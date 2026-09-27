import React, { useState, useEffect } from 'react';
import { Menu, LogOut, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { healthService } from '../../services/healthService';
import { executionService } from '../../services/executionService';
import Button from '../common/Button';
import { StatusDot } from '../common/StatusDot';

const Topbar = ({ title = 'Dashboard', onToggleSidebar }) => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState(null);
  const [executionConfig, setExecutionConfig] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      const data = await healthService.getHealth();
      if (mounted) {
        setHealth(data);
        setLoadingHealth(false);
      }
    };

    const fetchExecutionConfig = async () => {
      try {
        const config = await executionService.getConfig();
        if (mounted) setExecutionConfig(config || null);
      } catch {
        if (mounted) setExecutionConfig(null);
      }
    };

    fetchHealth();
    fetchExecutionConfig();
    window.addEventListener('execution-config-updated', fetchExecutionConfig);
    const interval = setInterval(() => {
      if (!document.hidden) fetchHealth();
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('execution-config-updated', fetchExecutionConfig);
    };
  }, []);

  const services = health?.data?.services;
  const isHealthy = services?.api === 'operational' && services?.database === 'healthy';
  const isUnavailable = health?.status === 'error' || !services;
  const statusLabel = loadingHealth
    ? 'Checking'
    : isUnavailable
      ? 'Unavailable'
      : isHealthy
        ? 'Healthy'
        : 'Needs attention';
  const mode = ['PAPER', 'TESTNET'].includes(executionConfig?.mode) ? executionConfig.mode : null;
  const modeDescription = mode === 'PAPER'
    ? 'Virtual simulation'
    : mode === 'TESTNET'
      ? executionConfig.enabled && services?.testnetExecution === 'ready' ? 'Testnet execution ready' : 'Testnet execution disabled'
      : 'Execution mode unavailable';
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <div className={`system-status-indicator ${isUnavailable ? 'is-unavailable' : isHealthy ? 'is-healthy' : 'is-warning'}`} title={`API: ${services?.api || 'Unavailable'} · Database: ${services?.database || 'Unavailable'} · Monitoring: ${services?.monitoring || 'Unavailable'}`}>
          <StatusDot
            status={isUnavailable ? 'idle' : isHealthy ? 'active' : 'warning'}
            showLabel={false}
            pulse={false}
          />
          <span>{statusLabel}</span>
        </div>

        <div className="environment-indicator" title={`${modeDescription}. Mainnet execution is blocked.`}>
          <span className="environment-icon"><ShieldCheck size={15} /></span>
          <span className="environment-copy">
            <span className="environment-label">MODE</span>
            <strong>{mode || 'Unavailable'}</strong>
          </span>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          aria-pressed={theme === 'dark'}
          title={`Current theme: ${theme}. Switch to ${theme === 'light' ? 'dark' : 'light'}.`}
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>

        <Button
          variant="secondary"
          onClick={logout}
          icon={<LogOut size={16} />}
          className="topbar-signout"
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
};

export default Topbar;
