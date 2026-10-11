import type { PageAdapter } from './types';
import { leetcodeAdapter } from './leetcode';
import { codeforcesAdapter } from './codeforces';
import { genericAdapter } from './generic';

export * from './types';
export * from './leetcode';
export * from './codeforces';
export * from './generic';

const adapters: PageAdapter[] = [leetcodeAdapter, codeforcesAdapter, genericAdapter];

export function resolveAdapter(url: URL): PageAdapter {
  for (const adapter of adapters) {
    if (adapter.matches(url)) {
      return adapter;
    }
  }
  return genericAdapter;
}
