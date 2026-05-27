export type AutonomyLevel = "assistive" | "supervised" | "autonomous";
export type MemoryPersistence = "none" | "session" | "persistent";
export type SideEffectClass = "read" | "mutating" | "external" | "destructive";
export interface AgentCard {
    agent_card_version: string;
    agent: {
        id: string;
        name: string;
        version: string;
        provider: string;
        description: string;
        homepage?: string;
    };
    capabilities: {
        primary_purpose: string;
        models_used: Array<{
            model: string;
            role?: string;
        }>;
        tools: Array<{
            name: string;
            side_effects: SideEffectClass;
            mcp_tool_card_uri?: string;
        }>;
        max_context_tokens: number;
        memory_persistence: MemoryPersistence;
        autonomy_level: AutonomyLevel;
    };
    refusal_taxonomy?: Array<{
        category: string;
        behavior: string;
    }>;
    evaluations?: Array<{
        suite: string;
        result_uri: string;
        ran_at: string;
        passed?: boolean;
    }>;
    deployment: Record<string, unknown>;
    safety_posture: {
        incident_response_uri?: string;
        [key: string]: unknown;
    };
}
export type FindingSeverity = "high" | "medium" | "low" | "info";
export type FindingCode = "autonomous-without-incident-response-uri" | "no-evaluations-on-autonomous" | "destructive-tool-on-non-autonomous" | "persistent-memory-without-refusal-taxonomy" | "empty-refusal-taxonomy" | "no-evaluations" | "missing-homepage";
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
export declare function summarize(cards: AgentCard[], now?: string): FleetReport;
export declare function toMarkdown(report: FleetReport): string;
