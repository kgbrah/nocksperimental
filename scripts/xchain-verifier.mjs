#!/usr/bin/env node

// xchain-verifier — standalone forensic verifier for Nockchain<->Base cross-chain apps.
//
// Re-derives the 7 cross-chain security properties from PUBLIC joint state, INDEPENDENTLY of the lab
// runner — so a relying party resolves a dispute by recomputation, not by trusting nocksperimental.
// It proves (a) the honest federated-bridge and HTLC-swap apps satisfy every applicable property, and
// (b) each modeled attack is caught by EXACTLY its target property (specificity) and nothing else.
//
// Ground truth: the real Nockchain<->Base bridge is a 3-of-5 federated mint-and-burn bridge
// (nockchain/crates/bridge: Nock.sol burn -> MessageInbox.sol mint); Nockchain %hax uses Tip5,
// EVM uses keccak256 (hoon/common/tx-engine-1.hoon). HONEST LIMIT: this is a MODEL of two chains,
// not a live two-chain execution. See docs/xchain-security-model.md.

import { createHash } from "node:crypto";

// Chain resolution + native-hash lookup is shared with the lab runner (run-lab.mjs) — same data, same
// alias map — via ./lib/evm-chain-registry.mjs. The independent property CHECKS below stay separate.
import { resolveChain as chain, hashesForChain as hashesFor } from "./lib/evm-chain-registry.mjs";

// ---- the 7 properties, each pure over public state: () => { ok, detail } -------------------

export function supplyConserved(x) {
  const burnById = new Map((x.burns ?? []).map((b) => [String(b.id), Number(b.amount ?? 0)]));
  const unbacked = (x.mints ?? []).filter((m) => (burnById.get(String(m.id)) ?? -1) < Number(m.amount ?? 0));
  const ok = Number(x.minted ?? 0) <= Number(x.burned ?? 0) && unbacked.length === 0;
  return { ok, detail: ok ? `minted ${x.minted} <= burned ${x.burned}, all backed` : `minted ${x.minted} > burned ${x.burned} or unbacked ${unbacked.map((m) => m.id)}` };
}
export function quorumAuthorized(x) {
  const authorized = new Set((x.signers ?? []).map(String));
  const bad = (x.mints ?? []).filter((m) => {
    const d = new Set((m.attestedBy ?? []).map(String));
    return [...d].some((s) => !authorized.has(s)) || d.size < Number(x.threshold ?? 0);
  });
  return { ok: bad.length === 0, detail: bad.length === 0 ? `all mints have >= ${x.threshold} authorized sigs` : `bad: ${bad.map((m) => m.id)}` };
}
export function replaySafe(mints) {
  const ids = (mints ?? []).map((m) => String(m.id));
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  return { ok: dup.length === 0, detail: dup.length === 0 ? `${ids.length} ids unique` : `replay ${[...new Set(dup)]}` };
}
export function finalityDepth(x) {
  const premature = (x.mints ?? []).filter((m) => Number(m.confirmations ?? 0) < Number(x.requiredConfirmations ?? 0));
  return { ok: premature.length === 0, detail: premature.length === 0 ? `all >= ${x.requiredConfirmations} conf` : `premature ${premature.map((m) => `${m.id}=${m.confirmations}`)}` };
}
export function hashlockAlgoMatch(htlc) {
  const issues = [];
  const seen = new Map();
  for (const leg of htlc.legs ?? []) {
    if (!hashesFor(leg.chainId ?? leg.chain, leg.family).includes(leg.hashAlgo)) issues.push(`${leg.chain ?? leg.chainId}:${leg.hashAlgo} not computable`);
    if (leg.derivedFromSharedPreimage !== true) issues.push(`${leg.chain}: not derived from shared preimage`);
    if (leg.hashAlgo === "sha256" && htlc.preimage != null) {
      const d = createHash("sha256").update(Buffer.from(String(htlc.preimage), "hex")).digest("hex");
      if (d !== String(leg.commitment)) issues.push(`${leg.chain}: sha256(preimage)!=commitment`);
    }
    seen.set(String(leg.commitment), (seen.get(String(leg.commitment)) ?? 0) + 1);
  }
  for (const [, n] of seen) if (n > 1) issues.push(`identical commitment x${n} (false cross-chain hash equality)`);
  return { ok: issues.length === 0, detail: issues.length === 0 ? "all legs chain-computable, distinct commitments" : issues.join("; ") };
}
export function timelockOrdering(htlc) {
  const first = (htlc.legs ?? []).find((l) => l.fundsFirst === true);
  const rest = (htlc.legs ?? []).filter((l) => l !== first);
  const unsafe = first ? rest.filter((l) => Number(first.timelockBlocks) <= Number(l.timelockBlocks)) : [];
  return { ok: Boolean(first) && unsafe.length === 0, detail: !first ? "no first-funded leg" : unsafe.length ? `free option vs ${unsafe.map((l) => l.chain)}` : `first-funded ${first.chain}=${first.timelockBlocks} > others` };
}
export function atomicSettlement(settlement) {
  const s = (settlement ?? []).map(String);
  const ok = s.length > 0 && (s.every((x) => x === "claimed") || s.every((x) => x === "refunded"));
  return { ok, detail: ok ? `atomic: all ${s[0]}` : `non-atomic [${s}]` };
}

