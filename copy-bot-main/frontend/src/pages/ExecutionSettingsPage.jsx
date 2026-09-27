import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Save,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Layers,
  Terminal,
  Activity,
  Lock
} from 'lucide-react';
import { executionService } from '../services/executionService';
import { useToast } from '../hooks/useToast';
import Badge from '../components/common/Badge';
import { SkeletonTable } from '../components/common/Skeleton';

const ExecutionSettingsPage = () => {
  const { success, error: toastError } = useToast();
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [networksData, setNetworksData] = useState([]);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [isTestnetModalOpen, setIsTestnetModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    mode: 'PAPER',
    enabled: false,
    allowedNetworks: ['sepolia', 'base-sepolia'],
    maxExecutionAmount: 100,
    maxDailyExecutionAmount: 500,
    maxGasCostGwei: 50,
    maxSlippageBps: 100
  });

  const [dryRunAmount, setDryRunAmount] = useState(50);
  const [dryRunNetwork, setDryRunNetwork] = useState('sepolia');
  const [dryRunResult, setDryRunResult] = useState(null);
  const [evaluatingDryRun, setEvaluatingDryRun] = useState(false);

  const [records, setRecords] = useState([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPages, setRecordsPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNetwork, setFilterNetwork] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchConfigAndNetworks = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const [configData, netData] = await Promise.all([
        executionService.getConfig(),
        executionService.getNetworks()
      ]);

      if (configData) {
        setConfig(configData);
        setFormData({
          mode: configData.mode || 'PAPER',
          enabled: Boolean(configData.enabled),
          allowedNetworks: configData.allowedNetworks || ['sepolia', 'base-sepolia'],
          maxExecutionAmount: configData.maxExecutionAmount ?? 100,
          maxDailyExecutionAmount: configData.maxDailyExecutionAmount ?? 500,
          maxGasCostGwei: configData.maxGasCostGwei ?? 50,
          maxSlippageBps: configData.maxSlippageBps ?? 100
        });
      }

      if (netData?.networks) setNetworksData(netData.networks);
      setNetworkStatus(netData || null);
    } catch (err) {
      if (!err.isRateLimitCooldown) toastError(err.response?.data?.message || 'Failed to load execution settings');
    } finally {
      setLoadingConfig(false);
    }
  }, [toastError]);

  const fetchRecords = useCallback(async (page = 1, status = '', network = '') => {
    setLoadingRecords(true);
    try {
      const filters = {};
      if (status) filters.status = status;
      if (network) filters.network = network;

      const result = await executionService.getRecords(filters, page, 10);
      setRecords(result?.data || []);
      setRecordsTotal(result?.pagination?.total || 0);
      setRecordsPage(result?.pagination?.page || 1);
      setRecordsPages(result?.pagination?.pages || 1);
    } catch (err) {
      if (!err.isRateLimitCooldown) toastError(err.response?.data?.message || 'Failed to fetch execution records');
    } finally {
      setLoadingRecords(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchConfigAndNetworks();
    fetchRecords(1, filterStatus, filterNetwork);
  }, [fetchConfigAndNetworks, fetchRecords, filterStatus, filterNetwork]);

  const handleSave = async (updatedFields = {}) => {
    setSaving(true);
    try {
      const payload = { ...formData, ...updatedFields };
      const updated = await executionService.updateConfig(payload);
      setConfig(updated);
      window.dispatchEvent(new Event('execution-config-updated'));
      setFormData({
        mode: updated.mode,
        enabled: Boolean(updated.enabled),
        allowedNetworks: updated.allowedNetworks,
        maxExecutionAmount: updated.maxExecutionAmount,
        maxDailyExecutionAmount: updated.maxDailyExecutionAmount,
        maxGasCostGwei: updated.maxGasCostGwei,
        maxSlippageBps: updated.maxSlippageBps
      });
      success('Execution configuration updated successfully');
    } catch (err) {
      if (!err.isRateLimitCooldown) toastError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = (newMode) => {
    if (newMode === 'TESTNET') {
      setIsTestnetModalOpen(true);
    } else {
      setFormData((previous) => ({ ...previous, mode: 'PAPER' }));
      handleSave({ mode: 'PAPER' });
    }
  };

  const confirmSwitchToTestnet = () => {
    setFormData((previous) => ({ ...previous, mode: 'TESTNET', enabled: true }));
    handleSave({ mode: 'TESTNET', enabled: true });
    setIsTestnetModalOpen(false);
  };

  const toggleNetwork = (networkId) => {
    setFormData((previous) => {
      const exists = previous.allowedNetworks.includes(networkId);
      const allowedNetworks = exists
        ? previous.allowedNetworks.filter((network) => network !== networkId)
        : [...previous.allowedNetworks, networkId];
      return { ...previous, allowedNetworks };
    });
  };

  const runSafetyDryRun = async () => {
    setEvaluatingDryRun(true);
    setDryRunResult(null);
    try {
      const result = await executionService.validateDryRun({
        proposedAmount: Number(dryRunAmount),
        network: dryRunNetwork
      });
      setDryRunResult(result);
    } catch (err) {
      if (!err.isRateLimitCooldown) toastError(err.response?.data?.message || 'Safety evaluation dry-run failed');
    } finally {
      setEvaluatingDryRun(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="active">Confirmed</Badge>;
      case 'SUBMITTED':
      case 'CONFIRMING':
        return <Badge variant="info">{status}</Badge>;
      case 'BUILDING':
      case 'VALIDATED':
        return <Badge variant="warning">{status}</Badge>;
      case 'REJECTED':
      case 'FAILED':
        return <Badge variant="danger">{status === 'FAILED' ? 'Failed' : 'Rejected'}</Badge>;
      default:
        return <Badge variant="neutral">{status || 'Unknown'}</Badge>;
    }
  };

  const isGlobalBlocked = Boolean(
    config?.killSwitchActive
    || networkStatus?.globalKillSwitch
    || config?.globalTestnetEnabled === false
    || networkStatus?.testnetEnabled === false
  );
  const hasSigner = networkStatus?.hasExecutionSigner;
  const allowedNetworkNames = (formData.allowedNetworks || []).map((networkId) => (
    networksData.find((network) => network.id === networkId)?.name || networkId
  ));
  const testnetStatus = loadingConfig
    ? 'Loading'
    : !config || !networkStatus
      ? 'Unavailable'
      : isGlobalBlocked && formData.mode === 'TESTNET' && formData.enabled
        ? 'Blocked'
        : formData.mode !== 'TESTNET' || !formData.enabled
          ? 'Disabled'
          : hasSigner
            ? 'Ready'
            : 'Signer unavailable';
  const modeLabel = !config ? 'Unavailable' : formData.mode === 'TESTNET' ? 'Testnet' : 'Paper';
  const statusClass = testnetStatus === 'Ready' ? 'is-active' : testnetStatus === 'Blocked' || testnetStatus === 'Signer unavailable' ? 'is-warning' : 'is-neutral';

  return (
    <div className="controls-page execution-controls-page">
      <header className="controls-page-heading">
        <div>
          <p className="controls-eyebrow">CONTROLS / EXECUTION</p>
          <h2>Testnet execution</h2>
          <p>Configure and validate approved test-network transactions.</p>
        </div>
        <button type="button" onClick={() => { fetchConfigAndNetworks(); fetchRecords(1, filterStatus, filterNetwork); }} className="controls-refresh" disabled={loadingConfig || loadingRecords}>
          <RefreshCw size={14} className={loadingConfig || loadingRecords ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <section className="controls-summary" aria-labelledby="execution-summary-title">
        <div className="controls-summary-heading">
          <div>
            <h3 id="execution-summary-title">Execution state</h3>
            <p>Current mode and testnet readiness.</p>
          </div>
          <span className={`controls-state ${statusClass}`}>{testnetStatus}</span>
        </div>
        <dl className="controls-summary-rows">
          <div><dt>Current mode</dt><dd>{modeLabel}</dd></div>
          <div><dt>Testnet execution</dt><dd>{!config ? 'Unavailable' : formData.mode === 'TESTNET' && formData.enabled ? isGlobalBlocked ? 'Blocked by global safety control' : hasSigner ? 'Enabled' : 'Enabled · signer unavailable' : 'Disabled'}</dd></div>
          <div><dt>Allowed testnets</dt><dd>{allowedNetworkNames.length > 0 ? allowedNetworkNames.join(', ') : 'None configured'}</dd></div>
          <div><dt>Safety</dt><dd>{config?.mainnetStatus === 'BLOCKED' || networkStatus?.mainnetStatus === 'BLOCKED' ? 'Mainnet execution blocked' : 'Status unavailable'}</dd></div>
        </dl>
        <div className="controls-summary-footer">
          <span>{formData.allowedNetworks.length} allowed testnet{formData.allowedNetworks.length === 1 ? '' : 's'} · {hasSigner === true ? 'Server signer configured' : hasSigner === false ? 'Server signer unavailable' : 'Signer status unavailable'}</span>
        </div>
      </section>

      <details className="controls-disclosure">
        <summary>
          <span>Execution configuration</span>
          <span>Mode, networks, limits, and allowlists</span>
        </summary>
        <div className="controls-disclosure-content">
          <section className="controls-detail-section">
            <div className="controls-detail-heading">
              <div><h3>Execution mode</h3><p>Switching to testnet requires explicit confirmation.</p></div>
            </div>
            <div className="controls-mode-options" role="group" aria-label="Execution mode">
              <button type="button" className={`controls-mode-option ${formData.mode === 'PAPER' ? 'is-selected' : ''}`} onClick={() => handleModeChange('PAPER')} disabled={saving}>
                <span><ShieldCheck size={16} /> Paper simulation</span>
                <small>Virtual execution only; no transaction broadcast.</small>
              </button>
              <button type="button" className={`controls-mode-option ${formData.mode === 'TESTNET' ? 'is-selected' : ''}`} onClick={() => handleModeChange('TESTNET')} disabled={saving}>
                <span><Zap size={16} /> Testnet broadcast</span>
                <small>Approved test networks only; mainnet remains blocked.</small>
              </button>
            </div>

            {formData.mode === 'TESTNET' && (
              <div className="controls-testnet-toggle">
                <div><strong>Testnet execution</strong><span>Pause or resume testnet transaction broadcasting.</span></div>
                <button type="button" role="switch" aria-checked={formData.enabled} aria-label="Testnet execution enabled" onClick={() => setFormData((previous) => ({ ...previous, enabled: !previous.enabled }))} className={`controls-switch ${formData.enabled ? 'is-on' : ''}`}>
                  <span />
                </button>
              </div>
            )}
          </section>

          <section className="controls-detail-section">
            <div className="controls-detail-heading"><div><h3>Execution limits</h3><p>Applied to each testnet execution and rolling daily spend.</p></div></div>
            <div className="controls-input-grid">
              <label className="controls-field"><span>Maximum per execution</span><div><input type="number" min="1" max="5000" value={formData.maxExecutionAmount} onChange={(event) => setFormData({ ...formData, maxExecutionAmount: Number(event.target.value) })} /><small>USD / testnet tokens</small></div></label>
              <label className="controls-field"><span>Maximum daily amount</span><div><input type="number" min="1" max="20000" value={formData.maxDailyExecutionAmount} onChange={(event) => setFormData({ ...formData, maxDailyExecutionAmount: Number(event.target.value) })} /><small>24-hour budget · spent ${Number(config?.dailySpent || 0).toLocaleString()}</small></div></label>
              <label className="controls-field"><span>Maximum gas ceiling</span><div><input type="number" min="1" max="1000" value={formData.maxGasCostGwei} onChange={(event) => setFormData({ ...formData, maxGasCostGwei: Number(event.target.value) })} /><small>Gwei</small></div></label>
              <label className="controls-field"><span>Maximum slippage</span><div><input type="number" min="10" max="500" value={formData.maxSlippageBps} onChange={(event) => setFormData({ ...formData, maxSlippageBps: Number(event.target.value) })} /><small>{formData.maxSlippageBps / 100}% · basis points</small></div></label>
            </div>
          </section>

          <section className="controls-detail-section">
            <div className="controls-detail-heading"><div><h3>Allowed testnets</h3><p>Only approved testnet networks can be selected.</p></div></div>
            <div className="controls-network-list">
              {networksData.map((network) => {
                const selected = formData.allowedNetworks.includes(network.id);
                return (
                  <label className="controls-network-row" key={network.id}>
                    <input type="checkbox" checked={selected} onChange={() => toggleNetwork(network.id)} />
                    <span><strong>{network.name}</strong><small>Chain {network.chainId} · {network.currencySymbol || 'ETH'}</small></span>
                    <span className="controls-network-protocols">{(network.protocols || []).join(', ') || 'Approved'}</span>
                  </label>
                );
              })}
              {!loadingConfig && networksData.length === 0 && <p className="controls-inline-unavailable">Approved network data is unavailable.</p>}
            </div>
          </section>

          <details className="controls-nested-disclosure">
            <summary><span>Router and token registry</span><span>{networksData.length} networks</span></summary>
            <div className="controls-registry-list">
              {networksData.map((network) => (
                <article className="controls-registry-row" key={network.id}>
                  <div className="controls-detail-heading"><div><h4>{network.name}</h4><p>Chain {network.chainId} · {(network.protocols || []).join(', ') || 'Approved protocol'}</p></div></div>
                  <div className="controls-registry-address"><span>Router</span><code title={typeof network.uniswapV2Router === 'string' ? network.uniswapV2Router : undefined}>{typeof network.uniswapV2Router === 'string' ? network.uniswapV2Router : Array.isArray(network.uniswapV2Router) ? network.uniswapV2Router.join(', ') : 'Not listed'}</code></div>
                  <div className="controls-token-list"><span>Verified tokens</span><div>{(network.tokens || []).map((token, index) => <span className="controls-token" key={token.symbol || index}>{token.symbol}</span>)}</div></div>
                </article>
              ))}
            </div>
          </details>

          <div className="controls-form-actions">
            <button type="button" className="controls-primary-button" onClick={() => handleSave()} disabled={saving || loadingConfig}>
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving configuration' : 'Save execution settings'}
            </button>
          </div>
        </div>
      </details>

      <details className="controls-disclosure">
        <summary>
          <span>Pre-execution safety check</span>
          <span>Validate a hypothetical testnet transaction</span>
        </summary>
        <div className="controls-disclosure-content">
          <div className="controls-detail-heading"><div><h3><Terminal size={16} /> Safety gate validation</h3><p>Runs the existing dry-run endpoint. No transaction is submitted.</p></div></div>
          <div className="controls-dry-run-form">
            <label className="controls-field"><span>Proposed amount</span><div><input type="number" min="0.001" value={dryRunAmount} onChange={(event) => setDryRunAmount(event.target.value)} /><small>Testnet tokens / USD</small></div></label>
            <label className="controls-field"><span>Target network</span><select value={dryRunNetwork} onChange={(event) => setDryRunNetwork(event.target.value)}>
              {networksData.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}
              <option value="ethereum">Ethereum mainnet (safety rejection test only)</option>
            </select></label>
            <button type="button" className="controls-secondary-button" onClick={runSafetyDryRun} disabled={evaluatingDryRun || loadingConfig}>
              {evaluatingDryRun ? <RefreshCw size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {evaluatingDryRun ? 'Validating' : 'Validate configuration'}
            </button>
          </div>
          {dryRunResult && (
            <div className={`controls-dry-run-result ${dryRunResult.allowed ? 'is-allowed' : 'is-blocked'}`} role="status">
              <div className="controls-dry-run-result-heading">
                <strong>{dryRunResult.allowed ? 'Checks passed' : 'Execution blocked'}</strong>
                <span>{dryRunResult.reason || (dryRunResult.allowed ? 'All checks passed' : (dryRunResult.reasons || []).join(', '))}</span>
              </div>
              <dl>
                {(dryRunResult.checkDetails || []).map((check, index) => (
                  <div key={`${check.name}-${index}`}><dt>{check.name.replaceAll('_', ' ')}</dt><dd className={check.status === 'PASS' ? 'is-pass' : 'is-fail'}>{check.status}</dd><span>{check.detail}</span></div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </details>

      <details className="controls-disclosure">
        <summary>
          <span>Execution history</span>
          <span>{loadingRecords ? 'Loading' : `${recordsTotal.toLocaleString()} records`}</span>
        </summary>
        <div className="controls-disclosure-content controls-records-content">
          <div className="controls-history-toolbar">
            <div><h3><Activity size={16} /> Testnet execution records</h3><p>Paginated execution status and receipt history.</p></div>
            <div className="controls-history-filters">
              <label><span className="sr-only">Filter by status</span><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="">All statuses</option><option value="CONFIRMED">Confirmed</option><option value="SUBMITTED">Submitted</option><option value="REJECTED">Rejected</option><option value="FAILED">Failed</option>
              </select></label>
              <label><span className="sr-only">Filter by network</span><select value={filterNetwork} onChange={(event) => setFilterNetwork(event.target.value)}>
                <option value="">All networks</option>{networksData.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}
              </select></label>
              <button type="button" className="controls-icon-button" onClick={() => fetchRecords(1, filterStatus, filterNetwork)} disabled={loadingRecords} aria-label="Refresh execution history"><RefreshCw size={15} /></button>
            </div>
          </div>

          {loadingRecords ? <SkeletonTable rows={4} cols={5} /> : records.length === 0 ? (
            <p className="controls-empty-state">No testnet execution records found.</p>
          ) : (
            <div className="controls-table-wrap">
              <table className="controls-table">
                <thead><tr><th>Status</th><th>Network</th><th>Transaction</th><th>Gas</th><th>Created</th><th><span className="sr-only">Details</span></th></tr></thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id || record.id}>
                      <td>{getStatusBadge(record.status)}</td>
                      <td><strong>{record.network}</strong><small>{record.executionMode}</small></td>
                      <td>{record.transactionHash ? <a href={record.explorerUrl || '#'} target="_blank" rel="noopener noreferrer" className="controls-transaction-link">{record.transactionHash.slice(0, 10)}...{record.transactionHash.slice(-6)} <ExternalLink size={12} /></a> : 'Not submitted'}<small>{record.protocol || 'Protocol unavailable'}</small></td>
                      <td>{record.gasUsed ? `${record.gasUsed.toLocaleString()} units` : '—'}</td>
                      <td>{record.createdAt ? new Date(record.createdAt).toLocaleString() : '—'}</td>
                      <td><button type="button" className="controls-text-button" onClick={() => setSelectedRecord(record)}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {records.length > 0 && <div className="controls-pagination"><span>Page {recordsPage} of {recordsPages} · {recordsTotal} total</span><div><button type="button" className="controls-secondary-button" disabled={recordsPage <= 1} onClick={() => fetchRecords(recordsPage - 1, filterStatus, filterNetwork)}>Previous</button><button type="button" className="controls-secondary-button" disabled={recordsPage >= recordsPages} onClick={() => fetchRecords(recordsPage + 1, filterStatus, filterNetwork)}>Next</button></div></div>}
        </div>
      </details>

      <aside className="controls-safety-note"><Lock size={15} /><span>Pre-signing checks and verified-token allowlists run before each testnet transaction.</span></aside>

      {selectedRecord && (
        <div className="controls-modal-backdrop" role="presentation" onClick={() => setSelectedRecord(null)}>
          <section className="controls-record-modal" role="dialog" aria-modal="true" aria-labelledby="record-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="controls-detail-heading"><div><h3 id="record-detail-title">Execution record</h3><p>{selectedRecord.status} · {selectedRecord.network}</p></div><button type="button" className="controls-icon-button" onClick={() => setSelectedRecord(null)} aria-label="Close execution record details">×</button></div>
            <dl className="controls-record-details">
              <div><dt>Mode</dt><dd>{selectedRecord.executionMode}</dd></div>
              <div><dt>Chain ID</dt><dd>{selectedRecord.chainId ?? '—'}</dd></div>
              <div><dt>Protocol</dt><dd>{selectedRecord.protocol || '—'}</dd></div>
              <div><dt>Token pair</dt><dd>{selectedRecord.tokenIn?.symbol || 'IN'} → {selectedRecord.tokenOut?.symbol || 'OUT'}</dd></div>
              <div><dt>Nonce</dt><dd>{selectedRecord.nonce ?? '—'}</dd></div>
              <div><dt>Gas used</dt><dd>{selectedRecord.gasUsed?.toLocaleString() || '—'}</dd></div>
              <div><dt>Transaction</dt><dd>{selectedRecord.transactionHash || 'Not submitted'}</dd></div>
              <div><dt>Created</dt><dd>{selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString() : '—'}</dd></div>
            </dl>
          </section>
        </div>
      )}

      {isTestnetModalOpen && (
        <div className="controls-modal-backdrop" role="presentation" onClick={() => setIsTestnetModalOpen(false)}>
          <section className="controls-record-modal controls-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="enable-testnet-title" onClick={(event) => event.stopPropagation()}>
            <div className="controls-detail-heading"><div><h3 id="enable-testnet-title"><AlertTriangle size={17} /> Enable testnet execution?</h3><p>Confirm before enabling transaction broadcasts.</p></div></div>
            <div className="controls-confirm-copy"><p>Transactions are restricted to approved testnets: Sepolia, Base Sepolia, and Polygon Amoy.</p><p>No mainnet networks or real funds are available. Pre-execution safety checks remain mandatory.</p></div>
            <div className="controls-modal-actions"><button type="button" className="controls-secondary-button" onClick={() => setIsTestnetModalOpen(false)}>Cancel</button><button type="button" className="controls-primary-button" onClick={confirmSwitchToTestnet} disabled={saving}>{saving ? 'Saving' : 'Confirm and enable'}</button></div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ExecutionSettingsPage;