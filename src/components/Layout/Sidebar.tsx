import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, CreditCard,
  FileText, BarChart2, Settings, LogOut, GraduationCap,
  Sun, Moon,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/batches',   icon: BookOpen,         label: 'Batches' },
  { to: '/students',  icon: Users,            label: 'Students' },
  { to: '/payments',  icon: CreditCard,       label: 'Payments' },
  { to: '/ledger',    icon: FileText,         label: 'Fee Ledger' },
  { to: '/reports',   icon: BarChart2,        label: 'Reports' },
];

export default function Sidebar() {
  const { state, logout } = useStore();
  const navigate = useNavigate();

  const [isLight, setIsLight] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLight) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <GraduationCap size={20} color="var(--text-dark)" />
        </div>
        <div>
          <div className="logo-text">{state.settings.instituteName}</div>
          <div className="logo-sub">Fee Management</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} className="nav-icon" />
            {label}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>System</div>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Settings size={16} className="nav-icon" />
          Settings
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={() => setIsLight(v => !v)}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {isLight ? <Sun size={13} /> : <Moon size={13} />}
            {isLight ? 'Light Mode' : 'Dark Mode'}
          </span>
          <div className={`theme-toggle-track${isLight ? ' on' : ''}`}>
            <div className="theme-toggle-thumb" />
          </div>
        </button>

        <div className="sidebar-user" onClick={handleLogout} title="Logout">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <div className="user-name">Admin</div>
            <div className="user-role">Click to logout</div>
          </div>
          <LogOut size={14} style={{ color: 'var(--text-3)', marginLeft: 'auto' }} />
        </div>
      </div>
    </aside>
  );
}
