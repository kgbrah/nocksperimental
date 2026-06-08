import { readFileSync, writeFileSync } from "node:fs";
import { NextResponse } from "next/server";
import {
  appendTrustUpdateToLog,
  createDevHash,
  trustUpdateChainSummary,
  trustUpdateEntries,
  trustUpdateLog,
  type TrustUpdateAppendInput,
  type TrustUpdateEntry,
  validateTrustUpdateChain
} from "@/lib/trust-update-log";
import {
  createTrustUpdateAuditLog,
  readTrustUpdateAuditLog,
  type TrustUpdateAuditEvent
} from "@/lib/trust-update-audit-log";
import { authenticateRegistryUpdate } from "@/lib/trust-update-registry-auth";
import { parseJsonObjectBody } from "@/lib/parse-json-object-body";

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

  const parsed = await parseJsonObjectBody(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  const input = parsed.value as Partial<TrustUpdateAppendInput>;
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
    // Verified attribution only: attribute the audited write to the AUTHENTICATED key,
    // never to the caller-supplied x-nocks-registry-actor header — an attacker holding
    // a valid write credential could otherwise forge actor attribution into the
    // tamper-evident audit chain.
    actor: auth.keyId,
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
