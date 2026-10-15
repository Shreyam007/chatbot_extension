import type { PageSection } from '../schemas/context';

export interface CoverageResult {
  formattedContent: string;
  outline: string;
  coveredCount: number;
  totalCount: number;
  coveredTitles: string[];
  skippedSections: string[];
}

/**
 * Builds coverage context for broad summary questions on long documents.
 * Instead of taking BM25 top-3 (which misses most sections), it includes an outline
 * of all sections plus content excerpts from every section in document order up to the character budget.
 */
export function buildCoverageContext(
  sections: PageSection[],
  budgetChars: number = 6000
): CoverageResult {
  if (!sections || sections.length === 0) {
    return {
      formattedContent: '',
      outline: '',
      coveredCount: 0,
      totalCount: 0,
      coveredTitles: [],
      skippedSections: [],
    };
  }

  const totalCount = sections.length;
  const outlineLines = sections.map((s, idx) => `${idx + 1}. ${s.title}`);
  const outline = `## Page Outline (${totalCount} Sections):\n${outlineLines.join('\n')}\n`;

  const remainingBudget = Math.max(1000, budgetChars - outline.length);
  // Calculate fair allocation per section
  const targetCharsPerSection = Math.max(180, Math.floor(remainingBudget / totalCount));

  const coveredSections: Array<{ title: string; excerpt: string }> = [];
  const coveredTitles: string[] = [];
  const skippedSections: string[] = [];
  let currentUsedChars = 0;

  for (const sec of sections) {
    const rawText = sec.text.trim();
    if (!rawText) continue;

    const available = remainingBudget - currentUsedChars;
    if (available < 100) {
      // Out of budget for subsequent sections
      skippedSections.push(sec.title);
      continue;
    }

    const maxForThis = Math.min(available, Math.max(targetCharsPerSection, 350));
    let excerpt = rawText;
    if (excerpt.length > maxForThis) {
      excerpt = excerpt.slice(0, maxForThis) + '...';
    }

    coveredSections.push({
      title: sec.title,
      excerpt,
    });
    coveredTitles.push(sec.title);
    currentUsedChars += sec.title.length + excerpt.length + 20;
  }

  const sectionsFormatted = coveredSections
    .map((cs) => `### ${cs.title}\n${cs.excerpt}`)
    .join('\n\n');

  const formattedContent = `${outline}\n## Section Content Coverage:\n${sectionsFormatted}`;

  return {
    formattedContent,
    outline,
    coveredCount: coveredSections.length,
    totalCount,
    coveredTitles,
    skippedSections,
  };
}
