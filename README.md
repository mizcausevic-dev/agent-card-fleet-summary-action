# agent-card-fleet-summary-action

[![CI](https://github.com/mizcausevic-dev/agent-card-fleet-summary-action/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/agent-card-fleet-summary-action/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)

GitHub Action that walks a directory of A2A **AgentCard** documents, surfaces the governance gaps that hurt an audit (autonomous-without-IRU, destructive-tool-on-non-autonomous, persistent-memory-without-refusal-taxonomy, etc.), posts a Markdown summary as a PR comment, and **fails the build** when any high-severity finding is present.

Wraps [`agent-card-fleet-summary`](https://github.com/mizcausevic-dev/agent-card-fleet-summary) — same finding logic, vendored into the action for self-contained execution.

Part of the [Kinetic Gain Suite](https://suite.kineticgain.com/). Sibling of [`llm-cost-rollup-action`](https://github.com/mizcausevic-dev/llm-cost-rollup-action) and [`k8s-pre-merge-action`](https://github.com/mizcausevic-dev/k8s-pre-merge-action).

---

## Usage

```yaml
name: A2A governance
on:
  pull_request:
    paths: ["agents/**"]

jobs:
  fleet-summary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mizcausevic-dev/agent-card-fleet-summary-action@v0.1-shipped
        with:
          cards-dir: agents/
          fail-on-high: true   # default
```

## Inputs

| input            | required | default       | description |
|---|---|---|---|
| `cards-dir`      | ✓        | —             | Directory containing `*.json` AgentCard documents. |
| `comment-on-pr`  |          | `auto`        | Post the Markdown summary as a PR comment. `auto` posts only on `pull_request` events; `true` / `false` force the behavior. |
| `fail-on-high`   |          | `true`        | Fail the run when any high-severity finding is present. |
| `github-token`   |          | `${{ github.token }}` | Token used to post the PR comment. |

## Outputs

| output             | description |
|---|---|
| `total-cards`      | Number of AgentCards analyzed. |
| `high-findings`    | Count of high-severity findings. |
| `autonomous-count` | Number of autonomous agents in the fleet. |
| `destructive-tools`| Total destructive tools declared across the fleet. |

## What it flags

| Code | Severity | Rule |
|---|---|---|
| `autonomous-without-incident-response-uri` | 🔴 | Autonomous agent missing `safety_posture.incident_response_uri`. |
| `no-evaluations-on-autonomous` | 🔴 | Autonomous agent has no `evaluations[]`. |
| `destructive-tool-on-non-autonomous` | 🟠 | Non-autonomous agent declares destructive tools. |
| `persistent-memory-without-refusal-taxonomy` | 🟠 | Persistent-memory agent has no refusal taxonomy. |
| `empty-refusal-taxonomy` | 🟡 | No refusal categories declared. |
| `no-evaluations` | 🟡 | No evaluations on a non-autonomous agent. |
| `missing-homepage` | ℹ️ | `agent.homepage` is not set. |

## Composes with

- [**`agent-card-fleet-summary`**](https://github.com/mizcausevic-dev/agent-card-fleet-summary) — the library this wraps.
- [**`agent-card-diff`**](https://github.com/mizcausevic-dev/agent-card-diff), [**`agent-card-stamp`**](https://github.com/mizcausevic-dev/agent-card-stamp), [**`agent-card-readme-generator`**](https://github.com/mizcausevic-dev/agent-card-readme-generator) — full A2A tool family.
- [**`llm-cost-rollup-action`**](https://github.com/mizcausevic-dev/llm-cost-rollup-action), [**`k8s-pre-merge-action`**](https://github.com/mizcausevic-dev/k8s-pre-merge-action) — sibling actions.

## License

[AGPL-3.0-or-later](LICENSE)
