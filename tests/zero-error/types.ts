export type ErrorLevel = 'warn' | 'error' | 'pageerror' | 'unhandledrejection';

export interface CapturedError {
  level: ErrorLevel;
  text: string;
  source: 'content' | 'sw' | 'sidepanel' | 'popup' | 'options' | 'runtime' | 'page';
  url: string;
  timestamp: number;
}

export interface ScenarioResult {
  scenario: string;
  page: string;
  warnCount: number;
  errorCount: number;
  pageerrorCount: number;
  firstWarn?: string;
  firstError?: string;
  captured: CapturedError[];
}

export interface AllowlistEntry {
  scenario?: string;
  pattern: string;
  justification: string;
}
