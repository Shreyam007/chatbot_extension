import React, { useState, useEffect } from 'react';
import {
  Radar,
  Layers,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  Lock,
  Zap,
  Info,
  Code2,
  Terminal
} from 'lucide-react';
import { APP_NAME, DEFAULT_AI_MODEL } from '../shared/config';
import { sendToBackground } from '../shared/messaging';
import { requestSitePermission } from '../shared/permissions';
import type { OnboardingState } from '../shared/schemas/onboarding';

interface OnboardingWizardProps {
  onComplete?: () => void;
  isStandalone?: boolean;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  isStandalone = false,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [enabledSites, setEnabledSites] = useState<string[]>(['leetcode.com', 'codeforces.com']);
  const [allowOtherSites, setAllowOtherSites] = useState(false);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [supportedModels, setSupportedModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted onboarding state on mount
  useEffect(() => {
    async function loadState() {
      try {
        const res = await sendToBackground<{ type: string; state: OnboardingState }>({
          type: 'GET_ONBOARDING',
        });
        if (res?.state) {
          setCurrentStep(res.state.currentStep || 1);
          setTrackingEnabled(res.state.trackingEnabled || false);
          setApiKey(res.state.apiKey || '');
          setEnabledSites(res.state.enabledSites || ['leetcode.com', 'codeforces.com']);
          if (res.state.testStatus === 'success') {
            setTestStatus('success');
            setLatencyMs(res.state.detectedLatencyMs || 142);
          }
        }
      } catch {
        // Fallback to chrome.storage directly if available
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const stored = await chrome.storage.local.get(['onboarding_state', 'apiKey']);
          if (stored.onboarding_state) {
            setCurrentStep(stored.onboarding_state.currentStep || 1);
            setTrackingEnabled(stored.onboarding_state.trackingEnabled || false);
            setEnabledSites(stored.onboarding_state.enabledSites || ['leetcode.com', 'codeforces.com']);
          }
          if (stored.apiKey) {
            setApiKey(stored.apiKey);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadState();
  }, []);

  // Persist state updates
  const persistState = async (updates: Partial<OnboardingState>) => {
    try {
      await sendToBackground({
        type: 'SAVE_ONBOARDING',
        updates,
      });
    } catch {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get(['onboarding_state']);
        await chrome.storage.local.set({
          onboarding_state: { ...(stored.onboarding_state || {}), ...updates },
        });
      }
    }
  };

  const handleToggleTracking = (enabled: boolean) => {
    setTrackingEnabled(enabled);
    persistState({ trackingEnabled: enabled });
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setErrorMessage('Please enter an API key to test.');
      return;
    }

    setTestStatus('testing');
    setErrorMessage(undefined);

    try {
      const res = await sendToBackground<{
        type: string;
        success: boolean;
        latencyMs?: number;
        supportedModels?: string[];
        error?: string;
      }>({
        type: 'TEST_API_KEY',
        apiKey: apiKey.trim(),
        model: DEFAULT_AI_MODEL,
      });

      if (res.success) {
        setTestStatus('success');
        setLatencyMs(res.latencyMs ?? 0);
        setSupportedModels(res.supportedModels || []);
        persistState({
          apiKey: apiKey.trim(),
          testStatus: 'success',
          detectedLatencyMs: res.latencyMs,
        });
      } else {
        setTestStatus('error');
        setErrorMessage(res.error || 'API key rejected. Please verify permissions.');
        persistState({ testStatus: 'error' });
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to test connection.');
    }
  };

  const handleToggleSite = (domain: string) => {
    const updated = enabledSites.includes(domain)
      ? enabledSites.filter((s) => s !== domain)
      : [...enabledSites, domain];
    setEnabledSites(updated);
    persistState({ enabledSites: updated });
  };

  const handleToggleOtherSites = async () => {
    if (!allowOtherSites) {
      const granted = await requestSitePermission('https://*/*');
      if (granted) {
        setAllowOtherSites(true);
      }
    } else {
      setAllowOtherSites(false);
    }
  };

  const handleFinish = async () => {
    await persistState({
      completed: true,
      currentStep: 3,
      trackingEnabled,
      apiKey: apiKey.trim(),
      enabledSites,
    });
    if (onComplete) {
      onComplete();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-on-surface-variant font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-primary" />
        Loading Unstuck setup...
      </div>
    );
  }

  return (
    <div
      data-testid="onboarding-wizard-container"
      className={`w-full ${
        isStandalone ? 'max-w-[480px] mx-auto min-h-screen md:min-h-0 md:my-8' : 'w-full'
      } bg-surface text-on-surface border border-outline-variant/40 rounded-xl shadow-2xl flex flex-col overflow-hidden font-sans`}
    >
      {/* Top Header */}
      <header className="bg-surface border-b border-outline-variant/30 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-surface-container flex items-center justify-center text-primary-container border border-outline-variant/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 19c2.5-4 5-9 8-9s3 6 6 3 2-7 2-7" />
              <path d="M4 12c1.5-1 4-1 6 1s4 4 6 2l4-4" strokeOpacity="0.5" />
            </svg>
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight text-primary">
            {APP_NAME}
          </span>
          <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-xs text-on-surface-variant">
            Step {currentStep} of 3
          </span>
        </div>
      </header>

      {/* Main Step Canvas */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* STEP 1: S01 Welcome & Stuck-Detection Consent */}
        {currentStep === 1 && (
          <div data-testid="onboarding-step-1" className="space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] uppercase tracking-wider">
                <Terminal className="w-3 h-3" />
                AI Engineering Co-Pilot
              </div>
              <h1 className="text-xl font-bold font-mono tracking-tight text-on-surface">
                Stuck? I'll notice.
              </h1>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {APP_NAME} gives you hints, not answers, right when you need them.
              </p>
            </div>

            {/* Benefit Rows */}
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center shrink-0 text-secondary border border-outline-variant/40 mt-0.5">
                  <Radar className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xs font-semibold font-mono text-on-surface">Spots when you're stuck</h2>
                  <p className="text-[11px] text-on-surface-variant leading-tight">
                    Detects long idle pauses, debug loop churn, and repeated failed test runs.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center shrink-0 text-tertiary border border-outline-variant/40 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xs font-semibold font-mono text-on-surface">Graded hints: direction first, answer last</h2>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-primary-container">
                    <span className="bg-surface-container-high px-1 py-0.5 rounded text-on-surface">L1 Direction</span>
                    <span className="text-on-surface-variant">→</span>
                    <span className="bg-surface-container-high px-1 py-0.5 rounded text-on-surface">L2 Approach</span>
                    <span className="text-on-surface-variant">→</span>
                    <span className="bg-surface-container-high px-1 py-0.5 rounded text-on-surface">L3 Code</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-tight">
                    Preserves your cognitive flow and problem-solving agency.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center shrink-0 text-primary border border-outline-variant/40 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xs font-semibold font-mono text-on-surface">Your browsing stays on your device</h2>
                  <p className="text-[11px] text-on-surface-variant leading-tight">
                    Zero background tracking, telemetry stays local.
                  </p>
                </div>
              </div>
            </div>

            {/* Sandboxed Privacy Card */}
            <div className="rounded-lg bg-surface-container-low border border-outline-variant/30 p-3 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-mono text-xs font-semibold text-on-surface">Privacy architecture</span>
                </div>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                  SANDBOXED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-surface-container/60 p-2 rounded border border-outline-variant/20 space-y-1">
                  <span className="font-mono text-[10px] text-secondary font-medium block">What I watch</span>
                  <ul className="space-y-0.5 text-on-surface-variant">
                    <li className="flex items-center gap-1">
                      <span className="text-primary font-bold">•</span> Active time on problem
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="text-primary font-bold">•</span> Scroll & friction loops
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="text-primary font-bold">•</span> Failed test runs
                    </li>
                  </ul>
                </div>

                <div className="bg-surface-container/60 p-2 rounded border border-outline-variant/20 space-y-1">
                  <span className="font-mono text-[10px] text-tertiary font-medium block">What I never do</span>
                  <ul className="space-y-0.5 text-on-surface-variant">
                    <li className="flex items-center gap-1">
                      <span className="text-error font-bold">×</span> Record your screen
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="text-error font-bold">×</span> Read tabs or cookies
                    </li>
                    <li className="flex items-center gap-1">
                      <span className="text-error font-bold">×</span> Store browsing history
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-2 rounded bg-surface-container-high/60 border-l-2 border-secondary text-[11px] text-on-surface-variant flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                <p>Only the problem text (and your code if you allow) is sent to the AI to write a hint.</p>
              </div>
            </div>

            {/* Opt-in Consent Switch */}
            <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-on-surface">Allow stuck-detection</span>
                  <span
                    data-testid="toggle-badge"
                    className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                      trackingEnabled
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-tertiary/20 text-tertiary border-tertiary/40'
                    }`}
                  >
                    {trackingEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-tight">
                  Background telemetry looks for coding friction while you solve. Default off.
                </p>
              </div>

              <button
                data-testid="consent-toggle-button"
                type="button"
                role="switch"
                aria-checked={trackingEnabled}
                onClick={() => handleToggleTracking(!trackingEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-surface ${
                  trackingEnabled ? 'bg-primary-container' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                    trackingEnabled ? 'translate-x-5 bg-surface-container-lowest' : 'translate-x-0 bg-on-surface-variant'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: S02a Connect Your AI (BYOK) */}
        {currentStep === 2 && (
          <div data-testid="onboarding-step-2" className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold font-mono tracking-tight text-on-surface">
                Connect your AI
              </h1>
              <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-outline" />
                <span>Your Gemini API key stays on this device only — never sent to our servers.</span>
              </p>
            </div>

            {/* API Key Form Card */}
            <div className="p-3.5 rounded-lg bg-surface-container border border-outline-variant/30 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="gemini-api-key" className="font-mono font-medium text-on-surface flex items-center gap-1">
                    <span>Gemini API key</span>
                    <span className="text-tertiary">*</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Where do I get a key?</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-outline">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="gemini-api-key"
                    data-testid="api-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (testStatus !== 'idle') setTestStatus('idle');
                    }}
                    onBlur={() => {
                      if (apiKey.trim()) persistState({ apiKey: apiKey.trim() });
                    }}
                    placeholder="Paste AIzaSy... key"
                    className="w-full pl-8 pr-9 py-2 bg-transparent text-xs font-mono text-on-surface placeholder:text-outline/60 focus:outline-none"
                  />
                  <button
                    data-testid="toggle-key-visibility"
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-outline hover:text-on-surface transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Button: Test connection */}
              <button
                data-testid="test-connection-button"
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === 'testing'}
                className="w-full py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-mono text-xs flex items-center justify-center gap-2 border border-outline-variant/40 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
                    <span>Testing connection...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>Test connection</span>
                    <kbd className="ml-1 text-[9px] font-mono bg-surface-container-lowest px-1.5 py-0.5 rounded border border-outline-variant/40 text-outline">
                      Cmd+T
                    </kbd>
                  </>
                )}
              </button>

              {/* Dynamic State Feedback */}
              {testStatus === 'idle' && (
                <div data-testid="status-idle" className="p-2 rounded bg-surface-container-lowest text-[11px] text-outline border border-outline-variant/20 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-outline" />
                  <span>Key entered. Click <strong>Test connection</strong> to authenticate.</span>
                </div>
              )}

              {testStatus === 'testing' && (
                <div data-testid="status-testing" className="p-2.5 rounded bg-surface-container-lowest border border-secondary/30 space-y-0.5 text-xs">
                  <p className="font-mono text-secondary flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking connection with Gemini 2.5 Flash...
                  </p>
                  <p className="text-[10px] text-outline pl-4">Handshaking with Google AI API gateway</p>
                </div>
              )}

              {testStatus === 'success' && (
                <div data-testid="status-success" className="p-2.5 rounded bg-primary/10 border border-primary/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-primary font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Connected — Gemini Flash & Pro ready
                    </span>
                    {latencyMs && <span className="font-mono text-[10px] text-primary">{latencyMs}ms</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary">
                    {(supportedModels.length > 0 ? supportedModels : ['models/gemini-2.5-flash', 'models/gemini-1.5-flash']).map((m) => (
                      <span key={m} className="px-1.5 py-0.5 rounded bg-surface-container-lowest border border-primary/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {testStatus === 'error' && (
                <div data-testid="status-error" className="p-2.5 rounded bg-error-container/20 border border-error/40 space-y-1 text-xs">
                  <div className="font-mono text-error font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-error" />
                    Key rejected. Check it and try again.
                  </div>
                  {errorMessage && (
                    <p className="text-[11px] text-on-surface-variant font-mono pl-5">
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Reassurance Micro-Card */}
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20 flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <div className="text-[11px]">
                <strong className="text-on-surface block font-mono">Zero Data Retention</strong>
                <span className="text-outline">Stored in chrome.storage.local. Never synced or shared.</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: S02b Where Should I Help? */}
        {currentStep === 3 && (
          <div data-testid="onboarding-step-3" className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold font-mono tracking-tight text-on-surface">
                Where should I help?
              </h1>
              <p className="text-xs text-on-surface-variant">
                Choose the platforms where {APP_NAME} automatically observes pauses and stuck moments.
              </p>
            </div>

            {/* Platform Selection Cards */}
            <div className="space-y-2">
              {/* LeetCode */}
              <div className="p-3 bg-surface-container rounded-lg border border-outline-variant/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center shrink-0 text-[#FFA116] border border-outline-variant/40 mt-0.5">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold font-mono text-on-surface">LeetCode</h2>
                      <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-primary/10 text-primary border border-primary/30">
                        Auto-Track
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      <span className="font-mono text-secondary">leetcode.com/problems/*</span> — watches timer, attempts, test cases.
                    </p>
                  </div>
                </div>

                <button
                  data-testid="toggle-leetcode"
                  type="button"
                  role="switch"
                  aria-checked={enabledSites.includes('leetcode.com')}
                  onClick={() => handleToggleSite('leetcode.com')}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 ${
                    enabledSites.includes('leetcode.com') ? 'bg-primary-container' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                      enabledSites.includes('leetcode.com') ? 'translate-x-5 bg-surface-container-lowest' : 'translate-x-0 bg-on-surface-variant'
                    }`}
                  />
                </button>
              </div>

              {/* Codeforces */}
              <div className="p-3 bg-surface-container rounded-lg border border-outline-variant/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center shrink-0 text-[#1890FF] border border-outline-variant/40 mt-0.5">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold font-mono text-on-surface">Codeforces</h2>
                      <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-primary/10 text-primary border border-primary/30">
                        Auto-Track
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      <span className="font-mono text-secondary">codeforces.com/contest/*</span> — detects verdict delays & test failures.
                    </p>
                  </div>
                </div>

                <button
                  data-testid="toggle-codeforces"
                  type="button"
                  role="switch"
                  aria-checked={enabledSites.includes('codeforces.com')}
                  onClick={() => handleToggleSite('codeforces.com')}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 ${
                    enabledSites.includes('codeforces.com') ? 'bg-primary-container' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                      enabledSites.includes('codeforces.com') ? 'translate-x-5 bg-surface-container-lowest' : 'translate-x-0 bg-on-surface-variant'
                    }`}
                  />
                </button>
              </div>

              {/* Optional On-Demand Sites */}
              <div className="p-3 bg-surface-container rounded-lg border border-outline-variant/30 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center shrink-0 text-outline border border-outline-variant/40 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-semibold font-mono text-on-surface">Any other site I ask for</h2>
                    <p className="text-[11px] text-on-surface-variant">
                      On-demand permission prompt whenever you summon {APP_NAME} on documentation portals.
                    </p>
                  </div>
                </div>

                <button
                  data-testid="toggle-other-sites"
                  type="button"
                  role="switch"
                  aria-checked={allowOtherSites}
                  onClick={handleToggleOtherSites}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 ${
                    allowOtherSites ? 'bg-primary-container' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                      allowOtherSites ? 'translate-x-5 bg-surface-container-lowest' : 'translate-x-0 bg-on-surface-variant'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Hint Escalation Preview */}
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-outline uppercase tracking-wider">Hint Escalation Model</span>
                <span className="font-mono text-primary">Pre-armed</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                <div className="p-1 rounded bg-surface-container text-on-surface border border-outline-variant/20 truncate">L1 Direction</div>
                <div className="p-1 rounded bg-surface-container text-on-surface border border-outline-variant/20 truncate">L2 Approach</div>
                <div className="p-1 rounded bg-surface-container text-on-surface border border-outline-variant/20 truncate">L3 Pseudocode</div>
                <div className="p-1 rounded bg-surface-container text-outline border border-outline-variant/10 truncate">L4 Solution</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Navigation Dock */}
      <footer className="p-3 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center justify-between shrink-0">
        {currentStep > 1 ? (
          <button
            data-testid="onboarding-back-button"
            type="button"
            onClick={() => {
              const prev = (currentStep - 1) as 1 | 2;
              setCurrentStep(prev);
              persistState({ currentStep: prev });
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-mono text-outline hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        ) : (
          <button
            data-testid="onboarding-skip-button"
            type="button"
            onClick={() => {
              handleToggleTracking(false);
              setCurrentStep(2);
              persistState({ currentStep: 2, trackingEnabled: false });
            }}
            className="text-[11px] text-on-surface-variant hover:text-on-surface underline underline-offset-4 decoration-outline-variant"
          >
            Use as normal chatbot only
          </button>
        )}

        {/* Step indicator dots */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full transition-all ${currentStep === 1 ? 'w-4 bg-primary-container' : 'bg-outline-variant/40'}`} />
          <span className={`w-2 h-2 rounded-full transition-all ${currentStep === 2 ? 'w-4 bg-primary-container' : 'bg-outline-variant/40'}`} />
          <span className={`w-2 h-2 rounded-full transition-all ${currentStep === 3 ? 'w-4 bg-primary-container' : 'bg-outline-variant/40'}`} />
        </div>

        {/* Next / Continue / Finish action */}
        {currentStep === 1 && (
          <button
            data-testid="onboarding-continue-button"
            type="button"
            onClick={() => {
              setCurrentStep(2);
              persistState({ currentStep: 2, trackingEnabled });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container hover:bg-surface-tint text-on-primary-container font-mono text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {currentStep === 2 && (
          <button
            data-testid="onboarding-next-button"
            type="button"
            disabled={testStatus !== 'success'}
            onClick={() => {
              setCurrentStep(3);
              persistState({ currentStep: 3, apiKey: apiKey.trim() });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container hover:bg-surface-tint text-on-primary-container font-mono text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {currentStep === 3 && (
          <button
            data-testid="onboarding-finish-button"
            type="button"
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-mono text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Finish</span>
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
      </footer>
    </div>
  );
};
