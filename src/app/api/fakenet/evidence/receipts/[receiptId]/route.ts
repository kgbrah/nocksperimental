import { NextResponse } from "next/server";
import { readFakenetEvidenceReceipt } from "@/lib/fakenet-receipt-store";
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
  const result = await readFakenetEvidenceReceipt(receiptId);

  if (!result.receipt) {
    return NextResponse.json(
      {
        version: "v0",
        service: registryServiceName,
        subject: registrySubject,
        canonicalUrl: `${registryCanonicalBaseUrl}/api/fakenet/evidence/receipts/${receiptId}`,
        receiptId,
        found: false,
        storage: {
          backend: result.backend,
          binding: result.binding
        },
        error: "Fakenet evidence receipt was not found.",
        links: {
          receipts: `${registryCanonicalBaseUrl}/api/fakenet/evidence/receipts`,
          submit: `${registryCanonicalBaseUrl}/api/fakenet/evidence/submit`
        }
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json(result.receipt);
}
