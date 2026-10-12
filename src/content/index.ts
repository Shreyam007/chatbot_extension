import { APP_NAME } from '../shared/config';
import { createLogger } from '../shared/logger';
import { sendToBackground, listenToBroadcastEvents, MessagingError } from '../shared/messaging';
import type { Settings } from '../shared/schemas/settings';
import type { PageContext } from '../shared/schemas/context';
import { resolveAdapter, type PageAdapter } from './adapters';
import { SignalCollector } from './signals/collector';
import { SPANavigationWatcher } from './signals/navigation';
import { OverlayHost } from './overlay/host';

const logger = createLogger('ContentScript');

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

export class ContentScriptController {
  private overlay: OverlayHost;
  private collector: SignalCollector | null = null;
  private navWatcher: SPANavigationWatcher | null = null;
  private currentAdapter: PageAdapter;
  private currentContext: PageContext | null = null;
  private reportIntervalId: number | null = null;
  private mutationObserver: MutationObserver | null = null;
  private unsubscribeEvents: (() => void) | null = null;
  private isDestroyed: boolean = false;

  constructor() {
    this.overlay = new OverlayHost();
    this.currentAdapter = resolveAdapter(new URL(window.location.href));
  }

  public async init(): Promise<void> {
    logger.info('Content script running on:', window.location.href);

    try {
      const res = await sendToBackground<{ type: string; settings: Settings }>({ type: 'GET_SETTINGS' });
      const gating = evaluateTrackingGating(res.settings);

      if (!gating.trackingActive) {
        logger.info(`Observing nothing on ${window.location.hostname}: ${gating.reason} (Chat-only mode)`);
        // Mount overlay in collapsed state for chat access without signal tracking
        this.overlay.mount();
        this.overlay.collapseToFab();
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

    // 2. Context extraction
    this.extractAndCacheContext();

    // 3. Start SPA navigation watcher (EC-022)
    this.navWatcher = new SPANavigationWatcher();
    this.navWatcher.start();
    this.navWatcher.onNavigate((newUrl) => {
      this.handleNavigation(newUrl);
    });

    // 4. Setup verdict observer (EC-045, EC-046)
    this.setupVerdictObserver();

    // 5. Setup periodic signal reporting (every 15s)
    this.reportIntervalId = window.setInterval(() => {
      this.reportSignals();
    }, 15000) as unknown as number;

    // 6. Listen for incoming broadcast events (e.g. NUDGE_OFFERED)
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
    }
  }

  private handleNavigation(newUrl: URL): void {
    logger.info(`Handling navigation to ${newUrl.pathname} (EC-022)`);

    // Reset signal window for new problem session
    this.collector?.reset();

    // Update adapter and contest mode
    this.currentAdapter = resolveAdapter(newUrl);
    const isContest = this.currentAdapter.detectContest(newUrl, document);
    this.overlay.setContestMode(isContest);

    if (!isContest) {
      this.overlay.collapseToFab();
    }

    // Allow DOM to settle before extracting new problem context
    setTimeout(() => {
      this.extractAndCacheContext();
    }, 500);
  }

  private setupVerdictObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.mutationObserver = new MutationObserver(() => {
      if (!this.currentAdapter.detectVerdict) return;

      const verdict = this.currentAdapter.detectVerdict(document);
      if (verdict) {
        if (verdict.verdict === 'wrong') {
          this.collector?.addVerdictResult(verdict);
        } else if (verdict.verdict === 'accepted') {
          logger.info('Accepted verdict detected! Marking problem solved (EC-046)');
          this.overlay.hideAll();
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private async reportSignals(): Promise<void> {
    if (this.isDestroyed || !this.collector || !this.currentContext) return;

    const signals = this.collector.getSnapshot();

    try {
      await sendToBackground({
        type: 'REPORT_SIGNALS',
        signals,
        context: this.currentContext,
      });
    } catch (err) {
      if (err instanceof MessagingError && err.code === 'CONTEXT_INVALIDATED') {
        this.showReloadPrompt();
        this.destroy();
      }
    }
  }

  private handleNudgeOffered(decision: { reason: string; utility: number }): void {
    const isContest = this.currentAdapter.detectContest(new URL(window.location.href), document);
    if (isContest) return;

    const hostname = window.location.hostname;
    const normSite = hostname.toLowerCase().includes('codeforces') ? 'codeforces' : 'leetcode';
    const bucket = `${normSite}:high:intermediate`;

    this.overlay.showNudge({
      title: 'Stuck on this part?',
      reason: decision.reason,
      previewText: 'Hint 1 of 4: Socratic direction available',
      contextBucket: bucket,
      onShowHint: () => {
        logger.info('User accepted nudge: Requesting hint & recording accept reward');
        sendToBackground({
          type: 'RECORD_FEEDBACK',
          contextBucket: bucket,
          action: 'accept',
          site: hostname,
        }).catch((err) => logger.debug('Record feedback error:', err));

        if (this.currentContext) {
          sendToBackground({
            type: 'REQUEST_HINT',
            level: 1,
            problemHash: this.currentContext.url,
          }).catch((err) => logger.debug('Hint request error:', err));
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
  }
}

export function highlightTextInPage(searchText: string): boolean {
  if (!searchText || searchText.trim().length === 0) return false;
  const cleanSearch = searchText.trim().toLowerCase();

  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.toLowerCase().includes(cleanSearch)) {
        const parent = node.parentElement;
        if (parent) {
          parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const origOutline = parent.style.outline;
          const origTransition = parent.style.transition;
          parent.style.transition = 'outline 0.3s ease-in-out';
          parent.style.outline = '3px solid #4be277';
          setTimeout(() => {
            parent.style.outline = origOutline;
            parent.style.transition = origTransition;
          }, 3000);
          return true;
        }
      }
    }
  } catch (err) {
    logger.debug('Highlight walker encountered error:', err);
  }
  return false;
}

let activeController: ContentScriptController | null = null;

export function initContentScript(): ContentScriptController {
  if (activeController) {
    return activeController;
  }
  activeController = new ContentScriptController();
  activeController.init();

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'HIGHLIGHT_PAGE_TEXT' && typeof message.text === 'string') {
        const found = highlightTextInPage(message.text);
        sendResponse({ ok: true, found });
      }
    });
  }

  return activeController;
}


