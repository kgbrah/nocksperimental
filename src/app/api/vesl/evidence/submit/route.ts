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
  const receipt = await persistVeslEvidenceReceipt(verifyVeslEvidenceSubmission(body));

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
