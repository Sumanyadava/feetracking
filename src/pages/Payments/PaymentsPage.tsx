import { useState, useMemo } from 'react';
import { Plus, Search, Printer, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import type { Payment } from '../../types';
import { formatCurrency, formatDateLong, getMonthLabel, parseMonthKey } from '../../utils/formatters';
import RecordPaymentModal from '../../components/Modals/RecordPaymentModal';
import ReceiptModal from '../../components/Modals/ReceiptModal';

export default function PaymentsPage() {
  const { state, deletePayment } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [batchFilter, setBatchFilter] = useState<string>('ALL');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return state.payments
      .filter(p => {
        const student = state.students.find(s => s.id === p.studentId);
        const matchesSearch =
          p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (student && student.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (student && student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesMethod = methodFilter === 'ALL' || p.method === methodFilter;
        const matchesBatch = batchFilter === 'ALL' || p.batchId === batchFilter || (student && student.batchId === batchFilter);

        return matchesSearch && matchesMethod && matchesBatch;
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [state.payments, state.students, searchTerm, methodFilter, batchFilter]);

  // Aggregate totals
  const totalAmountFiltered = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const handleDelete = (paymentId: string, receiptNumber: string) => {
    if (window.confirm(`Are you sure you want to reverse payment ${receiptNumber}? The student's fee dues will be recalculated.`)) {
      deletePayment(paymentId);
      toast.success(`Payment ${receiptNumber} reversed.`);
    }
  };

  const receiptStudent = receiptPayment
    ? state.students.find(s => s.id === receiptPayment.studentId)
    : undefined;
  const receiptBatch = receiptStudent
    ? state.batches.find(b => b.id === receiptStudent.batchId)
    : undefined;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Management</h1>
          <p className="page-subtitle">Track transaction history, multi-month allocations & instant receipt generation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPaymentModalOpen(true)}>
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {/* Summary strip */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Total Transactions</span>
          <div className="stat-value">{filteredPayments.length}</div>
          <div className="stat-delta text-muted">Filtered count</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Revenue Collected</span>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(totalAmountFiltered)}
          </div>
          <div className="stat-delta" style={{ color: 'var(--success)' }}>Verified in ledger</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">UPI Payments</span>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {formatCurrency(
              filteredPayments.filter(p => p.method === 'UPI').reduce((sum, p) => sum + p.amount, 0)
            )}
          </div>
          <div className="stat-delta text-muted">Digital collections</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Cash & Other</span>
          <div className="stat-value">
            {formatCurrency(
              filteredPayments.filter(p => p.method !== 'UPI').reduce((sum, p) => sum + p.amount, 0)
            )}
          </div>
          <div className="stat-delta text-muted">Cash, Card, Bank</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-wrap" style={{ width: 300 }}>
          <Search size={15} style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Search by student, receipt no, txn ref..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
        >
          <option value="ALL">All Payment Modes</option>
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Card">Card</option>
        </select>

        <select
          className="filter-select"
          value={batchFilter}
          onChange={e => setBatchFilter(e.target.value)}
        >
          <option value="ALL">All Batches</option>
          {state.batches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Payments Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Student Name</th>
              <th>Batch</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Payment Mode</th>
              <th>Allocated Months</th>
              <th>Ref / Txn ID</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                  No payments found matching criteria.
                </td>
              </tr>
            ) : (
              filteredPayments.map(p => {
                const s = state.students.find(stu => stu.id === p.studentId);
                const b = state.batches.find(bat => bat.id === (p.batchId || s?.batchId));

                const monthsText = p.feeMonths.map(mKey => {
                  const { month, year } = parseMonthKey(mKey);
                  return getMonthLabel(month, year).slice(0, 3) + " '" + String(year).slice(2);
                }).join(', ');

                return (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: 'var(--accent)' }}>{p.receiptNumber}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s?.name || 'Unknown Student'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{s?.rollNumber}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{b?.name || 'N/A'}</span>
                    </td>
                    <td>{formatDateLong(p.paymentDate)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {formatCurrency(p.amount)}
                    </td>
                    <td>
                      <span className="badge badge-accent">{p.method}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{monthsText || 'Specified'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        {p.transactionId || 'Cash'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          title="Print or Download PDF Receipt"
                          onClick={() => setReceiptPayment(p)}
                        >
                          <Printer size={13} /> Receipt
                        </button>
                        <button
                          className="btn btn-danger btn-icon-sm"
                          title="Reverse this Payment"
                          onClick={() => handleDelete(p.id, p.receiptNumber)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paymentModalOpen && (
        <RecordPaymentModal
          onClose={() => setPaymentModalOpen(false)}
          onPaymentRecorded={p => setReceiptPayment(p)}
        />
      )}

      {receiptPayment && receiptStudent && (
        <ReceiptModal
          payment={receiptPayment}
          student={receiptStudent}
          batch={receiptBatch}
          settings={state.settings}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
}
