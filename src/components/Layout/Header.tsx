import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, Bell } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface HeaderProps {
  onQuickPayment?: () => void;
}

export default function Header({ onQuickPayment }: HeaderProps) {
  const { state } = useStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; rollNumber: string; batch: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const lower = query.toLowerCase();
    const matches = state.students
      .filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.rollNumber.toLowerCase().includes(lower) ||
        s.phone.includes(query)
      )
      .slice(0, 5)
      .map(s => {
        const batch = state.batches.find(b => b.id === s.batchId);
        return {
          id: s.id,
          name: s.name,
          rollNumber: s.rollNumber,
          batch: batch?.name || 'No Batch',
        };
      });

    setSearchResults(matches);
    setShowDropdown(matches.length > 0);
  };

  const handleSelectStudent = (id: string) => {
    setSearchTerm('');
    setShowDropdown(false);
    navigate(`/students/${id}`);
  };

  // Overdue count
  const overdueCount = state.feeRecords.filter(r => r.status !== 'Paid' && r.status !== 'Waived' && new Date(r.dueDate) < new Date()).length;

  return (
    <header className="app-header">
      <div style={{ position: 'relative' }}>
        <div className="header-search">
          <Search size={16} style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Quick search student, roll no..."
            value={searchTerm}
            onChange={handleSearch}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
        </div>

        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '320px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow)',
            zIndex: 100,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
              Matching Students
            </div>
            {searchResults.map(s => (
              <div
                key={s.id}
                onClick={() => handleSelectStudent(s.id)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{s.rollNumber} • {s.batch}</div>
                </div>
                <span className="badge badge-accent">View</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {overdueCount > 0 && (
          <div
            onClick={() => navigate('/reports')}
            title={`${overdueCount} overdue fee records`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: '99px',
              background: 'var(--danger-dim)',
              color: 'var(--danger)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Bell size={14} />
            <span>{overdueCount} Overdue</span>
          </div>
        )}

        {onQuickPayment && (
          <button className="btn btn-primary btn-sm" onClick={onQuickPayment}>
            <PlusCircle size={15} />
            <span>Record Payment</span>
          </button>
        )}
      </div>
    </header>
  );
}
