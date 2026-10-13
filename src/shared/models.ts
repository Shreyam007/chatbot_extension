/**
 * Model filtering and sanitation utilities for Gemini API models.
 * Ensures only text generation models are displayed and used.
 */

export interface RawGeminiModel {
  name?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

export interface SanitizedModel {
  id: string; // e.g., "gemini-2.5-flash" (stripped of "models/" prefix)
  displayName: string;
  isRecommended: boolean;
}

const NON_TEXT_MODEL_REGEX = /(?:tts|embedding|embed|imagen|image|audio|live|realtime|aqa|whisper)/i;

const RECOMMENDED_ORDER = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-pro',
];

/**
 * Filters a raw list of models from Google AI Studio / Gemini API
 * to only include models that support text generation (generateContent).
 * Excludes TTS, embedding, image, audio, live, and non-text models.
 * Strips raw "models/" prefixes and sorts recommended models first.
 */
export function filterTextGenerationModels(rawModels: RawGeminiModel[]): SanitizedModel[] {
  if (!Array.isArray(rawModels)) {
    return [];
  }

  const sanitized: SanitizedModel[] = [];
  const seenIds = new Set<string>();

  for (const raw of rawModels) {
    if (!raw || typeof raw !== 'object') continue;

    const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!rawName) continue;

    // Check supportedGenerationMethods if provided
    if (
      Array.isArray(raw.supportedGenerationMethods) &&
      raw.supportedGenerationMethods.length > 0 &&
      !raw.supportedGenerationMethods.includes('generateContent')
    ) {
      continue;
    }

    // Strip "models/" prefix
    const shortId = rawName.replace(/^models\//, '');
    const displayName = typeof raw.displayName === 'string' && raw.displayName.trim()
      ? raw.displayName.trim()
      : shortId;

    // Filter out non-text models
    if (NON_TEXT_MODEL_REGEX.test(shortId) || NON_TEXT_MODEL_REGEX.test(displayName)) {
      continue;
    }

    if (seenIds.has(shortId)) {
      continue;
    }
    seenIds.add(shortId);

    const isRecommended = shortId === 'gemini-2.5-flash' || shortId === 'gemini-1.5-flash';

    sanitized.push({
      id: shortId,
      displayName,
      isRecommended,
    });
  }

  // Sort: Recommended in defined priority order first, then others alphabetically
  sanitized.sort((a, b) => {
    const aRecIdx = RECOMMENDED_ORDER.indexOf(a.id);
    const bRecIdx = RECOMMENDED_ORDER.indexOf(b.id);

    if (aRecIdx !== -1 && bRecIdx !== -1) {
      return aRecIdx - bRecIdx;
    }
    if (aRecIdx !== -1) return -1;
    if (bRecIdx !== -1) return 1;

    return a.id.localeCompare(b.id);
  });

  return sanitized;
}
