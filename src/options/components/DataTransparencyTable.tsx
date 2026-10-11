import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface DataTransparencyTableProps {
  includeCodeConsent: boolean;
}

interface TransparencyRow {
  field: string;
  format: string;
  purpose: string;
  status: 'transmitted' | 'conditional' | 'local_only' | 'omitted' | 'sliding_window';
  note?: string;
}

export const DataTransparencyTable: React.FC<DataTransparencyTableProps> = ({
  includeCodeConsent,
}) => {
  const rows: TransparencyRow[] = [
    {
      field: 'Problem Title & Description',
      format: 'UTF-8 Markdown string',
      purpose: 'Grounds hints to problem requirements and rubrics',
      status: 'transmitted',
    },
    {
      field: 'Problem Constraints & Invariants',
      format: 'JSON string array (e.g. constraints list)',
      purpose: 'Enforces complexity and boundary invariants',
      status: 'transmitted',
    },
    {
      field: 'Problem Topic Tags',
      format: 'Categorical string labels',
      purpose: 'Heuristic algorithmic categorization framing',
      status: 'transmitted',
    },
    {
      field: 'Submission Verdict & Error',
      format: 'Verdict code (WA, TLE, MLE, RE)',
      purpose: 'Diagnostic failure analysis and anti-pattern recovery',
      status: 'transmitted',
    },
    {
      field: 'Code Editor Context',
      format: 'Current editor snippet + language',
      purpose: 'Included in prompt for AST diagnosis and syntax hints',
      status: 'conditional',
    },
    {
      field: 'Dwell & Scroll Telemetry',
      format: 'JSON array [timestamp, scroll_reversals, idle_ms]',
      purpose: 'Evaluated client-side only by logistic stuck detector',
      status: 'local_only',
    },
    {
      field: 'User ID & Auth Tokens',
      format: 'Cookies, session tokens, account IDs',
      purpose: 'Stripped entirely before request dispatch',
      status: 'omitted',
    },
    {
      field: 'Past Chat Thread Context',
      format: 'Sliding window (last 2 turns)',
      purpose: 'Provides conversational thread continuity',
      status: 'sliding_window',
    },
  ];

  return (
    <div
      data-testid="data-transparency-table-container"
      className="rounded-xl bg-surface-container border border-outline-variant/30 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="p-4 bg-surface-container-low border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold font-mono text-on-surface">
              What is sent to the AI
            </h3>
          </div>
          <p className="text-xs font-sans text-on-surface-variant mt-0.5">
            Real-time inspection of outbound payload schemas dispatched during hints.
          </p>
        </div>
        <span className="text-[11px] font-mono text-outline border border-outline-variant/40 px-2 py-0.5 rounded bg-surface-container self-start sm:self-auto">
          Strict Egress Filter
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/30 bg-surface-container-low text-on-surface-variant text-[11px]">
              <th className="py-2.5 px-4 font-semibold">Payload Field</th>
              <th className="py-2.5 px-4 font-semibold">Sample / Data Format</th>
              <th className="py-2.5 px-4 font-semibold">Purpose</th>
              <th className="py-2.5 px-4 font-semibold">Transmitted to Model</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-on-surface">
            {rows.map((row) => {
              let badgeNode: React.ReactNode;

              if (row.status === 'transmitted') {
                badgeNode = (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Yes
                  </span>
                );
              } else if (row.status === 'conditional') {
                badgeNode = includeCodeConsent ? (
                  <span
                    data-testid="code-consent-status-allowed"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-primary/10 text-primary border border-primary/30"
                  >
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    Allowed (User Consent)
                  </span>
                ) : (
                  <span
                    data-testid="code-consent-status-excluded"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container-high text-on-surface-variant border border-outline-variant/40"
                  >
                    <XCircle className="w-3 h-3 text-outline" />
                    Excluded (Consent Disabled)
                  </span>
                );
              } else if (row.status === 'local_only') {
                badgeNode = (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container-high text-on-surface-variant border border-outline-variant/40">
                    Never sent (Local detector)
                  </span>
                );
              } else if (row.status === 'omitted') {
                badgeNode = (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-surface-container-high text-on-surface-variant border border-outline-variant/40">
                    Never sent (Strictly omitted)
                  </span>
                );
              } else {
                badgeNode = (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-tertiary/10 text-tertiary border border-tertiary/30">
                    <Clock className="w-3 h-3" />
                    Trimmed context
                  </span>
                );
              }

              return (
                <tr key={row.field} className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-secondary">
                    {row.field}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant">
                    {row.format}
                  </td>
                  <td className="py-3 px-4 text-on-surface-variant font-sans text-xs">
                    {row.purpose}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {badgeNode}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-xs font-sans text-on-surface-variant">
        <span>Curious about the exact payload structure right now?</span>
        <span className="text-primary font-mono text-[11px]">
          Inspection trace visible in Side Panel Trace tab
        </span>
      </div>
    </div>
  );
};
