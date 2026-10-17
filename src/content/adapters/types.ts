import type { PageContext } from '../../shared/schemas/context';

export interface VerdictResult {
  verdict: 'accepted' | 'wrong' | 'pending';
  rawText?: string;
  submissionId?: string;
}

export interface PageAdapter {
  name: 'leetcode' | 'codeforces' | 'generic' | 'wikipedia';
  matches(url: URL): boolean;
  extractContext(doc: Document, url: URL): PageContext | null;
  detectContest(url: URL, doc: Document): boolean;
  detectVerdict?(doc: Document): VerdictResult | null;
  readEditorCode?(doc: Document): string | null;
}
