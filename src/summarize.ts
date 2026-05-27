// Vendored agent-card fleet-summary logic. Mirrors the live tool at
// https://github.com/mizcausevic-dev/agent-card-fleet-summary so this action
// is self-contained.

export type AutonomyLevel = "assistive" | "supervised" | "autonomous";
export type MemoryPersistence = "none" | "session" | "persistent";
export type SideEffectClass = "read" | "mutating" | "external" | "destructive";

export interface AgentCard {
  agent_card_version: string;
  agent: { id: string; name: string; version: string; provider: string; description: string; homepage?: string };
  capabilities: {
    primary_purpose: string;
    models_used: Array<{ model: string; role?: string }>;
    tools: Array<{ name: string; side_effects: SideEffectClass; mcp_tool_card_uri?: string }>;
    max_context_tokens: number;
    memory_persistence: MemoryPersistence;
    autonomy_level: AutonomyLevel;
  };
  refusal_taxonomy?: Array<{ category: string; behavior: string }>;
  evaluations?: Array<{ suite: string; result_uri: string; ran_at: string; passed?: boolean }>;
  deployment: Record<string, unknown>;
  safety_posture: { incident_response_uri?: string; [key: string]: unknown };
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export type FindingCode =
  | "autonomous-without-incident-response-uri"
  | "no-evaluations-on-autonomous"
  | "destructive-tool-on-non-autonomous"
  | "persistent-memory-without-refusal-taxonomy"
  | "empty-refusal-taxonomy"
  | "no-evaluations"
  | "missing-homepage";

export interface Finding {
  code: FindingCode;
  severity: FindingSeverity;
  message: string;
  subject: string;
  subjectName?: string;
}

export interface FleetReport {
  generatedAt: string;
  cards: number;
  byAutonomy: Record<AutonomyLevel, number>;
  byMemory: Record<MemoryPersistence, number>;
  totalDestructiveTools: number;
  totalToolUses: number;
  findings: Finding[];
  ok: boolean;
}

export function summarize(cards: AgentCard[], now?: string): FleetReport {
  const generatedAt = now ?? new Date().toISOString();
  const findings: Finding[] = [];
  const byAutonomy: Record<AutonomyLevel, number> = { assistive: 0, supervised: 0, autonomous: 0 };
  const byMemory: Record<MemoryPersistence, number> = { none: 0, session: 0, persistent: 0 };
  let totalDestructiveTools = 0;
  let totalToolUses = 0;
  let counted = 0;

  for (const c of cards) {
    if (!c.agent || !c.capabilities) continue;
    counted += 1;
    const id = `${c.agent.id}@${c.agent.version}`;
    const tools = c.capabilities.tools ?? [];
    const destructive = tools.filter((t) => t.side_effects === "destructive").length;
    const refusalCount = c.refusal_taxonomy?.length ?? 0;
    const evalCount = c.evaluations?.length ?? 0;
    const hasIru = !!c.safety_posture?.incident_response_uri;

    if (c.capabilities.autonomy_level in byAutonomy) byAutonomy[c.capabilities.autonomy_level] += 1;
    if (c.capabilities.memory_persistence in byMemory) byMemory[c.capabilities.memory_persistence] += 1;
    totalDestructiveTools += destructive;
    totalToolUses += tools.length;

    if (c.capabilities.autonomy_level === "autonomous" && !hasIru) {
      findings.push({ code: "autonomous-without-incident-response-uri", severity: "high", message: "Autonomous agent has no incident_response_uri.", subject: id, subjectName: c.agent.name });
    }
    if (c.capabilities.autonomy_level === "autonomous" && evalCount === 0) {
      findings.push({ code: "no-evaluations-on-autonomous", severity: "high", message: "Autonomous agent has no evaluations.", subject: id, subjectName: c.agent.name });
    }
    if (destructive > 0 && c.capabilities.autonomy_level !== "autonomous") {
      findings.push({ code: "destructive-tool-on-non-autonomous", severity: "medium", message: `${destructive} destructive tool(s) on a ${c.capabilities.autonomy_level} agent.`, subject: id, subjectName: c.agent.name });
    }
    if (c.capabilities.memory_persistence === "persistent" && refusalCount === 0) {
      findings.push({ code: "persistent-memory-without-refusal-taxonomy", severity: "medium", message: "Persistent-memory agent has no refusal taxonomy.", subject: id, subjectName: c.agent.name });
    }
    if (refusalCount === 0) {
      findings.push({ code: "empty-refusal-taxonomy", severity: "low", message: "No refusal taxonomy.", subject: id, subjectName: c.agent.name });
    }
    if (evalCount === 0 && c.capabilities.autonomy_level !== "autonomous") {
      findings.push({ code: "no-evaluations", severity: "low", message: "No evaluations recorded.", subject: id, subjectName: c.agent.name });
    }
    if (!c.agent.homepage) {
      findings.push({ code: "missing-homepage", severity: "info", message: "agent.homepage is missing.", subject: id, subjectName: c.agent.name });
    }
  }

  return {
    generatedAt,
    cards: counted,
    byAutonomy,
    byMemory,
    totalDestructiveTools,
    totalToolUses,
    findings,
    ok: !findings.some((f) => f.severity === "high")
  };
}

const SEVERITY_LABEL: Record<FindingSeverity, string> = { high: "🔴 high", medium: "🟠 medium", low: "🟡 low", info: "ℹ️  info" };
const SEVERITY_RANK: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

export function toMarkdown(report: FleetReport): string {
  const lines: string[] = [];
  lines.push(report.ok ? `## Agent Card fleet summary ✅` : `## Agent Card fleet summary ❌`);
  lines.push(``);
  lines.push(`- **Cards:** ${report.cards} · Tool uses: ${report.totalToolUses} · Destructive: ${report.totalDestructiveTools}`);
  lines.push(`- Autonomy: assistive=${report.byAutonomy.assistive} · supervised=${report.byAutonomy.supervised} · autonomous=${report.byAutonomy.autonomous}`);
  lines.push(`- Memory: none=${report.byMemory.none} · session=${report.byMemory.session} · persistent=${report.byMemory.persistent}`);

  const ranked = [...report.findings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  if (ranked.length > 0) {
    lines.push(``);
    lines.push(`### Findings (${ranked.length})`);
    lines.push(``);
    lines.push(`| severity | code | agent | message |`);
    lines.push(`|---|---|---|---|`);
    for (const f of ranked) {
      lines.push(`| ${SEVERITY_LABEL[f.severity]} | \`${f.code}\` | ${f.subjectName ?? f.subject} | ${f.message} |`);
    }
  } else {
    lines.push(``);
    lines.push(`No findings.`);
  }
  return lines.join("\n");
}
