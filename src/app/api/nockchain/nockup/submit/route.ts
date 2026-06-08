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

  // Backstop: fail closed to 400 (not an unhandled 500) if any residual input
  // shape makes pure verification throw — public, unauthenticated route.
  let receipt;
  try {
    receipt = verifyNockupValidationSubmission(body);
  } catch {
    return NextResponse.json({ error: "Invalid validation submission." }, { status: 400 });
  }

  const persisted = await persistNockupValidationReceipt(receipt);

  return NextResponse.json(persisted, {
    status: persisted.accepted ? 200 : 400
  });
}
