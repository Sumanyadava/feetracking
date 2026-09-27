import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle,
  Printer, Plus, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import {
  formatCurrency, formatDate, formatDateLong, getMonthLabel,
  getInitials, parseMonthKey
} from '../../utils/formatters';
import { getOverdueDays } from '../../utils/feeEngine';
import RecordPaymentModal from '../../components/Modals/RecordPaymentModal';
import ReceiptModal from '../../components/Modals/ReceiptModal';
import type { Payment, FeeRecord } from '../../types';

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { state, waiveFee } = useStore();
  const navigate = useNavigate();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Waive fee modal state
  const [waiveModalOpen, setWaiveModalOpen] = useState(false);
  const [selectedRecordForWaive, setSelectedRecordForWaive] = useState<FeeRecord | null>(null);
  const [waiveReason, setWaiveReason] = useState('Scholarship / Management Waiver');

  const student = state.students.find(s => s.id === studentId);
  const batch = state.batches.find(b => b.id === student?.batchId);

  // Fee records sorted by year and month
  const feeRecords = useMemo(() => {
    return state.feeRecords
      .filter(r => r.studentId === studentId)
      .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));
  }, [state.feeRecords, studentId]);

  // Payments for this student
  const studentPayments = useMemo(() => {
    return state.payments
      .filter(p => p.studentId === studentId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [state.payments, studentId]);

  // Calculations
  const stats = useMemo(() => {
    const totalExpected = feeRecords.reduce((sum, r) => sum + r.expectedAmount, 0);
    const totalPaid = feeRecords.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalDue = feeRecords.reduce((sum, r) => (r.status !== 'Waived' ? sum + r.dueAmount : sum), 0);
    const overdueRecords = feeRecords.filter(
      r => r.status !== 'Paid' && r.status !== 'Waived' && new Date(r.dueDate) < new Date()
    );
    const overdueAmount = overdueRecords.reduce((sum, r) => sum + r.dueAmount, 0);

    return {
      totalExpected,
      totalPaid,
      totalDue,
      overdueRecordsCount: overdueRecords.length,
      overdueAmount,
    };
  }, [feeRecords]);

  if (!student) {
    return (
      <div className="empty-state">
        <p>Student not found.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/students')}>
          <ArrowLeft size={15} /> Back to Directory
        </button>
      </div>
    );
  }

  const handleOpenWaive = (rec: FeeRecord) => {
    setSelectedRecordForWaive(rec);
    setWaiveReason('Scholarship / Management Discount');
    setWaiveModalOpen(true);
  };

  const handleConfirmWaive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForWaive) return;

    waiveFee(selectedRecordForWaive.id, waiveReason);
    toast.success(`Fee waived for ${getMonthLabel(selectedRecordForWaive.month, selectedRecordForWaive.year)}`);
    setWaiveModalOpen(false);
  };

  return (
    <div>
      {/* Back button */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/students')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Back to Directory
      </button>

      {/* Student Profile & Quick Summary Header */}
      <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="avatar avatar-lg">
              {getInitials(student.name)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{student.name}</h1>
                <span className="badge badge-accent">{student.rollNumber}</span>
                <span className={`badge ${
                  student.status === 'Active' ? 'badge-success' : 'badge-neutral'
                }`}>
                  {student.status}
                </span>
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: 4 }}>
                Batch: <strong style={{ color: 'var(--text)' }}>{batch?.name || 'No Batch'}</strong> • {student.course}
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.75rem', marginTop: 2 }}>
                Enrolled on {formatDateLong(student.joiningDate)} • Phone: {student.phone} {student.email ? `• ${student.email}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => setPaymentModalOpen(true)}
            >
              <Plus size={16} /> Record Fee Payment
            </button>
          </div>
        </div>

        <div className="divider" />

        {/* Guardian & Contact Meta Row */}
        <div className="info-row">
          <div className="info-item">
            <span className="label">Guardian Name</span>
            <span className="value">{student.guardianName || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="label">Guardian Contact</span>
            <span className="value">{student.guardianPhone || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="label">Address</span>
            <span className="value">{student.address || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="label">Monthly Rate</span>
            <span className="value">{formatCurrency(batch?.monthlyFee ?? 0)}</span>
          </div>
          {student.notes && (
            <div className="info-item">
              <span className="label">Notes</span>
              <span className="value" style={{ fontStyle: 'italic', color: 'var(--text-2)' }}>{student.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Fee Due</span>
          <div className="stat-value">{formatCurrency(stats.totalExpected)}</div>
          <div className="stat-delta text-muted">Generated terms</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Paid to Date</span>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(stats.totalPaid)}
          </div>
          <div className="stat-delta" style={{ color: 'var(--success)' }}>
            {stats.totalExpected > 0 ? Math.round((stats.totalPaid / stats.totalExpected) * 100) : 0}% cleared
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Outstanding Balance</span>
          <div className="stat-value" style={{ color: stats.totalDue > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {formatCurrency(stats.totalDue)}
          </div>
          <div className="stat-delta text-muted">Remaining payable</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Overdue Balance</span>
          <div className="stat-value" style={{ color: stats.overdueAmount > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
            {formatCurrency(stats.overdueAmount)}
          </div>
          <div className="stat-delta" style={{ color: stats.overdueAmount > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
            {stats.overdueRecordsCount} term(s) past due
          </div>
        </div>
      </div>

      {/* 5. Month-by-Month Visual Snapshot Cards */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Fee Schedule & Month Status Snapshot</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Instant visual summary of all academic terms</div>
          </div>
        </div>

        <div className="fee-month-grid">
          {feeRecords.map(rec => {
            const overdueDays = getOverdueDays(rec);
            const isOverdue = overdueDays > 0;

            let cardClass = 'unpaid';
            if (rec.status === 'Paid') cardClass = 'paid';
            else if (rec.status === 'Partial') cardClass = 'partial';
            else if (rec.status === 'Waived') cardClass = 'waived';

            return (
              <div
                key={rec.id}
                className={`fee-month-card ${cardClass}`}
                onClick={() => {
                  if (rec.dueAmount > 0 && rec.status !== 'Waived') {
                    setPaymentModalOpen(true);
                  }
                }}
              >
                <div className="fee-month-label">
                  {getMonthLabel(rec.month, rec.year).slice(0, 3)} '{String(rec.year).slice(2)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {rec.status === 'Paid' && <CheckCircle2 size={16} color="var(--success)" />}
                  {rec.status === 'Partial' && <AlertTriangle size={16} color="var(--warning)" />}
                  {rec.status === 'Unpaid' && <XCircle size={16} color="var(--danger)" />}
                  {rec.status === 'Waived' && <Tag size={16} color="var(--text-3)" />}

                  <span className={`fee-month-status status-${rec.status.toLowerCase()}`}>
                    {rec.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Paid: {formatCurrency(rec.paidAmount)}
                </div>
                <div style={{ fontSize: '0.75rem', color: rec.dueAmount > 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                  Due: {formatCurrency(rec.dueAmount)}
                </div>

                {isOverdue && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 700, marginTop: 4 }}>
                    {overdueDays}d overdue
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fee Ledger Detailed Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Fee Ledger Breakdown</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Detailed term-by-term calculation and waiver options</div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Term / Month</th>
                <th>Due Date</th>
                <th>Expected Amount</th>
                <th>Paid Amount</th>
                <th>Due Amount</th>
                <th>Status</th>
                <th>Overdue Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feeRecords.map(rec => {
                const overdueDays = getOverdueDays(rec);
                return (
                  <tr key={rec.id}>
                    <td>
                      <strong>{getMonthLabel(rec.month, rec.year)}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {formatDate(rec.dueDate)}
                      </span>
                    </td>
                    <td>{formatCurrency(rec.expectedAmount)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {formatCurrency(rec.paidAmount)}
                    </td>
                    <td style={{ fontWeight: 600, color: rec.dueAmount > 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                      {formatCurrency(rec.dueAmount)}
                    </td>
                    <td>
                      <span className={`badge ${
                        rec.status === 'Paid' ? 'badge-success' :
                        rec.status === 'Partial' ? 'badge-warning' :
                        rec.status === 'Waived' ? 'badge-neutral' : 'badge-danger'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td>
                      {overdueDays > 0 ? (
                        <span className="badge badge-danger">
                          {overdueDays} days overdue
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>On Schedule</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        {rec.dueAmount > 0 && rec.status !== 'Waived' && (
                          <>
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => setPaymentModalOpen(true)}
                            >
                              Pay Now
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleOpenWaive(rec)}
                              title="Apply discount or scholarship waiver"
                            >
                              Waive
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History for this Student */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Payment History & Official Receipts</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>All verified transactions and print-ready receipts</div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Payment Date</th>
                <th>Amount Paid</th>
                <th>Payment Mode</th>
                <th>Months Covered</th>
                <th>Transaction Ref</th>
                <th style={{ textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {studentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-3)' }}>
                    No payments recorded for this student yet.
                  </td>
                </tr>
              ) : (
                studentPayments.map(payment => {
                  const monthsText = payment.feeMonths.map(mKey => {
                    const { month, year } = parseMonthKey(mKey);
                    return getMonthLabel(month, year).slice(0, 3) + ' ' + year;
                  }).join(', ');

                  return (
                    <tr key={payment.id}>
                      <td>
                        <strong style={{ color: 'var(--accent)' }}>{payment.receiptNumber}</strong>
                      </td>
                      <td>{formatDateLong(payment.paymentDate)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td>
                        <span className="badge badge-accent">{payment.method}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{monthsText}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                          {payment.transactionId || 'Cash Payment'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setReceiptPayment(payment)}
                        >
                          <Printer size={13} /> View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waive / Discount Modal */}
      {waiveModalOpen && selectedRecordForWaive && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setWaiveModalOpen(false); }}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <span className="modal-title">Waive / Discount Fee</span>
              <button className="btn btn-ghost btn-icon-sm" onClick={() => setWaiveModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleConfirmWaive}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: '0.875rem' }}>
                  Are you sure you want to waive the remaining balance of{' '}
                  <strong style={{ color: 'var(--warning)' }}>
                    {formatCurrency(selectedRecordForWaive.dueAmount)}
                  </strong>{' '}
                  for <strong>{getMonthLabel(selectedRecordForWaive.month, selectedRecordForWaive.year)}</strong>?
                </p>

                <div className="form-group">
                  <label className="form-label">Reason for Waiver / Adjustment *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={waiveReason}
                    onChange={e => setWaiveReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setWaiveModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <RecordPaymentModal
          initialStudentId={studentId}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentRecorded={p => setReceiptPayment(p)}
        />
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          student={student}
          batch={batch}
          settings={state.settings}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
}
