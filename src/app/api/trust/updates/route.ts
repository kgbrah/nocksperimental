import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { NextResponse } from "next/server";
import {
  appendTrustUpdateToLog,
  trustUpdateChainSummary,
  trustUpdateEntries,
  trustUpdateLog,
  type TrustUpdateAppendInput,
  type TrustUpdateEntry,
  validateTrustUpdateChain
} from "@/lib/trust-update-log";

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

type RegistryUpdateAuth = {
  keyId: string;
};

export function GET() {
  return NextResponse.json({
    version: trustUpdateLog.version,
    chain: trustUpdateLog.chain,
    summary: trustUpdateChainSummary,
    validation: validateTrustUpdateChain(),
    entries: trustUpdateEntries
  });
}

export async function POST(request: Request) {
  const auth = authenticateRegistryUpdate(request);

  if (!auth) {
    return NextResponse.json({ error: "unauthorized registry update" }, { status: 401 });
  }

  const input = (await request.json()) as Partial<TrustUpdateAppendInput>;
  const missingField = [
    "id",
    "action",
    "target",
    "targetPath",
    "recordedAt",
    "rootHash",
    "summary"
  ].find((field) => !input[field as keyof TrustUpdateAppendInput]);

  if (missingField) {
    return NextResponse.json({ error: `missing required field: ${missingField}` }, { status: 400 });
  }

  const writePath = process.env.NOCKS_REGISTRY_UPDATE_WRITE_PATH;
  const sourceLog = writePath
    ? JSON.parse(readFileSync(writePath, "utf8"))
    : trustUpdateLog;
  const candidateLog = appendTrustUpdateToLog(sourceLog, input as TrustUpdateAppendInput);
  const validation = validateTrustUpdateChain(candidateLog);
  const entry = candidateLog.entries.at(-1);

  if (!entry) {
    return NextResponse.json({ error: "candidate trust update log did not produce an entry" }, { status: 409 });
  }

  if (!validation.isAppendOnly) {
    return NextResponse.json(
      { error: "candidate trust update log failed append-only validation", validation },
      { status: 409 }
    );
  }

  const auditPath = process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH;
  const auditLog = auditPath ? readTrustUpdateAuditLog(auditPath) : createTrustUpdateAuditLog();
  const auditEvent = createTrustUpdateAuditEvent({
    actor: request.headers.get("x-nocks-registry-actor") ?? "registry-api",
    entry,
    keyId: auth.keyId,
    persisted: Boolean(writePath),
    sequence: auditLog.events.length + 1,
    writePath: writePath ?? null
  });

  if (writePath) {
    writeFileSync(writePath, `${JSON.stringify(candidateLog, null, 2)}\n`);
  }
  if (auditPath) {
    writeFileSync(
      auditPath,
      `${JSON.stringify({ ...auditLog, events: [...auditLog.events, auditEvent] }, null, 2)}\n`
    );
  }

  return NextResponse.json({
    persisted: Boolean(writePath),
    storage: {
      writePath: writePath ?? null
    },
    audit: {
      persisted: Boolean(auditPath),
      event: auditEvent
    },
    chain: candidateLog.chain,
    validation,
    entry
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

function createTrustUpdateAuditEvent(input: {
  actor: string;
  entry: TrustUpdateEntry;
  keyId: string;
  persisted: boolean;
  sequence: number;
  writePath: string | null;
}): TrustUpdateAuditEvent {
  const eventWithoutHash = {
    sequence: input.sequence,
    updateId: input.entry.id,
    action: input.entry.action,
    target: input.entry.target,
    actor: input.actor,
    keyId: input.keyId,
    recordedAt: new Date().toISOString(),
    previousRoot: input.entry.previousRoot,
    rootHash: input.entry.rootHash,
    entryHash: input.entry.entryHash,
    persisted: input.persisted,
    writePath: input.writePath
  };

  return {
    ...eventWithoutHash,
    eventHash: `sha256:${createDevHash(eventWithoutHash)}`
  };
}

function authenticateRegistryUpdate(request: Request): RegistryUpdateAuth | null {
  const requestKey = request.headers.get("x-nocks-registry-key") ?? "";
  const configuredKeys = parseRegistryUpdateKeys();

  if (configuredKeys.length > 0) {
    const requestKeyId = request.headers.get("x-nocks-registry-key-id") ?? "";
    const configuredKey = configuredKeys.find((key) => key.keyId === requestKeyId);

    if (configuredKey && safeCompareSecrets(configuredKey.secret, requestKey)) {
      return { keyId: configuredKey.keyId };
    }

    return null;
  }

  const legacyKey = process.env.NOCKS_REGISTRY_UPDATE_KEY;
  if (legacyKey && safeCompareSecrets(legacyKey, requestKey)) {
    return { keyId: request.headers.get("x-nocks-registry-key-id") ?? "legacy" };
  }

  return null;
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

function createDevHash(value: unknown) {
  return createHash("sha256").update(canonicalStringify(value)).digest("hex");
}

function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([keyA], [keyB]) =>
      keyA.localeCompare(keyB)
    );

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
