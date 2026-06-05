import { NextResponse } from "next/server";
import { launchEvidenceCaseForId, verifyLaunchEvidenceReport } from "@/lib/launch-evidence";

type VerificationRequestBody = {
  caseId?: unknown;
  reportHash?: unknown;
  snapshotRoot?: unknown;
};

type LaunchEvidenceVerification = ReturnType<typeof verifyLaunchEvidenceReport>;

export function GET(request: Request) {
  const url = new URL(request.url);
  const verification = verifyLaunchEvidenceReport({
    caseId: url.searchParams.get("caseId"),
    reportHash: url.searchParams.get("reportHash"),
    snapshotRoot: url.searchParams.get("snapshotRoot")
  });

  return NextResponse.json(redactPrivateVerification(verification));
}

export async function POST(request: Request) {
  const body = await parseVerificationRequestBody(request);

  if (!body.ok) {
    return NextResponse.json(
      {
        version: "v0",
        error: body.error
      },
      { status: 400 }
    );
  }

  const verification = verifyLaunchEvidenceReport({
    caseId: asOptionalString(body.value.caseId),
    reportHash: asOptionalString(body.value.reportHash),
    snapshotRoot: asOptionalString(body.value.snapshotRoot)
  });

  return NextResponse.json(redactPrivateVerification(verification));
}

async function parseVerificationRequestBody(
  request: Request
): Promise<{ ok: true; value: VerificationRequestBody } | { ok: false; error: string }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "Malformed Launch Evidence verification request." };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Launch Evidence verification request body must be an object." };
  }

  return { ok: true, value: body };
}

function redactPrivateVerification(verification: LaunchEvidenceVerification) {
  const launchCase = verification.caseId ? launchEvidenceCaseForId(verification.caseId) : null;

  if (launchCase?.visibility !== "private") {
    return verification;
  }

  return {
    version: verification.version,
    service: verification.service,
    subject: verification.subject,
    canonicalUrl: verification.canonicalUrl,
    verified: false,
    checks: {
      caseMatched: false,
      reportHashMatched: false,
      snapshotRootMatched: false,
      publicOrShared: false
    }
  };
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}
