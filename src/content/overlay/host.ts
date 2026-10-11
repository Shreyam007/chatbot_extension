import { OVERLAY_STYLES } from './styles';
import { createLogger } from '../../shared/logger';

const logger = createLogger('OverlayHost');

export interface NudgeCardOptions {
  title?: string;
  reason: string;
  previewText?: string;
  contextBucket?: string;
  onShowHint?: () => void;
  onDismiss?: () => void;
  onIgnore?: () => void;
  onSnooze?: (minutes: number) => void;
  onBlockSite?: () => void;
}

export class OverlayHost {
  private hostElement: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  private cardElement: HTMLElement | null = null;
  private fabElement: HTMLElement | null = null;
  private snoozeMenuElement: HTMLElement | null = null;
  private autoDismissTimer: number | null = null;
  private isContest: boolean = false;

  private currentOptions: NudgeCardOptions | null = null;
  private boundOnKeyDown: (e: KeyboardEvent) => void;

  // Dragging state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cardStartLeft = 0;
  private cardStartTop = 0;
  private boundOnPointerMove: (e: PointerEvent) => void;
  private boundOnPointerUp: (e: PointerEvent) => void;

  constructor() {
    this.boundOnKeyDown = this.handleKeyDown.bind(this);
    this.boundOnPointerMove = this.handlePointerMove.bind(this);
    this.boundOnPointerUp = this.handlePointerUp.bind(this);
  }

  public mount(): void {
    if (typeof document === 'undefined') return;

    const hostId = 'unstuck-overlay-root';
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      host.setAttribute('tabindex', '-1');
      document.body?.appendChild(host);
    }
    this.hostElement = host;

    if (!host.shadowRoot) {
      this.shadowRoot = host.attachShadow({ mode: 'open' });
    } else {
      this.shadowRoot = host.shadowRoot;
    }

