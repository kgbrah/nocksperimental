import { NextResponse } from "next/server";
import {
  createVeslEvidenceSubmissionHelp,
  verifyVeslEvidenceSubmission
} from "@/lib/vesl-evidence-submission";
import { persistVeslEvidenceReceipt } from "@/lib/vesl-receipt-store";
import { parseJsonObjectBody } from "@/lib/parse-json-object-body";

export function GET() {
  return NextResponse.json(createVeslEvidenceSubmissionHelp());
}

export async function POST(request: Request) {
  const parsed = await parseJsonObjectBody(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.value as Parameters<typeof verifyVeslEvidenceSubmission>[0];

  // Backstop: verification is pure over the parsed body, but fail closed to 400
  // (not an unhandled 500) if any residual input shape makes it throw — public,
  // unauthenticated route, so never surface a 500/stack to the caller.
  let receipt;
  try {
    receipt = verifyVeslEvidenceSubmission(body);
  } catch {
    return NextResponse.json({ error: "Invalid evidence submission." }, { status: 400 });
  }

  const persisted = await persistVeslEvidenceReceipt(receipt);

  return NextResponse.json(persisted, {
    status: persisted.accepted ? 200 : 400
  });
}
