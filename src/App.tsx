import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './store/useStore';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import BatchesPage from './pages/Batches/BatchesPage';
import BatchDetailPage from './pages/Batches/BatchDetailPage';
import StudentsPage from './pages/Students/StudentsPage';
import StudentDetailPage from './pages/Students/StudentDetailPage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import FeeLedgerPage from './pages/FeeLedger/FeeLedgerPage';
import ReportsPage from './pages/Reports/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="batches" element={<BatchesPage />} />
            <Route path="batches/:batchId" element={<BatchDetailPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:studentId" element={<StudentDetailPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="ledger" element={<FeeLedgerPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
