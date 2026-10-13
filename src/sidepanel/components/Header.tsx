import React from 'react';
import {
  PauseCircle,
  PlayCircle,
  Settings as SettingsIcon,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { APP_NAME } from '../../shared/config';
import type { PageContext } from '../../shared/schemas/context';

export interface HeaderProps {
  context: PageContext | null;
  isWatching: boolean;
  isPaused: boolean;
  isContest: boolean;
  demoMode?: boolean;
  onTogglePause: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  context,
  isWatching,
  isPaused,
  isContest,
  demoMode,
  onTogglePause,
  onOpenSettings,
}) => {
  return (
    <header className="bg-surface-container-low top-0 sticky z-40 flex flex-col w-full px-3 py-2 border-b border-outline-variant/40 shrink-0 select-none">
      {/* Upper row: Brand, Live status pill, and action buttons */}
      <div className="flex items-center justify-between gap-2 pb-2">
        {/* Brand & Live status */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-primary shrink-0">
            <svg
              className="w-3.5 h-3.5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              <circle cx="12" cy="12" r="3.5" strokeDasharray="3 2" />
            </svg>
          </div>
          <span className="text-sm font-mono font-bold text-on-surface tracking-tight truncate min-w-0">
            {APP_NAME} TUTOR
          </span>

          {demoMode && (
            <div
              data-testid="demo-mode-badge"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/20 border border-secondary/40 shrink-0 text-secondary font-mono text-[9px] font-bold uppercase tracking-wider"
              title="Demo Mode active: 20s cooldowns"
            >
              DEMO (20s)
            </div>
          )}

          {/* Live Status Badge */}
          {isContest ? (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 border border-tertiary-container/40 shrink-0"
              title="Contest detected: AI nudges silenced per fair-play rules"
            >
              <Trophy className="w-3 h-3 text-tertiary" />
              <span className="font-mono text-[10px] text-tertiary font-semibold uppercase tracking-wider">
                Contest
              </span>
            </div>
          ) : isPaused ? (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/40 shrink-0"
              title="Observation paused by user"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-outline" />
              <span className="font-mono text-[10px] text-on-surface-variant">Paused</span>
            </div>
          ) : isWatching ? (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/30 shrink-0"
              title="Real-time tab observation active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-[10px] text-primary font-medium tracking-wide">
                Watching
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-outline" />
              <span className="font-mono text-[10px] text-on-surface-variant">Idle</span>
            </div>
          )}
        </div>

        {/* Trailing actions: Pause & Settings */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onTogglePause}
            className="px-2 py-1 rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center gap-1 text-xs font-mono active:scale-95 duration-100"
            title={isPaused ? 'Resume observation' : 'Pause observation'}
            aria-label={isPaused ? 'Resume observation' : 'Pause observation'}
          >
            {isPaused ? (
              <>
                <PlayCircle className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary">Resume</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1 rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors active:scale-95 duration-100"
            title="Extension Settings"
            aria-label="Extension Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Problem Context Bar (if problem context is detected) */}
      {context && (
        <div className="bg-surface-container border border-outline-variant/40 rounded-xl p-2.5 flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary font-mono text-[10px] border border-secondary/20 shrink-0">
                {context.site}
              </span>
              <span className="text-on-surface font-mono text-xs font-semibold truncate" title={context.title}>
                {context.title}
              </span>
            </div>

            {context.difficulty && (
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                  context.difficulty.toLowerCase() === 'easy'
                    ? 'text-primary bg-primary/10 border-primary/30'
                    : context.difficulty.toLowerCase() === 'medium'
                    ? 'text-tertiary bg-tertiary/10 border-tertiary/30'
                    : 'text-error bg-error/10 border-error/30'
                }`}
              >
                {context.difficulty}
              </span>
            )}
          </div>

          {/* Tags and sync indicator */}
          <div className="flex items-center justify-between text-on-surface-variant text-[10px] font-mono">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {context.tags && context.tags.length > 0 ? (
                context.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.2 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface-variant whitespace-nowrap"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-outline">Active problem session</span>
              )}
            </div>

            <div className="flex items-center gap-1 text-on-surface-variant/80 shrink-0">
              <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
              <span>Synced</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
