import {
  runEvaluation,
  formatEvaluationAsciiTable,
  formatEvaluationMarkdownTable,
  saveEvaluationArtifacts,
} from '../src/evaluation/harness';
import * as path from 'path';

function main() {
  const args = process.argv.slice(2);
  let seed = 42;

  const seedIdx = args.indexOf('--seed');
  if (seedIdx !== -1 && args[seedIdx + 1]) {
    seed = parseInt(args[seedIdx + 1]!, 10) || 42;
  }

  console.log(`[Unstuck Evaluation] Running Offline Critic benchmark on pre-written candidate hints with seed=${seed}...`);
  console.log(`[Note] Evaluates heuristic leak detection and grounding rules on 42 pre-written candidate hints across 15 benchmark problems without live LLM inference.`);
  const report = runEvaluation({ seed });

  // 1. Output ASCII results table
  console.log('\n' + formatEvaluationAsciiTable(report) + '\n');

  // 2. Output Markdown results table
  console.log('--- Markdown Output ---\n' + formatEvaluationMarkdownTable(report) + '\n------------------------\n');

  // 3. Save JSON, CSV, and Markdown export artifacts to eval-output/
  const evalOutputDir = path.resolve(process.cwd(), 'eval-output');
  const { jsonPath, csvPath, mdPath } = saveEvaluationArtifacts(report, evalOutputDir);
  console.log(`[Artifact] Evaluation JSON saved to:     ${jsonPath}`);
  console.log(`[Artifact] Evaluation CSV saved to:      ${csvPath}`);
  console.log(`[Artifact] Evaluation Markdown saved to: ${mdPath}`);

  // 4. Verification of Guardrails on Candidate Hints
  const l1Leak = report.summaryByLevel['L1']?.leakRate ?? 0;
  const l2Leak = report.summaryByLevel['L2']?.leakRate ?? 0;
  if (l1Leak > 0 || l2Leak > 0) {
    console.error(`[FAILURE] Code leak detected in early levels: L1=${l1Leak}, L2=${l2Leak}`);
    process.exit(1);
  }

  console.log(`[Verification] 0.0% code leak verified on all Level 1 and Level 2 candidate hints.`);
  console.log(`[Verification] Grounded rate: ${(report.overall.groundedRate * 100).toFixed(1)}%`);
  console.log(`[Verification] Offline Critic agreement: ${(report.overall.criticAgreementRate * 100).toFixed(1)}%`);
  console.log(`[SUCCESS] Offline Critic benchmark completed successfully.`);
}

main();
