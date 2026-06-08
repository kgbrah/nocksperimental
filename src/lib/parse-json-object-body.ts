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

// Max accepted JSON nesting depth. Real evidence/submission payloads are only a
// few levels deep; a pathologically-nested body (e.g. ~5000 levels in ~30KB, which
// slips the size cap) would otherwise crash downstream sinks that recurse over the
// raw input — V8's JSON.stringify throws a RangeError past a few thousand levels,
// which the VESL and Nockup submit libs hit when hashing raw input, turning the
// intended 400 into an unhandled 500. Rejecting here protects every POST route
// that goes through this parser in one place.
const MAX_BODY_DEPTH = 64;

function tooLargeResponse(): ParsedJsonObjectBody {
  return {
    ok: false,
    response: NextResponse.json({ error: "Request body too large." }, { status: 413 })
  };
}

// Bounded depth probe: bails as soon as the limit is reached, so recursion is
// capped at MAX_BODY_DEPTH frames and the probe itself cannot overflow the stack
// on a deeply-nested input. Returns true if any path is at least MAX_BODY_DEPTH deep.
function exceedsMaxDepth(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (depth >= MAX_BODY_DEPTH) {
    return true;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      if (exceedsMaxDepth(child, depth + 1)) {
        return true;
      }
    }
    return false;
  }
  for (const child of Object.values(value)) {
    if (exceedsMaxDepth(child, depth + 1)) {
      return true;
    }
  }
  return false;
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

  // Reject pathologically-nested bodies before any downstream sink recurses over
  // the raw input (fail closed to 400, not an unhandled 500). The probe is
  // depth-bounded so it cannot itself overflow on the very input it guards against.
  if (exceedsMaxDepth(body)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body nesting is too deep." }, { status: 400 })
    };
  }

  return { ok: true, value: body as Record<string, unknown> };
}
