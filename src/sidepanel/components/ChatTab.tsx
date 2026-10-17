import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Lightbulb,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Compass,
  RefreshCw,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';
import type { HintLevel } from '../../shared/schemas/hints';
import type { PageProfile } from '../../shared/page-profile';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  groundedQuote?: string;
  codeBlock?: string;
  confidence?: number;
  criticChecked?: boolean;
  badgeStatus?: 'checked' | 'checked_basic' | 'partly_verified' | 'unverified' | 'low_confidence';
  retrievalMode?: 'bm25' | 'coverage' | 'selection' | 'full';
  coverageStats?: { covered: number; total: number };
  llmCallCount?: number;
  model?: string;
  isError?: boolean;
  errorReason?: string;
  errorCode?: string;
  unverifiedDraft?: string;
  sectionsUsed?: string[];
}

export interface ChatTabProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (query: string, level?: HintLevel) => Promise<void> | void;
  onHighlightQuote: (quote: string, msgId?: string) => Promise<boolean | void> | boolean | void;
  siteName?: string;
  contentType?: string;
  isTruncatedPage?: boolean;
  pageProfile?: PageProfile;
}

const DraftToggle: React.FC<{ draft: string }> = ({ draft }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[11px] font-mono text-on-surface-variant hover:text-on-surface underline underline-offset-2 flex items-center gap-1 transition-colors"
      >
        <Eye className="w-3 h-3" />
        <span>{isOpen ? 'Hide raw unverified draft' : 'View raw unverified draft'}</span>
      </button>
      {isOpen && (
        <div className="mt-1.5 p-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs font-mono text-on-surface-variant whitespace-pre-wrap select-text leading-relaxed">
          {draft}
        </div>
      )}
    </div>
  );
};

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onHighlightQuote,
  siteName = 'Page',
  contentType,
  isTruncatedPage,
  pageProfile,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<HintLevel>(1);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightStatus, setHighlightStatus] = useState<Record<string, 'highlighting' | 'highlighted' | 'not_found'>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;

    // Preserve text in input until acknowledged; if error occurs, user keeps their text
    const backup = query;
    try {
      await onSendMessage(query, selectedLevel);
      setInputText('');
    } catch {
      setInputText(backup);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleHighlightClick = async (quote: string, msgId: string) => {
    setHighlightStatus((prev) => ({ ...prev, [msgId]: 'highlighting' }));
    try {
      const res = await onHighlightQuote(quote);
      if (res === false) {
        setHighlightStatus((prev) => ({ ...prev, [msgId]: 'not_found' }));
      } else {
        setHighlightStatus((prev) => ({ ...prev, [msgId]: 'highlighted' }));
      }
    } catch {
      setHighlightStatus((prev) => ({ ...prev, [msgId]: 'not_found' }));
    }

    setTimeout(() => {
      setHighlightStatus((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
    }, 3500);
  };

  const isGeneric = Boolean(contentType && contentType !== 'problem');
  const showLevels = pageProfile ? pageProfile.showLevels : !isGeneric;

  const levelLabels: Record<HintLevel, string> = isGeneric
    ? {
        1: 'Auto (Pointer)',
        2: 'Explain simply',
        3: 'Worked example',
        4: 'Full explanation',
      }
    : {
        1: 'Auto (L1 Direction)',
        2: 'L2 Approach',
        3: 'L3 Pseudocode',
        4: 'L4 Full Solution',
      };

  const inputPlaceholder = pageProfile
    ? pageProfile.placeholder
    : isGeneric
    ? 'Ask a question about this page...'
    : 'Ask a question about this problem...';

  const emptyTitle = pageProfile
    ? pageProfile.emptyStateTitle
    : isGeneric
    ? 'Ask me anything about this page.'
    : 'Ask me anything about this problem.';

  const emptyBody = pageProfile
    ? pageProfile.emptyStateBody
    : isGeneric
    ? 'I can explain sections, summarize details, or locate specific information on this page.'
    : "I'll give progressive hints, not code dumps. Current solution code and constraints are already indexed.";

  const rawChips: string[] =
    pageProfile?.chips ||
    (isGeneric
      ? [
          'Explain this page and what it offers',
          'Summarise all details on this page in short points',
          'What are the key sections, topics, or requirements here?',
        ]
      : [
          'Explain this problem',
          'Give me a direction',
          'Check my approach',
        ]);
  const chips = rawChips.map((c) => ({ label: c, query: c }));

  const getBadgeDetails = (msg: ChatMessage) => {
    const status =
      msg.badgeStatus ||
      (msg.criticChecked && (msg.confidence ?? 1) > 0.48
        ? 'checked'
        : msg.confidence !== undefined && msg.confidence <= 0.48
        ? 'low_confidence'
        : 'unverified');

    const tooltipParts: string[] = [];
    if (msg.criticChecked) tooltipParts.push('Automated Critic passed');
    if (msg.retrievalMode) tooltipParts.push(`Retrieval: ${msg.retrievalMode}`);
    if (msg.coverageStats) tooltipParts.push(`Coverage: ${msg.coverageStats.covered}/${msg.coverageStats.total} chars`);
    if (msg.llmCallCount !== undefined) tooltipParts.push(`Calls: ${msg.llmCallCount}`);
    if (msg.model) tooltipParts.push(`Model: ${msg.model}`);
    const tooltipText = tooltipParts.length > 0 ? tooltipParts.join(' • ') : undefined;

    switch (status) {
      case 'checked':
        return {
          label: 'Critic: Checked',
          classes: 'bg-primary/10 text-primary border-primary/30',
          icon: <ShieldCheck className="w-3 h-3 text-primary" />,
          tooltip: tooltipText,
        };
      case 'checked_basic':
        return {
          label: 'Critic: Checked (basic)',
          classes: 'bg-primary/10 text-primary border-primary/30',
          icon: <ShieldCheck className="w-3 h-3 text-primary" />,
          tooltip: tooltipText,
        };
      case 'partly_verified':
        return {
          label: 'Partly verified (quote dropped)',
          classes: 'bg-tertiary/10 text-tertiary border-tertiary/30',
          icon: <ShieldAlert className="w-3 h-3 text-tertiary" />,
          tooltip: tooltipText,
        };
      case 'low_confidence':
        return {
          label: 'Low confidence',
          classes: 'bg-error/10 text-error border-error/30',
          icon: <AlertTriangle className="w-3 h-3 text-error" />,
          tooltip: tooltipText,
        };
      case 'unverified':
      default:
        return {
          label: 'Unverified',
          classes: 'bg-outline/10 text-on-surface-variant border-outline/30',
          icon: <ShieldAlert className="w-3 h-3 text-outline" />,
          tooltip: tooltipText,
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          /* Empty State per S03 & PageProfile */
          <div className="flex flex-col items-center justify-center text-center py-6 px-2 my-auto select-none">
            {/* Watermark */}
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center border border-outline-variant/40 mb-3 text-primary/80">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.485 8.485l2.122 2.122M5.636 18.364l2.122-2.122m8.485-8.485l2.122-2.122" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>

            <h2 className="text-on-surface font-mono text-sm font-semibold mb-1">
              {emptyTitle}
            </h2>
            <p className="text-on-surface-variant font-sans text-xs max-w-[280px] mb-4 leading-relaxed">
              {emptyBody}
            </p>

            {/* Suggested Question Chips */}
            <div className="w-full max-w-sm flex flex-col gap-2">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (chip.query === 'Paste text to ask about') {
                      setInputText('Here is the text:\n\n');
                    } else {
                      onSendMessage(chip.query, 1);
                    }
                  }}
                  className="w-full text-left bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary/50 p-2.5 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    {idx === 0 ? (
                      <Lightbulb className="w-4 h-4 text-tertiary" />
                    ) : idx === 1 ? (
                      <Compass className="w-4 h-4 text-secondary" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-on-surface font-mono text-xs group-hover:text-primary transition-colors">
                      {chip.label}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              {msg.sender === 'user' ? (
                /* User query bubble */
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm p-3 text-on-surface font-sans text-xs select-text leading-relaxed break-words [overflow-wrap:anywhere]">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className="block text-right text-[10px] font-mono text-on-surface-variant/70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ) : (
                /* Assistant response card */
                <article
                  className={`bg-surface-container border rounded-xl p-3 space-y-2.5 transition-all max-w-[95%] shadow-sm ${
                    msg.isError
                      ? 'border-error/40 bg-error/5'
                      : 'border-outline-variant/30 hover:border-outline-variant/60'
                  }`}
                  aria-label="Assistant response"
                >
                  {/* Top metadata pill bar */}
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-1.5 gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="font-mono text-[10px] text-on-surface-variant truncate">
                        Unstuck Tutor
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Dynamic Verification Badge */}
                      {(() => {
                        const badge = getBadgeDetails(msg);
                        return (
                          <div
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono text-[9px] border ${badge.classes}`}
                            title={badge.tooltip}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </div>
                        );
                      })()}

                      {/* Confidence Score Pill */}
                      {msg.confidence !== undefined && (
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
                            msg.confidence > 0.65
                              ? 'text-primary bg-primary/10 border-primary/20'
                              : msg.confidence > 0.48
                              ? 'text-secondary bg-secondary/10 border-secondary/20'
                              : 'text-error bg-error/10 border-error/20'
                          }`}
                          title={`Confidence: ${Math.round(msg.confidence * 100)}%`}
                        >
                          {Math.round(msg.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Truncation notification banner */}
                  {isTruncatedPage && (
                    <div className="flex items-center gap-1.5 p-1.5 rounded bg-tertiary/10 border border-tertiary/20 text-tertiary text-[10px] font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Note: Page was partially trimmed to fit context budget.</span>
                    </div>
                  )}

                  {/* Body Text / Error State */}
                  {msg.isError ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-error/10 border border-error/20 text-error">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="text-xs font-sans space-y-1">
                          <p className="font-semibold font-mono text-[11px]">
                            {msg.errorCode === 'GROUNDING_FAILED'
                              ? 'Grounding Verification Failed'
                              : 'Unable to verify response'}
                          </p>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => onSendMessage(messages[messages.length - 2]?.text || 'Retry', 1)}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 font-mono text-[10px] text-on-surface flex items-center gap-1 transition-colors"
                          title="Retry generation"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>

                        {msg.unverifiedDraft && (
                          <DraftToggle draft={msg.unverifiedDraft} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-sans text-on-surface space-y-2 leading-relaxed break-words [overflow-wrap:anywhere] select-text">
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  )}

                  {/* Code block if present */}
                  {msg.codeBlock && (
                    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2.5 overflow-hidden w-full min-w-0">
                      <div className="flex items-center justify-between text-[10px] font-mono text-outline border-b border-outline-variant/20 pb-1 mb-1.5">
                        <span className="font-medium">Detected Pattern</span>
                        <span className="text-secondary">Code Scaffold</span>
                      </div>
                      <pre className="font-mono text-[11px] text-on-surface overflow-x-auto whitespace-pre custom-scrollbar leading-tight p-1">
                        <code>{msg.codeBlock}</code>
                      </pre>
                    </div>
                  )}

                  {/* "From the page" Citation Pill (highlights on page with real feedback) */}
                  {msg.groundedQuote && (
                    <div
                      onClick={() => handleHighlightClick(msg.groundedQuote!, msg.id)}
                      className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-secondary/50 cursor-pointer transition-colors group w-full min-w-0"
                      title="Click to locate and highlight this quote on active page"
                    >
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <span className="text-[12px] text-secondary font-mono shrink-0">“</span>
                        <span className="font-mono text-[11px] text-on-surface-variant truncate">
                          {msg.groundedQuote}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                        {highlightStatus[msg.id] === 'highlighting' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-secondary" />
                            <span className="text-secondary">Locating...</span>
                          </>
                        ) : highlightStatus[msg.id] === 'highlighted' ? (
                          <>
                            <Check className="w-3 h-3 text-primary" />
                            <span className="text-primary font-semibold">Highlighted</span>
                          </>
                        ) : highlightStatus[msg.id] === 'not_found' ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-tertiary" />
                            <span className="text-tertiary">Not found on page</span>
                          </>
                        ) : (
                          <>
                            <span className="text-secondary opacity-80 group-hover:opacity-100">Highlight</span>
                            <ExternalLink className="w-3 h-3 text-secondary opacity-80 group-hover:opacity-100" />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-outline border-t border-outline-variant/20 pt-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1 rounded hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center gap-1"
                        title="Copy message text"
                        aria-label="Copy message text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-primary" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </article>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface-variant text-xs font-mono">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Unstuck Tutor is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <footer className="p-2.5 bg-surface-container-low border-t border-outline-variant/40 shrink-0 space-y-1.5">
        {/* Level selector if enabled */}
        <div className="flex items-center justify-between gap-2 px-1">
          {showLevels ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-[11px] font-mono text-on-surface transition-colors"
                title="Select guidance level"
              >
                <span>Level: {levelLabels[selectedLevel]}</span>
                <ChevronDown className="w-3 h-3 text-on-surface-variant" />
              </button>

              {isLevelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-48 bg-surface-container-highest border border-outline-variant rounded-lg shadow-xl p-1 z-50 text-xs font-mono">
                  {([1, 2, 3, 4] as HintLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setSelectedLevel(lvl);
                        setIsLevelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                        selectedLevel === lvl
                          ? 'bg-primary/20 text-primary font-semibold'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span>{levelLabels[lvl]}</span>
                      {selectedLevel === lvl && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-on-surface-variant font-mono text-[11px]">
              Direct Guidance
            </span>
          )}

          <span className="text-on-surface-variant/70 text-[10px] font-mono truncate max-w-[140px] min-w-0">
            Context: {pageProfile?.sourceLabel || siteName}
          </span>
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-2 flex flex-col gap-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={inputPlaceholder}
            rows={2}
            className="w-full bg-transparent border-0 p-1 text-on-surface placeholder:text-on-surface-variant font-sans text-xs resize-none outline-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
            <span className="text-[10px] font-mono text-outline">
              ↵ Send &nbsp; ⇧↵ Newline
            </span>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary-container font-mono text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              title="Send message"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};
