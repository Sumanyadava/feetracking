import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDate, getMonthLabel } from '../../utils/formatters';
import { getOverdueDays } from '../../utils/feeEngine';
import RecordPaymentModal from '../../components/Modals/RecordPaymentModal';
import ReceiptModal from '../../components/Modals/ReceiptModal';
import type { Payment } from '../../types';

export default function FeeLedgerPage() {
  const { state } = useStore();
  const navigate = useNavigate();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<string | undefined>();
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Available unique month/years in feeRecords
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    state.feeRecords.forEach(r => {
      set.add(`${r.year}-${String(r.month).padStart(2, '0')}`);
    });
    return Array.from(set).sort().map(key => {
      const [y, m] = key.split('-').map(Number);
      return { month: m, year: y, key };
    });
  }, [state.feeRecords]);

  // Filtered fee records for selected period
  const ledgerRows = useMemo(() => {
    return state.feeRecords
      .filter(r => {
        const matchesPeriod = r.month === selectedMonth && r.year === selectedYear;
        const matchesBatch = batchFilter === 'ALL' || r.batchId === batchFilter;
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

        const student = state.students.find(s => s.id === r.studentId);
        const matchesSearch =
          !searchTerm ||
          (student && student.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (student && student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesPeriod && matchesBatch && matchesStatus && matchesSearch;
      })
      .map(r => {
        const student = state.students.find(s => s.id === r.studentId);
        const batch = state.batches.find(b => b.id === r.batchId);
        const overdueDays = getOverdueDays(r);
        return {
          ...r,
          student,
          batch,
          overdueDays,
        };
      });
  }, [state.feeRecords, state.students, state.batches, selectedMonth, selectedYear, batchFilter, statusFilter, searchTerm]);

  // Aggregate metrics for this month view
  const periodTotals = useMemo(() => {
    const totalExpected = ledgerRows.reduce((sum, r) => sum + r.expectedAmount, 0);
    const totalPaid = ledgerRows.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalDue = ledgerRows.reduce((sum, r) => (r.status !== 'Waived' ? sum + r.dueAmount : sum), 0);
    const paidCount = ledgerRows.filter(r => r.status === 'Paid').length;
    const partialCount = ledgerRows.filter(r => r.status === 'Partial').length;
    const unpaidCount = ledgerRows.filter(r => r.status === 'Unpaid').length;

    return { totalExpected, totalPaid, totalDue, paidCount, partialCount, unpaidCount };
  }, [ledgerRows]);

  // Export to CSV
  const handleExportCSV = () => {
    if (ledgerRows.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Student Name', 'Roll Number', 'Batch', 'Month', 'Expected (INR)', 'Paid (INR)', 'Due (INR)', 'Status', 'Due Date', 'Overdue Days'];
    const rows = ledgerRows.map(r => [
      r.student?.name || 'Unknown',
      r.student?.rollNumber || '',
      r.batch?.name || '',
      getMonthLabel(r.month, r.year),
      r.expectedAmount,
      r.paidAmount,
      r.dueAmount,
      r.status,
      formatDate(r.dueDate),
      r.overdueDays,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fee_Ledger_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV downloaded successfully!');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Institution Fee Ledger</h1>
          <p className="page-subtitle">Month-by-month expected vs realized fee balance matrix</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleExportCSV}>
            <Download size={15} /> Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedStudentForPayment(undefined);
              setPaymentModalOpen(true);
            }}
          >
            <Plus size={15} /> Record Payment
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="tab-nav" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {availablePeriods.map(p => {
          const isSelected = p.month === selectedMonth && p.year === selectedYear;
          return (
            <button
              key={p.key}
              className={`tab-btn ${isSelected ? 'active' : ''}`}
              onClick={() => {
                setSelectedMonth(p.month);
                setSelectedYear(p.year);
              }}
            >
              {getMonthLabel(p.month, p.year)}
            </button>
          );
        })}
      </div>

      {/* KPI Stats Strip */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Expected for {getMonthLabel(selectedMonth, selectedYear).slice(0, 3)}</span>
          <div className="stat-value">{formatCurrency(periodTotals.totalExpected)}</div>
          <div className="stat-delta text-muted">{ledgerRows.length} students billed</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Collected Amount</span>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(periodTotals.totalPaid)}
          </div>
          <div className="stat-delta" style={{ color: 'var(--success)' }}>
            {periodTotals.paidCount} Fully Paid
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Outstanding Balance</span>
          <div className="stat-value" style={{ color: periodTotals.totalDue > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {formatCurrency(periodTotals.totalDue)}
          </div>
          <div className="stat-delta" style={{ color: 'var(--danger)' }}>
            {periodTotals.unpaidCount} Unpaid • {periodTotals.partialCount} Partial
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="filters-bar">
        <div className="search-wrap" style={{ width: 280 }}>
          <Search size={15} style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Search student or roll number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

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

        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Payment Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Waived">Waived</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Roll No</th>
              <th>Batch</th>
              <th>Expected</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                  No fee records found for the selected period and filters.
                </td>
              </tr>
            ) : (
              ledgerRows.map(row => (
                <tr key={row.id}>
                  <td>
                    <div
                      style={{ fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
                      onClick={() => navigate(`/students/${row.student?.id}`)}
                    >
                      {row.student?.name || 'Unknown'}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{row.student?.rollNumber}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                      {row.batch?.name || 'N/A'}
                    </span>
                  </td>
                  <td>{formatCurrency(row.expectedAmount)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                    {formatCurrency(row.paidAmount)}
                  </td>
                  <td style={{ fontWeight: 600, color: row.dueAmount > 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                    {formatCurrency(row.dueAmount)}
                  </td>
                  <td>
                    <span className={`badge ${
                      row.status === 'Paid' ? 'badge-success' :
                      row.status === 'Partial' ? 'badge-warning' :
                      row.status === 'Waived' ? 'badge-neutral' : 'badge-danger'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: row.overdueDays > 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                      {formatDate(row.dueDate)}
                      {row.overdueDays > 0 && ` (${row.overdueDays}d overdue)`}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => navigate(`/students/${row.student?.id}`)}
                      >
                        Ledger
                      </button>
                      {row.dueAmount > 0 && row.status !== 'Waived' && (
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => {
                            setSelectedStudentForPayment(row.student?.id);
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
