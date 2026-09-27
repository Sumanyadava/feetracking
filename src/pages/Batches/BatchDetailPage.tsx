import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import RecordPaymentModal from '../../components/Modals/RecordPaymentModal';
import ReceiptModal from '../../components/Modals/ReceiptModal';
import type { Payment } from '../../types';

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { state } = useStore();
  const navigate = useNavigate();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<string | undefined>();
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const batch = state.batches.find(b => b.id === batchId);
  const batchStudents = state.students.filter(s => s.batchId === batchId);

  // Financial calculations for this batch
  const batchMetrics = useMemo(() => {
    if (!batch) return { totalExpected: 0, totalCollected: 0, totalDue: 0, efficiency: 0 };

    const studentIds = batchStudents.map(s => s.id);
    const records = state.feeRecords.filter(r => studentIds.includes(r.studentId));

    const totalExpected = records.reduce((sum, r) => sum + r.expectedAmount, 0);
    const totalCollected = records.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalDue = records.reduce((sum, r) => (r.status !== 'Waived' ? sum + r.dueAmount : sum), 0);
    const efficiency = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return { totalExpected, totalCollected, totalDue, efficiency };
  }, [batch, batchStudents, state.feeRecords]);

  // Students with calculated fee standing
  const studentsWithFees = useMemo(() => {
    return batchStudents.map(student => {
      const records = state.feeRecords.filter(r => r.studentId === student.id);
      const expected = records.reduce((sum, r) => sum + r.expectedAmount, 0);
      const paid = records.reduce((sum, r) => sum + r.paidAmount, 0);
      const due = records.reduce((sum, r) => (r.status !== 'Waived' ? sum + r.dueAmount : sum), 0);

      const hasOverdue = records.some(
        r => r.status !== 'Paid' && r.status !== 'Waived' && new Date(r.dueDate) < new Date()
      );

      let statusBadge: 'Paid' | 'Partial' | 'Overdue' | 'Due' = 'Paid';
      if (hasOverdue) statusBadge = 'Overdue';
      else if (due > 0 && paid > 0) statusBadge = 'Partial';
      else if (due > 0) statusBadge = 'Due';

      return {
        student,
        expected,
        paid,
        due,
        statusBadge,
      };
    });
  }, [batchStudents, state.feeRecords]);

  if (!batch) {
    return (
      <div className="empty-state">
        <p>Batch not found.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/batches')}>
          <ArrowLeft size={15} /> Back to Batches
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back button & Title */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/batches')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back to Batches
      </button>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">{batch.name}</h1>
            <span className="badge badge-accent">{batch.code}</span>
            <span className={`badge ${batch.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
              {batch.status}
            </span>
          </div>
          <p className="page-subtitle">{batch.courseName} • Timeline: {formatDate(batch.startDate)} to {formatDate(batch.endDate)}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setSelectedStudentForPayment(undefined);
            setPaymentModalOpen(true);
          }}
        >
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {/* Batch Stats KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Enrolled Students</span>
          <div className="stat-value">{batchStudents.length}</div>
          <div className="stat-delta text-muted">Monthly Fee: {formatCurrency(batch.monthlyFee)}</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Fee Expected</span>
          <div className="stat-value">{formatCurrency(batchMetrics.totalExpected)}</div>
          <div className="stat-delta text-muted">All generated terms</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Fee Collected</span>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(batchMetrics.totalCollected)}
          </div>
          <div className="stat-delta" style={{ color: 'var(--success)' }}>
            {batchMetrics.efficiency}% collected
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Outstanding Dues</span>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>
            {formatCurrency(batchMetrics.totalDue)}
          </div>
          <div className="stat-delta text-muted">Pending from batch</div>
        </div>
      </div>

      {/* Progress Bar for collection */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
          <span style={{ fontWeight: 600 }}>Batch Collection Progress</span>
          <span style={{ color: 'var(--text-2)' }}>{batchMetrics.efficiency}% fulfilled</span>
        </div>
        <div className="progress-bar" style={{ height: 8 }}>
          <div
            className="progress-fill success"
            style={{ width: `${Math.min(100, batchMetrics.efficiency)}%` }}
          />
        </div>
      </div>

      {/* Students in Batch Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Enrolled Students & Fee Ledger</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Click on any student to view their complete monthly fee history</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/students')}>
            Add New Student <ChevronRight size={14} />
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Contact</th>
                <th>Expected Total</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithFees.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                    No students currently assigned to this batch.
                  </td>
                </tr>
              ) : (
                studentsWithFees.map(({ student, expected, paid, due, statusBadge }) => (
                  <tr key={student.id}>
                    <td>
                      <div
                        style={{ fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        {student.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        Guardian: {student.guardianName}
                      </div>
                    </td>
                    <td>{student.rollNumber}</td>
                    <td>{student.phone}</td>
                    <td>{formatCurrency(expected)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {formatCurrency(paid)}
                    </td>
                    <td style={{ fontWeight: 600, color: due > 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                      {formatCurrency(due)}
                    </td>
                    <td>
                      <span className={`badge ${
                        statusBadge === 'Paid' ? 'badge-success' :
                        statusBadge === 'Partial' ? 'badge-warning' :
                        statusBadge === 'Overdue' ? 'badge-danger' : 'badge-neutral'
                      }`}>
                        {statusBadge}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/students/${student.id}`)}
                        >
                          Ledger
                        </button>
                        {due > 0 && (
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => {
                              setSelectedStudentForPayment(student.id);
                              setPaymentModalOpen(true);
                            }}
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentModalOpen && (
        <RecordPaymentModal
          initialStudentId={selectedStudentForPayment}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentRecorded={p => setReceiptPayment(p)}
        />
      )}

      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          student={state.students.find(s => s.id === receiptPayment.studentId)!}
          batch={batch}
          settings={state.settings}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
}
