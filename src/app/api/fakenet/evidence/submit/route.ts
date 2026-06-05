import { NextResponse } from "next/server";
import {
  createFakenetEvidenceSubmissionHelp,
  verifyFakenetEvidenceSubmission
} from "@/lib/fakenet-evidence-submission";
import { persistFakenetEvidenceReceipt } from "@/lib/fakenet-receipt-store";

export function GET() {
  return NextResponse.json(createFakenetEvidenceSubmissionHelp());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Parameters<typeof verifyFakenetEvidenceSubmission>[0];
  const receipt = await persistFakenetEvidenceReceipt(verifyFakenetEvidenceSubmission(body));

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
