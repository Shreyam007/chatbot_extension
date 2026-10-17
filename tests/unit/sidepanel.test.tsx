// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

// Set React act environment flag
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { Header } from '../../src/sidepanel/components/Header';
import { Navigation } from '../../src/sidepanel/components/Navigation';
import { HintsTab } from '../../src/sidepanel/components/HintsTab';
import { ChatTab, type ChatMessage } from '../../src/sidepanel/components/ChatTab';
import { TraceTab } from '../../src/sidepanel/components/TraceTab';
import { ProgressTab } from '../../src/sidepanel/components/ProgressTab';
import { SolvedModal } from '../../src/sidepanel/components/SolvedModal';
import { ErrorStateView } from '../../src/sidepanel/components/ErrorStateView';
import { ContextualStateView } from '../../src/sidepanel/components/ContextualStateView';
import type { PageContext } from '../../src/shared/schemas/context';
import type { Hint } from '../../src/shared/schemas/hints';
import type { AgentRunTrace } from '../../src/background/graph/types';

describe('Side Panel Components & S03-S14 States (Step 10)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const mockContext: PageContext = {
    url: 'https://leetcode.com/problems/two-sum',
    site: 'leetcode',
    title: '1. Two Sum',
    statementText: 'Given an array of integers nums...',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    isContest: false,
    detectedAt: Date.now(),
  };

  const mockHint: Hint = {
    id: 'hint-test-1',
    level: 2,
    text: "Think about trading space for time with a hash map.",
    confidence: 0.85,
    checks: { leak: false, grounded: true, relevant: true },
    retries: 0,
    model: 'gemini-2.5-flash',
    latencyMs: 180,
  };

  describe('Header Component', () => {
    it('renders brand, watching status, and problem context bar', () => {
      act(() => {
        root.render(
          <Header
            context={mockContext}
            isWatching={true}
            isPaused={false}
            isContest={false}
            onTogglePause={vi.fn()}
            onOpenSettings={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Unstuck');
      expect(container.textContent).toContain('Watching');
      expect(container.textContent).toContain('1. Two Sum');
      expect(container.textContent).toContain('Easy');
      expect(container.textContent).toContain('Array');
    });

    it('displays Contest mode badge when isContest is true', () => {
      act(() => {
        root.render(
          <Header
            context={mockContext}
            isWatching={false}
            isPaused={false}
            isContest={true}
            onTogglePause={vi.fn()}
            onOpenSettings={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Contest');
      expect(container.textContent).not.toContain('Watching');
    });

    it('displays Paused badge and Resume action when isPaused is true', () => {
      act(() => {
        root.render(
          <Header
            context={mockContext}
            isWatching={false}
            isPaused={true}
            isContest={false}
            onTogglePause={vi.fn()}
            onOpenSettings={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Paused');
      expect(container.textContent).toContain('Resume');
    });
  });

  describe('Navigation Component', () => {
    it('renders 4 tabs with accessible ARIA tablist roles', () => {
      const onTabChange = vi.fn();
      act(() => {
        root.render(
          <Navigation
            activeTab="hints"
            onTabChange={onTabChange}
            chatBadgeCount={3}
          />
        );
      });

      const tabs = container.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(4);
      expect(container.textContent).toContain('Chat');
      expect(container.textContent).toContain('Hints');
      expect(container.textContent).toContain('Trace');
      expect(container.textContent).toContain('Progress');
      expect(container.textContent).toContain('3'); // unread badge

      const chatTab = container.querySelector('#tab-chat') as HTMLButtonElement;
      act(() => {
        chatTab.click();
      });
      expect(onTabChange).toHaveBeenCalledWith('chat');
    });
  });

  describe('HintsTab Component (S05, S06)', () => {
    it('renders stepper, confidence score, and critic verification badge', () => {
      act(() => {
        root.render(
          <HintsTab
            currentLevel={2}
            activeHint={mockHint}
            isLoading={false}
            onNextLevel={vi.fn()}
            onMakeMoreDirect={vi.fn()}
            onSolved={vi.fn()}
            onFeedback={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Level 2 of 4');
      expect(container.textContent).toContain('Confidence 85%');
      expect(container.textContent).toContain('Checked by Critic: No spoiler code detected');
      expect(container.textContent).toContain('Think about trading space for time');
    });

    it('opens thumbs down feedback reason chips when not helpful is clicked', () => {
      const onFeedback = vi.fn();
      act(() => {
        root.render(
          <HintsTab
            currentLevel={2}
            activeHint={mockHint}
            isLoading={false}
            onNextLevel={vi.fn()}
            onMakeMoreDirect={vi.fn()}
            onSolved={vi.fn()}
            onFeedback={onFeedback}
          />
        );
      });

      const downBtn = container.querySelector('button[aria-label="Not helpful"]') as HTMLButtonElement;
      expect(downBtn).not.toBeNull();
      act(() => {
        downBtn.click();
      });

      expect(container.textContent).toContain('Tell us what needs calibration:');
      expect(container.textContent).toContain('Too vague');
      expect(container.textContent).toContain('Gave too much');
      expect(container.textContent).toContain('Wrong direction');

      // Click "Too vague"
      const reasonBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Too vague'
      );
      expect(reasonBtn).toBeDefined();
      act(() => {
        reasonBtn?.click();
      });
      expect(onFeedback).toHaveBeenCalledWith('hint-test-1', false, 'Too vague');
    });

    it('renders L4 double confirmation guard when advancing to Level 4', () => {
      act(() => {
        root.render(
          <HintsTab
            currentLevel={3}
            activeHint={mockHint}
            isLoading={false}
            onNextLevel={vi.fn()}
            onMakeMoreDirect={vi.fn()}
            onSolved={vi.fn()}
            onFeedback={vi.fn()}
          />
        );
      });

      const nextBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Next hint (L4)')
      );
      expect(nextBtn).toBeDefined();
      act(() => {
        nextBtn?.click();
      });

      expect(container.textContent).toContain('Guarded: Level 4 Full Solution');
      expect(container.textContent).toContain('Reveal Full Solution');
    });
  });

  describe('ChatTab Component (S03)', () => {
    it('renders empty state with 3 suggestion chips', () => {
      const onSendMessage = vi.fn();
      act(() => {
        root.render(
          <ChatTab
            messages={[]}
            isLoading={false}
            onSendMessage={onSendMessage}
            onHighlightQuote={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Ask me anything about this problem.');
      expect(container.textContent).toContain('Explain this problem');
      expect(container.textContent).toContain('Give me a direction');
      expect(container.textContent).toContain('Check my approach');

      // Click first prompt chip
      const promptBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Explain this problem')
      );
      act(() => {
        promptBtn?.click();
      });
      expect(onSendMessage).toHaveBeenCalled();
    });

    it('renders generic page empty state with article/page chips when contentType is article', () => {
      act(() => {
        root.render(
          <ChatTab
            messages={[]}
            isLoading={false}
            contentType="article"
            onSendMessage={vi.fn()}
            onHighlightQuote={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('Ask me anything about this page.');
      expect(container.textContent).toContain('Explain this page and what it offers');
      expect(container.textContent).toContain('Summarise all details on this page in short points');
    });

    it('renders conversation messages and triggers highlight on citation click', () => {
      const onHighlight = vi.fn();
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          sender: 'user',
          text: 'How do I do this in O(n)?',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          sender: 'assistant',
          text: 'Use a single pass hash table.',
          timestamp: Date.now(),
          groundedQuote: 'return indices of the two numbers',
          confidence: 0.91,
          criticChecked: true,
        },
      ];

      act(() => {
        root.render(
          <ChatTab
            messages={messages}
            isLoading={false}
            onSendMessage={vi.fn()}
            onHighlightQuote={onHighlight}
          />
        );
      });

      expect(container.textContent).toContain('How do I do this in O(n)?');
      expect(container.textContent).toContain('Use a single pass hash table.');
      expect(container.textContent).toContain('Critic: Checked');

      const citationPill = container.querySelector('[title*="Click to locate"]') as HTMLDivElement;
      expect(citationPill).not.toBeNull();
      act(() => {
        citationPill.click();
      });
      expect(onHighlight).toHaveBeenCalledWith('return indices of the two numbers');
    });

    it('renders Low Confidence badge when confidence <= 0.48', () => {
      act(() => {
        root.render(
          <ChatTab
            messages={[
              {
                id: 'msg-low',
                sender: 'assistant',
                text: 'Maybe try binary search?',
                timestamp: Date.now(),
                confidence: 0.4,
                criticChecked: false,
              },
            ]}
            isLoading={false}
            onSendMessage={vi.fn()}
            onHighlightQuote={vi.fn()}
          />
        );
      });
      expect(container.textContent).toContain('Low confidence');
    });
  });

  describe('TraceTab Component (S07)', () => {
    it('renders empty state when no traces exist', () => {
      act(() => {
        root.render(<TraceTab traces={[]} />);
      });
      expect(container.textContent).toContain('No trace telemetry yet');
    });

    it('renders telemetry stat bento and 4 agent nodes', () => {
      const mockTrace: AgentRunTrace = {
        id: 'trace-1',
        problemHash: 'two-sum',
        requestedLevel: 2,
        startTime: Date.now(),
        totalDurationMs: 2400,
        nodeTimings: [
          { node: 'detector', startTime: 0, durationMs: 180 },
          { node: 'planner', startTime: 180, durationMs: 12 },
          { node: 'context_builder', startTime: 192, durationMs: 10, details: { statementLength: 200 } },
          { node: 'hint_generator', startTime: 202, durationMs: 1800 },
          { node: 'critic', startTime: 2002, durationMs: 240 },
          { node: 'deliver', startTime: 2242, durationMs: 15 },
        ],
        retries: 0,
        criticEvaluations: [
          {
            pass: true,
            leak: false,
            grounded: true,
            relevant: true,
            confidence: 0.94,
            reason: 'APPROVED',
          },
        ],
        isFallback: false,
        model: 'gemini-2.5-flash',
      };

      act(() => {
        root.render(
          <TraceTab
            traces={[mockTrace]}
            activePStuck={0.78}
            contributions={{
              dwell: 0.85,
              scrollReversals: 0.72,
              wrongSubmissions: 0.9,
              tabSwitches: 0.45,
            }}
          />
        );
      });

      expect(container.textContent).toContain('Trace');
      expect(container.textContent).toContain('2.4s');
      expect(container.textContent).toContain('4/4');
      expect(container.textContent).toContain('1. Detector Agent');
      expect(container.textContent).toContain('2. Planner Agent');
      expect(container.textContent).toContain('3. Generator Agent');
      expect(container.textContent).toContain('4. Critic Agent');
      expect(container.textContent).toContain('p(stuck) = 0.78');
      expect(container.textContent).toContain('Dwell weight');
      expect(container.textContent).toContain('Scroll reversals');
      expect(container.textContent).toContain('Wrong verdicts');
    });
  });

  describe('ProgressTab Component (S10)', () => {
    it('renders empty states when no topics exist', () => {
      act(() => {
        root.render(
          <ProgressTab
            topics={[]}
            weeklySolved={0}
            hintsPerSolve={0}
            nudgeAcceptRate={0}
          />
        );
      });
      expect(container.textContent).toContain('No topic mastery recorded yet');
      expect(container.textContent).toContain('No problem completion history yet');
    });

    it('renders weekly summary metrics, telemetry, and mastery accordion', () => {
      act(() => {
        root.render(
          <ProgressTab
            topics={[
              { topic: 'Arrays & Hashing', pKnown: 0.75, attempts: 4, hintsUsed: 2 },
              { topic: 'Two Pointers', pKnown: 0.5, attempts: 2, hintsUsed: 3 },
            ]}
            weeklySolved={8}
            hintsPerSolve={1.5}
            nudgeAcceptRate={0.75}
          />
        );
      });

      expect(container.textContent).toContain('Solved this week');
      expect(container.textContent).toContain('8');
      expect(container.textContent).toContain('Topic mastery');
      expect(container.textContent).toContain('Arrays & Hashing');
      expect(container.textContent).toContain('Two Pointers');
      expect(container.textContent).toContain('Weak');
    });
  });

  describe('SolvedModal Component (S12)', () => {
    it('renders S12 celebration hero and 2x2 session metrics', () => {
      const onDismiss = vi.fn();
      act(() => {
        root.render(
          <SolvedModal
            problemTitle="1. Two Sum"
            timeTaken="18m 40s"
            hintsUsedCount={2}
            topic="Arrays & Hash"
            masteryGain="+5%"
            newMasteryPct={77}
            onDismiss={onDismiss}
          />
        );
      });

      expect(container.textContent).toContain('Solved. Nice.');
      expect(container.textContent).toContain('1. Two Sum');
      expect(container.textContent).toContain('18m 40s');
      expect(container.textContent).toContain('2');
      expect(container.textContent).toContain('Arrays & Hash');
      expect(container.textContent).toContain('+5%');
      expect(container.textContent).toContain('77%');

      const keepPracticingBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Keep Practicing')
      );
      expect(keepPracticingBtn).toBeDefined();
      act(() => {
        keepPracticingBtn?.click();
      });
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('S13 Error States', () => {
    it('renders S13.1 No API Key with options link', () => {
      const onOpenSettings = vi.fn();
      act(() => {
        root.render(
          <ErrorStateView
            type="no_api_key"
            onOpenSettings={onOpenSettings}
          />
        );
      });

      expect(container.textContent).toContain('Connect your Gemini Key');
      const settingsBtn = container.querySelector('button');
      act(() => {
        settingsBtn?.click();
      });
      expect(onOpenSettings).toHaveBeenCalled();
    });

    it('renders S13.2 Offline state', () => {
      act(() => {
        root.render(<ErrorStateView type="offline" onRetry={vi.fn()} />);
      });
      expect(container.textContent).toContain("You're offline");
    });

    it('renders S13.3 Rate Limited state with countdown', () => {
      act(() => {
        root.render(<ErrorStateView type="rate_limited" retryAfterSeconds={15} />);
      });
      expect(container.textContent).toContain('Quota Rate Limited');
      expect(container.textContent).toContain('15s remaining');
    });

    it('renders S13.4 Timeout state with retry button', () => {
      const onRetry = vi.fn();
      act(() => {
        root.render(<ErrorStateView type="timeout" onRetry={onRetry} />);
      });
      expect(container.textContent).toContain('Request Timed Out');
      const retryBtn = container.querySelector('button');
      act(() => {
        retryBtn?.click();
      });
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('S14 Contextual States', () => {
    it('renders S14.1 No Problem Detected with open chat CTA', () => {
      const onOpenChat = vi.fn();
      act(() => {
        root.render(
          <ContextualStateView
            type="no_problem"
            onOpenChat={onOpenChat}
          />
        );
      });
      expect(container.textContent).toContain("I can't find a problem on this page");
      const chatBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Open Chat Anyway')
      );
      act(() => {
        chatBtn?.click();
      });
      expect(onOpenChat).toHaveBeenCalled();
    });

    it('renders S14.2 Contest Fairness Lock', () => {
      act(() => {
        root.render(<ContextualStateView type="contest" />);
      });
      expect(container.textContent).toContain('Contest Mode Active');
      expect(container.textContent).toContain('LLM hint generation silenced');
    });

    it('renders S14.3 Observation Paused with resume button', () => {
      const onResume = vi.fn();
      act(() => {
        root.render(<ContextualStateView type="paused" onResume={onResume} />);
      });
      expect(container.textContent).toContain('Tutor is paused');
      const resumeBtn = container.querySelector('button');
      act(() => {
        resumeBtn?.click();
      });
      expect(onResume).toHaveBeenCalled();
    });
  });
});
