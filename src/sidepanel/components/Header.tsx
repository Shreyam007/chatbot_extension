import React from 'react';
import {
  PauseCircle,
  PlayCircle,
  Settings as SettingsIcon,
  RefreshCw,
  Trophy,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { APP_NAME } from '../../shared/config';
import type { PageContext } from '../../shared/schemas/context';
import type { PageProfile } from '../../shared/page-profile';

export interface HeaderProps {
  context: PageContext | null;
  isWatching: boolean;
  isPaused: boolean;
  isContest: boolean;
  demoMode?: boolean;
  pageProfile?: PageProfile;
  activeUrl?: string | null;
  activeTabTitle?: string | null;
  isLoadingPage?: boolean;
  onTogglePause: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  context,
  isWatching,
  isPaused,
  isContest,
  demoMode,
  pageProfile,
  activeUrl,
  activeTabTitle,
  isLoadingPage = false,
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

          <div className="flex items-center gap-1.5 truncate min-w-0">
            <span className="font-mono text-xs font-bold tracking-tight text-on-surface">
              {APP_NAME}
            </span>

            {/* Live Indicator / Contest Pill */}
            {isContest ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-tertiary/10 text-tertiary border border-tertiary/30 shrink-0">
                <Trophy className="w-2.5 h-2.5 text-tertiary" />
                <span>Contest</span>
              </span>
            ) : isPaused ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-outline-variant/40 text-on-surface-variant shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                <span>Paused</span>
              </span>
            ) : isWatching ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Watching</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-surface-container-high text-on-surface-variant shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                <span>Ready</span>
              </span>
            )}

            {demoMode && (
              <span className="font-mono text-[9px] uppercase px-1 py-0.2 rounded bg-tertiary/20 text-tertiary border border-tertiary/30 shrink-0">
                Demo
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onTogglePause}
            className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors flex items-center gap-1 border active:scale-95 duration-100 ${
              isPaused
                ? 'bg-primary/20 text-primary border-primary/40 hover:bg-primary/30'
                : 'bg-surface-container-high text-on-surface-variant border-outline-variant/40 hover:text-on-surface'
            }`}
            title={isPaused ? 'Resume live assistance' : 'Pause live assistance'}
            aria-label={isPaused ? 'Resume live assistance' : 'Pause live assistance'}
          >
            {isPaused ? (
              <>
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Resume</span>
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

      {/* Problem / Article Context Bar */}
      {context ? (
        <div className="bg-surface-container border border-outline-variant/40 rounded-xl p-2.5 flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary font-mono text-[10px] border border-secondary/20 shrink-0">
                {pageProfile?.contextLabel || (context.contentType && context.contentType !== 'problem' ? context.contentType : context.site)}
              </span>
              <span className="text-on-surface font-mono text-xs font-semibold truncate" title={context.title}>
                {context.title}
              </span>
            </div>

            {context.isSensitive ? (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 text-error bg-error/10 border-error/30">
                Guarded
              </span>
            ) : context.difficulty ? (
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
            ) : null}
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
                <span className="text-outline">Active session</span>
              )}
            </div>

            <div className="flex items-center gap-1 text-on-surface-variant/80 shrink-0">
              <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
              <span>Synced</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container/60 border border-outline-variant/30 rounded-xl p-2.5 flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {isLoadingPage ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                <span className="text-on-surface-variant font-mono text-xs truncate">
                  Reading active page...
                </span>
              </>
            ) : pageProfile?.kind === 'restricted' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                <div className="min-w-0">
                  <div className="text-on-surface font-mono text-xs font-semibold truncate">
                    {activeTabTitle || 'Restricted Page'}
                  </div>
                  <div className="text-[10px] font-sans text-on-surface-variant truncate">
                    Browser security blocks extension on internal pages
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-outline shrink-0" />
                <span className="text-on-surface-variant font-mono text-xs truncate">
                  {activeTabTitle ? `${activeTabTitle.slice(0, 30)}... (No context)` : 'No readable page active'}
                </span>
              </>
            )}
          </div>

          <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono text-[9px] shrink-0">
            {pageProfile?.sourceLabel || 'Idle'}
          </span>
        </div>
      )}
    </header>
  );
};
