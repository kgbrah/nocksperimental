import { NextResponse } from "next/server";

export type ParsedJsonObjectBody =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: NextResponse };

export async function parseJsonObjectBody(request: Request): Promise<ParsedJsonObjectBody> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 })
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 })
    };
  }

  return { ok: true, value: body as Record<string, unknown> };
}
