import { BENCHMARK_PROBLEMS } from '../src/evaluation/benchmark-dataset';
import { runAgentGraph } from '../src/background/graph/graph';
import { checkHeuristicLeak, checkGrounding } from '../src/background/graph/critic';
import { calculatePercentile } from '../src/shared/metrics/calculator';
import { DEFAULT_AI_MODEL } from '../src/shared/config';
import type { PageContext } from '../src/shared/schemas/context';
import type { HintLevel } from '../src/shared/schemas/hints';
import * as fs from 'fs';
import * as path from 'path';

interface LiveCallResult {
  problemId: string;
  problemTitle: string;
  level: HintLevel;
  deliveredLevel: HintLevel;
  hasLeak: boolean;
  isGrounded: boolean;
  retries: number;
  isFallback: boolean;
  latencyMs: number;
  success: boolean;
  error?: string;
}

interface LiveEvaluationSummary {
  timestamp: number;
  model: string;
  totalEvaluated: number;
  successfulCalls: number;
  failedOrRateLimited: number;
  l1L2Total: number;
  l1L2Leaks: number;
  l1L2LeakRate: number;
  groundedCount: number;
  groundedRate: number;
  firstTryPassCount: number;
  firstTryPassRate: number;
  retryCount: number;
  retryRate: number;
  fallbackCount: number;
  fallbackRate: number;
  meanLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  resultsByLevel: Record<
    string,
    {
      evaluated: number;
      leaks: number;
      leakRate: number;
      grounded: number;
      groundedRate: number;
      fallbacks: number;
      fallbackRate: number;
      meanLatencyMs: number;
    }
  >;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.log('================================================================================');
    console.log(' [Unstuck Live Evaluation] GEMINI_API_KEY environment variable is NOT set.');
    console.log('================================================================================');
    console.log(' To execute the live pipeline evaluation against the real Gemini API on the');
    console.log(' 15 benchmark problems (levels L1, L2, L3):');
    console.log('');
    console.log('   Windows PowerShell:');
    console.log('     $env:GEMINI_API_KEY="your-gemini-api-key"');
    console.log('     npm run eval:live');
    console.log('');
    console.log('   Bash / macOS / Linux:');
    console.log('     export GEMINI_API_KEY="your-gemini-api-key"');
    console.log('     npm run eval:live');
    console.log('');
    console.log(' Optional: Set GEMINI_MODEL (defaults to ' + DEFAULT_AI_MODEL + ').');
    console.log(' Note: The key is read strictly in memory and is NEVER logged, committed, or written to disk.');
    console.log(' Live evaluation is cleanly skipped in CI and npm test.');
    console.log('================================================================================');
    process.exit(0);
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const targetLevels: HintLevel[] = [1, 2, 3];

  console.log('================================================================================');
  console.log(' UNSTUCK LIVE PIPELINE EVALUATION (Real Gemini API Inference)');
  console.log(` Model: ${model} | Benchmark Problems: ${BENCHMARK_PROBLEMS.length} | Levels: L1, L2, L3`);
  console.log(' Security: GEMINI_API_KEY loaded from environment (key string is never printed or saved).');
  console.log('================================================================================\n');

  const results: LiveCallResult[] = [];
  let failedOrRateLimited = 0;

