import { NextResponse } from "next/server";
import {
  createVeslEvidenceSubmissionHelp,
  verifyVeslEvidenceSubmission
} from "@/lib/vesl-evidence-submission";
import { persistVeslEvidenceReceipt } from "@/lib/vesl-receipt-store";

export function GET() {
  return NextResponse.json(createVeslEvidenceSubmissionHelp());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Parameters<typeof verifyVeslEvidenceSubmission>[0];
  const receipt = await persistVeslEvidenceReceipt(verifyVeslEvidenceSubmission(body));

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
