import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  Sliders,
  Wallet,
  Radio,
  Settings,
  Shield,
  Layers,
  Cpu,
  Server,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../common/Badge';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navGroups = [
    { label: 'OVERVIEW', items: [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
    { label: 'MONITORING', items: [
      { path: '/traders', label: 'Tracked Traders', icon: Users },
      { path: '/activity', label: 'Activity Explorer', icon: Activity },
      { path: '/monitoring', label: 'Monitoring Engine', icon: Radio },
    ] },
    { label: 'AUTOMATION', items: [
      { path: '/copy-rules', label: 'Copy Rules', icon: Sliders },
      { path: '/copy-trading', label: 'Copy Engine', icon: Cpu },
    ] },
    { label: 'CONTROLS', items: [
      { path: '/risk-management', label: 'Risk Controls', icon: Shield },
      { path: '/execution', label: 'Testnet Execution', icon: Layers },
      { path: '/paper-trading', label: 'Paper Trading', icon: Wallet },
    ] },
    { label: 'OPERATIONS', items: [{ path: '/operations', label: 'System Operations', icon: Server }] },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sidebar-logo-icon">
            <Layers size={21} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sidebar-logo-text">CryptoCopy</span>
            <span className="sidebar-subtitle">ON-CHAIN INTELLIGENCE</span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar navigation"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div className="sidebar-nav-group" key={group.label}>
            <div className="sidebar-group-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
        <div className="sidebar-nav-group sidebar-account-group">
          <div className="sidebar-group-label">ACCOUNT</div>
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings size={17} aria-hidden="true" />
            <span>Settings &amp; Security</span>
          </NavLink>
        </div>
      </nav>

      {/* Sidebar Footer User Info */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar-circle">
            {(user?.profile?.displayName || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.profile?.displayName || user?.email?.split('@')[0]}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Badge variant={user?.role === 'ADMIN' ? 'admin' : 'user'}>
                {user?.role || 'USER'}
              </Badge>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Account</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
