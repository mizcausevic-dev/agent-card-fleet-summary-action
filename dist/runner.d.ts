import { type FleetReport } from "./summarize.js";
export interface RunnerEnv {
    inputs: Record<string, string | undefined>;
    GITHUB_OUTPUT?: string;
    GITHUB_EVENT_NAME?: string;
    GITHUB_REPOSITORY?: string;
    GITHUB_EVENT_PATH?: string;
    /** File reader (defaults to fs.readFileSync). */
    readFile?: (path: string) => string;
    /** Directory lister (defaults to fs.readdirSync). */
    readDir?: (path: string) => string[];
    /** Path stat-isFile predicate (defaults to fs.statSync().isFile). */
    isFile?: (path: string) => boolean;
    /** Stubbed PR-comment poster for tests. */
    postComment?: (args: {
        token: string;
        repo: string;
        issueNumber: number;
        body: string;
    }) => Promise<void>;
    /** Output stream (defaults to process.stdout). */
    write?: (line: string) => void;
}
export interface RunnerResult {
    exitCode: 0 | 1;
    report: FleetReport;
    commentPosted: boolean;
    reason?: string;
}
export declare function run(env: RunnerEnv): Promise<RunnerResult>;
