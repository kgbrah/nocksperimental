import { NextResponse } from "next/server";
import {
  createNockupValidationSubmissionHelp,
  verifyNockupValidationSubmission
} from "@/lib/nockup-validation-submission";
import { persistNockupValidationReceipt } from "@/lib/nockup-receipt-store";

export function GET() {
  return NextResponse.json(createNockupValidationSubmissionHelp());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Parameters<typeof verifyNockupValidationSubmission>[0];
  const receipt = await persistNockupValidationReceipt(verifyNockupValidationSubmission(body));

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
