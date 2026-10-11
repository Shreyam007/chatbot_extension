import React, { useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const isMatch = confirmText.trim() === 'DELETE';

  if (!isOpen) return null;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!isMatch || isDeleting) return;
    await onConfirm();
  };

  return (
    <div
      data-testid="wipe-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm antialiased"
    >
      <div className="w-full max-w-lg rounded-xl bg-surface-container-low border border-error/40 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-outline-variant/30 bg-surface-container flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-error-container/30 border border-error/50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-error" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold font-mono text-on-surface tracking-tight">
              Delete all local data?
            </h3>
            <span className="text-[11px] font-mono text-error uppercase tracking-wider font-semibold">
              Irreversible Action
            </span>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            data-testid="close-delete-modal-btn"
            className="text-on-surface-variant hover:text-on-surface p-1 transition-colors rounded disabled:opacity-40"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
            This operation will irrevocably wipe all <strong className="text-on-surface font-semibold">chat histories</strong>, recorded <strong className="text-on-surface font-semibold">problem mastery scores</strong>, AST snapshots, and client telemetry from this browser instance.
          </p>

          <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs font-mono text-outline space-y-1.5">
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-error shrink-0" />
              <span>Purges IndexedDB namespace: <code className="text-on-surface font-semibold">unstuck_store_v2</code></span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-error shrink-0" />
              <span>Resets local heuristic dwell models to factory state</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-error shrink-0" />
              <span>Clears stored Gemini API key and active preferences</span>
            </div>
          </div>

          {/* Verification Prompt Field */}
          <div className="space-y-2 pt-1">
            <label htmlFor="confirm-input" className="block text-xs font-mono text-on-surface">
              Type <span className="text-error font-bold font-mono">DELETE</span> to confirm:
            </label>
            <div className="relative">
              <input
                id="confirm-input"
                data-testid="delete-confirm-input"
                type="text"
                autoFocus
                disabled={isDeleting}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-surface-container-lowest border border-error/60 text-error font-mono text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-error transition-all"
              />
              {isMatch && (
                <span
                  data-testid="delete-matched-badge"
                  className="absolute right-3 top-2.5 text-[10px] font-mono font-bold text-error tracking-wider"
                >
                  MATCHED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-surface-container border-t border-outline-variant/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            data-testid="cancel-delete-btn"
            className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-mono border border-outline-variant/30 transition-colors active:scale-95 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatch || isDeleting}
            data-testid="confirm-delete-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-error text-on-error font-mono text-xs font-semibold hover:bg-error/90 transition-colors active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Erasing...' : 'Permanently Erase Everything'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
