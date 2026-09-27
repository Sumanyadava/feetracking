import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import Header from './Header';
import RecordPaymentModal from '../Modals/RecordPaymentModal';
import ReceiptModal from '../Modals/ReceiptModal';
import { useStore } from '../../store/useStore';
import type { Payment } from '../../types';

export default function Layout() {
  const { state } = useStore();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const receiptStudent = receiptPayment
    ? state.students.find(s => s.id === receiptPayment.studentId)
    : undefined;
  const receiptBatch = receiptStudent
    ? state.batches.find(b => b.id === receiptStudent.batchId)
    : undefined;

  return (
    <div className="app-shell">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          },
        }}
      />

      <Sidebar />

      <div className="app-main">
        <Header onQuickPayment={() => setShowPaymentModal(true)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {showPaymentModal && (
        <RecordPaymentModal
          onClose={() => setShowPaymentModal(false)}
          onPaymentRecorded={payment => {
            setReceiptPayment(payment);
          }}
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
