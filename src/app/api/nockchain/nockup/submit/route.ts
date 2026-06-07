import { NextResponse } from "next/server";
import {
  createNockupValidationSubmissionHelp,
  verifyNockupValidationSubmission
} from "@/lib/nockup-validation-submission";
import { persistNockupValidationReceipt } from "@/lib/nockup-receipt-store";
import { parseJsonObjectBody } from "@/lib/parse-json-object-body";

export function GET() {
  return NextResponse.json(createNockupValidationSubmissionHelp());
}

export async function POST(request: Request) {
  const parsed = await parseJsonObjectBody(request);

  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.value as Parameters<typeof verifyNockupValidationSubmission>[0];
  const receipt = await persistNockupValidationReceipt(verifyNockupValidationSubmission(body));

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
