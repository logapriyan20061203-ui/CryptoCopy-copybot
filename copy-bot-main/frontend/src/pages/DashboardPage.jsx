import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, ShieldAlert, Users } from 'lucide-react';
import { traderService } from '../services/traderService';
import { healthService } from '../services/healthService';
import { useToast } from '../hooks/useToast';
import { Skeleton } from '../components/common/Skeleton';
import { StatusDot } from '../components/common/StatusDot';
import ActivityDetailsModal from '../components/activity/ActivityDetailsModal';

const DashboardPage = () => {
  const { success } = useToast();
  const [traders, setTraders] = useState([]);
  const [traderSummary, setTraderSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [totalActivities, setTotalActivities] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradersUnavailable, setTradersUnavailable] = useState(false);
  const [summaryUnavailable, setSummaryUnavailable] = useState(false);
  const [activitiesUnavailable, setActivitiesUnavailable] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      const results = await Promise.all([
        traderService.getTraderSummary().then((data) => ({ data })).catch(() => ({ unavailable: true })),
        traderService.getTraders({ limit: 5 }).then((data) => ({ data })).catch(() => ({ unavailable: true })),
        traderService.getRecentActivities({ limit: 4 }).then((data) => ({ data })).catch(() => ({ unavailable: true })),
        healthService.getHealth(),
      ]);

      if (!mounted) return;

      const [summaryResult, tradersResult, activityResult, healthData] = results;
      const traderItems = tradersResult.data?.items || tradersResult.data?.traders || tradersResult.data?.data?.items || [];
      const activityItems = activityResult.data?.items || activityResult.data?.activities || activityResult.data?.data?.items || [];
      const activityTotal = activityResult.data?.pagination?.total
        ?? activityResult.data?.data?.pagination?.total
        ?? (activityResult.unavailable ? null : activityItems.length);

      setTraderSummary(summaryResult.unavailable ? null : summaryResult.data);
      setTraders(traderItems);
      setActivities(activityItems);
      setTotalActivities(activityTotal);
      setHealth(healthData);
      setSummaryUnavailable(summaryResult.unavailable);
      setTradersUnavailable(tradersResult.unavailable);
      setActivitiesUnavailable(activityResult.unavailable);
      setLoading(false);
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const services = health?.data?.services;
  const safety = health?.data?.safety;
  const isHealthy = services?.api === 'operational' && services?.database === 'healthy';
  const healthUnavailable = health?.status === 'error' || !services;
  const healthLabel = loading ? 'Checking' : healthUnavailable ? 'Unavailable' : isHealthy ? 'Healthy' : 'Needs attention';
  const monitoringLabel = services?.monitoring
    ? services.monitoring.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())
    : 'Unavailable';
  const traderCount = traderSummary?.total ?? null;
  const activeCount = traderSummary?.active ?? null;
  const pausedCount = traderSummary?.paused ?? null;
  const permittedModes = Array.isArray(safety?.supportedModes) ? safety.supportedModes : [];

  const displayCount = (value) => Number.isFinite(value) ? value.toLocaleString() : '—';
  const formatShortAddress = (address) => {
    if (!address) return 'Address unavailable';
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Time unavailable';
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? 'Time unavailable'
      : `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };
  const handleCopy = (event, text, label) => {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    success(`Copied ${label} to clipboard.`);
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-intro" aria-labelledby="dashboard-overview-title">
        <div>
          <p className="dashboard-eyebrow">WORKSPACE OVERVIEW</p>
          <h2 id="dashboard-overview-title">Current system state</h2>
          <p className="dashboard-intro-copy">Monitoring, activity, and execution context in one place.</p>
        </div>
        <Link to="/traders" className="dashboard-primary-action">
          <Plus size={16} aria-hidden="true" /> Add tracked trader
        </Link>
      </section>

      <section className="dashboard-state-grid" aria-label="System and execution status">
        <article className={`dashboard-state-panel ${healthUnavailable ? 'is-unavailable' : isHealthy ? 'is-healthy' : 'is-warning'}`}>
          <div className="dashboard-panel-label">SYSTEM HEALTH</div>
          <div className="dashboard-health-value">
            <StatusDot status={healthUnavailable ? 'idle' : isHealthy ? 'active' : 'warning'} showLabel={false} pulse={false} />
            <strong>{healthLabel}</strong>
          </div>
          <p>{healthUnavailable ? 'Health status could not be retrieved.' : isHealthy ? 'API and database are operational.' : 'One or more core services need attention.'}</p>
          <details className="dashboard-detail-disclosure">
            <summary>Service details</summary>
            <dl>
              <div><dt>API</dt><dd>{services?.api || 'Unavailable'}</dd></div>
              <div><dt>Database</dt><dd>{services?.database || 'Unavailable'}</dd></div>
              <div><dt>Monitoring</dt><dd>{monitoringLabel}</dd></div>
              <div><dt>Testnet execution</dt><dd>{services?.testnetExecution?.replaceAll('_', ' ') || 'Unavailable'}</dd></div>
              <div><dt>Mainnet execution</dt><dd>Blocked</dd></div>
            </dl>
          </details>
          <Link to="/operations" className="dashboard-text-link">Open operations <ArrowRight size={14} aria-hidden="true" /></Link>
        </article>

        <article className="dashboard-state-panel dashboard-mode-panel">
          <div className="dashboard-panel-label">PERMITTED EXECUTION MODES</div>
          <div className="dashboard-mode-list">
            {permittedModes.length > 0 ? permittedModes.map((mode) => (
              <span key={mode} className="dashboard-mode-item">{mode}</span>
            )) : <span className="dashboard-unavailable">Unavailable</span>}
          </div>
          <p>Mainnet execution is blocked by platform safety controls.</p>
          <Link to="/execution" className="dashboard-text-link">Review execution settings <ArrowRight size={14} aria-hidden="true" /></Link>
        </article>
      </section>

      <section className="dashboard-metrics" aria-label="Key metrics">
        <article className="dashboard-metric">
          <div className="dashboard-metric-label">Tracked traders</div>
          <strong>{loading ? <Skeleton height="30px" width="72px" /> : summaryUnavailable ? '—' : displayCount(traderCount)}</strong>
          <span>{summaryUnavailable ? 'Count unavailable' : Number.isFinite(pausedCount) ? `${displayCount(pausedCount)} paused` : 'Registered public wallets'}</span>
        </article>
        <article className="dashboard-metric">
          <div className="dashboard-metric-label">Active monitors</div>
          <strong>{loading ? <Skeleton height="30px" width="72px" /> : summaryUnavailable ? '—' : displayCount(activeCount)}</strong>
          <span>{healthUnavailable ? 'Monitoring state unavailable' : `Engine ${monitoringLabel.toLowerCase()}`}</span>
        </article>
        <article className="dashboard-metric">
          <div className="dashboard-metric-label">Recorded events</div>
          <strong>{loading ? <Skeleton height="30px" width="72px" /> : displayCount(totalActivities)}</strong>
          <span>{activitiesUnavailable ? 'Activity data unavailable' : 'Read-only on-chain activity'}</span>
        </article>
      </section>

      <section className="dashboard-activity-section" aria-labelledby="dashboard-activity-title">
        <header className="dashboard-section-header">
          <div>
            <p className="dashboard-eyebrow">LATEST</p>
            <h3 id="dashboard-activity-title">Recent activity</h3>
          </div>
          <Link to="/activity" className="dashboard-text-link">View activity <ArrowRight size={14} aria-hidden="true" /></Link>
        </header>

        {loading ? (
          <div className="dashboard-activity-loading" aria-label="Loading recent activity">
            <Skeleton height="44px" />
            <Skeleton height="44px" />
            <Skeleton height="44px" />
          </div>
        ) : activitiesUnavailable ? (
          <p className="dashboard-empty-state">Activity is unavailable right now.</p>
        ) : activities.length === 0 ? (
          <p className="dashboard-empty-state">No recent events detected.</p>
        ) : (
          <div className="dashboard-activity-list">
            {activities.slice(0, 4).map((activity, index) => (
              <button
                key={activity._id || activity.id || activity.transactionHash || `activity-${index}`}
                type="button"
                className="dashboard-activity-row"
                onClick={() => setSelectedActivity(activity)}
                aria-label={`Inspect ${activity.activityType || 'transaction'} ${formatShortAddress(activity.transactionHash)}`}
              >
                <span className="dashboard-activity-kind">{(activity.activityType || 'Transaction').replaceAll('_', ' ')}</span>
                <span className="dashboard-activity-identity">
                  <strong>{formatShortAddress(activity.transactionHash)}</strong>
                  <span>{activity.network || 'Network unavailable'}</span>
                </span>
                <time className="dashboard-activity-time">{formatTimestamp(activity.blockTimestamp || activity.createdAt)}</time>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>

      <details className="dashboard-traders-disclosure">
        <summary>
          <span><Users size={16} aria-hidden="true" /> Tracked trader preview</span>
          <span>{tradersUnavailable ? 'Unavailable' : `${displayCount(traderCount)} total`}</span>
        </summary>
        <div className="dashboard-trader-list">
          {loading ? <Skeleton height="44px" /> : tradersUnavailable ? (
            <p className="dashboard-empty-state">Trader data is unavailable right now.</p>
          ) : traders.length === 0 ? (
            <div className="dashboard-empty-state">
              <p>No traders tracked yet.</p>
              <Link to="/traders" className="dashboard-text-link">Add a trader <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          ) : traders.slice(0, 5).map((trader, index) => {
            const tracking = trader.isTracking !== undefined ? trader.isTracking : trader.trackingEnabled;
            return (
              <div className="dashboard-trader-row" key={trader._id || trader.id || trader.walletAddress || `trader-${index}`}>
                <span className="dashboard-trader-state"><StatusDot status={tracking ? 'active' : 'idle'} showLabel={false} pulse={false} />{tracking ? 'Active' : 'Paused'}</span>
                <span className="dashboard-trader-identity"><strong>{trader.displayName || 'Unnamed trader'}</strong><span>{formatShortAddress(trader.walletAddress)}</span></span>
                <span className="dashboard-trader-network">{trader.network || 'Network unavailable'}</span>
              </div>
            );
          })}
          <Link to="/traders" className="dashboard-text-link dashboard-traders-link">Manage traders <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      </details>

      <aside className="dashboard-safety-note">
        <ShieldAlert size={17} aria-hidden="true" />
        <p><strong>Read-only monitoring.</strong> The platform does not hold private keys; mainnet execution remains blocked.</p>
      </aside>

      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onCopy={handleCopy}
        />
      )}
      <span className="sr-only" aria-live="polite">{healthLabel === 'Needs attention' ? 'System requires attention.' : ''}</span>
    </div>
  );
};

export default DashboardPage;