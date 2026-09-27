import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';

export default function LoginPage() {
  const { login, state } = useStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(username, password);
    if (ok) {
      toast.success('Welcome back to EduTrack!');
      navigate('/dashboard');
    } else {
      toast.error('Invalid credentials. Default is admin / admin123');
    }
  };

  const handleFillDemo = () => {
    setUsername(state.settings.adminUsername);
    setPassword(state.settings.adminPassword);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">
            <GraduationCap size={28} color="var(--text-dark)" />
          </div>
          <div>
            <div className="login-title">{state.settings.instituteName}</div>
            <div className="login-sub">Fee Tracking & Management</div>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ paddingLeft: '38px' }}
              />
              <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '38px' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
            <span>Sign In to Dashboard</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleFillDemo}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            Quick Fill Demo Admin ({state.settings.adminUsername} / {state.settings.adminPassword})
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.75rem', color: 'var(--text-3)' }}>
          Secure local session • All fee records encrypted & preserved locally
        </div>
      </div>
    </div>
  );
}
