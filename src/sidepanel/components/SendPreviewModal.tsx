import React, { useState } from 'react';
import { Shield, Check, X, FileText } from 'lucide-react';

export interface SendPreviewModalProps {
  siteOrigin: string;
  question: string;
  extractedText: string;
  onConfirm: (payload: { trimmedText: string; includePageText: boolean; neverSendForSite: boolean }) => void;
  onCancel: () => void;
}

export const SendPreviewModal: React.FC<SendPreviewModalProps> = ({
  siteOrigin,
  question,
  extractedText,
  onConfirm,
  onCancel,
}) => {
  const [includePageText, setIncludePageText] = useState(true);
  const [neverSendForSite, setNeverSendForSite] = useState(false);
  const [editableText, setEditableText] = useState(extractedText.slice(0, 4000));

  const handleConfirm = () => {
    onConfirm({
      trimmedText: includePageText ? editableText : '',
      includePageText,
      neverSendForSite,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="bg-surface-container-high border border-outline-variant/60 rounded-xl p-4 w-full max-w-sm flex flex-col gap-3 shadow-2xl text-on-surface">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h2 id="preview-modal-title" className="font-mono text-xs font-semibold">
              What will be sent to the AI
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-bright/20"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] font-sans text-on-surface-variant leading-relaxed">
          Before sending your first request on <span className="font-mono text-secondary font-semibold">{siteOrigin}</span>, preview and review the data sent to Google's Gemini API:
        </p>

        {/* User Question Preview */}
        <div className="bg-surface-container rounded-lg p-2.5 border border-outline-variant/30 flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-outline">
            Your Question
          </span>
          <p className="text-xs font-sans text-on-surface font-medium truncate">
            {question || 'Initial hint request'}
          </p>
        </div>

        {/* Extracted Page Text Box */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-outline flex items-center gap-1">
              <FileText className="w-3 h-3 text-secondary" />
              Page Text Excerpt (Editable)
            </span>
            <span className="font-mono text-[9px] text-outline">
              {includePageText ? `${editableText.length} chars` : 'Excluded'}
            </span>
          </div>

          {includePageText ? (
            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              className="w-full h-28 bg-surface-container-lowest text-on-surface font-mono text-[10px] p-2 rounded-lg border border-outline-variant/30 focus:border-primary focus:outline-none resize-none leading-relaxed select-text"
              placeholder="No page text extracted..."
            />
          ) : (
            <div className="w-full h-16 bg-surface-container-lowest text-outline font-mono text-[10px] p-2 rounded-lg border border-outline-variant/20 flex items-center justify-center italic">
              Page text will not be included with this request.
            </div>
          )}
        </div>

        {/* Privacy Toggles */}
        <div className="flex flex-col gap-2 pt-1 border-t border-outline-variant/20">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includePageText}
              onChange={(e) => setIncludePageText(e.target.checked)}
              className="rounded border-outline-variant text-primary focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-sans text-[11px] text-on-surface">
              Include page text in this request
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={neverSendForSite}
              onChange={(e) => setNeverSendForSite(e.target.checked)}
              className="rounded border-outline-variant text-secondary focus:ring-0 w-3.5 h-3.5"
            />
            <span className="font-sans text-[11px] text-on-surface-variant">
              Never send page text from this site
            </span>
          </label>
        </div>

        {/* Confirmation Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-1.5 px-3 rounded-lg bg-surface-container font-mono text-xs text-on-surface hover:bg-surface-bright transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-1.5 px-3 rounded-lg bg-primary text-on-primary font-mono text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Send to AI
          </button>
        </div>
      </div>
    </div>
  );
};
