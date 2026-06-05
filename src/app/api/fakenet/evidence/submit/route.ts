import { NextResponse } from "next/server";
import {
  createFakenetEvidenceSubmissionHelp,
  verifyFakenetEvidenceSubmission
} from "@/lib/fakenet-evidence-submission";

export function GET() {
  return NextResponse.json(createFakenetEvidenceSubmissionHelp());
}

export async function POST(request: Request) {
  const body = await request.json();
  const receipt = verifyFakenetEvidenceSubmission(body);

  return NextResponse.json(receipt, {
    status: receipt.accepted ? 200 : 400
  });
}
