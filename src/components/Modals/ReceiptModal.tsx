import { jsPDF } from 'jspdf';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import type { Payment, Student, Batch, Settings } from '../../types';
import { formatCurrency, formatDateLong, getMonthLabel, parseMonthKey } from '../../utils/formatters';

interface ReceiptModalProps {
  payment: Payment;
  student: Student;
  batch?: Batch;
  settings: Settings;
  onClose: () => void;
}

export default function ReceiptModal({
  payment,
  student,
  batch,
  settings,
  onClose,
}: ReceiptModalProps) {
  const formattedMonths = payment.feeMonths.map(mKey => {
    const { month, year } = parseMonthKey(mKey);
    return getMonthLabel(month, year);
  }).join(', ');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      // Background & Border (Clean White Paper style)
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 148, 210, 'F');

      // Card Border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(8, 8, 132, 194, 4, 4, 'S');

      // Institute Header
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.instituteName, 74, 22, { align: 'center' });

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(settings.instituteAddress, 74, 28, { align: 'center' });
      doc.text(`Tel: ${settings.institutePhone} | Email: ${settings.instituteEmail}`, 74, 33, { align: 'center' });

      // Title line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 38, 134, 38);

      doc.setTextColor(79, 70, 229);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL PAYMENT RECEIPT', 74, 45, { align: 'center' });

      // Receipt details box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 52, 120, 22, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text('Receipt Number:', 20, 60);
      doc.text('Date Issued:', 20, 68);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(payment.receiptNumber, 55, 60);
      doc.text(formatDateLong(payment.paymentDate), 55, 68);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Payment Mode:', 85, 60);
      doc.text('Transaction ID:', 85, 68);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(payment.method, 110, 60);
      doc.text(payment.transactionId || 'N/A', 110, 68);

      // Student info
      let y = 84;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text('Student Details', 14, y);

      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.text(`Name: ${student.name}`, 14, y);
      doc.text(`Roll No: ${student.rollNumber}`, 80, y);

      y += 5;
      doc.text(`Course: ${student.course}`, 14, y);
      doc.text(`Batch: ${batch?.name || 'N/A'}`, 80, y);

      y += 5;
      doc.text(`Phone: ${student.phone}`, 14, y);
      doc.text(`Guardian: ${student.guardianName}`, 80, y);

      // Fee details table
      y += 10;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, 134, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Description / Fee Period', 16, y);
      doc.text('Amount', 115, y, { align: 'right' });

      y += 4;
      doc.line(14, y, 134, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`Tuition Fee: ${formattedMonths || 'Specified Month'}`, 16, y);
      doc.text(formatCurrency(payment.amount), 130, y, { align: 'right' });

      if (payment.notes) {
        y += 6;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Notes: ${payment.notes}`, 16, y);
      }

      // Total Box
      y += 12;
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, y, 120, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(22, 163, 74);
      doc.text('TOTAL AMOUNT PAID', 20, y + 9);
      doc.text(formatCurrency(payment.amount), 126, y + 9, { align: 'right' });

      // PAID stamp watermark
      doc.setFontSize(22);
      doc.setTextColor(34, 197, 94);
      doc.text('[ PAID ]', 74, y + 32, { align: 'center' });

      // Footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated fee receipt and does not require a physical signature.', 74, 192, { align: 'center' });

      doc.save(`${payment.receiptNumber}-${student.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      window.print();
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-md">
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
            <span className="modal-title">Payment Receipt</span>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="modal-body print-area" style={{ background: 'var(--surface)', padding: '28px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
              {settings.instituteName}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '2px' }}>
              {settings.instituteAddress}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px' }}>
              Tel: {settings.institutePhone} • Email: {settings.instituteEmail}
            </p>
            <div style={{
              display: 'inline-block',
              marginTop: '12px',
              padding: '4px 14px',
              borderRadius: '99px',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              PAYMENT RECEIPT
            </div>
          </div>

          {/* Meta Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: 'var(--surface-2)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            marginBottom: '20px',
            fontSize: '0.825rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-3)' }}>Receipt No:</span>{' '}
              <strong style={{ color: 'var(--text)' }}>{payment.receiptNumber}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-3)' }}>Payment Date:</span>{' '}
              <strong style={{ color: 'var(--text)' }}>{formatDateLong(payment.paymentDate)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-3)' }}>Payment Method:</span>{' '}
              <span className="badge badge-accent">{payment.method}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-3)' }}>Transaction Ref:</span>{' '}
              <strong style={{ color: 'var(--text)' }}>{payment.transactionId || 'N/A'}</strong>
            </div>
          </div>

          {/* Student Info */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Student Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-3)' }}>Student Name:</span> <strong>{student.name}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Roll Number:</span> <strong>{student.rollNumber}</strong></div>
              <div><span style={{ color: 'var(--text-3)' }}>Course:</span> {student.course}</div>
              <div><span style={{ color: 'var(--text-3)' }}>Batch:</span> {batch?.name || 'N/A'}</div>
              <div><span style={{ color: 'var(--text-3)' }}>Contact:</span> {student.phone}</div>
              <div><span style={{ color: 'var(--text-3)' }}>Guardian:</span> {student.guardianName}</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap" style={{ marginBottom: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Description / Fee Month</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div><strong>Tuition Fee</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Covering: {formattedMonths || 'All Months'}</div>
                    {payment.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic', marginTop: '2px' }}>Note: {payment.notes}</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total & Stamp */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--success-dim)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 20px',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '0.05em' }}>PAID</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'uppercase' }}>Total Amount Paid</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(payment.amount)}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            This receipt is electronically verified and issued by {settings.instituteName}.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer no-print">
          <button className="btn btn-ghost" onClick={handlePrint}>
            <Printer size={15} />
            <span>Print Receipt</span>
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={15} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
