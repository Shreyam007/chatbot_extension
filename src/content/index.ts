import { APP_NAME } from '../shared/config';
import { createLogger } from '../shared/logger';
import { sendToBackground, listenToBroadcastEvents, MessagingError } from '../shared/messaging';
import type { Settings } from '../shared/schemas/settings';
import type { PageContext } from '../shared/schemas/context';
import { resolveAdapter, type PageAdapter } from './adapters';
import { SignalCollector } from './signals/collector';
import { SPANavigationWatcher } from './signals/navigation';
import { OverlayHost } from './overlay/host';
import { highlightTextInPage, highlightTextInPageDetailed } from './highlighter';
import { installGlobalErrorHandlers } from '../shared/errors/reporter';

const logger = createLogger('ContentScript');

declare global {
  interface Window {
    __UNSTUCK_INITIALIZED__?: boolean;
    __UNSTUCK_CONTROLLER__?: ContentScriptController;
  }
}

export interface ContentScriptState {
  trackingActive: boolean;
  isChatOnly: boolean;
  reason?: string;
}

export function evaluateTrackingGating(
  settings: Partial<Settings>,
  hostname: string = window.location.hostname
): ContentScriptState {
  if (!settings.trackingEnabled) {
    return {
      trackingActive: false,
      isChatOnly: true,
      reason: 'Tracking consent disabled (default OFF)',
    };
  }

  const enabledSites = settings.enabledSites || ['leetcode.com', 'codeforces.com'];
  const matchesSite = enabledSites.some((site) => hostname.includes(site) || site.includes(hostname));

  if (!matchesSite) {
    return {
      trackingActive: false,
      isChatOnly: true,
      reason: `Site ${hostname} not in enabled platforms list`,
    };
  }

  return {
    trackingActive: true,
    isChatOnly: false,
  };
}

