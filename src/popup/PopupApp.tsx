import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Settings,
  X,
  Play,
  Moon,
  Timer,
  Terminal,
  Lock,
  Shield,
  Info,
  PlusCircle,
  FileText,
  ArrowRight,
  Dock,
} from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../shared/config';
import { sendToBackground } from '../shared/messaging';
import type { PopupVariant } from '../shared/messaging/protocol';

interface PopupState {
  variant: PopupVariant;
  siteDomain: string;
  url: string;
  problemTitle?: string;
  problemUrl?: string;
  isContest: boolean;
  isPaused: boolean;
  isSnoozed: boolean;
  pauseRemainingMs?: number;
  pauseElapsedMs?: number;
  nudgesCount: number;
  acceptedCount: number;
  acceptRate: number;
  hintsUsedCount: number;
  hintsLeftCount: number;
  demoMode?: boolean;
}

const DEFAULT_POPUP_STATE: PopupState = {
  variant: 'unsupported',
  siteDomain: '',
  url: '',
  isContest: false,
  isPaused: false,
  isSnoozed: false,
  nudgesCount: 0,
  acceptedCount: 0,
  acceptRate: 0,
  hintsUsedCount: 0,
  hintsLeftCount: 0,
  demoMode: false,
};

export const PopupApp: React.FC = () => {
  const [state, setState] = useState<PopupState>(DEFAULT_POPUP_STATE);

  const fetchPopupState = useCallback(async () => {
    try {
      const res = await sendToBackground<{ type: 'POPUP_STATE' } & PopupState>({
        type: 'GET_POPUP_STATE',
      });
      if (res && res.variant) {
        setState({
          variant: res.variant,
          siteDomain: res.siteDomain || '',
          url: res.url || '',
          problemTitle: res.problemTitle,
          problemUrl: res.problemUrl,
          isContest: Boolean(res.isContest),
          isPaused: Boolean(res.isPaused),
          isSnoozed: Boolean(res.isSnoozed),
          pauseRemainingMs: res.pauseRemainingMs,
          pauseElapsedMs: res.pauseElapsedMs,
          nudgesCount: res.nudgesCount ?? 0,
          acceptedCount: res.acceptedCount ?? 0,
          acceptRate: res.acceptRate ?? 0,
          hintsUsedCount: res.hintsUsedCount ?? 0,
          hintsLeftCount: res.hintsLeftCount ?? 0,
          demoMode: Boolean(res.demoMode),
        });
      }
    } catch {
      // Keep default state for standalone / test environments
    }
  }, []);

  useEffect(() => {
    fetchPopupState();
    const interval = setInterval(fetchPopupState, 1000);
    return () => clearInterval(interval);
  }, [fetchPopupState]);

  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.sidePanel.open({ tabId: tabs[0].id });
        }
      });
    } else {
      window.open(chrome.runtime?.getURL?.('sidepanel.html') || 'sidepanel.html', '_blank');
    }
  };

  const handleOpenOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime?.getURL?.('options.html') || 'options.html', '_blank');
    }
  };

  const handlePauseOneHour = async () => {
    try {
      await sendToBackground({ type: 'SET_SNOOZE', durationMinutes: 60 });
      fetchPopupState();
    } catch {
      setState((prev) => ({ ...prev, variant: 'paused', isPaused: true, isSnoozed: true }));
    }
  };

  const handleResume = async () => {
    try {
      await sendToBackground({ type: 'SET_PAUSED', paused: false });
      await sendToBackground({ type: 'SET_SNOOZE', durationMinutes: 1 });
      fetchPopupState();
    } catch {
      setState((prev) => ({ ...prev, variant: 'active', isPaused: false, isSnoozed: false }));
    }
  };

  const handlePauseToday = async () => {
    try {
      await sendToBackground({ type: 'SET_SNOOZE', durationMinutes: 1440 });
      fetchPopupState();
    } catch {
      setState((prev) => ({ ...prev, variant: 'paused', isPaused: true, isSnoozed: true }));
    }
  };

  const handleTogglePauseSwitch = async () => {
    if (state.isPaused) {
      await handleResume();
    } else {
      await handlePauseOneHour();
    }
  };

  const renderVariantBadge = () => {
    switch (state.variant) {
      case 'active':
        return (
          <span className="font-mono text-[10px] text-primary flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            ACTIVE
          </span>
        );
      case 'paused':
        return (
          <span className="font-mono text-[10px] text-tertiary flex items-center gap-1.5 px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            PAUSED
          </span>
        );
      case 'unsupported':
        return (
          <span className="font-mono text-[10px] text-outline flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/30">
            <span className="w-1.5 h-1.5 rounded-full bg-outline" />
            INACTIVE
          </span>
        );
      case 'contest':
        return (
          <span className="font-mono text-[10px] text-secondary flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            FAIR PLAY
          </span>
        );
    }
  };

  return (
    <div
      className="w-full max-w-[360px] mx-auto min-h-[460px] bg-surface-container-low text-on-surface flex flex-col font-sans select-none antialiased"
      data-testid="unstuck-popup"
    >
      {/* Top Header */}
      <header className="bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between px-3.5 py-2.5 w-full sticky top-0 z-50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-md bg-surface-container flex items-center justify-center border border-outline-variant/40 text-primary shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-sm font-semibold text-on-surface tracking-tight truncate">
            {APP_NAME}
          </h1>
          {renderVariantBadge()}
          {state.demoMode && (
            <span
              data-testid="popup-demo-mode-badge"
              className="font-mono text-[9px] font-bold text-secondary px-1.5 py-0.5 rounded bg-secondary/15 border border-secondary/30 shrink-0"
              title="Demo Mode: 20s cooldowns"
            >
              DEMO
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleOpenOptions}
            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-bright/20 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.close()}
            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-bright/20 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body Stack */}
      <main className="p-3.5 flex-1 flex flex-col gap-3 min-w-0">
        {/* VARIANT 1: ACTIVE */}
        {state.variant === 'active' && (
          <>
            {/* Status Card: Watching Active */}
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/30 flex flex-col gap-2.5 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-on-surface truncate">
                    Watching this page
                  </span>
                </div>

                {/* Switched ON Toggle */}
                <button
                  onClick={handleTogglePauseSwitch}
                  className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 shrink-0"
                  title="Pause observation"
                  aria-label="Pause observation"
                >
                  <span className="font-mono text-[10px] text-outline">Pause</span>
                  <div className="w-8 h-4.5 bg-primary/20 rounded-full p-0.5 flex items-center justify-end transition-colors border border-primary/40">
                    <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-sm" />
                  </div>
                </button>
              </div>

              {/* Site Domain Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 font-mono text-[11px] text-on-surface-variant overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{state.siteDomain}</span>
              </div>
            </div>

            {/* 3 Stat Tiles Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-container rounded-lg p-2 border border-outline-variant/20 flex flex-col min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-wider text-outline truncate">
                  Nudges
                </span>
                <span className="font-mono text-sm text-on-surface font-semibold mt-0.5 truncate">
                  {state.nudgesCount}
                </span>
                <span className="font-mono text-[9px] text-primary mt-0.5 truncate">Tier 1</span>
              </div>

              <div className="bg-surface-container rounded-lg p-2 border border-outline-variant/20 flex flex-col min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-wider text-outline truncate">
                  Accepted
                </span>
                <span className="font-mono text-sm text-on-surface font-semibold mt-0.5 truncate">
                  {state.acceptedCount}
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5 truncate">
                  {Math.round(state.acceptRate * 100)}% rate
                </span>
              </div>

              <div className="bg-surface-container rounded-lg p-2 border border-outline-variant/20 flex flex-col min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-wider text-outline truncate">
                  Hints
                </span>
                <span className="font-mono text-sm text-on-surface font-semibold mt-0.5 truncate">
                  {state.hintsUsedCount}
                  <span className="text-outline text-xs font-normal">/6</span>
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5 truncate">
                  {state.hintsLeftCount} left
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleOpenSidePanel}
                className="w-full bg-primary hover:bg-primary/90 text-on-primary font-mono font-semibold rounded-lg px-3 py-2 flex items-center justify-between transition-colors active:scale-[0.98] shadow-sm text-xs"
              >
                <span className="flex items-center gap-2">
                  <Dock className="w-4 h-4" />
                  Open side panel
                </span>
                <div className="flex items-center gap-1.5">
                  <kbd className="font-mono text-[10px] bg-on-primary/20 px-1.5 py-0.5 rounded">
                    ⌥S
                  </kbd>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={handlePauseOneHour}
                className="w-full bg-surface-container-high text-on-surface font-mono text-xs rounded-lg px-3 py-1.5 border border-outline-variant/30 flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors active:scale-[0.98]"
              >
                <Timer className="w-3.5 h-3.5 text-outline" />
                Pause for 1 hour
              </button>
            </div>
          </>
        )}

        {/* VARIANT 2: PAUSED */}
        {state.variant === 'paused' && (
          <>
            {/* Status Block: Paused Warning Tone */}
            <div className="bg-surface-container rounded-xl p-3 border border-tertiary/40 flex flex-col gap-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Timer className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
                  <div>
                    <h2 className="font-mono text-xs font-semibold text-on-surface leading-none">
                      Paused on {state.siteDomain.split('/')[0]}
                    </h2>
                    <p className="font-sans text-[11px] text-outline mt-1">
                      Resumes in 42m or click below
                    </p>
                  </div>
                </div>

                {/* Switched OFF Toggle */}
                <button
                  onClick={handleResume}
                  className="w-8 h-4.5 bg-surface-bright rounded-full p-0.5 flex items-center justify-start transition-colors cursor-pointer border border-outline-variant/40"
                  title="Resume watching"
                  aria-label="Resume watching"
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-outline shadow-sm" />
                </button>
              </div>

              {/* Countdown Progress Bar */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="w-full bg-surface-container-lowest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-tertiary h-full w-[30%] rounded-full" />
                </div>
                <div className="flex justify-between font-mono text-[9px] text-outline">
                  <span>18m elapsed</span>
                  <span>42m remaining</span>
                </div>
              </div>
            </div>

            {/* Dimmed Stat Tiles Grid */}
            <div className="grid grid-cols-3 gap-2 opacity-60">
              <div className="bg-surface-container rounded-lg p-2 border border-outline-variant/20 flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-wider text-outline truncate">
                  Nudges
                </span>
                <span className="font-mono text-sm text-on-surface font-semibold mt-0.5">
                  {state.nudgesCount}
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5">Suspended</span>
              </div>
              <div className="bg-surface-container rounded-lg p-2 border border-outline-variant/20 flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-wider text-outline truncate">
                  Accepted
                </span>
                <span className="font-mono text-sm text-on-surface font-semibold mt-0.5">
                  {state.acceptedCount}
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5">75% rate</span>
              </div>
              <div className="bg-surface-container rounded-lg p-2 border border-outline-variant/20 flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-wider text-outline truncate">
                  Hints
                </span>
                <span className="font-mono text-sm text-on-surface font-semibold mt-0.5">
                  {state.hintsUsedCount}
                  <span className="text-outline text-xs font-normal">/6</span>
                </span>
                <span className="font-mono text-[9px] text-outline mt-0.5">Suspended</span>
              </div>
            </div>

            {/* Action Buttons: Resume & Keep Paused */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleResume}
                className="w-full bg-primary hover:bg-primary/90 text-on-primary font-mono font-semibold rounded-lg px-3 py-2 flex items-center justify-center gap-2 transition-colors active:scale-[0.98] text-xs shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume watching
              </button>
              <button
                onClick={handlePauseToday}
                className="w-full bg-surface-container-high text-on-surface font-mono text-xs rounded-lg px-3 py-1.5 border border-outline-variant/30 flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors active:scale-[0.98]"
              >
                <Moon className="w-3.5 h-3.5 text-outline" />
                Keep paused for today
              </button>
            </div>
          </>
        )}

        {/* VARIANT 3: UNSUPPORTED / RESTRICTED SCHEME */}
        {state.variant === 'unsupported' && (
          <>
            {/* Status Block: Unsupported Notice */}
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/30 flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-surface-container-highest flex items-center justify-center text-secondary shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-mono text-xs font-semibold text-on-surface">
                    I can't run on this page
                  </h2>
                  <p className="font-sans text-[11px] text-outline leading-relaxed mt-1">
                    Unstuck only activates on supported problem pages and programming documentation.
                  </p>
                </div>
              </div>

              {/* Target Domain Pill (Restricted) */}
              <div className="mt-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 font-mono text-[10px] text-outline">
                <Lock className="w-3.5 h-3.5 text-error shrink-0" />
                <span className="truncate">Target: {state.url || 'Restricted scheme'}</span>
              </div>
            </div>

            {/* Supported Sites Badge Row */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
                Supported out-of-the-box:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant">
                  LeetCode
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant">
                  HackerRank
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant">
                  Codeforces
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-secondary">
                  + docs
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleOpenOptions}
                className="w-full bg-surface-container-high text-on-surface font-mono text-xs rounded-lg px-3 py-2 border border-outline-variant/30 flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4 text-primary" />
                Add custom domain / localhost
              </button>
              <button
                onClick={handleOpenSidePanel}
                className="w-full bg-surface-container text-on-surface font-mono text-xs rounded-lg px-3 py-1.5 border border-outline-variant/30 flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-outline" />
                Open scratchpad panel
              </button>
            </div>
          </>
        )}

        {/* VARIANT 4: CONTEST FAIR-PLAY LOCK */}
        {state.variant === 'contest' && (
          <>
            {/* Status Block: Contest Lock Tone */}
            <div className="bg-surface-container rounded-xl p-3 border border-secondary/40 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-mono text-xs font-semibold text-on-surface">
                    Contest mode active
                  </h2>
                  <p className="font-sans text-[11px] text-outline leading-relaxed mt-1">
                    Proactive nudges are disabled to adhere to platform fair play and honor codes.
                  </p>
                </div>
              </div>

              {/* Contest Domain Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 font-mono text-[10px] text-on-surface-variant overflow-hidden text-ellipsis whitespace-nowrap">
                <Terminal className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span className="truncate">{state.siteDomain} (Live Contest)</span>
              </div>
            </div>

            {/* Fair-Play Notice Box */}
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-secondary/20 flex flex-col gap-1 text-[11px] font-sans text-outline">
              <span className="font-mono text-[10px] text-secondary font-semibold uppercase tracking-wider">
                Integrity Lock Engaged
              </span>
              <span>
                All AI hint generators and automated code suggestions remain silenced until the contest session ends.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleOpenSidePanel}
                className="w-full bg-surface-container-high text-on-surface font-mono text-xs rounded-lg px-3 py-2 border border-outline-variant/30 flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-secondary" />
                Open post-contest review
              </button>
              <button
                onClick={handleOpenOptions}
                className="w-full bg-surface-container text-on-surface font-mono text-xs rounded-lg px-3 py-1.5 border border-outline-variant/30 flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors active:scale-[0.98]"
              >
                Contest rules & integrity policy
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer Action Dock */}
      <footer className="bg-surface-container-low border-t border-outline-variant/30 px-3.5 py-2 flex items-center justify-between font-mono text-[10px] text-outline">
        <span className="truncate">v{APP_VERSION} • Local LLM / Gemini</span>
        <button
          onClick={handleOpenOptions}
          className="text-outline hover:text-primary transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          Settings
        </button>
      </footer>
    </div>
  );
};
