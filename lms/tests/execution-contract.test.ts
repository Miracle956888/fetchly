import { afterEach, describe, expect, it } from "vitest";
import {
  getCodeExecutor,
  NotProvisionedExecutor,
  setCodeExecutor,
  type ExecutionRequest,
} from "@/lib/execution/contracts";

const req: ExecutionRequest = {
  userId: "u1",
  language: "javascript",
  code: "process.exit(0); // must never run",
  timeoutMs: 1000,
};

describe("code-execution contract (Phase 01 stub)", () => {
  afterEach(() => {
    setCodeExecutor(new NotProvisionedExecutor());
  });

  it("default executor is the not-provisioned stub", () => {
    expect(getCodeExecutor().kind).toBe("not-provisioned");
  });

  it("fails closed: reports rejected, executes nothing, no output", async () => {
    const result = await getCodeExecutor().execute(req);
    expect(result.status).toBe("rejected");
    expect(result.stdout).toBe("");
    expect(result.exitCode).toBeNull();
    expect(result.passed).toBeNull();
    expect(result.stderr).toContain("not provisioned");
  });

  it("the stub is stateless and repeatable", async () => {
    const a = await getCodeExecutor().execute(req);
    const b = await getCodeExecutor().execute(req);
    expect(a.status).toBe(b.status);
  });

  it("setCodeExecutor swaps the active executor", async () => {
    const custom = {
      kind: "test-dummy",
      async execute() {
        return { status: "completed" as const, stdout: "ok", stderr: "", exitCode: 0, durationMs: 1, passed: true };
      },
    };
    setCodeExecutor(custom);
    expect(getCodeExecutor().kind).toBe("test-dummy");
    const r = await getCodeExecutor().execute(req);
    expect(r.status).toBe("completed");
    expect(r.stdout).toBe("ok");
  });
});
