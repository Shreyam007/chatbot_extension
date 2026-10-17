import { createLogger } from '../../shared/logger';

const logger = createLogger('SPANavigation');

export type NavigationCallback = (newUrl: URL, previousUrl: URL) => void;

export class SPANavigationWatcher {
  private currentUrl: URL;
  private listeners: Set<NavigationCallback> = new Set();
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;
  private pollIntervalId: number | null = null;

  constructor() {
    this.currentUrl = new URL(window.location.href);
  }

  public start(): void {
    if (typeof window === 'undefined') return;

    // Patch history.pushState
    this.originalPushState = history.pushState;
    const origPush = this.originalPushState;
    const onUrlChange = () => this.checkUrlChange();

    history.pushState = function (...args) {
      origPush?.apply(this, args);
      onUrlChange();
    };

    // Patch history.replaceState
    this.originalReplaceState = history.replaceState;
    const origReplace = this.originalReplaceState;
    history.replaceState = function (...args) {
      origReplace?.apply(this, args);
      onUrlChange();
    };

    // Event listeners
    window.addEventListener('popstate', this.onPopState);
    window.addEventListener('hashchange', this.onPopState);

    // Modern Chrome Navigation API support (EC-022)
    const navObj = (window as unknown as { navigation?: EventTarget }).navigation;
    if (navObj && typeof navObj.addEventListener === 'function') {
      try {
        navObj.addEventListener('navigate', this.onPopState);
        navObj.addEventListener('navigatesuccess', this.onPopState);
      } catch {
        // Fallback
      }
    }

    // Resilient polling for frameworks with internal routing (every 800ms)
    this.pollIntervalId = window.setInterval(() => {
      this.checkUrlChange();
    }, 800) as unknown as number;
  }

  private onPopState = (): void => {
    this.checkUrlChange();
  };

  private checkUrlChange(): void {
    try {
      const nextUrl = new URL(window.location.href);
      if (nextUrl.href !== this.currentUrl.href) {
        const previous = this.currentUrl;
        this.currentUrl = nextUrl;
        logger.info(`SPA Navigation detected: ${previous.pathname} -> ${nextUrl.pathname}`);
        this.notify(nextUrl, previous);
      }
    } catch (err) {
      logger.error('Failed to parse URL in SPA watcher:', err);
    }
  }

  public onNavigate(callback: NavigationCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(newUrl: URL, prevUrl: URL): void {
    for (const listener of this.listeners) {
      try {
        listener(newUrl, prevUrl);
      } catch (err) {
        logger.error('Error in navigation listener:', err);
      }
    }
  }

  public destroy(): void {
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopState);
      window.removeEventListener('hashchange', this.onPopState);
    }

    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }

    this.listeners.clear();
  }
}
