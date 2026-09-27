import { useState, useEffect } from 'react';
import { X, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import type { Payment, PaymentMethod } from '../../types';
import { formatCurrency, getMonthLabel, toISODateString } from '../../utils/formatters';

interface RecordPaymentModalProps {
  initialStudentId?: string;
  onClose: () => void;
  onPaymentRecorded?: (payment: Payment) => void;
}

export default function RecordPaymentModal({
  initialStudentId,
  onClose,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const { state, recordPayment } = useStore();

  const [studentId, setStudentId] = useState(initialStudentId || (state.students[0]?.id ?? ''));
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(toISODateString(new Date()));
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [transactionId, setTransactionId] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const currentStudent = state.students.find(s => s.id === studentId);
  const currentBatch = state.batches.find(b => b.id === currentStudent?.batchId);

  // Student's fee records sorted chronologically
  const studentFeeRecords = state.feeRecords
    .filter(r => r.studentId === studentId)
    .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

  // Auto-prefill amount and unpaid months when student changes
  useEffect(() => {
    const unpaidRecords = studentFeeRecords.filter(r => r.status !== 'Paid' && r.status !== 'Waived');
    if (unpaidRecords.length > 0) {
      // Pick first unpaid month by default
      const firstUnpaid = unpaidRecords[0];
      const mKey = `${firstUnpaid.year}-${String(firstUnpaid.month).padStart(2, '0')}`;
      setSelectedMonths([mKey]);
      setAmount(firstUnpaid.dueAmount);
    } else if (currentBatch) {
      setAmount(currentBatch.monthlyFee);
      setSelectedMonths([]);
    }
  }, [studentId]);

  // When user toggles a month chip
  const toggleMonth = (mKey: string) => {
    let next: string[];
    if (selectedMonths.includes(mKey)) {
      next = selectedMonths.filter(m => m !== mKey);
    } else {
      next = [...selectedMonths, mKey];
    }
    setSelectedMonths(next);

    // Auto-calculate suggested sum of due amounts for selected months
    let totalDueForSelected = 0;
    for (const key of next) {
      const [yrStr, moStr] = key.split('-');
      const y = parseInt(yrStr, 10);
      const m = parseInt(moStr, 10);
      const rec = studentFeeRecords.find(r => r.year === y && r.month === m);
      totalDueForSelected += rec ? rec.dueAmount : (currentBatch?.monthlyFee ?? 0);
    }
    if (totalDueForSelected > 0) {
      setAmount(totalDueForSelected);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error('Please select a student');
      return;
    }
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (selectedMonths.length === 0) {
      toast.error('Please select at least one month being paid');
      return;
    }

    try {
      const newPayment = recordPayment({
        studentId,
        batchId: currentStudent?.batchId ?? '',
        amount,
        paymentDate,
        method,
        transactionId: transactionId.trim(),
        feeMonths: selectedMonths,
        notes: notes.trim(),
      });

      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully!`);
      if (onPaymentRecorded) {
        onPaymentRecorded(newPayment);
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={20} style={{ color: 'var(--accent)' }} />
            <span className="modal-title">Record Fee Payment</span>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Student selection */}
            <div className="form-group">
              <label className="form-label">Select Student *</label>
              <select
                className="form-select"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                disabled={Boolean(initialStudentId)}
              >
                {state.students.map(s => {
                  const b = state.batches.find(batch => batch.id === s.batchId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber}) — {b?.name || 'No Batch'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Student info banner */}
            {currentStudent && (
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.825rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{currentStudent.name}</div>
                  <div style={{ color: 'var(--text-2)' }}>{currentStudent.course} • Batch: {currentBatch?.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>Monthly Fee</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(currentBatch?.monthlyFee ?? 0)}</div>
                </div>
              </div>
            )}

            {/* Select Fee Month(s) */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="form-label">Month(s) Being Paid *</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  Supports single month partials or multiple months
                </span>
              </div>

              {studentFeeRecords.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                  No fee records generated for this student yet.
                </div>
              ) : (
                <div className="month-selector">
                  {studentFeeRecords.map(rec => {
                    const mKey = `${rec.year}-${String(rec.month).padStart(2, '0')}`;
                    const isSelected = selectedMonths.includes(mKey);
                    const isPaid = rec.status === 'Paid';
                    const isPartial = rec.status === 'Partial';

                    return (
                      <div
                        key={rec.id}
                        className={`month-chip ${isSelected ? 'selected' : ''} ${isPaid ? 'paid' : ''}`}
                        onClick={() => toggleMonth(mKey)}
                        title={`${rec.status}: Due ${formatCurrency(rec.dueAmount)}`}
                      >
                        <span>{getMonthLabel(rec.month, rec.year).slice(0, 3)} '{String(rec.year).slice(2)}</span>
                        {isPaid && <span style={{ color: 'var(--success)', fontSize: '0.65rem' }}>✓</span>}
                        {isPartial && <span style={{ color: 'var(--warning)', fontSize: '0.65rem' }}>⚠</span>}
                        {!isPaid && !isPartial && <span style={{ color: 'var(--danger)', fontSize: '0.65rem' }}>✕</span>}
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({formatCurrency(rec.dueAmount)})</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Amount & Date */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Amount Paid (₹) *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 3500"
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Method & Transaction ID */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  className="form-select"
                  value={method}
                  onChange={e => setMethod(e.target.value as PaymentMethod)}
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
                  <option value="Card">Card (Debit / Credit)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction / Ref ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={method === 'Cash' ? 'Optional (Receipt no)' : 'e.g. UPI827189028'}
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes / Remarks</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Paid in 2 installments / Cheque clearance pending"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record & Generate Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
