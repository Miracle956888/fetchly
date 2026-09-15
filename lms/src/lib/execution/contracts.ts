/**
 * Code-execution engine contracts (Phase 01: interfaces only).
 *
 * SECURITY RULE — non-negotiable:
 *   Student code is NEVER executed on the application server process.
 *   The eventual execution service must be a separate, isolated runtime with:
 *     - process/container sandboxing (no host filesystem or network by default)
 *     - CPU & memory limits, wall-clock timeouts
 *     - a per-language allowlist (no arbitrary interpreters)
 *     - output size limits and no secrets in the environment
 *
 * Reference implementations considered for Phase 02+: gVisor/Firecracker
 * microVMs, WASI (browser-adjacent), or a managed sandbox API. The adapter
 * below is the seam the rest of the application codes against.
 */
import type { Language } from "@/types";

export type ExecutionStatus = "completed" | "timeout" | "error" | "rejected";

export interface ExecutionRequest {
  /** Who submits (auditing + rate limiting). Never used to relax isolation. */
  userId: string;
  language: Language;
  code: string;
  /** Optional test-harness input for the exercise. */
  input?: string;
  /** Wall-clock timeout in milliseconds (enforced by the sandbox, not us). */
  timeoutMs: number;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  /** Present when the exercise harness evaluates the output. */
  passed?: boolean | null;
}

/**
 * Contract for the isolated executor. Phase 02 ships a real adapter
 * (e.g. `SandboxedExecutor`); Phase 01 only ships the safe stub below.
 */
export interface CodeExecutor {
  readonly kind: string;
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
}

/**
 * Phase 01 stub. Fails closed: instead of running anything, it reports the
 * feature as unavailable. Nothing on this path can execute student code.
 */
export class NotProvisionedExecutor implements CodeExecutor {
  readonly kind = "not-provisioned";
  async execute(_req: ExecutionRequest): Promise<ExecutionResult> {
    return {
      status: "rejected",
      stdout: "",
      stderr: "The interactive code runner is not provisioned in this phase. It is reserved for Phase 02 behind a sandboxed execution service.",
      exitCode: null,
      durationMs: 0,
      passed: null,
    };
  }
}

let executor: CodeExecutor = new NotProvisionedExecutor();

/** Configure a real executor once Phase 02 provisions the sandbox service. */
export function setCodeExecutor(next: CodeExecutor): void {
  executor = next;
}

export function getCodeExecutor(): CodeExecutor {
  return executor;
}
