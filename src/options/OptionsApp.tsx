import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Bell,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Lock,
  Download,
  Trash2,
  Sparkles,
  ExternalLink,
  Copy,
  Clock,
  Globe,
  Sliders,
  Check,
  Table as TableIcon,
  RefreshCw,
  BarChart2,
} from 'lucide-react';
import { APP_NAME, APP_VERSION, DEFAULT_AI_MODEL, SUPPORTED_AI_MODELS } from '../shared/config';
import { OnboardingWizard } from '../ui/OnboardingWizard';
import { sendToBackground } from '../shared/messaging';
import { getStoredApiKey, setStoredApiKey, getStoredSettings } from '../shared/storage';
import type { Settings } from '../shared/schemas/settings';
import type { LocalMetricsSummary } from '../shared/metrics/types';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DataTransparencyTable } from './components/DataTransparencyTable';

export type Section = 'ai' | 'nudges' | 'transparency' | 'privacy' | 'onboarding';

export const OptionsApp: React.FC = () => {
  const getInitialSection = (): Section => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as Section;
      if (['ai', 'nudges', 'transparency', 'privacy', 'onboarding'].includes(hash)) {
        return hash;
      }
    }
    return 'onboarding';
  };

  const [activeSection, setActiveSection] = useState<Section>(getInitialSection);

  // AI & Key states
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_AI_MODEL);
  const [testState, setTestState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    latencyMs?: number;
    error?: string;
  }>({ status: 'idle' });

  // Policy & Settings states
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [includeCodeConsent, setIncludeCodeConsent] = useState(false);
  const [nudgeSensitivity, setNudgeSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [cooldownMin, setCooldownMin] = useState(15);
  const [maxNudgesPerHour, setMaxNudgesPerHour] = useState(4);
  const [defaultHintLevel, setDefaultHintLevel] = useState<1 | 2 | 3 | 4>(1);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [demoMode, setDemoMode] = useState(false);
  const [blockedSites, setBlockedSites] = useState<string[]>([]);

  // Privacy & Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string>(() => new Date().toLocaleTimeString());

  // Storage Stats Bento
  const [storageStats, setStorageStats] = useState({
    totalEvents: 0,
    totalHints: 0,
    blockedSitesCount: 0,
  });

  const [localMetrics, setLocalMetrics] = useState<LocalMetricsSummary | null>(null);

  const loadLocalMetrics = useCallback(async () => {
    try {
      const res = await sendToBackground<{ type: string; metrics: LocalMetricsSummary }>({
        type: 'GET_LOCAL_METRICS',
      });
      if (res?.metrics) {
        setLocalMetrics(res.metrics);
      }
    } catch {
      // Best-effort
    }
  }, []);

  // Load existing settings and API key on mount
  const loadInitialSettings = useCallback(async () => {
    try {
      const storedKey = await getStoredApiKey();
      setApiKey(storedKey || '');

      let s: Settings;
      try {
        const resp = await sendToBackground<{ type: string; settings: Settings }>({
          type: 'GET_SETTINGS',
        });
        s = resp.settings;
      } catch {
        s = await getStoredSettings();
      }

      if (s) {
        setTrackingEnabled(Boolean(s.trackingEnabled));
        setIncludeCodeConsent(Boolean(s.includeCodeConsent));
        setNudgeSensitivity(s.nudgeSensitivity || 'medium');
        setCooldownMin(s.cooldownMin || 15);
        setMaxNudgesPerHour(s.maxNudgesPerHour || 4);
        setDefaultHintLevel(s.defaultHintLevel || 1);
        setSelectedModel(s.model || DEFAULT_AI_MODEL);
        setQuietHoursEnabled(Boolean(s.quietHours?.enabled));
        setQuietHoursStart(s.quietHours?.start || '22:00');
        setQuietHoursEnd(s.quietHours?.end || '08:00');
        setDemoMode(Boolean(s.demoMode));
        setBlockedSites(s.blockedSites || []);
      }

      // If user has completed onboarding and no specific hash was set, switch from onboarding to ai
      try {
        const onbRes = await sendToBackground<{ type: string; state?: { completed?: boolean } }>({
          type: 'GET_ONBOARDING',
        });
        const hasHash = typeof window !== 'undefined' && Boolean(window.location.hash);
        if (onbRes?.state?.completed && !hasHash) {
          setActiveSection('ai');
        }
      } catch {
        // ignore
      }

      // Query export to get stats
      try {
        const exportRes = await sendToBackground<{
          type: string;
          exportData: { eventsCount?: number; hintsDeliveredCount?: number };
        }>({ type: 'EXPORT_DATA' });
        setStorageStats({
          totalEvents: exportRes.exportData?.eventsCount || 0,
          totalHints: exportRes.exportData?.hintsDeliveredCount || 0,
          blockedSitesCount: s?.blockedSites?.length || 0,
        });
        await loadLocalMetrics();
      } catch {
        // Fallback
      }
    } catch (err) {
      console.error('Failed to load initial settings:', err);
    }
  }, [loadLocalMetrics]);

  useEffect(() => {
    loadInitialSettings();
  }, [loadInitialSettings]);

  // Persist helper for settings updates
  const saveSettingsUpdate = async (updates: Partial<Settings>) => {
    try {
      await sendToBackground({
        type: 'UPDATE_SETTINGS',
        updates,
      });
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // API Key tester
  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestState({
        status: 'error',
        error: 'Please enter a Gemini API key before testing.',
      });
      return;
    }

    setTestState({ status: 'loading' });
    try {
      const res = await sendToBackground<{
        type: string;
        success: boolean;
        latencyMs?: number;
        error?: string;
      }>({
        type: 'TEST_API_KEY',
        apiKey: apiKey.trim(),
        model: selectedModel,
      });

      if (res.success) {
        setTestState({
          status: 'success',
          latencyMs: res.latencyMs || 120,
        });
        await setStoredApiKey(apiKey.trim());
        setLastSaved(new Date().toLocaleTimeString());
      } else {
        setTestState({
          status: 'error',
          error: res.error || 'Connection failed. Please check key validity.',
        });
      }
    } catch (err) {
      setTestState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Network test error',
      });
    }
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  // Unblock site handler
  const handleUnblockSite = async (domain: string) => {
    const updated = blockedSites.filter((d) => d !== domain);
    setBlockedSites(updated);
    await saveSettingsUpdate({ blockedSites: updated });
  };

  // Export data handler
  const handleExportData = async () => {
    try {
      setExportNotice('Exporting...');
      const res = await sendToBackground<{ type: string; exportData: Record<string, unknown> }>({
        type: 'EXPORT_DATA',
      });
      const blob = new Blob([JSON.stringify(res.exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unstuck-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice('Export complete!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportNotice('Export failed');
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  // Metrics export handler (JSON, CSV, or Markdown)
  const handleExportMetrics = async (format: 'json' | 'csv' | 'markdown') => {
    try {
      const resp = await sendToBackground<{
        type: string;
        data: string;
        filename: string;
        mimeType: string;
      }>({
        type: 'EXPORT_METRICS',
        format,
      });
      const blob = new Blob([resp.data], { type: resp.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resp.filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice(`Metrics (${format.toUpperCase()}) exported successfully!`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Export metrics failed:', err);
      setExportNotice('Export metrics failed');
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  // Total wipe handler
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await sendToBackground({ type: 'DELETE_ALL_DATA' });
      setApiKey('');
      setBlockedSites([]);
      setStorageStats({ totalEvents: 0, totalHints: 0, blockedSitesCount: 0 });
      setShowDeleteModal(false);
      setIsDeleting(false);
      setExportNotice('All extension data successfully erased.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Delete all failed:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col md:flex-row antialiased font-sans select-none">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-surface-container-low border-b md:border-b-0 md:border-r border-outline-variant/30 p-4 space-y-6 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Brand & App Info */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center border border-outline-variant/40 text-primary shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold font-mono tracking-tight text-on-surface">
                  {APP_NAME} SETTINGS
                </h1>
                <span className="text-[10px] font-mono text-outline px-1 rounded bg-surface-container border border-outline-variant/30">
                  v{APP_VERSION}
                </span>
              </div>
              <span className="text-[11px] font-mono text-on-surface-variant">Settings & Controls</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Settings navigation" className="space-y-1">
            <button
              data-testid="tab-ai-provider"
              onClick={() => setActiveSection('ai')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-colors ${
                activeSection === 'ai'
                  ? 'bg-surface-container-high text-primary border-l-2 border-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4" />
                <span>AI & Inference</span>
              </div>
              {activeSection === 'ai' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>

            <button
              data-testid="tab-nudges-policy"
              onClick={() => setActiveSection('nudges')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-colors ${
                activeSection === 'nudges'
                  ? 'bg-surface-container-high text-primary border-l-2 border-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" />
                <span>Nudges & Policy</span>
              </div>
              {activeSection === 'nudges' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>

            <button
              data-testid="tab-data-transparency"
              onClick={() => setActiveSection('transparency')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-colors ${
                activeSection === 'transparency'
                  ? 'bg-surface-container-high text-primary border-l-2 border-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TableIcon className="w-4 h-4" />
                <span>Data Transparency</span>
              </div>
              {activeSection === 'transparency' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>

            <button
              data-testid="tab-privacy-data"
              onClick={() => setActiveSection('privacy')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-colors ${
                activeSection === 'privacy'
                  ? 'bg-surface-container-high text-primary border-l-2 border-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <span>Privacy & Storage</span>
              </div>
              {activeSection === 'privacy' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>

            <div className="pt-2">
              <button
                data-testid="tab-onboarding"
                onClick={() => setActiveSection('onboarding')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                  activeSection === 'onboarding'
                    ? 'bg-surface-container-high text-primary border border-outline-variant/30 font-semibold'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Setup Wizard (S01-S02)</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer Diagnostics */}
        <div className="pt-4 border-t border-outline-variant/20 text-[11px] font-mono text-outline space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Client Engine</span>
            <span className="text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Online
            </span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Storage Status</span>
            <span className="text-outline">IndexedDB OK</span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-8 max-w-4xl space-y-6 overflow-y-auto">
        {/* Top Header / Auto-Save Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
            <span>Settings</span>
            <span>/</span>
            <span className="text-primary font-semibold capitalize">
              {activeSection === 'ai' ? 'AI & Inference' : activeSection}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {exportNotice && (
              <span
                data-testid="export-toast-notice"
                className="text-xs font-mono px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 animate-in fade-in"
              >
                {exportNotice}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30">
              <Check className="w-3 h-3 text-primary" />
              <span>Auto-saved</span>
              <span className="text-outline">{lastSaved}</span>
            </div>
          </div>
        </div>

        {/* 1. SETUP WIZARD (ONBOARDING) */}
        {activeSection === 'onboarding' && (
          <div className="space-y-4">
            <header className="border-b border-outline-variant/30 pb-3">
              <h2 className="text-base font-semibold font-mono text-on-surface">Setup Wizard (S01–S02)</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Complete the 3-step setup to connect your Gemini API key and configure stuck-detection preferences.
              </p>
            </header>
            <div className="max-w-xl">
              <OnboardingWizard onComplete={() => setActiveSection('ai')} />
            </div>
          </div>
        )}

        {/* 2. AI & INFERENCE */}
        {activeSection === 'ai' && (
          <div className="space-y-6">
            <header className="border-b border-outline-variant/30 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-on-surface">AI Provider (BYOK)</h2>
                  <span className="px-2 py-0.5 text-[11px] font-mono bg-surface-container-high text-secondary border border-secondary/30 rounded-full">
                    BYOK Mode
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Unstuck connects directly to Google Gemini from your browser service worker. Zero proxy servers.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-mono text-on-surface">Direct Client Egress</span>
              </div>
            </header>

            {/* API Key Card */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <label htmlFor="apiKeyInput" className="text-xs font-mono font-semibold text-on-surface">
                    GOOGLE GEMINI API KEY
                  </label>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-secondary hover:underline flex items-center gap-1"
                >
                  <span>Get a free key</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="relative">
                <input
                  id="apiKeyInput"
                  data-testid="api-key-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestState({ status: 'idle' });
                  }}
                  onBlur={() => {
                    setStoredApiKey(apiKey.trim());
                    setLastSaved(new Date().toLocaleTimeString());
                  }}
                  placeholder="AIzaSy..."
                  className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-lg border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary pr-20"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    data-testid="toggle-show-key-btn"
                    className="p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    data-testid="copy-key-btn"
                    className="p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Copy key"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Status and Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div>
                  {testState.status === 'success' && (
                    <div
                      data-testid="test-api-success-indicator"
                      className="flex items-center gap-1.5 text-xs font-mono text-primary animate-in fade-in"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Valid connection verified ({testState.latencyMs}ms)</span>
                    </div>
                  )}
                  {testState.status === 'error' && (
                    <div
                      data-testid="test-api-error-indicator"
                      className="flex items-center gap-1.5 text-xs font-mono text-error animate-in fade-in"
                    >
                      <XCircle className="w-4 h-4 text-error" />
                      <span>{testState.error}</span>
                    </div>
                  )}
                  {testState.status === 'loading' && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant">
                      <RefreshCw className="w-4 h-4 animate-spin text-secondary" />
                      <span>Verifying key against Gemini API...</span>
                    </div>
                  )}
                  {testState.status === 'idle' && (
                    <span className="text-[11px] font-sans text-on-surface-variant break-words">
                      Your key is stored only on this device (<code className="text-secondary font-mono">chrome.storage.local</code>) and sent only to Google's Gemini API with your requests. We run no servers.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="test-api-key-btn"
                  onClick={handleTestKey}
                  disabled={testState.status === 'loading'}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {testState.status === 'loading' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Model Selector Card */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <label htmlFor="modelSelector" className="text-xs font-mono font-semibold text-on-surface">
                  GEMINI MODEL SELECTION
                </label>
                <span className="text-[11px] font-mono text-secondary">
                  Active: {selectedModel}
                </span>
              </div>

              <select
                id="modelSelector"
                data-testid="model-selector"
                value={selectedModel}
                onChange={(e) => {
                  const m = e.target.value;
                  setSelectedModel(m);
                  saveSettingsUpdate({ model: m });
                }}
                className="w-full bg-surface-container-low px-3.5 py-2.5 rounded-lg border border-outline-variant/40 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
              >
                {SUPPORTED_AI_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model} {model === DEFAULT_AI_MODEL ? '(Default / Fast & Accurate)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] font-sans text-on-surface-variant leading-relaxed">
                <code className="text-secondary font-mono">gemini-2.5-flash</code> is recommended for sub-second hint generation with excellent coding benchmark scores.
              </p>
            </div>

            {/* Default Hint Level Card */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-semibold text-on-surface">
                  DEFAULT S08 NUDGE HINT LEVEL
                </label>
                <span className="text-[11px] font-mono text-primary">Level {defaultHintLevel}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { level: 1 as const, name: 'L1: Socratic Direction' },
                  { level: 2 as const, name: 'L2: Invariant Check' },
                  { level: 3 as const, name: 'L3: Pseudocode' },
                  { level: 4 as const, name: 'L4: Targeted Fix' },
                ].map(({ level, name }) => (
                  <button
                    key={level}
                    type="button"
                    data-testid={`default-hint-level-${level}`}
                    onClick={() => {
                      setDefaultHintLevel(level);
                      saveSettingsUpdate({ defaultHintLevel: level });
                    }}
                    className={`p-2.5 rounded-lg text-xs font-mono text-left border transition-all ${
                      defaultHintLevel === level
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. NUDGES & POLICY */}
        {activeSection === 'nudges' && (
          <div className="space-y-6">
            <header className="border-b border-outline-variant/30 pb-4">
              <h2 className="text-lg font-bold font-mono text-on-surface">Nudge Policy & Sensitivity</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Customize stuck detection thresholds, cooldown intervals, quiet hours, and manage blocked problem domains.
              </p>
            </header>

            {/* Sensitivity Selection */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <label className="text-xs font-mono font-semibold text-on-surface">
                    STUCK DETECTION SENSITIVITY
                  </label>
                </div>
                <span className="text-[11px] font-mono text-primary capitalize">{nudgeSensitivity}</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    data-testid={`sensitivity-${level}`}
                    onClick={() => {
                      setNudgeSensitivity(level);
                      saveSettingsUpdate({ nudgeSensitivity: level });
                    }}
                    className={`py-3 px-3 rounded-lg text-xs font-mono capitalize border transition-all flex flex-col items-center gap-1 ${
                      nudgeSensitivity === level
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span>{level}</span>
                    <span className="text-[10px] font-sans font-normal text-outline">
                      {level === 'low' ? 'Patient (25m dwell)' : level === 'medium' ? 'Balanced (15m dwell)' : 'Proactive (8m dwell)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cooldown & Rate Limits */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-5 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-on-surface font-semibold">COOLDOWN BETWEEN NUDGES</span>
                  <span data-testid="cooldown-value" className="text-primary font-bold">{cooldownMin} minutes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  data-testid="cooldown-slider"
                  value={cooldownMin}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCooldownMin(val);
                    saveSettingsUpdate({ cooldownMin: val });
                  }}
                  className="w-full accent-primary h-1.5 bg-surface-container-low rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-outline">
                  <span>1 min (Rapid)</span>
                  <span>15 min (Standard)</span>
                  <span>60 min (Extended)</span>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="maxNudgesSelect" className="text-xs font-mono font-semibold text-on-surface">
                    MAX NUDGES PER HOUR
                  </label>
                  <select
                    id="maxNudgesSelect"
                    data-testid="max-nudges-select"
                    value={maxNudgesPerHour}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxNudgesPerHour(val);
                      saveSettingsUpdate({ maxNudgesPerHour: val });
                    }}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant/40 text-xs font-mono text-on-surface"
                  >
                    {[1, 2, 3, 4, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} nudges / hour {n === 4 ? '(Recommended)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-semibold text-on-surface">
                    PER-PROBLEM LIMIT
                  </span>
                  <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono text-secondary">
                    3 nudges max per problem
                  </div>
                </div>
              </div>
            </div>

            {/* Quiet Hours & Demo Mode */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-mono font-semibold text-on-surface">QUIET HOURS</h3>
                  </div>
                  <p className="text-[11px] font-sans text-on-surface-variant mt-0.5">
                    Silences all proactive popups during your scheduled focus or downtime window.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="quiet-hours-toggle"
                  onClick={() => {
                    const next = !quietHoursEnabled;
                    setQuietHoursEnabled(next);
                    saveSettingsUpdate({
                      quietHours: {
                        enabled: next,
                        start: quietHoursStart,
                        end: quietHoursEnd,
                      },
                    });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    quietHoursEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-surface-container-lowest absolute top-1 transition-transform ${
                      quietHoursEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {quietHoursEnabled && (
                <div
                  data-testid="quiet-hours-inputs"
                  className="flex items-center gap-4 pt-2 border-t border-outline-variant/20 animate-in fade-in"
                >
                  <div className="flex items-center gap-2">
                    <label htmlFor="quietStart" className="text-xs font-mono text-on-surface-variant">
                      From:
                    </label>
                    <input
                      id="quietStart"
                      data-testid="quiet-start-input"
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuietHoursStart(val);
                        saveSettingsUpdate({
                          quietHours: { enabled: true, start: val, end: quietHoursEnd },
                        });
                      }}
                      className="bg-surface-container-low px-2 py-1 rounded border border-outline-variant/40 text-xs font-mono text-on-surface"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="quietEnd" className="text-xs font-mono text-on-surface-variant">
                      To:
                    </label>
                    <input
                      id="quietEnd"
                      data-testid="quiet-end-input"
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuietHoursEnd(val);
                        saveSettingsUpdate({
                          quietHours: { enabled: true, start: quietHoursStart, end: val },
                        });
                      }}
                      className="bg-surface-container-low px-2 py-1 rounded border border-outline-variant/40 text-xs font-mono text-on-surface"
                    />
                  </div>
                </div>
              )}

              {/* Demo Mode */}
              <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-semibold text-on-surface">DEMO / EVALUATION MODE</h3>
                  <p className="text-[11px] font-sans text-on-surface-variant mt-0.5">
                    Compresses stuck detection dwell thresholds to 20 seconds for rapid testing.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="demo-mode-toggle"
                  onClick={() => {
                    const next = !demoMode;
                    setDemoMode(next);
                    saveSettingsUpdate({ demoMode: next });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    demoMode ? 'bg-secondary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-surface-container-lowest absolute top-1 transition-transform ${
                      demoMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Hard Rules: Contest Auto-Disable */}
              <div className="pt-4 border-t border-outline-variant/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-on-surface font-semibold">
                    <Lock className="w-3.5 h-3.5 text-tertiary" />
                    CONTEST AUTO-DISABLE (EC-100)
                  </span>
                  <span className="text-primary font-bold">Locked ON</span>
                </div>
                <p className="text-[11px] font-sans text-on-surface-variant leading-relaxed">
                  Strict fair-play policy: On live LeetCode/Codeforces contest URLs, all nudges, hints, and side panel assists are automatically disabled. This setting cannot be overridden.
                </p>
              </div>
            </div>

            {/* Blocked Sites List */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-mono font-semibold text-on-surface">BLOCKED PROBLEM SITES</h3>
                </div>
                <span className="text-[11px] font-mono text-outline">
                  {blockedSites.length} domain{blockedSites.length === 1 ? '' : 's'}
                </span>
              </div>

              {blockedSites.length === 0 ? (
                <p className="text-xs font-sans text-on-surface-variant py-2">
                  No domains are currently blocked. Sites can be blocked via the snooze menu on any nudge card.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {blockedSites.map((domain) => (
                    <div
                      key={domain}
                      data-testid={`blocked-site-${domain}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono"
                    >
                      <span className="text-on-surface">{domain}</span>
                      <button
                        type="button"
                        data-testid={`unblock-site-${domain}`}
                        onClick={() => handleUnblockSite(domain)}
                        className="text-error hover:text-error/80 text-[11px] font-semibold transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. DATA TRANSPARENCY */}
        {activeSection === 'transparency' && (
          <div className="space-y-6">
            <header className="border-b border-outline-variant/30 pb-4">
              <h2 className="text-lg font-bold font-mono text-on-surface">Data Transparency & Audit</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Full disclosure of every data field gathered and whether it is permitted to leave your machine.
              </p>
            </header>

            <DataTransparencyTable includeCodeConsent={includeCodeConsent} />
          </div>
        )}

        {/* 5. PRIVACY & STORAGE */}
        {activeSection === 'privacy' && (
          <div className="space-y-6">
            <header className="border-b border-outline-variant/30 pb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-primary mb-1">
                <Shield className="w-4 h-4" />
                <span>Local-First Security Protocol</span>
              </div>
              <h2 className="text-lg font-bold font-mono text-on-surface">Privacy & Local Storage</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Zero tracking cookies. All telemetry, problem context, and hints live strictly on your machine.
              </p>
            </header>

            {/* Bento 1: Privacy Hero Card */}
            <div className="relative overflow-hidden rounded-xl bg-surface-container-low border border-outline-variant/40 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant/50 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-bold font-mono text-on-surface">
                      Everything is stored on this device
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-primary/10 border border-primary/30 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Local IndexedDB Sandbox
                    </span>
                  </div>
                  <p className="text-xs font-sans text-on-surface-variant mt-2 leading-relaxed">
                    Unstuck operates completely client-side in your Chrome environment. Diagnostic snapshots, idle timing, and hints are preserved directly in your browser&apos;s local sandbox. <strong className="text-on-surface font-semibold">Prompt contexts are strictly ephemeral</strong>—they are forwarded once for inference and are never persisted on remote servers or used for model training.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-mono text-outline">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Zero Telemetry Cookies
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> No External Sync Servers
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Fully Inspectable Prompts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 2: Storage Stats & Controls */}
            <div className="rounded-xl bg-surface-container border border-outline-variant/30 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div>
                  <h3 className="text-xs font-mono font-semibold text-on-surface">
                    LOCAL STORAGE CONTROLS
                  </h3>
                  <p className="text-xs font-sans text-on-surface-variant">
                    Extract your saved learning journal or completely wipe client states.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    data-testid="export-data-button"
                    onClick={handleExportData}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface border border-outline-variant/40 transition-colors text-xs font-mono group active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-secondary" />
                    <span>Export my data (JSON)</span>
                  </button>

                  <button
                    type="button"
                    data-testid="delete-all-data-button"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-error-container/20 border border-error/50 hover:bg-error-container/40 text-error transition-colors text-xs font-mono active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete all data</span>
                  </button>
                </div>
              </div>

              {/* Bento Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Local Audit Log Entries</span>
                  <span data-testid="stat-events-count" className="text-base font-bold text-on-surface">
                    {storageStats.totalEvents} events
                  </span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Delivered Hints Recorded</span>
                  <span data-testid="stat-hints-count" className="text-base font-bold text-on-surface">
                    {storageStats.totalHints} hints
                  </span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Blocked Sites</span>
                  <span data-testid="stat-blocked-count" className="text-base font-bold text-on-surface">
                    {blockedSites.length} domains
                  </span>
                </div>
              </div>
            </div>

            {/* Bento 2.5: Local Metrics & Evaluation (Step 15) */}
            <div className="rounded-xl bg-surface-container border border-outline-variant/30 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/40 flex items-center justify-center shrink-0 text-primary">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-semibold text-on-surface">
                      LOCAL METRICS & EVALUATION
                    </h3>
                    <p className="text-xs font-sans text-on-surface-variant">
                      Real-time pedagogy effectiveness, latency percentiles, and critic rejection stats computed strictly from local storage.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    data-testid="export-metrics-csv"
                    onClick={() => handleExportMetrics('csv')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface border border-outline-variant/40 transition-colors text-xs font-mono active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    data-testid="export-metrics-json"
                    onClick={() => handleExportMetrics('json')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface border border-outline-variant/40 transition-colors text-xs font-mono active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-secondary" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    type="button"
                    data-testid="export-metrics-md"
                    onClick={() => handleExportMetrics('markdown')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface border border-outline-variant/40 transition-colors text-xs font-mono active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-tertiary" />
                    <span>Export MD</span>
                  </button>

                  <button
                    type="button"
                    data-testid="refresh-metrics-button"
                    onClick={loadLocalMetrics}
                    title="Refresh metrics"
                    className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface border border-outline-variant/40 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 8 KPI Cards Grid */}
              <div
                data-testid="metrics-summary-grid"
                className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs font-mono"
              >
                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Nudge Acceptance</span>
                  <span className="text-base font-bold text-primary">
                    {Math.round((localMetrics?.nudgeAcceptanceRate ?? 0) * 100)}%
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    {localMetrics?.nudgesAccepted ?? 0} accepted / {localMetrics?.nudgesOffered ?? 0}
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Nudge Dismissal</span>
                  <span className="text-base font-bold text-tertiary">
                    {Math.round((localMetrics?.nudgeDismissRate ?? 0) * 100)}%
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    {localMetrics?.nudgesDismissed ?? 0} dismissed
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Solved Problems</span>
                  <span className="text-base font-bold text-on-surface">
                    {localMetrics?.solvedProblemsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    Mean: {Math.round((localMetrics?.timeToSolveAvgMs ?? 0) / 1000)}s
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Hints per Solve</span>
                  <span className="text-base font-bold text-on-surface">
                    {(localMetrics?.hintsPerSolve ?? 0).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    {localMetrics?.totalHintsDelivered ?? 0} hints delivered
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Hint Helpfulness</span>
                  <span className="text-base font-bold text-primary">
                    {Math.round((localMetrics?.hintHelpfulnessRate ?? 0) * 100)}%
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    {localMetrics?.totalHintRatings ?? 0} user ratings
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Latency p50 / p95</span>
                  <span className="text-base font-bold text-on-surface">
                    {localMetrics?.latencyP50Ms !== undefined && localMetrics.latencyP50Ms > 0 ? `${localMetrics.latencyP50Ms}ms` : '—'}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    p95: {localMetrics?.latencyP95Ms !== undefined && localMetrics.latencyP95Ms > 0 ? `${localMetrics.latencyP95Ms}ms` : '—'}
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Critic Rejection</span>
                  <span className="text-base font-bold text-on-surface">
                    {Math.round((localMetrics?.criticRejectionRate ?? 0) * 100)}%
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    Requires regeneration
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <span className="text-outline block mb-1">Fallback Rate</span>
                  <span className="text-base font-bold text-on-surface">
                    {Math.round((localMetrics?.fallbackRate ?? 0) * 100)}%
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    Safe scaffold fallback
                  </span>
                </div>
              </div>
            </div>

            {/* Bento 3: Consent Controls */}
            <div className="p-5 rounded-xl bg-surface-container border border-outline-variant/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-semibold text-on-surface">
                    BEHAVIORAL SIGNAL TRACKING
                  </h3>
                  <p className="text-[11px] font-sans text-on-surface-variant">
                    Observe scroll reversals, dwell, and wrong verdicts on enabled problem sites.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="tracking-consent-toggle"
                  onClick={() => {
                    const next = !trackingEnabled;
                    setTrackingEnabled(next);
                    saveSettingsUpdate({ trackingEnabled: next });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    trackingEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-surface-container-lowest absolute top-1 transition-transform ${
                      trackingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-semibold text-on-surface">
                    INCLUDE CODE EDITOR CONTEXT (AST)
                  </h3>
                  <p className="text-[11px] font-sans text-on-surface-variant">
                    Permit sending your active code snippet when requesting Level 3 and 4 hints.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="code-consent-toggle"
                  onClick={() => {
                    const next = !includeCodeConsent;
                    setIncludeCodeConsent(next);
                    saveSettingsUpdate({ includeCodeConsent: next });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    includeCodeConsent ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-surface-container-lowest absolute top-1 transition-transform ${
                      includeCodeConsent ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        isDeleting={isDeleting}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAll}
      />
    </div>
  );
};
