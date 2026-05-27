import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { run, type RunnerEnv } from "../src/runner.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES = `${here}/../fixtures/cards`;

function envWithInputs(inputs: Record<string, string>): RunnerEnv {
  return {
    inputs,
    readFile: (p) => readFileSync(p, "utf8"),
    readDir: (p) => readdirSync(p),
    isFile: (p) => statSync(p).isFile(),
    write: () => undefined
  };
}

describe("runner.run", () => {
  it("exits 1 when fail-on-high is set and a high finding exists", async () => {
    const r = await run(envWithInputs({ cards_dir: FIXTURES, fail_on_high: "true", comment_on_pr: "false" }));
    expect(r.exitCode).toBe(1);
    expect(r.report.cards).toBe(2);
    expect(r.report.findings.some((f) => f.code === "autonomous-without-incident-response-uri")).toBe(true);
    expect(r.commentPosted).toBe(false);
  });

  it("exits 0 when fail-on-high is false even with high findings", async () => {
    const r = await run(envWithInputs({ cards_dir: FIXTURES, fail_on_high: "false", comment_on_pr: "false" }));
    expect(r.exitCode).toBe(0);
  });

  it("rejects when cards-dir input is missing", async () => {
    await expect(run({ inputs: {} })).rejects.toThrow(/cards_dir/);
  });

  it("posts a PR comment in pull_request context when token + event_path provided", async () => {
    const calls: Array<{ repo: string; issueNumber: number; body: string }> = [];
    const env: RunnerEnv = {
      inputs: { cards_dir: FIXTURES, comment_on_pr: "auto", github_token: "ghs_test", fail_on_high: "false" },
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_REPOSITORY: "mizcausevic-dev/test",
      GITHUB_EVENT_PATH: `${here}/event.json`,
      readFile: (p) => (p.endsWith("event.json") ? JSON.stringify({ number: 42 }) : readFileSync(p, "utf8")),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      postComment: async (args) => {
        calls.push({ repo: args.repo, issueNumber: args.issueNumber, body: args.body });
      },
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].repo).toBe("mizcausevic-dev/test");
    expect(calls[0].issueNumber).toBe(42);
    expect(calls[0].body).toContain("Agent Card fleet summary");
  });

  it("skips PR comment when no GITHUB_EVENT_PATH", async () => {
    const env: RunnerEnv = {
      inputs: { cards_dir: FIXTURES, comment_on_pr: "true", github_token: "ghs_test", fail_on_high: "false" },
      GITHUB_REPOSITORY: "x/y",
      readFile: (p) => readFileSync(p, "utf8"),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
    expect(r.reason).toBe("no GITHUB_EVENT_PATH");
  });

  it("skips PR comment when token is missing", async () => {
    const env: RunnerEnv = {
      inputs: { cards_dir: FIXTURES, comment_on_pr: "true", fail_on_high: "false" },
      GITHUB_REPOSITORY: "x/y",
      GITHUB_EVENT_PATH: "/event.json",
      readFile: (p) => (p.endsWith("event.json") ? "{}" : readFileSync(p, "utf8")),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
    expect(r.reason).toBe("no github-token provided");
  });

  it("skips PR comment when event has no PR number", async () => {
    const env: RunnerEnv = {
      inputs: { cards_dir: FIXTURES, comment_on_pr: "true", github_token: "ghs", fail_on_high: "false" },
      GITHUB_REPOSITORY: "x/y",
      GITHUB_EVENT_PATH: "/event.json",
      readFile: (p) => (p.endsWith("event.json") ? "{}" : readFileSync(p, "utf8")),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
    expect(r.reason).toBe("no PR number in event payload");
  });

  it("does not comment by default on non-PR events with comment_on_pr=auto", async () => {
    const env: RunnerEnv = {
      inputs: { cards_dir: FIXTURES, comment_on_pr: "auto", github_token: "ghs", fail_on_high: "false" },
      GITHUB_EVENT_NAME: "push",
      readFile: (p) => readFileSync(p, "utf8"),
      readDir: (p) => readdirSync(p),
      isFile: (p) => statSync(p).isFile(),
      write: () => undefined
    };
    const r = await run(env);
    expect(r.commentPosted).toBe(false);
  });
});