// ---- multi-EVM generalization checks (registry-driven) ----
export function finalityAdequacy(x) {
  const appReq = Number(x.appRequiredConfirmations ?? 0);
  const issues = [];
  for (const s of x.settles ?? []) {
    const c = chain(s.chainId ?? s.chain);
    if (!c) { issues.push(`${s.id}:unknown-chain`); continue; }
    const floor = Math.max(appReq, Number(c.recommendedMinConfirmations ?? 0));
    if (Number(s.confirmations ?? 0) < floor) issues.push(`${s.id}@${c.name}:${s.confirmations}<${floor}`);
    if (s.confirmationBasis != null && c.confirmationBasis != null && String(s.confirmationBasis) !== String(c.confirmationBasis)) issues.push(`${s.id}@${c.name}:basis ${s.confirmationBasis}!=${c.confirmationBasis}`);
    if (s.basedOnSoftConfirm === true && c.trustSoftConfirm === false) issues.push(`${s.id}@${c.name}:soft-confirm`);
  }
  return { ok: issues.length === 0, detail: issues.length === 0 ? "all settles meet chain floor+basis" : issues.join("; ") };
}
export function chainidBound(x) {
  const issues = [];
  for (const m of x.messages ?? []) {
    const a = m.attestation ?? {};
    if (a.signedPayloadIncludesChainId !== true) issues.push(`${m.id}:no-chainId`);
    else if (Number(a.signedChainId) !== Number(m.targetChainId)) issues.push(`${m.id}:signed ${a.signedChainId}->applied ${m.targetChainId}`);
    if (a.eip155 === false) issues.push(`${m.id}:pre-eip155`);
  }
  return { ok: issues.length === 0, detail: issues.length === 0 ? "all messages bind targetChainId" : issues.join("; ") };
}
export function replayNamespacing(x) {
  const route = x.expectedRoute ?? {};
  const counts = new Map();
  const issues = [];
  for (const p of x.processed ?? []) {
    const k = `${p.destChainId}:${p.id}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (p.sourceChainId == null) issues.push(`${p.id}:no-source`);
    if (route[p.id] != null && Number(route[p.id]) !== Number(p.destChainId)) issues.push(`${p.id}:misrouted->${p.destChainId}`);
  }
  for (const [k, n] of counts) if (n > 1) issues.push(`replay ${k}`);
  return { ok: issues.length === 0, detail: issues.length === 0 ? "unique per (destChainId,id)" : issues.join("; ") };
}
export function domainSeparator(x) {
  const issues = [];
  const byEp = new Map();
  const hs = [];
  const h = (d) => createHash("sha256").update(`${d?.name}|${d?.version}|${d?.chainId}|${d?.verifyingContract}`).digest("hex");
  for (const e of x.endpoints ?? []) {
    const d = e.domain ?? {};
    if (Number(d.chainId) !== Number(e.chainId)) issues.push(`ep${e.chainId}:chainId`);
    if (!d.verifyingContract || /^0x0+$|placeholder/i.test(String(d.verifyingContract))) issues.push(`ep${e.chainId}:verifyingContract`);
    if (e.derivesChainIdAtVerify !== true) issues.push(`ep${e.chainId}:stale`);
    const hh = h(d);
    byEp.set(Number(e.chainId), hh);
    hs.push(hh);
  }
  if (hs.some((v, i) => hs.indexOf(v) !== i)) issues.push("duplicate-domain");
  for (const a of x.authorizations ?? []) if (a.boundDomainHash !== byEp.get(Number(a.usedAtEndpoint))) issues.push(`auth@${a.usedAtEndpoint}:wrong-domain`);
  return { ok: issues.length === 0, detail: issues.length === 0 ? "distinct chain-bound domains; authorizations match" : issues.join("; ") };
}
export function challengeWindow(x) {
  const issues = [];
  for (const w of x.withdrawals ?? []) {
    const c = chain(w.chainId ?? w.chain);
    if (!c) { issues.push(`${w.id}:unknown-chain`); continue; }
    const win = Number(c.challengeWindowSeconds ?? 0); // >0 marks an optimistic/contestable chain
    if (win <= 0) continue;
    if (w.finalizedOnL1 === true || w.instantLPexit === true) continue;
    if (Number(w.creditedAtTime ?? 0) - Number(w.l2BurnBlockTime ?? 0) < win) issues.push(`${w.id}@${c.name}:credited-early`);
  }
  return { ok: issues.length === 0, detail: issues.length === 0 ? "optimistic withdrawals finalized/LP-bonded" : issues.join("; ") };
}

const FED = (x) => ({ "supply-conserved": supplyConserved(x), "quorum-authorized": quorumAuthorized(x), "replay-safe": replaySafe(x.mints), "finality-depth": finalityDepth(x) });
const HTLC = (h) => ({ "hashlock-algo-match": hashlockAlgoMatch(h), "timelock-ordering": timelockOrdering(h), "atomic-settlement": atomicSettlement(h.settlement) });
const MEVM = (x) => ({ "chainid-bound": chainidBound(x.crosschain ?? {}), "finality-adequacy": finalityAdequacy(x.finality ?? {}), "replay-namespacing": replayNamespacing(x.routing ?? {}), "domain-separator": domainSeparator(x.domain ?? {}), "challenge-window": challengeWindow(x.exits ?? {}), "hashlock-algo-match": hashlockAlgoMatch(x.htlc ?? { legs: [] }) });

// ---- self-test: honest apps verify; each attack is caught by EXACTLY its target ------------

function main() {
  const fails = [];
  const ok = (cond, label) => { if (!cond) fails.push(label); console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`); };
  const PRE = "aa".repeat(32);
  const cBase = createHash("sha256").update(Buffer.from(PRE, "hex")).digest("hex");
  const cNock = "t1p5" + "c".repeat(60);

  const honestFed = { minted: 1000, burned: 1000, signers: ["n1", "n2", "n3", "n4", "n5"], threshold: 3, requiredConfirmations: 12, burns: [{ id: "wd-001", amount: 1000 }], mints: [{ id: "wd-001", amount: 1000, attestedBy: ["n1", "n2", "n3"], confirmations: 12 }], settlement: ["claimed"] };
  const honestHtlc = { preimage: PRE, legs: [{ chain: "nockchain", hashAlgo: "tip5", commitment: cNock, derivedFromSharedPreimage: true, timelockBlocks: 200, fundsFirst: true }, { chain: "base", hashAlgo: "sha256", commitment: cBase, derivedFromSharedPreimage: true, timelockBlocks: 100, fundsFirst: false }], settlement: ["claimed", "claimed"] };

  console.log("1) Honest federated bridge satisfies all 4 federated properties:");
  for (const [k, r] of Object.entries(FED(honestFed))) ok(r.ok, `${k}: ${r.detail}`);
  console.log("\n2) Honest HTLC swap satisfies all 3 HTLC properties:");
  for (const [k, r] of Object.entries(HTLC(honestHtlc))) ok(r.ok, `${k}: ${r.detail}`);
  ok(atomicSettlement(honestFed.settlement).ok, `atomic-settlement (federated): ${atomicSettlement(honestFed.settlement).detail}`);

  console.log("\n3) Each attack is caught by EXACTLY its target property (specificity):");
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const attacks = [
    ["mint-without-burn", "supply-conserved", "fed", (x) => { x.mints = [{ id: "wd-EVIL", amount: 500, attestedBy: ["n1", "n2", "n3"], confirmations: 12 }]; }],
    ["under-quorum", "quorum-authorized", "fed", (x) => { x.mints[0].attestedBy = ["n1", "n2"]; }],
    ["unauthorized-signer", "quorum-authorized", "fed", (x) => { x.mints[0].attestedBy = ["n1", "n2", "evil"]; }],
    ["replay", "replay-safe", "fed", (x) => { x.mints = [x.mints[0], clone(x.mints[0])]; }],
    ["premature-finality", "finality-depth", "fed", (x) => { x.mints[0].confirmations = 3; }],
    ["hash-algo-mismatch", "hashlock-algo-match", "htlc", (h) => { h.legs[0].hashAlgo = "keccak256"; }],
    ["timelock-inversion", "timelock-ordering", "htlc", (h) => { h.legs[0].timelockBlocks = 100; h.legs[1].timelockBlocks = 200; }],
    ["one-sided-settlement", "atomic-settlement", "htlc", (h) => { h.settlement = ["refunded", "claimed"]; }]
  ];
  for (const [name, target, kind, mutate] of attacks) {
    const base = kind === "fed" ? clone(honestFed) : clone(honestHtlc);
    mutate(base);
    const results = kind === "fed" ? FED(base) : HTLC(base);
    const targetCaught = results[target] && results[target].ok === false;
    const othersClean = Object.entries(results).filter(([k]) => k !== target).every(([, r]) => r.ok);
    ok(targetCaught && othersClean, `${name} -> caught by ${target} only (${results[target]?.detail})`);
  }

  // ---- multi-EVM generalization: any EVM chain via the registry ----
  const dHash = (d) => createHash("sha256").update(`${d.name}|${d.version}|${d.chainId}|${d.verifyingContract}`).digest("hex");
  // Fresh objects per call (the attacks mutate sub-objects in place, so nothing may be shared).
  const honestMevm = () => {
    const a = { name: "NockBridge", version: "1", chainId: 42161, verifyingContract: "0xArb01" };
    const o = { name: "NockBridge", version: "1", chainId: 10, verifyingContract: "0xOpt02" };
    return {
      crosschain: { messages: [{ id: "wd-001", targetChainId: 42161, attestation: { signedPayloadIncludesChainId: true, signedChainId: 42161, eip155: true } }] },
      finality: { appRequiredConfirmations: 0, settles: [{ id: "wd-001", chainId: 42161, confirmations: 64, confirmationBasis: "L1-batch", basedOnSoftConfirm: false }] },
      routing: { processed: [{ id: "wd-001", sourceChainId: 0, destChainId: 42161 }], expectedRoute: { "wd-001": 42161 } },
      domain: { endpoints: [{ chainId: 42161, verifyingContract: a.verifyingContract, domain: a, derivesChainIdAtVerify: true }, { chainId: 10, verifyingContract: o.verifyingContract, domain: o, derivesChainIdAtVerify: true }], authorizations: [{ boundDomainHash: dHash(a), usedAtEndpoint: 42161 }] },
      exits: { now: 700000, withdrawals: [{ id: "wd-001", chainId: 42161, l2BurnBlockTime: 0, creditedAtTime: 0, finalizedOnL1: true }] },
      htlc: { preimage: PRE, legs: [{ chainId: 0, chain: "nockchain", hashAlgo: "tip5", commitment: cNock, derivedFromSharedPreimage: true }, { chainId: 42161, chain: "arbitrum", hashAlgo: "keccak256", commitment: "kecc" + "a".repeat(60), derivedFromSharedPreimage: true }] }
    };
  };

  console.log("\n4) Honest multi-EVM bridge satisfies all 6 generalized (registry-driven) properties:");
  for (const [k, r] of Object.entries(MEVM(honestMevm()))) ok(r.ok, `${k}: ${r.detail}`);

  console.log("\n5) Each multi-EVM attack is caught by EXACTLY its target property:");
  const mAttacks = [
    ["signature-replay", "chainid-bound", (x) => { x.crosschain.messages[0].targetChainId = 10; }],
    ["insufficient-finality", "finality-adequacy", (x) => { x.finality.settles[0] = { id: "wd-001", chainId: 8453, confirmations: 12, confirmationBasis: "native" }; }],
    ["replay-namespacing", "replay-namespacing", (x) => { x.routing.processed = [{ id: "wd-001", sourceChainId: 0, destChainId: 8453 }, { id: "wd-001", sourceChainId: 0, destChainId: 42161 }]; x.routing.expectedRoute = { "wd-001": 8453 }; }],
    ["missing-domain-separator", "domain-separator", (x) => { for (const e of x.domain.endpoints) { e.domain.chainId = 1; e.domain.verifyingContract = "0xSAME"; e.derivesChainIdAtVerify = false; } x.domain.authorizations = [{ boundDomainHash: dHash(x.domain.endpoints[0].domain), usedAtEndpoint: 10 }]; }],
    ["challenge-window", "challenge-window", (x) => { x.exits.withdrawals[0] = { id: "wd-001", chainId: 10, l2BurnBlockTime: 0, creditedAtTime: 3600, finalizedOnL1: false }; }],
    ["evm-hashlock-family-mismatch", "hashlock-algo-match", (x) => { x.htlc.legs[1].hashAlgo = "tip5"; }]
  ];
  for (const [name, target, mutate] of mAttacks) {
    const base = honestMevm();
    mutate(base);
    const results = MEVM(base);
    const targetCaught = results[target] && results[target].ok === false;
    const othersClean = Object.entries(results).filter(([k]) => k !== target).every(([, r]) => r.ok);
    ok(targetCaught && othersClean, `${name} -> caught by ${target} only (${results[target]?.detail})`);
  }

  console.log(`\n${fails.length === 0 ? "xchain-verifier: all assertions passed" : `FAILURES: ${fails.join(" | ")}`}`);
  if (fails.length) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
