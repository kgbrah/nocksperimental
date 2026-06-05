import { NextResponse } from "next/server";
import { readVeslEvidenceReceipt } from "@/lib/vesl-receipt-store";
import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";

export const dynamic = "force-dynamic";

type ReceiptRouteContext = {
  params: {
    receiptId?: string;
  } | Promise<{
    receiptId?: string;
  }>;
};

export async function GET(_request: Request, context: ReceiptRouteContext) {
  const { receiptId = "" } = await context.params;
  const result = await readVeslEvidenceReceipt(receiptId);

  if (!result.receipt) {
    return NextResponse.json(
      {
        version: "v0",
        service: registryServiceName,
        subject: registrySubject,
        canonicalUrl: `${registryCanonicalBaseUrl}/api/vesl/evidence/receipts/${receiptId}`,
        receiptId,
        found: false,
        storage: {
          backend: result.backend,
          binding: result.binding
        },
        error: "VESL evidence receipt was not found.",
        links: {
          receipts: `${registryCanonicalBaseUrl}/api/vesl/evidence/receipts`,
          submit: `${registryCanonicalBaseUrl}/api/vesl/evidence/submit`
        }
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json(result.receipt);
}
