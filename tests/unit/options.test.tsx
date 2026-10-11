// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { OptionsApp } from '../../src/options/OptionsApp';
import * as messaging from '../../src/shared/messaging';
import * as storage from '../../src/shared/storage';
import { DEFAULT_SETTINGS } from '../../src/shared/config';

// Set React act environment flag
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../src/shared/messaging', () => ({
  sendToBackground: vi.fn(),
}));

vi.mock('../../src/shared/storage', () => ({
  getStoredApiKey: vi.fn(),
  setStoredApiKey: vi.fn(),
  getStoredSettings: vi.fn(),
  setStoredSettings: vi.fn(),
  exportAllData: vi.fn(),
  deleteAllData: vi.fn(),
}));

describe('OptionsApp & Privacy Tools (Step 12 — S11)', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockSettings = {
    ...DEFAULT_SETTINGS,
    trackingEnabled: true,
    nudgeSensitivity: 'medium' as const,
    cooldownMin: 15,
    maxNudgesPerHour: 4,
    model: 'gemini-2.5-flash',
    includeCodeConsent: false,
    quietHours: { enabled: true, start: '23:00', end: '07:00' },
    blockedSites: ['example.com'],
    demoMode: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      runtime: {
        openOptionsPage: vi.fn(),
      },
    };

    window.location.hash = '#ai';

    // Default mocks
    vi.mocked(storage.getStoredApiKey).mockResolvedValue('AIzaSy_mock_test_key');
    vi.mocked(storage.getStoredSettings).mockResolvedValue(mockSettings);
    vi.mocked(messaging.sendToBackground).mockImplementation(async (req) => {
      if (req.type === 'GET_SETTINGS') {
        return { type: 'SETTINGS', settings: mockSettings };
      }
      if (req.type === 'GET_ONBOARDING') {
        return { type: 'ONBOARDING_STATE', state: { completed: true, step: 3 } };
      }
      if (req.type === 'UPDATE_SETTINGS') {
        return { type: 'SETTINGS_UPDATED', settings: { ...mockSettings, ...(req as { updates?: object }).updates } };
      }
      if (req.type === 'TEST_API_KEY') {
        return { type: 'TEST_API_KEY_RESULT', success: true, latencyMs: 135 };
      }
      if (req.type === 'EXPORT_DATA') {
        return {
          type: 'EXPORT_DATA_RESULT',
          exportData: {
            app: 'Unstuck',
            eventsCount: 12,
            hintsDeliveredCount: 5,
            settings: mockSettings,
          },
        };
      }
      if (req.type === 'DELETE_ALL_DATA') {
        return { type: 'DELETE_ALL_DATA_RESULT', success: true };
      }
      return { type: 'OK' };
    });

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });

    // Mock URL object methods
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
    }
  });

  it('renders AI & Provider tab by default with API key input and test button', async () => {
    await act(async () => {
      root.render(<OptionsApp />);
    });

    expect(container.querySelector('[data-testid="tab-ai-provider"]')).not.toBeNull();
    const apiKeyInput = container.querySelector('[data-testid="api-key-input"]') as HTMLInputElement;
    expect(apiKeyInput).not.toBeNull();
    expect(apiKeyInput.value).toBe('AIzaSy_mock_test_key');
    expect(apiKeyInput.type).toBe('password');

    // Toggle reveal key
    const toggleBtn = container.querySelector('[data-testid="toggle-show-key-btn"]') as HTMLButtonElement;
    await act(async () => {
      toggleBtn.click();
    });
    expect(apiKeyInput.type).toBe('text');

    // Test API key execution
    const testBtn = container.querySelector('[data-testid="test-api-key-btn"]') as HTMLButtonElement;
    await act(async () => {
      testBtn.click();
    });

    expect(messaging.sendToBackground).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TEST_API_KEY',
        apiKey: 'AIzaSy_mock_test_key',
      })
    );
    expect(container.querySelector('[data-testid="test-api-success-indicator"]')).not.toBeNull();
  });

  it('displays API key test error if test returns failure', async () => {
    vi.mocked(messaging.sendToBackground).mockImplementation(async (req) => {
      if (req.type === 'TEST_API_KEY') {
        return { type: 'TEST_API_KEY_RESULT', success: false, error: 'Invalid API key provided' };
      }
      if (req.type === 'GET_SETTINGS') {
        return { type: 'SETTINGS', settings: mockSettings };
      }
      return { type: 'OK' };
    });

    await act(async () => {
      root.render(<OptionsApp />);
    });

    const testBtn = container.querySelector('[data-testid="test-api-key-btn"]') as HTMLButtonElement;
    await act(async () => {
      testBtn.click();
    });

    const errorInd = container.querySelector('[data-testid="test-api-error-indicator"]');
    expect(errorInd).not.toBeNull();
    expect(errorInd?.textContent).toContain('Invalid API key provided');
  });

  it('switches between sidebar tabs and navigates correctly', async () => {
    await act(async () => {
      root.render(<OptionsApp />);
    });

    // Switch to Nudges tab
    const nudgesTab = container.querySelector('[data-testid="tab-nudges-policy"]') as HTMLButtonElement;
    await act(async () => {
      nudgesTab.click();
    });
    expect(container.querySelector('[data-testid="cooldown-slider"]')).not.toBeNull();

    // Switch to Data Transparency tab
    const transTab = container.querySelector('[data-testid="tab-data-transparency"]') as HTMLButtonElement;
    await act(async () => {
      transTab.click();
    });
    expect(container.querySelector('[data-testid="data-transparency-table-container"]')).not.toBeNull();

    // Switch to Privacy tab
    const privacyTab = container.querySelector('[data-testid="tab-privacy-data"]') as HTMLButtonElement;
    await act(async () => {
      privacyTab.click();
    });
    expect(container.querySelector('[data-testid="export-data-button"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="delete-all-data-button"]')).not.toBeNull();
  });

  it('updates nudge settings: sensitivity, cooldown, quiet hours, and blocked sites unblock', async () => {
    await act(async () => {
      root.render(<OptionsApp />);
    });

    // Go to Nudges tab
    const nudgesTab = container.querySelector('[data-testid="tab-nudges-policy"]') as HTMLButtonElement;
    await act(async () => {
      nudgesTab.click();
    });

    // Click 'high' sensitivity
    const highBtn = container.querySelector('[data-testid="sensitivity-high"]') as HTMLButtonElement;
    await act(async () => {
      highBtn.click();
    });
    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'UPDATE_SETTINGS',
      updates: { nudgeSensitivity: 'high' },
    });

    // Slider adjustment
    const slider = container.querySelector('[data-testid="cooldown-slider"]') as HTMLInputElement;
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeSetter?.call(slider, '25');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'UPDATE_SETTINGS',
      updates: { cooldownMin: 25 },
    });

    // Unblock site
    const unblockBtn = container.querySelector('[data-testid="unblock-site-example.com"]') as HTMLButtonElement;
    expect(unblockBtn).not.toBeNull();
    await act(async () => {
      unblockBtn.click();
    });
    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'UPDATE_SETTINGS',
      updates: { blockedSites: [] },
    });
  });

  it('reflects code consent state dynamically in Data Transparency Table', async () => {
    // 1. Initial: code consent false
    await act(async () => {
      root.render(<OptionsApp />);
    });

    const transTab = container.querySelector('[data-testid="tab-data-transparency"]') as HTMLButtonElement;
    await act(async () => {
      transTab.click();
    });

    expect(container.querySelector('[data-testid="code-consent-status-excluded"]')).not.toBeNull();

    // 2. Go to Privacy tab, enable code consent
    const privacyTab = container.querySelector('[data-testid="tab-privacy-data"]') as HTMLButtonElement;
    await act(async () => {
      privacyTab.click();
    });

    const codeToggle = container.querySelector('[data-testid="code-consent-toggle"]') as HTMLButtonElement;
    await act(async () => {
      codeToggle.click();
    });

    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'UPDATE_SETTINGS',
      updates: { includeCodeConsent: true },
    });

    // 3. Return to Transparency tab: should now show allowed status
    await act(async () => {
      transTab.click();
    });

    expect(container.querySelector('[data-testid="code-consent-status-allowed"]')).not.toBeNull();
  });

  it('enforces typed "DELETE" in modal before executing permanent deletion', async () => {
    await act(async () => {
      root.render(<OptionsApp />);
    });

    const privacyTab = container.querySelector('[data-testid="tab-privacy-data"]') as HTMLButtonElement;
    await act(async () => {
      privacyTab.click();
    });

    const deleteBtn = container.querySelector('[data-testid="delete-all-data-button"]') as HTMLButtonElement;
    await act(async () => {
      deleteBtn.click();
    });

    // Modal is open
    expect(container.querySelector('[data-testid="wipe-modal"]')).not.toBeNull();
    const confirmBtn = container.querySelector('[data-testid="confirm-delete-btn"]') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    const input = container.querySelector('[data-testid="delete-confirm-input"]') as HTMLInputElement;

    // Type partial or wrong string
    await act(async () => {
      input.value = 'del';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // In React controlled component, we set target value directly via event
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(input, 'del');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(confirmBtn.disabled).toBe(true);

    // Type exact string "DELETE"
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(input, 'DELETE');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="delete-matched-badge"]')).not.toBeNull();
    expect(confirmBtn.disabled).toBe(false);

    // Click confirm
    await act(async () => {
      confirmBtn.click();
    });

    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'DELETE_ALL_DATA',
    });
  });

  it('triggers JSON export download on clicking export button', async () => {
    await act(async () => {
      root.render(<OptionsApp />);
    });

    const privacyTab = container.querySelector('[data-testid="tab-privacy-data"]') as HTMLButtonElement;
    await act(async () => {
      privacyTab.click();
    });

    const exportBtn = container.querySelector('[data-testid="export-data-button"]') as HTMLButtonElement;
    await act(async () => {
      exportBtn.click();
    });

    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'EXPORT_DATA',
    });
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });
});
