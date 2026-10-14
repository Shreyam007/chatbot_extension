export interface PageSection {
  id: string;
  title: string;
  text: string;
}

export interface RankedSection {
  section: PageSection;
  score: number;
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now',
]);

/**
 * Tokenizes and normalizes text into word stems/tokens, filtering out stopwords.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Local in-memory BM25 lexical ranking for section retrieval without embeddings
 * or external network calls.
 */
export class BM25Retriever {
  private k1: number;
  private b: number;
  private sections: PageSection[];
  private docTokens: string[][];
  private docLengths: number[];
  private avgDocLength: number;
  private docFreqs: Map<string, number>;
  private numDocs: number;

  constructor(sections: PageSection[], k1 = 1.2, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.sections = sections;
    this.numDocs = sections.length;
    this.docTokens = sections.map((s) => tokenizeText(`${s.title} ${s.text}`));
    this.docLengths = this.docTokens.map((t) => t.length);
    const totalLength = this.docLengths.reduce((acc, len) => acc + len, 0);
    this.avgDocLength = this.numDocs > 0 ? totalLength / this.numDocs : 1;

    // Compute document frequencies for all vocabulary terms
    this.docFreqs = new Map();
    for (const tokens of this.docTokens) {
      const seen = new Set(tokens);
      for (const term of seen) {
        this.docFreqs.set(term, (this.docFreqs.get(term) || 0) + 1);
      }
    }
  }

  private getIdf(term: string): number {
    const df = this.docFreqs.get(term) || 0;
    // Standard Lucene/BM25 probabilistic IDF with smoothing
    return Math.log(1 + (this.numDocs - df + 0.5) / (df + 0.5));
  }

  public scoreSection(queryTokens: string[], docIndex: number): number {
    const tokens = this.docTokens[docIndex];
    if (!tokens || tokens.length === 0) return 0;

    const docLength = this.docLengths[docIndex] ?? 0;
    // Term frequencies in this document
    const termFreqs = new Map<string, number>();
    for (const t of tokens) {
      termFreqs.set(t, (termFreqs.get(t) || 0) + 1);
    }

    let score = 0;
    for (const q of queryTokens) {
      const tf = termFreqs.get(q) || 0;
      if (tf === 0) continue;

      const idf = this.getIdf(q);
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / (this.avgDocLength || 1)));
      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Ranks all sections by BM25 relevance score for a given query string.
   */
  public search(query: string, topK = 3): RankedSection[] {
    const queryTokens = tokenizeText(query);
    if (this.numDocs === 0) return [];
    if (queryTokens.length === 0) {
      // If query has no substantive keywords, return first topK sections with neutral score
      return this.sections.slice(0, topK).map((section) => ({ section, score: 0 }));
    }

    const scores: RankedSection[] = this.sections.map((section, idx) => ({
      section,
      score: this.scoreSection(queryTokens, idx),
    }));

    scores.sort((a, b) => b.score - a.score);

    // If top score is > 0, return matched topK
    const positive = scores.filter((s) => s.score > 0);
    if (positive.length > 0) {
      return positive.slice(0, topK);
    }

    // Fallback: return first topK sections
    return scores.slice(0, topK);
  }
}

/**
 * Convenience helper to rank and retrieve relevant sections within a character budget.
 */
export function retrieveRelevantSections(
  query: string,
  sections: PageSection[],
  topK = 3,
  maxTotalChars = 6000
): { retrieved: PageSection[]; scores: number[] } {
  if (!sections || sections.length === 0) {
    return { retrieved: [], scores: [] };
  }

  if (sections.length <= 2) {
    return { retrieved: sections, scores: sections.map(() => 1.0) };
  }

  const retriever = new BM25Retriever(sections);
  const ranked = retriever.search(query, topK);

  const result: PageSection[] = [];
  const scores: number[] = [];
  let totalChars = 0;

  for (const item of ranked) {
    if (totalChars + item.section.text.length > maxTotalChars && result.length > 0) {
      break;
    }
    result.push(item.section);
    scores.push(item.score);
    totalChars += item.section.text.length;
  }

  return { retrieved: result, scores };
}
