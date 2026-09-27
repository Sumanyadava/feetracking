import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { formatCurrency, getMonthLabel } from '../../utils/formatters';
import { getOverdueDays } from '../../utils/feeEngine';
import RecordPaymentModal from '../../components/Modals/RecordPaymentModal';
import ReceiptModal from '../../components/Modals/ReceiptModal';
import type { Payment } from '../../types';

type ReportTab = 'collection' | 'overdue' | 'batch';

export default function ReportsPage() {
  const { state } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ReportTab>('collection');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<string | undefined>();
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // 1. Payment Methods Collection Breakdown
  const methodStats = useMemo(() => {
    const methods: { [key: string]: { count: number; total: number } } = {
      UPI: { count: 0, total: 0 },
      Cash: { count: 0, total: 0 },
      'Bank Transfer': { count: 0, total: 0 },
      Card: { count: 0, total: 0 },
    };

    state.payments.forEach(p => {
      const m = p.method;
      if (methods[m]) {
        methods[m].count += 1;
        methods[m].total += p.amount;
      }
    });

    const grandTotal = Object.values(methods).reduce((sum, item) => sum + item.total, 0);
    return { methods, grandTotal };
  }, [state.payments]);

  // 2. Overdue Students Report
  const overdueReport = useMemo(() => {
    const map = new Map<string, { studentId: string; batchId: string; totalDue: number; maxDays: number; overdueMonths: string[] }>();

    state.feeRecords.forEach(rec => {
      if (rec.status !== 'Paid' && rec.status !== 'Waived' && new Date(rec.dueDate) < new Date()) {
        const days = getOverdueDays(rec);
        const mLabel = getMonthLabel(rec.month, rec.year).slice(0, 3);
        const existing = map.get(rec.studentId);
        if (existing) {
          existing.totalDue += rec.dueAmount;
          existing.maxDays = Math.max(existing.maxDays, days);
          existing.overdueMonths.push(mLabel);
        } else {
          map.set(rec.studentId, {
            studentId: rec.studentId,
            batchId: rec.batchId,
            totalDue: rec.dueAmount,
            maxDays: days,
            overdueMonths: [mLabel],
          });
        }
      }
    });

    return Array.from(map.values())
      .map(item => {
        const student = state.students.find(s => s.id === item.studentId);
        const batch = state.batches.find(b => b.id === item.batchId);
        return {
          student,
          batch,
          totalDue: item.totalDue,
          maxDays: item.maxDays,
          overdueMonths: item.overdueMonths,
        };
      })
      .filter(item => item.student !== undefined)
      .sort((a, b) => b.maxDays - a.maxDays);
  }, [state.feeRecords, state.students, state.batches]);

  // 3. Batch-wise Collection Report
  const batchReport = useMemo(() => {
    return state.batches.map(batch => {
      const students = state.students.filter(s => s.batchId === batch.id);
      const studentIds = students.map(s => s.id);
      const records = state.feeRecords.filter(r => studentIds.includes(r.studentId));
      const payments = state.payments.filter(p => studentIds.includes(p.studentId) || p.batchId === batch.id);

      const expected = records.reduce((sum, r) => sum + r.expectedAmount, 0);
      const collected = payments.reduce((sum, p) => sum + p.amount, 0);
      const pending = records.reduce((sum, r) => (r.status !== 'Waived' ? sum + r.dueAmount : sum), 0);
      const percentage = expected > 0 ? Math.round((collected / expected) * 100) : 0;

      return {
        batch,
        studentsCount: students.length,
        expected,
        collected,
        pending,
        percentage,
      };
    });
  }, [state.batches, state.students, state.feeRecords, state.payments]);

  // Export handlers
  const handleExportOverdueCSV = () => {
    const headers = ['Student Name', 'Roll Number', 'Batch', 'Contact', 'Guardian', 'Total Overdue Amount (INR)', 'Days Overdue', 'Overdue Terms'];
    const rows = overdueReport.map(r => [
      r.student?.name || '',
      r.student?.rollNumber || '',
      r.batch?.name || '',
      r.student?.phone || '',
      r.student?.guardianName || '',
      r.totalDue,
      r.maxDays,
      r.overdueMonths.join('; '),
    ]);

    exportCSV('Overdue_Fees_Report.csv', headers, rows);
  };

  const handleExportBatchCSV = () => {
    const headers = ['Batch Name', 'Batch Code', 'Course', 'Students Enrolled', 'Total Expected (INR)', 'Total Collected (INR)', 'Total Pending (INR)', 'Collection %'];
    const rows = batchReport.map(r => [
      r.batch.name,
      r.batch.code,
      r.batch.courseName,
      r.studentsCount,
      r.expected,
      r.collected,
      r.pending,
      `${r.percentage}%`,
    ]);

    exportCSV('Batch_Collection_Report.csv', headers, rows);
  };

  const exportCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}`);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Financial Reports</h1>
          <p className="page-subtitle">Multi-dimensional auditing: Payment channels, batch yields & overdue aging</p>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="tab-nav" style={{ maxWidth: 640 }}>
        <button
          className={`tab-btn ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => setActiveTab('collection')}
        >
          Payment Mode Breakdown
        </button>
        <button
          className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue Ageing ({overdueReport.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          Batch Performance
        </button>
      </div>

      {/* Tab 1: Collection by Payment Mode */}
      {activeTab === 'collection' && (
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Payment Method Revenue Distribution</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Reconciliation across electronic and physical modes</div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Payment Mode</th>
                    <th>Number of Transactions</th>
                    <th>Total Realized Amount</th>
                    <th>Revenue Share</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(methodStats.methods).map(([mode, data]) => {
                    const pct = methodStats.grandTotal > 0
                      ? Math.round((data.total / methodStats.grandTotal) * 100)
                      : 0;
                    return (
                      <tr key={mode}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="badge badge-accent">{mode}</span>
                          </div>
                        </td>
                        <td>{data.count} receipts issued</td>
                        <td style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                          {formatCurrency(data.total)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="progress-bar" style={{ width: 120 }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
                    <td><strong>Grand Total Realized</strong></td>
                    <td><strong>{state.payments.length} transactions</strong></td>
                    <td style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success)' }}>
                      {formatCurrency(methodStats.grandTotal)}
                    </td>
                    <td><strong>100%</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Overdue Aging Report */}
      {activeTab === 'overdue' && (
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Overdue Delinquency Report</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Students past their designated monthly due date</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleExportOverdueCSV}>
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Batch</th>
                    <th>Contact Phone</th>
                    <th>Guardian</th>
                    <th>Overdue Amount</th>
                    <th>Overdue Days</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                        All student fees are fully on schedule!
                      </td>
                    </tr>
                  ) : (
                    overdueReport.map(item => (
                      <tr key={item.student?.id}>
                        <td>
                          <strong
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/students/${item.student?.id}`)}
                          >
                            {item.student?.name}
                          </strong>
                        </td>
                        <td><span className="badge badge-neutral">{item.student?.rollNumber}</span></td>
                        <td>{item.batch?.name}</td>
                        <td>{item.student?.phone}</td>
                        <td>{item.student?.guardianName}</td>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                          {formatCurrency(item.totalDue)}
                        </td>
                        <td>
                          <span className="badge badge-danger">
                            {item.maxDays} days overdue
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => {
                              setSelectedStudentForPayment(item.student?.id);
                              setPaymentModalOpen(true);
                            }}
                          >
                            Collect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Batch Performance Report */}
      {activeTab === 'batch' && (
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Batch Financial Performance & Fulfillment</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Target vs actual revenue per cohort</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleExportBatchCSV}>
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Batch Name & Code</th>
                    <th>Course</th>
                    <th>Students</th>
                    <th>Total Target</th>
                    <th>Collected</th>
                    <th>Outstanding</th>
                    <th>Fulfillment Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {batchReport.map(item => (
                    <tr key={item.batch.id}>
                      <td>
                        <strong
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/batches/${item.batch.id}`)}
                        >
                          {item.batch.name}
                        </strong>
                        <span className="badge badge-accent" style={{ marginLeft: 6 }}>{item.batch.code}</span>
                      </td>
                      <td>{item.batch.courseName}</td>
                      <td>{item.studentsCount} Students</td>
                      <td>{formatCurrency(item.expected)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(item.collected)}
                      </td>
                      <td style={{ fontWeight: 700, color: item.pending > 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                        {formatCurrency(item.pending)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 100 }}>
                            <div className="progress-fill success" style={{ width: `${item.percentage}%` }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
          batch={state.batches.find(b => b.id === receiptPayment.batchId)}
          settings={state.settings}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
}
