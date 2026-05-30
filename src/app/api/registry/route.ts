import { NextResponse } from "next/server";
import { productOpportunities, registryTemplates } from "@/lib/registry";

export function GET() {
  return NextResponse.json({
    products: productOpportunities,
    templates: registryTemplates
  });
}
