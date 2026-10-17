import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Promise Safety Static Verification', () => {
  const sidepanelDir = path.resolve(__dirname, '../../src/sidepanel');

  it('SidePanelApp.tsx never throws raw PREVIEW_CANCELLED error directly', () => {
    const sidePanelAppCode = fs.readFileSync(path.join(sidepanelDir, 'SidePanelApp.tsx'), 'utf-8');
    // Ensure raw throw/reject with new Error('PREVIEW_CANCELLED') is gone
    expect(sidePanelAppCode).not.toContain("new Error('PREVIEW_CANCELLED')");
    expect(sidePanelAppCode).not.toContain('new Error("PREVIEW_CANCELLED")');
    // Ensure cancelPendingAction is used instead
    expect(sidePanelAppCode).toContain("cancelPendingAction('PREVIEW_CANCELLED')");
  });

  it('ChatTab.tsx handles all onSendMessage invocations with cancellation safety', () => {
    const chatTabCode = fs.readFileSync(path.join(sidepanelDir, 'components/ChatTab.tsx'), 'utf-8');
    
    // Check handleSubmit contains isCancellation check
    expect(chatTabCode).toContain('isCancellation(err)');

    // Ensure all bare invocations like onClick={() => onSendMessage(...)} are wrapped with Promise.resolve().catch()
    // Finding all onClick lines calling onSendMessage:
    const lines = chatTabCode.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('onSendMessage(') && !line.includes('onSendMessage:') && !line.includes('await onSendMessage(')) {
        // If it calls onSendMessage synchronously in an event, it should be wrapped with Promise.resolve or void or catch
        const isWrapped = line.includes('Promise.resolve(onSendMessage') || line.includes('catch') || lines[index - 1]?.includes('Promise.resolve(onSendMessage');
        expect(
          isWrapped,
          `Line ${index + 1} has unhandled onSendMessage: "${line.trim()}"`
        ).toBe(true);
      }
    });
  });

  it('Global error handler is installed in sidepanel, popup, and options entry points', () => {
    const sidepanelIndex = fs.readFileSync(path.join(sidepanelDir, 'index.tsx'), 'utf-8');
    const popupIndex = fs.readFileSync(path.resolve(__dirname, '../../src/popup/index.tsx'), 'utf-8');
    const optionsIndex = fs.readFileSync(path.resolve(__dirname, '../../src/options/index.tsx'), 'utf-8');

    expect(sidepanelIndex).toContain("installGlobalErrorHandlers('sidepanel')");
    expect(popupIndex).toContain("installGlobalErrorHandlers('popup')");
    expect(optionsIndex).toContain("installGlobalErrorHandlers('options')");
  });
});