function computeContextHash(ctx: PageContext): string {
  const str = `${ctx.url}|${ctx.title}|${ctx.statementLength || ctx.statementText.length}|${ctx.isContest}|${ctx.tags.join(',')}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `h_${hash}`;
}

export class ContentScriptController {
  private overlay: OverlayHost;
  private collector: SignalCollector | null = null;
  private navWatcher: SPANavigationWatcher | null = null;
  private currentAdapter: PageAdapter;
  private currentContext: PageContext | null = null;
  private lastSentContextHash: string | null = null;
  private reportIntervalId: number | null = null;
  private mutationObserver: MutationObserver | null = null;
  private mutationDebounceTimer: number | null = null;
  private unsubscribeEvents: (() => void) | null = null;
  private isDestroyed: boolean = false;

  // Verdict state transition tracking (F4, F5)
  private lastVerdictState: 'accepted' | 'wrong' | 'pending' | null = null;
  private lastWrongVerdictText: string | null = null;
  private hasRecordedSolved: boolean = false;

  constructor() {
    this.overlay = new OverlayHost();
    this.currentAdapter = resolveAdapter(new URL(window.location.href));
  }

  public async init(): Promise<void> {
    logger.info('Content script running on:', window.location.href);

    try {
      const res = await sendToBackground<{ type: string; settings: Settings }>({ type: 'GET_SETTINGS' });
      const gating = evaluateTrackingGating(res.settings);

      // Start SPA navigation watcher unconditionally (F7)
      this.navWatcher = new SPANavigationWatcher();
      this.navWatcher.start();
      this.navWatcher.onNavigate((newUrl) => {
        this.handleNavigation(newUrl);
      });

      // Context extraction is essential for Hints & Chat, regardless of signal tracking
      this.extractAndCacheContext();

      // Retry extraction after 500ms and 1500ms to catch React/Next.js hydration on fresh loads
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.extractAndCacheContext();
        }
      }, 500);

      setTimeout(() => {
        if (!this.isDestroyed) {
          this.extractAndCacheContext();
        }
      }, 1500);

      if (!gating.trackingActive) {
        logger.info(`Observing nothing on ${window.location.hostname}: ${gating.reason} (Chat-only mode)`);
        // Mount overlay in collapsed state for chat access without signal tracking
        this.overlay.mount();
        this.overlay.collapseToFab();
        this.setupDOMObserver();
        return;
      }

      this.startActiveTracking();
    } catch (err: unknown) {
      if (err instanceof MessagingError && err.code === 'CONTEXT_INVALIDATED') {
        logger.debug('Extension context invalidated notice (EC-003)');
        this.showReloadPrompt();
      } else {
        logger.error('Failed to initialize content script settings:', err);
      }
    }
  }

  private startActiveTracking(): void {
    const currentUrl = new URL(window.location.href);
    this.currentAdapter = resolveAdapter(currentUrl);

    const isContest = this.currentAdapter.detectContest(currentUrl, document);
    this.overlay.mount();
    this.overlay.setContestMode(isContest);

    if (isContest) {
      logger.info('Contest detected: All nudges silenced per fair-play rules (EC-031/EC-100)');
    } else {
      this.overlay.collapseToFab();
    }

    // 1. Start monotonic signal collector
    this.collector = new SignalCollector();
    this.collector.start();

    // 2. Setup DOM & verdict observer (EC-045, EC-046)
    this.setupDOMObserver();

    // 3. Setup periodic rate-limited signal reporting (every 15s)
    this.reportIntervalId = window.setInterval(() => {
      this.reportSignals();
    }, 15000) as unknown as number;

    // 4. Listen for incoming broadcast events (e.g. NUDGE_OFFERED)
    this.unsubscribeEvents = listenToBroadcastEvents((event) => {
      if (event.event === 'NUDGE_OFFERED') {
        this.handleNudgeOffered(event.decision);
      }
    });
  }

  private extractAndCacheContext(): void {
    const currentUrl = new URL(window.location.href);
    this.currentContext = this.currentAdapter.extractContext(document, currentUrl);
    if (this.currentContext) {
      logger.info(`Extracted page context: "${this.currentContext.title}" (${this.currentContext.site})`);
      this.reportSignals();
    } else {
      logger.debug('No coding problem context extracted from current DOM');
      // If navigating to non-problem path, clear stale context in worker (F6)
      sendToBackground({ type: 'CLEAR_PAGE_CONTEXT' }).catch((err) => logger.debug('Clear context notice:', err));
    }
  }

  private handleNavigation(newUrl: URL): void {
    logger.info(`Handling navigation to ${newUrl.pathname} (EC-022)`);

    // Reset problem session states (F4, F5, F6)
    this.collector?.reset();
    this.hasRecordedSolved = false;
    this.lastVerdictState = null;
    this.lastWrongVerdictText = null;
    this.lastSentContextHash = null;

    // Update adapter and contest mode
    this.currentAdapter = resolveAdapter(newUrl);
    const isContest = this.currentAdapter.detectContest(newUrl, document);
    this.overlay.setContestMode(isContest);

    if (!isContest) {
      this.overlay.collapseToFab();
    }

    // Allow DOM to settle before extracting new problem context
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.extractAndCacheContext();
      }
    }, 500);
  }

  public getCurrentContext(): PageContext | null {
    return this.currentContext;
  }

  private setupDOMObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.mutationObserver = new MutationObserver(() => {
      // Debounce mutations by 500ms (F13)
      if (this.mutationDebounceTimer !== null) {
        window.clearTimeout(this.mutationDebounceTimer);
      }
      this.mutationDebounceTimer = window.setTimeout(() => {
        this.processDOMMutations();
      }, 500) as unknown as number;
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private processDOMMutations(): void {
    if (this.isDestroyed) return;

    // 1. Transition-based verdict detection (F4, F5)
    if (this.currentAdapter.detectVerdict) {
      const verdict = this.currentAdapter.detectVerdict(document);
      if (verdict) {
        if (verdict.verdict === 'wrong') {
          const raw = verdict.rawText || 'wrong';
          // Only increment if state transitioned or text changed
          if (this.lastVerdictState !== 'wrong' || raw !== this.lastWrongVerdictText) {
            this.lastVerdictState = 'wrong';
            this.lastWrongVerdictText = raw;
            this.collector?.addVerdictResult(verdict);
          }
        } else if (verdict.verdict === 'accepted') {
          if (!this.hasRecordedSolved && this.currentContext) {
            this.hasRecordedSolved = true;
            this.lastVerdictState = 'accepted';
            logger.info(`Accepted verdict detected! Recording solve for ${this.currentContext.url}`);
            sendToBackground({
              type: 'RECORD_SOLVED',
              problemHash: this.currentContext.url,
              timeTakenMs: this.collector ? this.collector.getSnapshot().dwellMs : undefined,
            }).catch((err) => logger.debug('Record solved error:', err));
          }
          // Collapse card but retain FAB for S12 summary entry point (F4)
          this.overlay.collapseToFab();
        } else if (verdict.verdict === 'pending') {
          this.lastVerdictState = 'pending';
        }
      }
    }

    // 2. React hydration observer: if statement was empty or placeholder, re-extract when DOM settles
    if (
      !this.currentContext ||
      this.currentContext.statementText.includes('loading...')
    ) {
      const hasContent = document.querySelector(
        'div[data-track-load="description_content"], .elfjS, div.question-content, .text-title-large, div[data-cy="question-title"]'
      );
      if (hasContent) {
        this.extractAndCacheContext();
      }
    }
  }

  private async reportSignals(): Promise<void> {
    if (this.isDestroyed || !this.currentContext) return;
    // Suppress heartbeats while tab is hidden (F8)
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const currentHash = computeContextHash(this.currentContext);
    const isFirstOrChanged = this.lastSentContextHash !== currentHash;

    const signals = this.collector
      ? this.collector.getSnapshot()
      : {
          dwellMs: 0,
          scrollReversals: 0,
          idleMs: 0,
          wrongSubmissions: 0,
          tabSwitches: 0,
          activeMs: 0,
          readingMs: 0,
          windowStart: Date.now() - 1000,
          windowEnd: Date.now(),
        };

    try {
      if (isFirstOrChanged) {
        await sendToBackground({
          type: 'REPORT_SIGNALS',
          signals,
          context: this.currentContext,
        });
        this.lastSentContextHash = currentHash;
      } else {
        // Send lightweight signals heartbeat (F8)
        await sendToBackground({
          type: 'SIGNALS_HEARTBEAT',
          signals,
          contextHash: currentHash,
          readingMs: signals.readingMs,
        });
      }
    } catch (err) {
      if (err instanceof MessagingError && err.code === 'CONTEXT_INVALIDATED') {
        this.showReloadPrompt();
        this.destroy();
      }
    }
  }

  private handleNudgeOffered(decision: { reason: string; utility: number; contextBucket?: string; nudgeText?: string }): void {
    const isContest = this.currentAdapter.detectContest(new URL(window.location.href), document);
    if (isContest) return;

    const hostname = window.location.hostname;
    const normSite = hostname.toLowerCase().includes('codeforces') ? 'codeforces' : 'leetcode';
    const bucket = decision.contextBucket || `${normSite}:high:intermediate`;

    // Adaptive copy depending on problem vs generic/article page (F3)
    const isProblemPage =
      this.currentContext?.contentType === 'problem' ||
      this.currentContext?.site === 'leetcode' ||
      this.currentContext?.site === 'codeforces';

    const previewText = isProblemPage
      ? 'Hint 1 of 4: Socratic direction'
      : 'Guidance available: Key takeaways & explanation';

    const userFacingReason = decision.nudgeText || 'Would you like some direction?';

    this.overlay.showNudge({
      title: 'Stuck on this part?',
      reason: userFacingReason,
      previewText,
      contextBucket: bucket,
      onShowHint: () => {
        logger.info('User accepted nudge: Opening side panel & requesting hint');
        // Open side panel targeting hints tab (F2)
        sendToBackground({
          type: 'OPEN_SIDE_PANEL',
          tab: 'hints',
        }).catch((err) => logger.debug('Side panel open notice:', err));

        if (this.currentContext) {
          sendToBackground({
            type: 'REQUEST_HINT',
            level: 1,
            problemHash: this.currentContext.url,
          })
            .then(() => {
              // Record accept feedback ONLY after hint request starts successfully (F2)
              sendToBackground({
                type: 'RECORD_FEEDBACK',
                contextBucket: bucket,
                action: 'accept',
                site: hostname,
              }).catch((err) => logger.debug('Record feedback error:', err));
            })
            .catch((err) => logger.debug('Hint request error:', err));
        }
      },
      onDismiss: () => {
        logger.info('User dismissed nudge: recording dismiss penalty');
        sendToBackground({
          type: 'RECORD_FEEDBACK',
          contextBucket: bucket,
          action: 'dismiss',
          site: hostname,
        }).catch((err) => logger.debug('Record feedback error:', err));
      },
      onIgnore: () => {
        logger.info('User ignored nudge (8s timeout): recording ignore penalty');
        sendToBackground({
          type: 'RECORD_FEEDBACK',
          contextBucket: bucket,
          action: 'ignore',
          site: hostname,
        }).catch((err) => logger.debug('Record feedback error:', err));
      },
      onSnooze: (minutes) => {
        logger.info(`User snoozed nudges for ${minutes} min`);
        sendToBackground({
          type: 'SET_SNOOZE',
          durationMinutes: minutes,
        }).catch((err) => logger.debug('Set snooze error:', err));

        sendToBackground({
          type: 'RECORD_FEEDBACK',
          contextBucket: bucket,
          action: 'dismiss',
          site: hostname,
        }).catch((err) => logger.debug('Record feedback error:', err));
      },
      onBlockSite: () => {
        logger.info(`User blocked nudges on site: ${hostname}`);
        sendToBackground({
          type: 'BLOCK_SITE',
          domain: hostname,
        }).catch((err) => logger.debug('Block site error:', err));

        sendToBackground({
          type: 'RECORD_FEEDBACK',
          contextBucket: bucket,
          action: 'block_site',
          site: hostname,
        }).catch((err) => logger.debug('Record feedback error:', err));
      },
    });
  }

  private showReloadPrompt(): void {
    const hostId = 'unstuck-overlay-root';
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      document.body?.appendChild(host);
    }
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div style="position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#171f33;border:1px solid #ef9900;border-radius:9999px;padding:6px 14px;color:#ffba61;font-family:'JetBrains Mono',monospace;font-size:12px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef9900;"></span>
        <span>${APP_NAME} (Reload Page)</span>
      </div>
    `;
  }

  public getCodeContent(): string | null {
    if (!this.currentAdapter.readEditorCode) return null;
    return this.currentAdapter.readEditorCode(document);
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.reportIntervalId !== null) {
      clearInterval(this.reportIntervalId);
      this.reportIntervalId = null;
    }
    if (this.mutationDebounceTimer !== null) {
      clearTimeout(this.mutationDebounceTimer);
      this.mutationDebounceTimer = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.unsubscribeEvents) {
      this.unsubscribeEvents();
      this.unsubscribeEvents = null;
    }
    this.collector?.destroy();
    this.collector = null;
    this.navWatcher?.destroy();
    this.navWatcher = null;
    this.overlay.destroy();
    if (typeof window !== 'undefined') {
      window.__UNSTUCK_INITIALIZED__ = false;
      delete window.__UNSTUCK_CONTROLLER__;
    }
  }
}

