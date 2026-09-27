import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, IndianRupee, Clock, AlertTriangle,
  Plus, Receipt, ArrowUpRight, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatDateLong, getMonthLabel, formatMonth } from '../../utils/formatters';
import { getOverdueDays } from '../../utils/feeEngine';
import RecordPaymentModal from '../../components/Modals/RecordPaymentModal';
import ReceiptModal from '../../components/Modals/ReceiptModal';
import type { Payment } from '../../types';

export default function DashboardPage() {
  const { state } = useStore();
  const navigate = useNavigate();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<string | undefined>();
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'trend' | 'batches' | 'status'>('trend');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // 1. Calculations
  const stats = useMemo(() => {
    const totalStudents = state.students.length;
    const activeStudents = state.students.filter(s => s.status === 'Active').length;
    const activeBatches = state.batches.filter(b => b.status === 'Active').length;

    // Collected this current month
    const collectedThisMonth = state.payments.reduce((sum, p) => {
      const pDate = new Date(p.paymentDate);
      if (pDate.getMonth() + 1 === currentMonth && pDate.getFullYear() === currentYear) {
        return sum + p.amount;
      }
      return sum;
    }, 0);

    // Pending fees across all records generated up to today
    const pendingFees = state.feeRecords.reduce((sum, r) => {
      if (r.status !== 'Paid' && r.status !== 'Waived') {
        return sum + r.dueAmount;
      }
      return sum;
    }, 0);

    // Overdue students list
    const overdueRecords = state.feeRecords.filter(r => {
      if (r.status === 'Paid' || r.status === 'Waived') return false;
      return new Date(r.dueDate) < now;
    });

    const overdueStudentIds = new Set(overdueRecords.map(r => r.studentId));
    const overdueStudentsCount = overdueStudentIds.size;

    return {
      totalStudents,
      activeStudents,
      activeBatches,
      collectedThisMonth,
      pendingFees,
      overdueStudentsCount,
    };
  }, [state, currentMonth, currentYear, now]);

  // 2. Overdue tracking items (aggregated by student)
  const overdueList = useMemo(() => {
    const map = new Map<string, { studentId: string; totalDue: number; maxOverdueDays: number }>();

    state.feeRecords.forEach(rec => {
      if (rec.status !== 'Paid' && rec.status !== 'Waived' && new Date(rec.dueDate) < now) {
        const days = getOverdueDays(rec);
        const existing = map.get(rec.studentId);
        if (existing) {
          existing.totalDue += rec.dueAmount;
          existing.maxOverdueDays = Math.max(existing.maxOverdueDays, days);
        } else {
          map.set(rec.studentId, {
            studentId: rec.studentId,
            totalDue: rec.dueAmount,
            maxOverdueDays: days,
          });
        }
      }
    });

    return Array.from(map.values())
      .map(item => {
        const student = state.students.find(s => s.id === item.studentId);
        const batch = state.batches.find(b => b.id === student?.batchId);
        return {
          student,
          batch,
          totalDue: item.totalDue,
          daysOverdue: item.maxOverdueDays,
        };
      })
      .filter(item => item.student !== undefined)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);
  }, [state, now]);

  // 3. Monthly collection trend (last 6 months)
  const monthlyTrendData = useMemo(() => {
    const monthsData: { name: string; collected: number; expected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const mName = formatMonth(m, y);

      const collected = state.payments.reduce((sum, p) => {
        const pDate = new Date(p.paymentDate);
        if (pDate.getMonth() + 1 === m && pDate.getFullYear() === y) {
          return sum + p.amount;
        }
        return sum;
      }, 0);

      const expected = state.feeRecords.reduce((sum, r) => {
        if (r.month === m && r.year === y) {
          return sum + r.expectedAmount;
        }
        return sum;
      }, 0);

      monthsData.push({
        name: mName,
        collected,
        expected: expected || collected,
      });
    }
    return monthsData;
  }, [state, currentMonth, currentYear]);

  // 4. Paid vs Unpaid status breakdown
  const feeStatusData = useMemo(() => {
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    state.feeRecords.forEach(r => {
      if (r.status === 'Paid') paidCount++;
      else if (r.status === 'Partial') partialCount++;
      else if (r.status === 'Unpaid') unpaidCount++;
    });

    return [
      { name: 'Paid', value: paidCount, color: '#22C55E' },
      { name: 'Partial', value: partialCount, color: '#CA8A04' },
      { name: 'Unpaid', value: unpaidCount, color: '#991B1B' },
    ];
  }, [state.feeRecords]);

  // 5. Batch-wise collection data
  const batchWiseData = useMemo(() => {
    return state.batches.map(batch => {
      const batchStudentIds = state.students.filter(s => s.batchId === batch.id).map(s => s.id);

      const collected = state.payments
        .filter(p => batchStudentIds.includes(p.studentId) || p.batchId === batch.id)
        .reduce((sum, p) => sum + p.amount, 0);

      const pending = state.feeRecords
        .filter(r => batchStudentIds.includes(r.studentId) && r.status !== 'Paid' && r.status !== 'Waived')
        .reduce((sum, r) => sum + r.dueAmount, 0);

      return {
        name: batch.code || batch.name.slice(0, 10),
        fullName: batch.name,
        collected,
        pending,
      };
    });
  }, [state.batches, state.students, state.payments, state.feeRecords]);

  // Recent payments
  const recentPayments = useMemo(() => {
    return [...state.payments]
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5);
  }, [state.payments]);

  return (
    <div>
      {/* Ornate QuestUI Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Treasury Overview</h1>
          <p className="page-subtitle">Grand ledger of fee collections, outstanding tributes & student enrollments</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/ledger')}
          >
            Fee Ledger
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedStudentForPayment(undefined);
              setPaymentModalOpen(true);
            }}
          >
            <Plus size={16} />
            Record Payment
          </button>
        </div>
      </div>

      {/* Ornate 4-Card KPI Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: Collected This Month */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Collected This Moon</span>
            <div className="icon-wrap" style={{ background: 'rgba(202, 138, 4, 0.15)', color: '#CA8A04', borderColor: '#CA8A04' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="stat-value" >
            {formatCurrency(stats.collectedThisMonth)}
          </div>
          <div className="stat-delta">
            {getMonthLabel(currentMonth, currentYear)} Treasury
          </div>
        </div>

        {/* Card 2: Pending Dues */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Pending Tributes</span>
            <div className="icon-wrap" style={{ background: 'rgba(202, 138, 4, 0.20)', color: '#CA8A04' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value" >
            {formatCurrency(stats.pendingFees)}
          </div>
          <div className="stat-delta">
            Total outstanding receivables
          </div>
        </div>

        {/* Card 3: Overdue Students */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Overdue Tributes</span>
            <div className="icon-wrap" style={{ background: 'rgba(153, 27, 27, 0.25)', color: '#F87171', borderColor: '#991B1B' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#F87171' }}>
            {stats.overdueStudentsCount}
          </div>
          <div className="stat-delta" style={{ color: '#F87171' }}>
            {stats.overdueStudentsCount > 0 ? 'Requires immediate action' : 'All accounts settled'}
          </div>
        </div>

        {/* Card 4: Active Enrolled Students */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Enrolled Scholars</span>
            <div className="icon-wrap" style={{ background: 'rgba(88, 28, 135, 0.3)', color: '#C084FC', borderColor: '#581C87' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value" >
            {stats.activeStudents}
          </div>
          <div className="stat-delta">
            Across {stats.activeBatches} active cohorts
          </div>
        </div>
      </div>

      {/* Ornate Financial Overview with Gold Tabs */}
      <div className="card" style={{ marginBottom: 24, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
          <div>
            <div className="card-title">Treasury Performance</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
              {activeChartTab === 'trend' && 'Monthly collection trajectory across the realm (Last 6 Months)'}
              {activeChartTab === 'batches' && 'Comparison of collected revenue vs outstanding dues by cohort'}
              {activeChartTab === 'status' && 'Distribution of paid, partial, and unpaid records in the archives'}
            </div>
          </div>

          {/* QuestUI Tab Navigation */}
          <div className="tab-nav" style={{ margin: 0, padding: '3px' }}>
            <button
              className={`tab-btn ${activeChartTab === 'trend' ? 'active' : ''}`}
              onClick={() => setActiveChartTab('trend')}
            >
              Collection Trend
            </button>
            <button
              className={`tab-btn ${activeChartTab === 'batches' ? 'active' : ''}`}
              onClick={() => setActiveChartTab('batches')}
            >
              Cohort Yield
            </button>
            <button
              className={`tab-btn ${activeChartTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveChartTab('status')}
            >
              Tribute Status
            </button>
          </div>
        </div>

        {/* Tab 1: Collection Trend */}
        {activeChartTab === 'trend' && (
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="questGoldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CA8A04" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#CA8A04" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#BFA98A" fontSize={12} tickLine={false} fontFamily="Spectral" />
                <YAxis stroke="#BFA98A" fontSize={12} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} fontFamily="Spectral" />
                <Tooltip
                  contentStyle={{
                    background: '#2C1A10',
                    borderColor: '#CA8A04',
                    borderRadius: '4px',
                    color: '#F5E6D3',
                    fontFamily: 'Spectral',
                    boxShadow: '0 4px 16px rgba(202, 138, 4, 0.3)',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Collected']}
                />
                <Area type="monotone" dataKey="collected" stroke="#CA8A04" strokeWidth={2.5} fillOpacity={1} fill="url(#questGoldGradient)" name="Collected" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tab 2: Cohort Yield Bar Chart */}
        {activeChartTab === 'batches' && (
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batchWiseData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#BFA98A" fontSize={12} tickLine={false} fontFamily="Spectral" />
                <YAxis stroke="#BFA98A" fontSize={12} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} fontFamily="Spectral" />
                <Tooltip
                  contentStyle={{
                    background: '#2C1A10',
                    borderColor: '#CA8A04',
                    borderRadius: '4px',
                    color: '#F5E6D3',
                    fontFamily: 'Spectral',
                    boxShadow: '0 4px 16px rgba(202, 138, 4, 0.3)',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                />
                <Bar dataKey="collected" fill="#CA8A04" radius={[2, 2, 0, 0]} name="Collected" />
                <Bar dataKey="pending" fill="#991B1B" radius={[2, 2, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tab 3: Status Breakdown */}
        {activeChartTab === 'status' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, gap: 48, flexWrap: 'wrap' }}>
            <div style={{ width: 190, height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {feeStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#1A0F0A" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#2C1A10',
                      borderColor: '#CA8A04',
                      borderRadius: '4px',
                      color: '#F5E6D3',
                      fontFamily: 'Spectral',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {feeStatusData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.95rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '2px', background: item.color, border: '1px solid #5C3D2E' }} />
                  <span style={{ width: 90, color: 'var(--text-2)', fontFamily: 'Cinzel', fontSize: '0.8rem', letterSpacing: '0.05em' }}>{item.name}:</span>
                  <span style={{ fontWeight: 700, color: '#F5E6D3' }}>{item.value} Records</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2-Column Quest Focus Section: Overdue Follow-ups & Recent Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Left Column: Overdue Follow-ups */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Overdue Tributes</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Scholars requiring fee collection summons</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>

          {overdueList.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={26} style={{ color: '#22C55E' }} />
              <p>Hark! All scholars have settled their dues in full.</p>
            </div>
          ) : (
            <div className="overdue-list">
              {overdueList.map(item => (
                <div key={item.student?.id} className="overdue-item">
                  <div>
                    <div
                      style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F5E6D3', cursor: 'pointer' }}
                      onClick={() => navigate(`/students/${item.student?.id}`)}
                    >
                      {item.student?.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>
                      {item.batch?.name} • <span style={{ color: '#F87171', fontWeight: 600 }}>{item.daysOverdue}d overdue</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, color: '#F87171', fontSize: '1rem', fontFamily: 'Cinzel' }}>
                      {formatCurrency(item.totalDue)}
                    </span>
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={() => {
                        setSelectedStudentForPayment(item.student?.id);
                        setPaymentModalOpen(true);
                      }}
                    >
                      Collect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Tributes</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Latest payments inscribed in the rolls</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/payments')}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="empty-state">
              <p>No payments recorded in this ledger yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentPayments.map(p => {
                const s = state.students.find(stu => stu.id === p.studentId);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--surface-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      transition: 'all var(--transition)',
                    }}
                  >
                    <div>
                      <div
                        style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F5E6D3', cursor: 'pointer' }}
                        onClick={() => navigate(`/students/${p.studentId}`)}
                      >
                        {s?.name || 'Unknown Scholar'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>
                        {p.receiptNumber} • {formatDateLong(p.paymentDate)} • <span className="badge badge-accent" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>{p.method}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 700, color: '#CA8A04', fontSize: '1.05rem', fontFamily: 'Cinzel' }}>
                        {formatCurrency(p.amount)}
                      </span>
                      <button
                        className="btn btn-ghost btn-icon-sm"
                        title="View Scroll / Receipt"
                        onClick={() => setReceiptPayment(p)}
                      >
                        <Receipt size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Global Modals for Dashboard */}
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
