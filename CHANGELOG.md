# Changelog

## v0.1.0 — 2026-05-26

- Initial release: GitHub Action wrapping `agent-card-fleet-summary` for PR gating.
- Inputs: `cards-dir` (required), `comment-on-pr` (auto/true/false), `fail-on-high` (default true), `github-token`.
- Outputs: `total-cards`, `high-findings`, `autonomous-count`, `destructive-tools`.
- Vendored 7-code fleet-summary logic — same findings as the standalone library.
- Posts a per-PR Markdown comment when run on `pull_request` events with a valid token.
- Fails the run (exit 1) when any high-severity finding is present, unless `fail-on-high: false`.
- Composite Node 20 action with `dist/index.js` committed for SHA/tag pinning.
- 2-card fixture corpus (clean supervised + risky autonomous-without-IRU).
- Node 20/22 CI (lint, typecheck, coverage, build, `npm audit`), AGPL-3.0-or-later, Dependabot.
- Sibling of `llm-cost-rollup-action` and `k8s-pre-merge-action`.
