// Central config + reachability for the Nock %fair orchestrator.
//
// The orchestrator is a co-located service: it shells out to the verified Nock
// CLIs and reaches a local fakenet node's private gRPC, so it CANNOT run inside
// the Cloudflare Worker that serves this site. The browser talks to it directly
// over HTTP.
//
// Loopback nuance: `http://127.0.0.1` (and localhost) is a "potentially
// trustworthy" SECURE CONTEXT, so browsers do NOT treat it as mixed content —
// an https page (the hosted site) CAN call it, provided the operator is on the
// same machine running the orchestrator and the browser's Private Network
// Access preflight is answered (the orchestrator does, for allowlisted origins).
// Only a NON-loopback http URL from an https page is truly blocked. Set
// NEXT_PUBLIC_ORCHESTRATOR_URL to a hosted, HTTPS, CORS-allowed orchestrator to
// enable it for visitors who aren't on the operator's machine.

export const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || "http://127.0.0.1:8787";

const DEFAULT_LOCAL = !process.env.NEXT_PUBLIC_ORCHESTRATOR_URL;

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1";
}

/** True when the configured orchestrator URL points at localhost/loopback. */
export function isLocalOrchestrator(): boolean {
  try {
    return isLoopbackHost(new URL(ORCHESTRATOR_URL).hostname);
  } catch {
    return false;
  }
}

/**
 * True ONLY for genuinely-blocked mixed content: an https page calling a
 * NON-loopback http orchestrator. Loopback http is a secure-context exception
 * and is NOT blocked, so it must not short-circuit the reachability probe.
 */
export function isMixedContent(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.protocol !== "https:" || !ORCHESTRATOR_URL.startsWith("http://")) return false;
  try {
    return !isLoopbackHost(new URL(ORCHESTRATOR_URL).hostname);
  } catch {
    return true;
  }
}

export type OrchestratorStatus =
  | { state: "checking" }
  | { state: "ready" }
  | { state: "unavailable"; reason: string };

/**
 * A best-effort static reason the orchestrator can't be reached, derived from
 * config + page origin — used to explain the situation BEFORE a network probe
 * (and to give a precise message when a probe fails). Returns null when there's
 * no a-priori reason it should fail.
 */
export function staticUnavailableReason(): string | null {
  if (typeof window === "undefined") return null;
  if (isMixedContent()) {
    return "This page is https but the orchestrator URL is non-loopback http — browsers block that (mixed content). Serve the orchestrator over https, or use a loopback URL on the operator's own machine.";
  }
  const onHostedSite = !isLoopbackHost(window.location.hostname);
  if (onHostedSite && (DEFAULT_LOCAL || isLocalOrchestrator())) {
    return "Live %fair settlement runs against a co-located orchestrator + fakenet node on the operator's machine. From the hosted site it's reachable only if you're on that same machine (with it running). Otherwise run the site locally, or point NEXT_PUBLIC_ORCHESTRATOR_URL at a hosted orchestrator.";
  }
  return null;
}

/** Ping the orchestrator's /health with a short timeout. */
export async function pingOrchestrator(timeoutMs = 4000): Promise<boolean> {
  if (typeof window !== "undefined" && isMixedContent()) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${ORCHESTRATOR_URL}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function parseOrError(res: Response, path: string) {
  // Tolerate non-JSON error bodies (a proxy 502 is HTML, not JSON) so callers
  // see the wrapped "<path> failed (status)" message, not a SyntaxError.
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const msg =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `${path} failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

// Pre-block ONLY the fetch the browser is guaranteed to reject outright: a
// non-loopback http orchestrator from an https page (true mixed content). A
// loopback URL is NOT pre-blocked — it may genuinely work for the operator
// (secure-context exception + the orchestrator's Private Network Access reply),
// so we let the request go and let the actual /health probe decide.
function guardReachable(): void {
  if (isMixedContent()) {
    throw new Error(
      "This page is https but the orchestrator URL is non-loopback http — browsers block that (mixed content). Serve the orchestrator over https."
    );
  }
}

export async function orchestratorPost(path: string, payload: unknown) {
  guardReachable();
  const res = await fetch(`${ORCHESTRATOR_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseOrError(res, path);
}

export async function orchestratorGet(path: string) {
  guardReachable();
  const res = await fetch(`${ORCHESTRATOR_URL}${path}`);
  return parseOrError(res, path);
}
