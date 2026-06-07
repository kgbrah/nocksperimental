import { NextResponse } from "next/server";
import {
  createTrustUpdateAuditLog,
  readTrustUpdateAuditLog
} from "@/lib/trust-update-audit-log";
import { authenticateRegistryUpdate } from "@/lib/trust-update-registry-auth";

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