export { highlightTextInPage };

let activeController: ContentScriptController | null = null;

export function initContentScript(ctx?: { onInvalidated?: (fn: () => void) => void }): ContentScriptController {
  // Single instance guard (F12)
  if (typeof window !== 'undefined') {
    if (window.__UNSTUCK_INITIALIZED__ && window.__UNSTUCK_CONTROLLER__) {
      return window.__UNSTUCK_CONTROLLER__;
    }
    window.__UNSTUCK_INITIALIZED__ = true;
  }

  // Install global error recorder
  installGlobalErrorHandlers('content');

  activeController = new ContentScriptController();
  activeController.init();
  if (typeof window !== 'undefined') {
    window.__UNSTUCK_CONTROLLER__ = activeController;
  }

  // Lifecycle bindings (F12)
  if (ctx && typeof ctx.onInvalidated === 'function') {
    ctx.onInvalidated(() => {
      activeController?.destroy();
      activeController = null;
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      activeController?.destroy();
    });
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'HIGHLIGHT_PAGE_TEXT' && typeof message.text === 'string') {
        const result = highlightTextInPageDetailed(message.text);
        sendResponse({
          ok: true,
          found: result.found,
          matchedLength: result.matchedLength,
          strategyUsed: result.strategyUsed,
        });
      } else if (message?.type === 'GET_PAGE_CONTEXT') {
        const pageCtx = activeController?.getCurrentContext() || null;
        sendResponse({ ok: true, context: pageCtx });
      }
    });
  }

  return activeController;
}
