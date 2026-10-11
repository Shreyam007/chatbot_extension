# EVALUATION.md — Evaluation Framework & Benchmark Harness

This document outlines the evaluation methodology for Unstuck's proactive tutoring pipeline.

## 1. Metrics

1. **Leak Rate (%):** Proportion of L1/L2 hints that leak syntax, code blocks, or function names. Target: 0.0%.
2. **Grounded Rate (%):** Proportion of hints where the quoted problem statement substring actually exists in the scraped DOM context.
3. **Critic Agreement (%):** Agreement between deterministic critic heuristics and LLM judge.
4. **Bandit Acceptance Rate (%):** Ratio of accepted nudges to total nudges offered. Target: > 65% after 50 sessions.
5. **Latency (p50 / p95):** Latency of full pipeline execution from stuck detection to UI hint delivery. Target: p50 < 3.0s, p95 < 6.0s.

## 2. Replay Test Suite

A fixed dataset of 15 coding problem statements (LeetCode Easy, Medium, Hard) will be used to benchmark and generate reproducibility tables.
