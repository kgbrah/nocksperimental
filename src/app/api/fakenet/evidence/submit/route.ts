import { NextResponse } from "next/server";
import {
  createFakenetEvidenceSubmissionHelp,
  verifyFakenetEvidenceSubmission
} from "@/lib/fakenet-evidence-submission";
import { persistFakenetEvidenceReceipt } from "@/lib/fakenet-receipt-store";
import { parseJsonObjectBody } from "@/lib/parse-json-object-body";

export function GET() {
  return NextResponse.json(createFakenetEvidenceSubmissionHelp());
}

export async function POST(request: Request) {
  const parsed = await parseJsonObjectBody(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.value as Parameters<typeof verifyFakenetEvidenceSubmission>[0];
  const receipt = await persistFakenetEvidenceReceipt(verifyFakenetEvidenceSubmission(body));

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
