import { NextResponse } from "next/server";

export type ParsedJsonObjectBody =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: NextResponse };

// Hard cap on accepted request-body size. Evidence/submission payloads are tiny
// (well under this). These public, unauthenticated POST routes feed the body
// into a full-body secret scan plus two stringifies plus a deep redact copy, so
// an oversized body amplifies into several large in-memory copies. We reject
// early (413) rather than buffer-and-process an attacker-sized payload.
const MAX_BODY_BYTES = 256 * 1024;

function tooLargeResponse(): ParsedJsonObjectBody {
  return {
    ok: false,
    response: NextResponse.json({ error: "Request body too large." }, { status: 413 })
  };
}

export async function parseJsonObjectBody(request: Request): Promise<ParsedJsonObjectBody> {
  // Reject an oversized body up front (413) before parsing + the downstream
  // secret scan/redact. Content-Length is the cheap, honest signal for normal
  // client POSTs; a body that omits it (chunked) is still bounded by the platform
  // cap and by the breadth bound in the secret scrubber, which fails closed.
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return tooLargeResponse();
  }

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
