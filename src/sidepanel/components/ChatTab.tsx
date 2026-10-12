import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Lightbulb,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Compass,
} from 'lucide-react';
import type { HintLevel } from '../../shared/schemas/hints';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  groundedQuote?: string;
  codeBlock?: string;
  confidence?: number;
  criticChecked?: boolean;
}

export interface ChatTabProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (query: string, level?: HintLevel) => void;
  onHighlightQuote: (quote: string) => void;
  siteName?: string;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onHighlightQuote,
  siteName = 'LeetCode',
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<HintLevel>(1);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim(), selectedLevel);
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const levelLabels: Record<HintLevel, string> = {
    1: 'Auto (L1 Direction)',
    2: 'L2 Approach',
    3: 'L3 Pseudocode',
    4: 'L4 Full Solution',
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          /* Empty State per S03 */
          <div className="flex flex-col items-center justify-center text-center py-6 px-2 my-auto select-none">
            {/* Knot motif watermark */}
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
              Ask me anything about this page.
            </h2>
            <p className="text-on-surface-variant font-sans text-xs max-w-[280px] mb-4 leading-relaxed">
              I'll give progressive hints, not code dumps. Current solution code and constraints are already indexed.
            </p>

            {/* Suggested Question Chips */}
            <div className="w-full max-w-sm flex flex-col gap-2">
              <button
                onClick={() => onSendMessage('Explain this problem and what it is asking for', 1)}
                className="w-full text-left bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary/50 p-2.5 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-tertiary" />
                  <span className="text-on-surface font-mono text-xs group-hover:text-primary transition-colors">
                    Explain this problem
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onSendMessage('Give me a high-level conceptual direction without spoiling code', 1)}
                className="w-full text-left bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary/50 p-2.5 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-secondary" />
                  <span className="text-on-surface font-mono text-xs group-hover:text-primary transition-colors">
                    Give me a direction
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => onSendMessage('Check my approach: is there an O(n) space/time tradeoff?', 2)}
                className="w-full text-left bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary/50 p-2.5 rounded-xl transition-all flex items-center justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-on-surface font-mono text-xs group-hover:text-primary transition-colors">
                    Check my approach
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.sender === 'user' ? (
                /* User Bubble */
                <div className="max-w-[85%] bg-surface-container-high border border-outline-variant/50 rounded-xl rounded-tr-xs p-3 transition-colors">
                  <p className="font-sans text-xs text-on-surface break-words leading-relaxed select-text">
                    {msg.text}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-outline">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-0.5 hover:text-primary transition-colors ml-1"
                      title="Copy message"
                      aria-label="Copy message"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ) : (
                /* Assistant Bubble */
                <article className="w-full bg-surface-container border border-outline-variant/40 rounded-xl p-3 flex flex-col gap-2.5 transition-all shadow-sm">
                  {/* Low Confidence Warning Banner (S14.4) */}
                  {msg.confidence !== undefined && msg.confidence <= 0.48 && (
                    <div className="flex items-center justify-between gap-1.5 bg-tertiary/10 border border-tertiary/30 rounded-lg p-2 text-tertiary">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-tertiary" />
                        <span className="font-mono text-[11px] leading-tight font-medium">
                          I'm not sure about this one. Treat it as a guess.
                        </span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-tertiary/20 text-tertiary text-[10px] font-mono font-semibold shrink-0">
                        {Math.round(msg.confidence * 100)}%
                      </span>
                    </div>
                  )}

                  {/* Header: Brand & Critic status */}
                  <div className="flex items-center justify-between gap-2 border-b border-outline-variant/25 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-primary/20 border border-primary/50 flex items-center justify-center text-primary">
                        <Lightbulb className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-on-surface tracking-tight">
                        Unstuck Tutor
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-[10px] font-mono font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Critic: Checked
                    </span>
                  </div>

                  {/* Message body */}
                  <div className="text-xs font-sans text-on-surface space-y-2 leading-relaxed break-words select-text">
                    <p>{msg.text}</p>
                  </div>

                  {/* Code block if present */}
                  {msg.codeBlock && (
                    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2.5 overflow-hidden">
                      <div className="flex items-center justify-between text-[10px] font-mono text-outline border-b border-outline-variant/20 pb-1 mb-1.5">
                        <span className="font-medium">Detected Pattern</span>
                        <span className="text-secondary">Code Scaffold</span>
                      </div>
                      <pre className="font-mono text-[11px] text-on-surface overflow-x-auto whitespace-pre custom-scrollbar leading-tight p-1">
                        <code>{msg.codeBlock}</code>
                      </pre>
                    </div>
                  )}

                  {/* "From the page" Citation Pill (highlights on page) */}
                  {msg.groundedQuote && (
                    <div
                      onClick={() => onHighlightQuote(msg.groundedQuote!)}
                      className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-secondary/50 cursor-pointer transition-colors group"
                      title="Click to locate and highlight this quote on active page"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[12px] text-secondary font-mono">“</span>
                        <span className="font-mono text-[11px] text-on-surface-variant truncate">
                          {msg.groundedQuote}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-secondary shrink-0 opacity-80 group-hover:opacity-100">
                        <span>Highlight</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-outline border-t border-outline-variant/20 pt-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1 rounded hover:bg-surface-container-high hover:text-on-surface transition-colors flex items-center gap-1"
                        title="Copy hint text"
                        aria-label="Copy hint text"
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

      {/* Input Footer Dock */}
      <footer className="p-3 border-t border-outline-variant/30 bg-surface-container/95 backdrop-blur-md flex flex-col gap-2 relative z-30 shrink-0">
        {/* Mini toolbar */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
              className="flex items-center gap-1.5 bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/40 hover:border-outline-variant transition-colors"
              title="Select pedagogical hint level"
            >
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-on-surface-variant text-[11px]">Level:</span>
              <span className="text-on-surface font-medium text-[11px]">
                {levelLabels[selectedLevel]}
              </span>
              <ChevronDown className="w-3 h-3 text-on-surface-variant" />
            </button>

            {isLevelDropdownOpen && (
              <div className="absolute bottom-8 left-0 w-48 bg-surface-container-high border border-outline-variant rounded-lg shadow-xl p-1 z-50 text-xs font-mono">
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

          <span className="text-on-surface-variant/70 text-[10px] font-mono">
            Context: {siteName}
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
            placeholder="Ask a question about this problem..."
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
