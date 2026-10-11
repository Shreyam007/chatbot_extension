import type { NudgeDecision, StuckEstimate } from '../../shared/schemas/signals';
import type { PageContext } from '../../shared/schemas/context';
import type { Settings } from '../../shared/schemas/settings';
import type { BanditBucketStats } from '../../shared/schemas/mastery';

export type BanditAction = 'nudge_now' | 'wait';

export type FeedbackAction = 'accept' | 'dismiss' | 'ignore' | 'block_site';

export interface GateCheckResult {
  pass: boolean;
  reason?: string;
}

export interface ContextBucketComponents {
  site: string; // 'leetcode' | 'codeforces' | 'generic'
  stuckBucket: 'low' | 'medium' | 'high';
  masteryBucket: 'novice' | 'intermediate' | 'advanced';
}

export interface ProblemSessionHistory {
  problemHash: string;
  nudgeCount: number;
  lastNudgeTime: number;
  solved: boolean;
}

export interface PlannerState {
  recentNudges: number[]; // Timestamps of nudges in past 2 hours
  lastNudgeTime: number;
  snoozeUntil: number;
  activeTabId?: number;
  blockedSites: string[];
  sessionHistories: Record<string, ProblemSessionHistory>;
}

export interface PlannerOptions {
  demoMode?: boolean; // Shortens cooldowns for live evaluation (EC-066)
  masteryPKnown?: number; // 0..1 topic knowledge probability
  isTabActive?: boolean; // EC-064
}

export type { NudgeDecision, StuckEstimate, PageContext, Settings, BanditBucketStats };
