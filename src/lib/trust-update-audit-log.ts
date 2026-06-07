import { existsSync, readFileSync } from "node:fs";

export type TrustUpdateAuditEvent = {
  sequence: number;
  updateId: string;
  action: string;
  target: string;
  actor: string;
  keyId: string;
  recordedAt: string;
  previousRoot: string;
  rootHash: string;
  entryHash: string;
  persisted: boolean;
  writePath: string | null;
  eventHash: string;
};

export type TrustUpdateAuditLog = {
  version: string;
  source: string;
  events: TrustUpdateAuditEvent[];
};

export function createTrustUpdateAuditLog(): TrustUpdateAuditLog {
  return {
    version: "v0",
    source: "src/app/api/trust/updates",
    events: []
  };
}

export function readTrustUpdateAuditLog(auditPath: string): TrustUpdateAuditLog {
  if (!existsSync(auditPath)) {
    return createTrustUpdateAuditLog();
  }

  return JSON.parse(readFileSync(auditPath, "utf8")) as TrustUpdateAuditLog;
}
