import { LIMITS } from './config';

/**
 * Truncates text so the total length, INCLUDING the truncation marker,
 * is guaranteed to be <= max.
 *
 * @param text The input string to truncate
 * @param max The maximum allowable total length of the returned string
 * @param marker The marker appended when truncation occurs (default: '... [truncated]')
 */
export function truncateToBudget(
  text: string,
  max: number,
  marker = '... [truncated]'
): string {
  if (max <= 0) return '';
  if (!text || text.length <= max) return text || '';

  if (marker.length >= max) {
    return marker.slice(0, max);
  }

  const allowedContentChars = max - marker.length;
  return text.slice(0, allowedContentChars) + marker;
}

export interface SectionBudget {
  id?: string;
  title: string;
  text: string;
}

/**
 * Bounds and enforces limits on an array of sections according to global limits:
 * - Max sections count (e.g. 60)
 * - Max chars per individual section (e.g. 4000)
 * - Max cumulative characters across all sections (e.g. 60000)
 */
export function sanitizeSectionsBudget<T extends SectionBudget>(
  sections: T[],
  maxCount = LIMITS.MAX_SECTIONS_COUNT || 60,
  maxPerSection = LIMITS.MAX_SECTION_CHARS || 4000,
  maxTotalChars = LIMITS.MAX_TOTAL_SECTIONS_CHARS || 60000
): T[] {
  if (!Array.isArray(sections)) return [];

  const cappedSections = sections.slice(0, maxCount);
  const result: T[] = [];
  let cumulativeChars = 0;

  for (const sec of cappedSections) {
    if (cumulativeChars >= maxTotalChars) {
      break;
    }

    const availableBudget = maxTotalChars - cumulativeChars;
    const effectiveSectionMax = Math.min(maxPerSection, availableBudget);

    const safeText = sec.text.length > effectiveSectionMax
      ? truncateToBudget(sec.text, effectiveSectionMax, '... [section truncated]')
      : sec.text;

    result.push({
      ...sec,
      text: safeText,
    });

    cumulativeChars += safeText.length;
  }

  return result;
}
