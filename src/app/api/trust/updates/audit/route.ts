import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { NextResponse } from "next/server";

type TrustUpdateAuditEvent = {
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

type TrustUpdateAuditLog = {
  version: string;
  source: string;
  events: TrustUpdateAuditEvent[];
};

export function GET(request: Request) {
  if (!authenticateRegistryUpdate(request)) {
    return NextResponse.json({ error: "unauthorized registry update" }, { status: 401 });
  }

  const auditPath = process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH;
  const configured = Boolean(auditPath);
  const auditLog = auditPath ? readTrustUpdateAuditLog(auditPath) : createTrustUpdateAuditLog();
  const latestEvent = auditLog.events.at(-1) ?? null;

  return NextResponse.json({
    configured,
    source: auditLog.source,
    eventCount: auditLog.events.length,
    latestEvent,
    events: auditLog.events
  });
}

function createTrustUpdateAuditLog(): TrustUpdateAuditLog {
  return {
    version: "v0",
    source: "src/app/api/trust/updates",
    events: []
  };
}

function readTrustUpdateAuditLog(auditPath: string): TrustUpdateAuditLog {
  if (!existsSync(auditPath)) {
    return createTrustUpdateAuditLog();
  }

  return JSON.parse(readFileSync(auditPath, "utf8")) as TrustUpdateAuditLog;
}

function authenticateRegistryUpdate(request: Request) {
  const requestKey = request.headers.get("x-nocks-registry-key") ?? "";
  const configuredKeys = parseRegistryUpdateKeys();

  if (configuredKeys.length > 0) {
    const requestKeyId = request.headers.get("x-nocks-registry-key-id") ?? "";
    const configuredKey = configuredKeys.find((key) => key.keyId === requestKeyId);

    return Boolean(configuredKey && safeCompareSecrets(configuredKey.secret, requestKey));
  }

  const legacyKey = process.env.NOCKS_REGISTRY_UPDATE_KEY;

  return Boolean(legacyKey && safeCompareSecrets(legacyKey, requestKey));
}

function parseRegistryUpdateKeys() {
  return (process.env.NOCKS_REGISTRY_UPDATE_KEYS ?? "")
    .split(",")
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex === -1) {
        return null;
      }

      const keyId = entry.slice(0, separatorIndex).trim();
      const secret = entry.slice(separatorIndex + 1).trim();

      if (!keyId || !secret) {
        return null;
      }

      return { keyId, secret };
    })
    .filter((entry): entry is { keyId: string; secret: string } => Boolean(entry));
}

function safeCompareSecrets(expected: string, actual: string) {
  const expectedHash = createHash("sha256").update(expected).digest();
  const actualHash = createHash("sha256").update(actual).digest();

  return timingSafeEqual(expectedHash, actualHash);
}
