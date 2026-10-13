import { describe, it, expect } from 'vitest';
import { filterTextGenerationModels } from '../../src/shared/models';

describe('Model Filter (Requirement 2 & 8)', () => {
  it('excludes TTS, embedding, image, audio, live, and non-text models', () => {
    const rawModels = [
      {
        name: 'models/gemini-2.5-flash-preview-tts',
        displayName: 'Gemini 2.5 Flash Preview TTS',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/text-embedding-004',
        displayName: 'Text Embedding 004',
        supportedGenerationMethods: ['embedContent'],
      },
      {
        name: 'models/imagen-3.0-generate-002',
        displayName: 'Imagen 3.0',
        supportedGenerationMethods: ['generateImages'],
      },
      {
        name: 'models/gemini-2.0-flash-realtime-exp',
        displayName: 'Gemini 2.0 Flash Realtime',
        supportedGenerationMethods: ['bidiGenerateContent'],
      },
      {
        name: 'models/gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        supportedGenerationMethods: ['generateContent', 'countTokens'],
      },
      {
        name: 'models/gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        supportedGenerationMethods: ['generateContent'],
      },
    ];

    const result = filterTextGenerationModels(rawModels);

    // Only text generation models without non-text keywords should remain
    expect(result.map((m) => m.id)).toEqual(['gemini-2.5-flash', 'gemini-1.5-pro']);
  });

  it('strips "models/" prefixes and provides clean short names', () => {
    const rawModels = [
      { name: 'models/gemini-2.5-flash' },
      { name: 'models/gemini-2.5-pro' },
      { name: 'gemini-1.5-flash' }, // already without prefix
    ];

    const result = filterTextGenerationModels(rawModels);

    expect(result.map((m) => m.id)).toEqual([
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-2.5-pro',
    ]);
    expect(result.every((m) => !m.id.startsWith('models/'))).toBe(true);
  });

  it('excludes models whose supportedGenerationMethods does not include generateContent', () => {
    const rawModels = [
      {
        name: 'models/gemini-custom-eval',
        supportedGenerationMethods: ['countTokens'],
      },
      {
        name: 'models/gemini-2.5-flash',
        supportedGenerationMethods: ['generateContent'],
      },
    ];

    const result = filterTextGenerationModels(rawModels);

    expect(result.map((m) => m.id)).toEqual(['gemini-2.5-flash']);
  });

  it('orders recommended models first (gemini-2.5-flash, gemini-1.5-flash)', () => {
    const rawModels = [
      { name: 'models/gemini-1.0-pro' },
      { name: 'models/gemini-2.5-pro' },
      { name: 'models/gemini-1.5-flash' },
      { name: 'models/gemini-2.5-flash' },
    ];

    const result = filterTextGenerationModels(rawModels);

    expect(result.map((m) => m.id)).toEqual([
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-2.5-pro',
      'gemini-1.0-pro',
    ]);
  });

  it('handles empty, null, or malformed lists gracefully', () => {
    expect(filterTextGenerationModels([])).toEqual([]);
    // @ts-expect-error testing invalid input
    expect(filterTextGenerationModels(null)).toEqual([]);
    // @ts-expect-error testing invalid input
    expect(filterTextGenerationModels(undefined)).toEqual([]);
  });
});
