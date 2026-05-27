import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { summarize, toMarkdown, type AgentCard } from "../src/summarize.js";

const here = fileURLToPath(new URL(".", import.meta.url));

function loadFleet(): AgentCard[] {
  const dir = `${here}/../fixtures/cards`;
  return readdirSync(dir).filter((e) => e.endsWith(".json")).map((e) => JSON.parse(readFileSync(`${dir}/${e}`, "utf8")) as AgentCard);
}

describe("summarize", () => {
  it("counts the 2-card fixture fleet", () => {
    const r = summarize(loadFleet(), "2026-05-26T20:00:00Z");
    expect(r.cards).toBe(2);
    expect(r.byAutonomy.supervised).toBe(1);
    expect(r.byAutonomy.autonomous).toBe(1);
    expect(r.byMemory.session).toBe(1);
    expect(r.byMemory.persistent).toBe(1);
    expect(r.totalDestructiveTools).toBe(1);
  });

  it("flags autonomous-without-incident-response-uri (high) on the risky agent", () => {
    const r = summarize(loadFleet(), "2026-05-26T20:00:00Z");
    expect(r.findings.some((f) => f.code === "autonomous-without-incident-response-uri")).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("flags no-evaluations-on-autonomous and persistent-memory-without-refusal-taxonomy on the risky agent", () => {
    const r = summarize(loadFleet(), "2026-05-26T20:00:00Z");
    const codes = r.findings.map((f) => f.code);
    expect(codes).toContain("no-evaluations-on-autonomous");
    expect(codes).toContain("persistent-memory-without-refusal-taxonomy");
  });

  it("flags missing-homepage (info) when homepage is unset", () => {
    const r = summarize(loadFleet(), "2026-05-26T20:00:00Z");
    expect(r.findings.some((f) => f.code === "missing-homepage")).toBe(true);
  });

  it("ignores cards missing required blocks", () => {
    const r = summarize([{} as AgentCard], "2026-05-26T20:00:00Z");
    expect(r.cards).toBe(0);
  });

  it("ok=true when the fleet is clean", () => {
    const clean: AgentCard[] = [
      {
        agent_card_version: "0.1",
        agent: { id: "a", name: "A", version: "1.0.0", provider: "kg", description: "x", homepage: "https://x" },
        capabilities: { primary_purpose: "p", models_used: [{ model: "c" }], tools: [], max_context_tokens: 1000, memory_persistence: "session", autonomy_level: "assistive" },
        refusal_taxonomy: [{ category: "x", behavior: "refuse_silently" }],
        evaluations: [{ suite: "x", result_uri: "https://x/", ran_at: "2026-01-01T00:00:00Z", passed: true }],
        deployment: {},
        safety_posture: {}
      }
    ];
    const r = summarize(clean, "2026-05-26T20:00:00Z");
    expect(r.ok).toBe(true);
  });

  it("toMarkdown renders a summary section + findings table when present", () => {
    const md = toMarkdown(summarize(loadFleet(), "2026-05-26T20:00:00Z"));
    expect(md).toContain("## Agent Card fleet summary");
    expect(md).toContain("### Findings");
    expect(md).toContain("`autonomous-without-incident-response-uri`");
  });

  it("toMarkdown renders 'No findings.' when clean", () => {
    const clean: AgentCard[] = [
      {
        agent_card_version: "0.1",
        agent: { id: "a", name: "A", version: "1.0.0", provider: "kg", description: "x", homepage: "https://x" },
        capabilities: { primary_purpose: "p", models_used: [{ model: "c" }], tools: [], max_context_tokens: 1000, memory_persistence: "session", autonomy_level: "assistive" },
        refusal_taxonomy: [{ category: "x", behavior: "refuse_silently" }],
        evaluations: [{ suite: "x", result_uri: "https://x/", ran_at: "2026-01-01T00:00:00Z", passed: true }],
        deployment: {},
        safety_posture: {}
      }
    ];
    const md = toMarkdown(summarize(clean, "2026-05-26T20:00:00Z"));
    expect(md).toContain("✅");
    expect(md).toContain("No findings.");
  });
});