  for (let pIdx = 0; pIdx < BENCHMARK_PROBLEMS.length; pIdx++) {
    const prob = BENCHMARK_PROBLEMS[pIdx]!;
    const context: PageContext = {
      url: prob.url,
      site: 'leetcode',
      title: prob.title,
      statementText: prob.statementText,
      tags: prob.tags,
      difficulty: prob.difficulty,
      isContest: false,
      detectedAt: Date.now(),
    };

    console.log(`\n[${pIdx + 1}/${BENCHMARK_PROBLEMS.length}] Problem: ${prob.title} (${prob.difficulty})`);

    for (const level of targetLevels) {
      process.stdout.write(`  -> Evaluating Level ${level}... `);
      const callStart = Date.now();

      try {
        const { hint, trace } = await runAgentGraph(context, level, {
          apiKey,
          model,
          maxRetries: 2,
        });

        const duration = Date.now() - callStart;
        const candidateForCheck = {
          hint: hint.text,
          codeBlock: hint.codeBlock,
          topics: [],
          groundedQuote: hint.groundedQuote || '',
          selfConfidence: hint.confidence,
        };

        const hasLeak = checkHeuristicLeak(candidateForCheck, level);
        const isGrounded = hint.groundedQuote
          ? checkGrounding(hint.groundedQuote, prob.statementText)
          : true;

        results.push({
          problemId: prob.id,
          problemTitle: prob.title,
          level,
          deliveredLevel: hint.level,
          hasLeak,
          isGrounded,
          retries: trace.retries,
          isFallback: trace.isFallback,
          latencyMs: duration,
          success: true,
        });

        const statusStr = trace.isFallback
          ? 'FALLBACK'
          : trace.retries > 0
            ? `RETRY x${trace.retries}`
            : 'PASS';
        const leakStr = hasLeak ? ' [LEAK DETECTED!]' : '';
        console.log(`${statusStr} in ${duration}ms${leakStr}`);
      } catch (err) {
        failedOrRateLimited++;
        const errMsg = err instanceof Error ? err.message : String(err);
        // Scrub any potential credential traces from error message
        const sanitizedError = errMsg.replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED]');
        console.log(`FAILED (${sanitizedError})`);

        results.push({
          problemId: prob.id,
          problemTitle: prob.title,
          level,
          deliveredLevel: level,
          hasLeak: false,
          isGrounded: false,
          retries: 0,
          isFallback: true,
          latencyMs: Date.now() - callStart,
          success: false,
          error: sanitizedError,
        });
      }

      // Respect API rate limits with polite sequential backoff
      await sleep(650);
    }
  }

  // --- Compute Summary Metrics ---
  const validResults = results.filter((r) => r.success);
  const totalEvaluated = results.length;
  const l1L2Items = validResults.filter((r) => r.level <= 2);
  const l1L2Leaks = l1L2Items.filter((r) => r.hasLeak).length;
  const l1L2LeakRate = l1L2Items.length > 0 ? l1L2Leaks / l1L2Items.length : 0;

  const groundedCount = validResults.filter((r) => r.isGrounded).length;
  const groundedRate = validResults.length > 0 ? groundedCount / validResults.length : 0;

  const firstTryPass = validResults.filter((r) => !r.isFallback && r.retries === 0).length;
  const firstTryPassRate = validResults.length > 0 ? firstTryPass / validResults.length : 0;

  const retryItems = validResults.filter((r) => r.retries > 0).length;
  const retryRate = validResults.length > 0 ? retryItems / validResults.length : 0;

  const fallbackItems = validResults.filter((r) => r.isFallback).length;
  const fallbackRate = validResults.length > 0 ? fallbackItems / validResults.length : 0;

  const latencies = validResults.map((r) => r.latencyMs);
  const meanLatency =
    latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);

  const resultsByLevel: LiveEvaluationSummary['resultsByLevel'] = {};
  for (const lvl of targetLevels) {
    const lvlKey = `L${lvl}`;
    const items = validResults.filter((r) => r.level === lvl);
    const leaks = items.filter((r) => r.hasLeak).length;
    const grounded = items.filter((r) => r.isGrounded).length;
    const fallbacks = items.filter((r) => r.isFallback).length;
    const lvlLats = items.map((r) => r.latencyMs);
    const lvlMean = lvlLats.length > 0 ? Math.round(lvlLats.reduce((a, b) => a + b, 0) / lvlLats.length) : 0;

    resultsByLevel[lvlKey] = {
      evaluated: items.length,
      leaks,
      leakRate: items.length > 0 ? leaks / items.length : 0,
      grounded,
      groundedRate: items.length > 0 ? grounded / items.length : 0,
      fallbacks,
      fallbackRate: items.length > 0 ? fallbacks / items.length : 0,
      meanLatencyMs: lvlMean,
    };
  }

  const summary: LiveEvaluationSummary = {
    timestamp: Date.now(),
    model,
    totalEvaluated,
    successfulCalls: validResults.length,
    failedOrRateLimited,
    l1L2Total: l1L2Items.length,
    l1L2Leaks,
    l1L2LeakRate,
    groundedCount,
    groundedRate,
    firstTryPassCount: firstTryPass,
    firstTryPassRate,
    retryCount: retryItems,
    retryRate,
    fallbackCount: fallbackItems,
    fallbackRate,
    meanLatencyMs: meanLatency,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    resultsByLevel,
  };

  // --- Render Tables ---
  console.log('\n================================================================================');
  console.log(' UNSTUCK LIVE PIPELINE EVALUATION RESULTS');
  console.log(` Model: ${model} | Total Calls: ${totalEvaluated} | Failed/Rate-Limited: ${failedOrRateLimited}`);
  console.log('================================================================================');
  console.log(' Level | Evaluated | Leak Rate | Grounded % | Pass % | Retries | Fallback % | Mean Latency ');
  console.log('-------+-----------+-----------+------------+--------+---------+------------+--------------');
  for (const [lvl, s] of Object.entries(resultsByLevel)) {
    console.log(
      ` ${lvl.padEnd(5)} | ${String(s.evaluated).padStart(9)} | ${(s.leakRate * 100).toFixed(1)}%     | ${(s.groundedRate * 100).toFixed(1)}%     | ${((1 - s.fallbackRate) * 100).toFixed(1)}%   | ${String(s.fallbacks).padStart(7)} | ${(s.fallbackRate * 100).toFixed(1)}%     | ${(s.meanLatencyMs + 'ms').padStart(12)} `
    );
  }
  console.log('-------+-----------+-----------+------------+--------+---------+------------+--------------');
  console.log(` L1/L2 Code Leak Rate:    ${(l1L2LeakRate * 100).toFixed(1)}% (${l1L2Leaks}/${l1L2Items.length})`);
  console.log(` Grounded Claim Rate:     ${(groundedRate * 100).toFixed(1)}%`);
  console.log(` First-Try Pass Rate:     ${(firstTryPassRate * 100).toFixed(1)}%`);
  console.log(` Retry Rate:              ${(retryRate * 100).toFixed(1)}%`);
  console.log(` Safe Fallback Rate:      ${(fallbackRate * 100).toFixed(1)}%`);
  console.log(` Latency p50:             ${p50}ms`);
  console.log(` Latency p95:             ${p95}ms`);
  console.log('================================================================================\n');

  // --- Save Artifacts to eval-output/ ---
  const evalOutputDir = path.resolve(process.cwd(), 'eval-output');
  if (!fs.existsSync(evalOutputDir)) {
    fs.mkdirSync(evalOutputDir, { recursive: true });
  }

  const jsonPath = path.resolve(evalOutputDir, 'live_evaluation_results.json');
  const csvPath = path.resolve(evalOutputDir, 'live_evaluation_results.csv');
  const mdPath = path.resolve(evalOutputDir, 'live_evaluation_results.md');

  // Markdown format
  const mdLines: string[] = [
    '### Live Pipeline Evaluation Results',
    '',
    `- **Model ID:** \`${model}\``,
    `- **Timestamp:** \`${new Date(summary.timestamp).toISOString()}\``,
    `- **Total Pipeline Calls:** \`${totalEvaluated}\``,
    `- **Successful Calls:** \`${summary.successfulCalls}\``,
    `- **Failed / Rate-Limited Calls:** \`${failedOrRateLimited}\``,
    '',
    '| Level | Evaluated | Leak Rate | Grounded % | Fallback Rate | Mean Latency |',
    '|---|---|---|---|---|---|',
  ];
  for (const [lvl, s] of Object.entries(resultsByLevel)) {
    mdLines.push(
      `| ${lvl} | ${s.evaluated} | ${(s.leakRate * 100).toFixed(1)}% | ${(s.groundedRate * 100).toFixed(1)}% | ${(s.fallbackRate * 100).toFixed(1)}% | ${s.meanLatencyMs}ms |`
    );
  }
  mdLines.push('');
  mdLines.push('#### Key Quality & Reliability Metrics');
  mdLines.push(`- **L1/L2 Code Leak Rate:** \`${(l1L2LeakRate * 100).toFixed(1)}%\` (Target: 0.0%)`);
  mdLines.push(`- **Grounded Quote Rate:** \`${(groundedRate * 100).toFixed(1)}%\``);
  mdLines.push(`- **First-Try Pass Rate:** \`${(firstTryPassRate * 100).toFixed(1)}%\``);
  mdLines.push(`- **Retry Rate:** \`${(retryRate * 100).toFixed(1)}%\``);
  mdLines.push(`- **Safe Fallback Rate:** \`${(fallbackRate * 100).toFixed(1)}%\``);
  mdLines.push(`- **Latency p50:** \`${p50}ms\``);
  mdLines.push(`- **Latency p95:** \`${p95}ms\``);

  // CSV format
  const csvLines: string[] = [
    'Level,Evaluated,LeakRate,GroundedRate,FallbackRate,MeanLatencyMs',
    ...Object.entries(resultsByLevel).map(
      ([lvl, s]) =>
        `${lvl},${s.evaluated},${(s.leakRate * 100).toFixed(1)}%,${(s.groundedRate * 100).toFixed(1)}%,${(s.fallbackRate * 100).toFixed(1)}%,${s.meanLatencyMs}`
    ),
  ];

  fs.writeFileSync(jsonPath, JSON.stringify({ summary, results }, null, 2), 'utf8');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');

  console.log(`[Artifact] Live JSON saved to:     ${jsonPath}`);
  console.log(`[Artifact] Live CSV saved to:      ${csvPath}`);
  console.log(`[Artifact] Live Markdown saved to: ${mdPath}`);
}

main().catch((err) => {
  console.error('[Live Evaluation Error]', err);
  process.exit(1);
});
