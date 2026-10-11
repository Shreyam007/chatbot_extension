export const OVERLAY_STYLES = `
:host {
  all: initial;
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #dae2fd;
  box-sizing: border-box;
  pointer-events: none;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.unstuck-card {
  pointer-events: auto;
  position: relative;
  width: 380px;
  max-width: calc(100vw - 32px);
  background-color: #171f33;
  border-radius: 12px;
  border-left: 4px solid #4be277;
  border-top: 1px solid rgba(61, 74, 61, 0.4);
  border-right: 1px solid rgba(61, 74, 61, 0.4);
  border-bottom: 1px solid rgba(61, 74, 61, 0.4);
  box-shadow: 0 12px 36px -6px rgba(0, 0, 0, 0.65), 0 0 20px 0 rgba(75, 226, 119, 0.1);
  overflow: visible;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  animation: unstuck-slide-in 0.3s ease-out forwards;
}

@keyframes unstuck-slide-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.unstuck-card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unstuck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  padding-bottom: 4px;
}

.unstuck-header:active {
  cursor: grabbing;
}

.unstuck-badge-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unstuck-icon-box {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: rgba(75, 226, 119, 0.15);
  border: 1px solid rgba(75, 226, 119, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4be277;
  font-size: 16px;
}

.unstuck-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  background-color: rgba(75, 226, 119, 0.15);
  color: #4be277;
  border: 1px solid rgba(75, 226, 119, 0.3);
  text-transform: uppercase;
}

.unstuck-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.unstuck-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #869585;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.unstuck-icon-btn:hover {
  color: #dae2fd;
  background-color: rgba(255, 255, 255, 0.1);
}

.unstuck-snooze-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 210px;
  background-color: #131b2e;
  border: 1px solid rgba(61, 74, 61, 0.6);
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  animation: unstuck-popover 0.15s ease-out forwards;
}

@keyframes unstuck-popover {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.unstuck-snooze-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #dae2fd;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
  width: 100%;
}

.unstuck-snooze-item:hover {
  background-color: #222a3d;
  color: #ffffff;
}

.unstuck-snooze-item-danger {
  color: #ffb4ab;
  border-top: 1px solid rgba(61, 74, 61, 0.3);
  margin-top: 4px;
  padding-top: 8px;
}

.unstuck-snooze-item-danger:hover {
  background-color: rgba(147, 0, 10, 0.25);
  color: #ffdad6;
}

.unstuck-title-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.unstuck-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #dae2fd;
  line-height: 1.3;
}

.unstuck-body {
  font-size: 12px;
  line-height: 1.45;
  color: #bccbb9;
}

.unstuck-socratic-preview {
  padding: 8px 10px;
  border-radius: 8px;
  background-color: #0b1326;
  border: 1px solid rgba(61, 74, 61, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: #869585;
}

.unstuck-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.unstuck-btn-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unstuck-primary-btn {
  background-color: #22c55e;
  color: #002109;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.unstuck-primary-btn:hover {
  background-color: #4be277;
  transform: translateY(-1px);
}

.unstuck-primary-btn:active {
  transform: translateY(0);
}

.unstuck-secondary-btn {
  background-color: #222a3d;
  color: #bccbb9;
  border: 1px solid rgba(61, 74, 61, 0.5);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.unstuck-secondary-btn:hover {
  background-color: #31394d;
  color: #ffffff;
}

.unstuck-esc-badge {
  font-size: 11px;
  color: #869585;
  display: flex;
  align-items: center;
  gap: 4px;
}

.unstuck-kbd {
  padding: 2px 5px;
  border-radius: 4px;
  background-color: #0b1326;
  border: 1px solid #3d4a3d;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #bccbb9;
}

.unstuck-progress-track {
  width: 100%;
  height: 3px;
  background-color: #0b1326;
  overflow: hidden;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.unstuck-progress-bar {
  height: 100%;
  background-color: #4be277;
  width: 100%;
  transform-origin: left;
  animation: unstuck-countdown 8s linear forwards;
}

@keyframes unstuck-countdown {
  from { width: 100%; }
  to { width: 0%; }
}

/* Compact FAB Variant */
.unstuck-fab-container {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unstuck-fab {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: #171f33;
  border: 1px solid rgba(61, 74, 61, 0.6);
  color: #4be277;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.unstuck-fab:hover {
  transform: scale(1.08);
  border-color: #4be277;
}

.unstuck-fab:active {
  transform: scale(0.95);
}

.unstuck-fab-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-color: rgba(75, 226, 119, 0.25);
  animation: unstuck-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

@keyframes unstuck-pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.4); opacity: 0.05; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.unstuck-fab-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #22c55e;
  border: 2px solid #171f33;
}

.unstuck-hidden {
  display: none !important;
}
`;
