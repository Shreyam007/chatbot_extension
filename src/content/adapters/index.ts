import type { PageAdapter } from './types';
import { leetcodeAdapter } from './leetcode';
import { codeforcesAdapter } from './codeforces';
import { genericAdapter } from './generic';
import { wikipediaAdapter } from './wikipedia';

export * from './types';
export * from './leetcode';
export * from './codeforces';
export * from './generic';
export * from './wikipedia';

const adapters: PageAdapter[] = [leetcodeAdapter, codeforcesAdapter, wikipediaAdapter, genericAdapter];

export function resolveAdapter(url: URL): PageAdapter {
  for (const adapter of adapters) {
    if (adapter.matches(url)) {
      return adapter;
    }
  }
  return genericAdapter;
}