    this.render();
    window.addEventListener('keydown', this.boundOnKeyDown);
  }

  private render(): void {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>${OVERLAY_STYLES}</style>
      
      <!-- S08 Floating Nudge Card -->
      <div id="unstuck-card" class="unstuck-card unstuck-hidden" data-testid="unstuck-nudge-card" tabindex="-1">
        <div class="unstuck-card-content">
          <!-- Draggable Header -->
          <div id="unstuck-header" class="unstuck-header" title="Drag to reposition">
            <div class="unstuck-badge-container">
              <div class="unstuck-icon-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <span class="unstuck-badge">Unstuck TUTOR</span>
            </div>

            <div class="unstuck-header-actions">
              <!-- Snooze Button -->
              <button id="unstuck-snooze-btn" class="unstuck-icon-btn" title="Snooze options" aria-label="Snooze options" tabindex="-1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </button>

              <!-- Close Button -->
              <button id="unstuck-close-btn" class="unstuck-icon-btn" title="Dismiss (Esc)" aria-label="Dismiss" tabindex="-1">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <!-- Snooze Popover Menu -->
              <div id="unstuck-snooze-menu" class="unstuck-snooze-menu unstuck-hidden">
                <button class="unstuck-snooze-item" data-action="snooze-10" tabindex="-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4be277" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 15 15"/></svg>
                  <span>Snooze 10 minutes</span>
                </button>
                <button class="unstuck-snooze-item" data-action="snooze-60" tabindex="-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4be277" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>
                  <span>Snooze 1 hour</span>
                </button>
                <button class="unstuck-snooze-item" data-action="snooze-tomorrow" tabindex="-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7bd0ff" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  <span>Until tomorrow</span>
                </button>
                <button class="unstuck-snooze-item unstuck-snooze-item-danger" data-action="block-site" tabindex="-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffb4ab" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  <span>Don't nudge on this site</span>
                </button>
              </div>
            </div>
          </div>

          <div class="unstuck-title-area">
            <h3 id="unstuck-title" class="unstuck-title">Stuck on this part?</h3>
            <p id="unstuck-body" class="unstuck-body">You've been on this step for a while. Want a nudge?</p>
          </div>

          <div id="unstuck-socratic-preview" class="unstuck-socratic-preview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4be277" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span id="unstuck-preview-text">Hint 1 of 4: Socratic direction available</span>
          </div>

          <div class="unstuck-actions">
            <div class="unstuck-btn-group">
              <button id="unstuck-show-hint-btn" class="unstuck-primary-btn" tabindex="-1">
                <span>Show a hint</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
              <button id="unstuck-not-now-btn" class="unstuck-secondary-btn" tabindex="-1">Not now</button>
            </div>
            <div class="unstuck-esc-badge">
              <kbd class="unstuck-kbd">Esc</kbd>
              <span>to dismiss</span>
            </div>
          </div>
        </div>

        <div class="unstuck-progress-track">
          <div id="unstuck-progress-bar" class="unstuck-progress-bar"></div>
        </div>
      </div>

      <!-- Compact 40px Circular FAB Beacon -->
      <div id="unstuck-fab-container" class="unstuck-fab-container" data-testid="unstuck-fab-beacon">
        <button id="unstuck-fab" class="unstuck-fab" title="Open Unstuck AI Tutor" aria-label="Open Unstuck Tutor" tabindex="-1">
          <span class="unstuck-fab-pulse"></span>
          <span class="unstuck-fab-dot"></span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    this.cardElement = this.shadowRoot.getElementById('unstuck-card');
    this.fabElement = this.shadowRoot.getElementById('unstuck-fab-container');
    this.snoozeMenuElement = this.shadowRoot.getElementById('unstuck-snooze-menu');

    const header = this.shadowRoot.getElementById('unstuck-header');
    const showHintBtn = this.shadowRoot.getElementById('unstuck-show-hint-btn');
    const notNowBtn = this.shadowRoot.getElementById('unstuck-not-now-btn');
    const closeBtn = this.shadowRoot.getElementById('unstuck-close-btn');
    const snoozeBtn = this.shadowRoot.getElementById('unstuck-snooze-btn');
    const fabBtn = this.shadowRoot.getElementById('unstuck-fab');

    // Dragging setup
    header?.addEventListener('pointerdown', this.handleHeaderPointerDown.bind(this));

    // Focus preservation: Prevent mousedown from blurring active editor element
    const preventFocusLoss = (e: MouseEvent) => {
      e.preventDefault();
    };
    showHintBtn?.addEventListener('mousedown', preventFocusLoss);
    notNowBtn?.addEventListener('mousedown', preventFocusLoss);
    closeBtn?.addEventListener('mousedown', preventFocusLoss);
    snoozeBtn?.addEventListener('mousedown', preventFocusLoss);
    fabBtn?.addEventListener('mousedown', preventFocusLoss);

    showHintBtn?.addEventListener('click', () => {
      this.clearAutoDismiss();
      this.collapseToFab();
      if (this.currentOptions?.onShowHint) {
        this.currentOptions.onShowHint();
      }
    });

    notNowBtn?.addEventListener('click', () => {
      this.dismiss();
    });

    closeBtn?.addEventListener('click', () => {
      this.dismiss();
    });

    snoozeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSnoozeMenu();
    });

    fabBtn?.addEventListener('click', () => {
      if (this.currentOptions?.onShowHint) {
        this.currentOptions.onShowHint();
      }
    });

    // Snooze menu action handlers
    this.shadowRoot.querySelectorAll('.unstuck-snooze-item').forEach((item) => {
      item.addEventListener('mousedown', preventFocusLoss as EventListener);
      item.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).getAttribute('data-action');
        this.handleSnoozeAction(action);
      });
    });
  }

  private toggleSnoozeMenu(): void {
    if (!this.snoozeMenuElement) return;
    const isHidden = this.snoozeMenuElement.classList.contains('unstuck-hidden');
    if (isHidden) {
      this.snoozeMenuElement.classList.remove('unstuck-hidden');
    } else {
      this.snoozeMenuElement.classList.add('unstuck-hidden');
    }
  }

  private handleSnoozeAction(action: string | null): void {
    this.snoozeMenuElement?.classList.add('unstuck-hidden');
    this.clearAutoDismiss();
    this.collapseToFab();

    if (action === 'snooze-10') {
      this.currentOptions?.onSnooze?.(10);
    } else if (action === 'snooze-60') {
      this.currentOptions?.onSnooze?.(60);
    } else if (action === 'snooze-tomorrow') {
      this.currentOptions?.onSnooze?.(1440);
    } else if (action === 'block-site') {
      this.currentOptions?.onBlockSite?.();
    }
  }

  // --- Dragging Handlers ---
  private handleHeaderPointerDown(e: PointerEvent): void {
    // Ignore clicks on action buttons inside header
    if ((e.target as HTMLElement).closest('.unstuck-header-actions')) return;
    if (!this.cardElement) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    const rect = this.cardElement.getBoundingClientRect();
    this.cardStartLeft = rect.left;
    this.cardStartTop = rect.top;

    // Switch card from relative to fixed absolute positioning for drag
    this.cardElement.style.position = 'fixed';
    this.cardElement.style.left = `${this.cardStartLeft}px`;
    this.cardElement.style.top = `${this.cardStartTop}px`;
    this.cardElement.style.bottom = 'auto';
    this.cardElement.style.right = 'auto';

    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.cardElement) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    const newLeft = Math.max(12, Math.min(window.innerWidth - this.cardElement.offsetWidth - 12, this.cardStartLeft + dx));
    const newTop = Math.max(12, Math.min(window.innerHeight - this.cardElement.offsetHeight - 12, this.cardStartTop + dy));

    this.cardElement.style.left = `${newLeft}px`;
    this.cardElement.style.top = `${newTop}px`;
  }

  private handlePointerUp(): void {
    this.isDragging = false;
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
  }

  // --- Adaptive Positioning ---
  private applyAdaptivePosition(): void {
    if (!this.cardElement) return;

    // Reset inline coordinates to defaults
    this.cardElement.style.position = '';
    this.cardElement.style.left = '';
    this.cardElement.style.top = '';
    this.cardElement.style.bottom = '';
    this.cardElement.style.right = '';

    try {
      // Find active code editor or cursor position
      const activeEl = document.activeElement;
      let cursorRect: DOMRect | null = null;

      if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.classList.contains('inputarea'))) {
        cursorRect = activeEl.getBoundingClientRect();
      } else {
        const monacoCursor = document.querySelector('.monaco-editor .cursor');
        if (monacoCursor) {
          cursorRect = monacoCursor.getBoundingClientRect();
        }
      }

      // If active cursor is in bottom-right quadrant, reposition card to top-right
      if (cursorRect && cursorRect.bottom > window.innerHeight * 0.60 && cursorRect.right > window.innerWidth * 0.60) {
        if (this.hostElement) {
          this.hostElement.style.bottom = 'auto';
          this.hostElement.style.top = '24px';
        }
      } else {
        if (this.hostElement) {
          this.hostElement.style.top = 'auto';
          this.hostElement.style.bottom = '24px';
        }
      }
    } catch {
      // Fallback: stay at bottom right
    }
  }

  public showNudge(options: NudgeCardOptions): void {
    if (this.isContest) {
      logger.info('Contest detected: Nudge suppressed per fair-play rules (EC-031/EC-100)');
      return;
    }

    this.currentOptions = options;

    if (!this.shadowRoot || !this.cardElement || !this.fabElement) {
      this.mount();
    }

    const titleEl = this.shadowRoot?.getElementById('unstuck-title');
    const bodyEl = this.shadowRoot?.getElementById('unstuck-body');
    const previewEl = this.shadowRoot?.getElementById('unstuck-preview-text');

    if (titleEl && options.title) {
      titleEl.textContent = options.title;
    }
    if (bodyEl && options.reason) {
      bodyEl.textContent = options.reason;
    }
    if (previewEl && options.previewText) {
      previewEl.textContent = options.previewText;
    }

    // Apply adaptive non-covering placement
    this.applyAdaptivePosition();

    // Reset animation on countdown progress bar
    const bar = this.shadowRoot?.getElementById('unstuck-progress-bar');
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetHeight;
      bar.style.animation = 'unstuck-countdown 8s linear forwards';
    }

    this.cardElement?.classList.remove('unstuck-hidden');
    this.fabElement?.classList.add('unstuck-hidden');
    this.snoozeMenuElement?.classList.add('unstuck-hidden');

    this.clearAutoDismiss();
    // 8-second auto dismiss countdown
    this.autoDismissTimer = window.setTimeout(() => {
      logger.debug('Auto-dismiss countdown completed (8s) - user ignored');
      this.autoDismiss();
    }, 8000);
  }

  public dismiss(): void {
    this.clearAutoDismiss();
    this.collapseToFab();
    if (this.currentOptions?.onDismiss) {
      this.currentOptions.onDismiss();
    }
  }

  public autoDismiss(): void {
    this.clearAutoDismiss();
    this.collapseToFab();
    if (this.currentOptions?.onIgnore) {
      this.currentOptions.onIgnore();
    } else if (this.currentOptions?.onDismiss) {
      this.currentOptions.onDismiss();
    }
  }

  public collapseToFab(): void {
    this.cardElement?.classList.add('unstuck-hidden');
    this.snoozeMenuElement?.classList.add('unstuck-hidden');
    if (!this.isContest) {
      this.fabElement?.classList.remove('unstuck-hidden');
    }
  }

  public hideAll(): void {
    this.clearAutoDismiss();
    this.cardElement?.classList.add('unstuck-hidden');
    this.fabElement?.classList.add('unstuck-hidden');
    this.snoozeMenuElement?.classList.add('unstuck-hidden');
  }

  public setContestMode(isContest: boolean): void {
    this.isContest = isContest;
    if (isContest) {
      logger.info('Setting contest mode: completely hiding all overlays');
      this.hideAll();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.cardElement && !this.cardElement.classList.contains('unstuck-hidden')) {
      logger.debug('Escape pressed, dismissing nudge card (EC-121)');
      this.dismiss();
    }
  }

  private clearAutoDismiss(): void {
    if (this.autoDismissTimer !== null) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
  }

  public destroy(): void {
    this.clearAutoDismiss();
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    if (this.hostElement?.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
    }
    this.hostElement = null;
    this.shadowRoot = null;
    this.cardElement = null;
    this.fabElement = null;
    this.snoozeMenuElement = null;
  }
}
