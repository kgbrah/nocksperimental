#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  INVARIANT_KINDS,
  INVARIANT_SEVERITIES,
  STEP_TYPES,
  scaffoldFixture,
  validateFixture
} from "./fixture-builder.mjs";
import { resolveChain, hashesForChain } from "./lib/evm-chain-registry.mjs";

const rawArgs = process.argv.slice(2);
const verb = rawArgs[0];
const args = rawArgs[0] === "run" ? rawArgs.slice(1) : rawArgs;

const BOOLEAN_FLAGS = new Set(["--strict", "--ci", "--help"]);
const VALUE_FLAGS = new Set(["--config", "--out", "--markdown", "--out-dir"]);
// Known subcommands (used by did-you-mean); declared early so main() can use it.
const KNOWN_VERBS = ["run", "new-fixture"];

// STEP_TYPES (handled in runStep), INVARIANT_KINDS and INVARIANT_SEVERITIES
// (handled in evaluateInvariant) are imported from fixture-builder.mjs as the
// single source of truth, kept in sync with the fixture/pack JSON schemas and
// src/lib/lab-report.ts. INVARIANT_REQUIRED_FIELDS stays local (the runner owns
// the per-kind cross-field requirements).
const PACK_DOMAINS = ["payments", "intents", "token-issuance", "bridge-settlement", "pma-safety", "mining-pow"];

// Per-kind cross-field requirements, mirroring src/lib/lab-report.ts invariantCatalog
// requiredFields. `type` "number"/"array" carry an additional type check beyond presence.
const INVARIANT_REQUIRED_FIELDS = {
  "numeric-min": [{ field: "min", type: "number" }, { field: "path", type: "string" }],
  "state-equals": [{ field: "path", type: "string" }, { field: "equals", type: "present" }],
  "timeline-state": [{ field: "path", type: "string" }, { field: "equals", type: "present" }],
  "supply-conservation": [
    { field: "balancesPath", type: "string" },
    { field: "supplyPath", type: "string" }
  ],
  "authorized-actor": [{ field: "actors", type: "array" }, { field: "stepType", type: "string" }],
  "poke-actors-declared": [],
  "numeric-range": [
    { field: "path", type: "string" },
    { field: "min", type: "number" },
    { field: "max", type: "number" }
  ],
  "array-length-min": [{ field: "path", type: "string" }, { field: "min", type: "number" }],
  "array-length-max": [{ field: "path", type: "string" }, { field: "max", type: "number" }],
  "temporal-ordering": [
    { field: "path", type: "string" },
    { field: "field", type: "string" },
    { field: "before", type: "present" },
    { field: "after", type: "present" }
  ],
  "custom-function": [{ field: "fn", type: "string" }, { field: "path", type: "string" }],
  "monotonic-strict": [{ field: "path", type: "string" }]
};

// Static, in-repo allowlist of custom invariant functions. A fixture references a
// function by NAME only (invariant.fn); there is NO eval / new Function / dynamic
// import of fixture-supplied code. Each fn is PURE over final state (no clock,
// network, or randomness) and returns { passes, observed, expected }. Adding a
// function is a deliberate, reviewed code change here — third-party fixtures can
// never register code, only reference an already-allowlisted name (enforced at load).
// EVM chain registry (src/data/evm-chains.json): family -> native hashes, plus per-chain finality
// profile (recommendedMinConfirmations, confirmationBasis, trustSoftConfirm, challengeWindowSeconds).
// This is what generalizes the cross-chain invariants to ANY EVM chain (and Nockchain, family "nock").
// resolveChain / hashesForChain are shared with the standalone verifier via ./lib/evm-chain-registry.mjs.

// Normalize a state value the contract types as a list. The xchain invariants take
// arrays (message lists, withdrawals, endpoints, …); anything else (undefined, an
// object, a scalar) becomes an empty list so iteration never throws on malformed input.
const asArray = (v) => (Array.isArray(v) ? v : []);

const CUSTOM_INVARIANT_FUNCTIONS = Object.freeze({
  "balances-non-negative": (state, invariant) => {
    const balances = getPath(state, invariant.path) ?? {};
    const offenders = Object.entries(balances).filter(([, amount]) => Number(amount) < 0);

    return {
      passes: offenders.length === 0,
      observed:
        offenders.length === 0
          ? `all ${Object.keys(balances).length} balances >= 0`
          : offenders.map(([holder, amount]) => `${holder}=${amount}`).join(", "),
      expected: `every value under ${invariant.path} >= 0`
    };
  },
  // Commit-reveal games (forfeit-flip/dice): the kernel's PEEK SURFACE must never expose an
  // unrevealed seed/secret. Fails if any key under `path` is secret-NAMED. (We match on key
  // name, NOT value shape: a public commitment is a long hex hash indistinguishable by shape
  // from a seed, so shape-matching would false-flag commitments. The structural fix is that
  // a seed never appears in the peek surface at all — a secret-named key is the leak.)
  // Catches the coinflip.hoon [%state ~] seed leak (its seed sat under the key `seed`).
  "peek-reveals-no-secret": (state, invariant) => {
    const surface = getPath(state, invariant.path) ?? {};
    const SECRET_KEY = /seed|secret|preimage|private|mnemonic|passphrase/i;
    const leaks = [];
    const walk = (obj, prefix) => {
      if (!obj || typeof obj !== "object") return;
      for (const [key, value] of Object.entries(obj)) {
        const keyPath = prefix ? `${prefix}.${key}` : key;
        if (SECRET_KEY.test(key)) leaks.push(keyPath);
        else if (value && typeof value === "object") walk(value, keyPath);
      }
    };
    walk(surface, "");
    return {
      passes: leaks.length === 0,
      observed:
        leaks.length === 0
          ? `peek surface clean: ${Object.keys(surface).length} field(s), no unrevealed secret`
          : `LEAK: ${leaks.join(", ")}`,
      expected: `no unrevealed seed/secret in the peek surface at ${invariant.path}`
    };
  },
  // Provable fairness: every REVEALED seed must hash to its prior commitment
  // (sha256(seed)==commit), so a post-hoc grind / wrong-seed reveal is caught. Each entry
  // under `path` is { commit, seed, label? }; unrevealed entries (missing seed) are skipped.
  "commit-binds-seed": (state, invariant) => {
    const raw = getPath(state, invariant.path) ?? [];
    const entries = Array.isArray(raw) ? raw : Object.values(raw);
    const mismatched = [];
    let checked = 0;
    for (const entry of entries) {
      if (!entry || entry.seed == null || entry.commit == null) continue;
      checked += 1;
      const digest = createHash("sha256").update(Buffer.from(String(entry.seed), "hex")).digest("hex");
      if (digest !== String(entry.commit)) mismatched.push(entry.label ?? String(entry.seed).slice(0, 12));
    }
    return {
      passes: mismatched.length === 0,
      observed:
        mismatched.length === 0
          ? `all ${checked} revealed seed(s) hash to their commitment`
          : `MISMATCH: ${mismatched.join(", ")}`,
      expected: `sha256(seed) == commit for every revealed pair under ${invariant.path}`
    };
  },

  // ===== Cross-chain (Nockchain <-> Base) security invariants =====
  // Model a TWO-chain app's joint state in one process (model-attested, not live execution).
  // Ground truth: the real Nockchain<->Base bridge is a 3-of-5 FEDERATED mint-and-burn bridge
  // (nockchain/crates/bridge: Nock.sol burn -> MessageInbox.sol mint); Nockchain's %hax hashlock uses
  // Tip5 while EVM uses keccak256 (hoon/common/tx-engine-1.hoon). See docs/xchain-security-model.md.

  // No value is minted on Base beyond what was burned/locked on Nockchain, and every mint is backed by
  // a recorded burn (matched by id). Catches inflation / mint-from-nothing.
  // path -> { minted:@, burned:@, mints?:[{id,amount}], burns?:[{id,amount}] }
  "xchain-supply-conserved": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const minted = Number(x.minted ?? 0);
    const burned = Number(x.burned ?? 0);
    const mints = asArray(x.mints);
    const burns = asArray(x.burns);
    const burnById = new Map(burns.map((b) => [String(b.id), Number(b.amount ?? 0)]));
    const unbacked = mints.filter((m) => (burnById.get(String(m.id)) ?? -1) < Number(m.amount ?? 0));
    return {
      passes: minted <= burned && unbacked.length === 0,
      observed:
        minted > burned
          ? `INFLATION: minted ${minted} > burned ${burned}`
          : unbacked.length
            ? `UNBACKED MINT(S): ${unbacked.map((m) => m.id).join(", ")}`
            : `minted ${minted} <= burned ${burned}; all ${mints.length} mint(s) backed by a burn`,
      expected: `minted <= burned and every mint backed by a recorded burn under ${invariant.path}`
    };
  },

  // Every mint/settle is attested by >= threshold DISTINCT signers, all in the authorized set.
  // Catches under-quorum and unauthorized-signer minting.
  // path -> { signers:[id], threshold:@, mints:[{id,attestedBy:[id]}] }
  "xchain-quorum-authorized": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const authorized = new Set((x.signers ?? []).map(String));
    const threshold = Number(x.threshold ?? 0);
    const mints = asArray(x.mints);
    const bad = [];
    for (const m of mints) {
      const distinct = new Set((m.attestedBy ?? []).map(String));
      const unauthorized = [...distinct].filter((s) => !authorized.has(s));
      if (unauthorized.length) bad.push(`${m.id}: unauthorized ${unauthorized.join("/")}`);
      else if (distinct.size < threshold) bad.push(`${m.id}: ${distinct.size}/${threshold} sigs`);
    }
    return {
      passes: bad.length === 0,
      observed:
        bad.length === 0
          ? `all ${mints.length} mint(s) have >= ${threshold} distinct authorized attestations`
          : `QUORUM FAIL: ${bad.join("; ")}`,
      expected: `each mint attested by >= threshold distinct authorized signers under ${invariant.path}`
    };
  },

  // Each cross-chain message id is processed at most once. Catches replay / double-mint.
  // path -> [{id}, ...] (the processed/minted message list)
  "xchain-replay-safe": (state, invariant) => {
    const list = asArray(getPath(state, invariant.path));
    const counts = new Map();
    for (const e of list) {
      const id = String(e?.id ?? e);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const dups = [...counts].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
    return {
      passes: dups.length === 0,
      observed: dups.length === 0 ? `all ${list.length} message id(s) unique` : `REPLAY: ${dups.join(", ")}`,
      expected: `no cross-chain message id processed more than once under ${invariant.path}`
    };
  },

  // Each dependent settle references a source event with confirmations >= requiredConfirmations.
  // Catches premature / reorg double-spend.
  // path -> { requiredConfirmations:@, mints:[{id,confirmations}] }
  "xchain-finality-depth": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const required = Number(x.requiredConfirmations ?? 0);
    const mints = asArray(x.mints);
    const premature = mints.filter((m) => Number(m.confirmations ?? 0) < required);
    return {
      passes: premature.length === 0,
      observed:
        premature.length === 0
          ? `all ${mints.length} settle(s) >= ${required} confirmations`
          : `PREMATURE: ${premature.map((m) => `${m.id}=${m.confirmations}`).join(", ")}`,
      expected: `every settle references a source event with >= ${required} confirmations under ${invariant.path}`
    };
  },

  // HTLC hashlock cross-chain compatibility. Each leg's hashAlgo must be one its chain can compute
  // (nockchain->tip5; base/evm->keccak256/sha256) AND its commitment must derive from the SHARED
  // preimage; two legs sharing an identical commitment value is the false "cross-chain hash equality"
  // bug (Tip5 != keccak). Where hashAlgo==sha256 the preimage->commitment is verified concretely.
  // path -> { preimage, legs:[{chain,hashAlgo,commitment,derivedFromSharedPreimage}] }
  "xchain-hashlock-algo-match": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    // Registry-driven: each leg's chain (by chainId or legacy name) -> its native hashes. Works for
    // ANY EVM chain (keccak256/sha256) and the Nockchain leg (tip5) without code changes.
    const legs = asArray(x.legs);
    const issues = [];
    const commitSeen = new Map();
    for (const leg of legs) {
      const label = leg.chain ?? leg.chainId;
      const allowed = hashesForChain(leg.chainId ?? leg.chain, leg.family);
      if (!allowed.includes(String(leg.hashAlgo))) {
        issues.push(`${label}: ${leg.hashAlgo} not computable on that chain (allowed: ${allowed.join("/") || "none"})`);
      }
      if (leg.derivedFromSharedPreimage !== true) {
        issues.push(`${label}: commitment not derived from the shared preimage`);
      }
      if (leg.hashAlgo === "sha256" && x.preimage != null) {
        const d = createHash("sha256").update(Buffer.from(String(x.preimage), "hex")).digest("hex");
        if (d !== String(leg.commitment)) issues.push(`${label}: sha256(preimage) != commitment`);
      }
      const c = String(leg.commitment);
      commitSeen.set(c, (commitSeen.get(c) ?? 0) + 1);
    }
    for (const [c, n] of commitSeen) {
      if (n > 1) issues.push(`identical commitment on ${n} legs (false cross-chain hash equality): ${c.slice(0, 12)}`);
    }
    return {
      passes: issues.length === 0,
      observed:
        issues.length === 0
          ? `all ${legs.length} leg(s) lock the shared preimage under a chain-computable hash; commitments distinct`
          : `HASHLOCK MISMATCH: ${issues.join("; ")}`,
      expected: `each HTLC leg locks the shared preimage under a hash its own chain can compute, with distinct per-chain commitments, under ${invariant.path}`
    };
  },

  // HTLC timelock ordering: the refund window on the FIRST-funded leg must outlast the claim window on
  // every other leg, so the counterparty can't refund and still claim. Catches the free-option / theft.
  // path -> { legs:[{chain,timelockBlocks,fundsFirst}] }
  "xchain-timelock-ordering": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const legs = asArray(x.legs);
    const first = legs.find((l) => l.fundsFirst === true);
    const rest = legs.filter((l) => l !== first);
    const unsafe = first
      ? rest.filter((l) => Number(first.timelockBlocks ?? 0) <= Number(l.timelockBlocks ?? 0))
      : [];
    return {
      passes: Boolean(first) && unsafe.length === 0,
      observed: !first
        ? "no first-funded leg declared"
        : unsafe.length
          ? `FREE OPTION: first-funded ${first.chain}=${first.timelockBlocks} <= ${unsafe.map((l) => `${l.chain}=${l.timelockBlocks}`).join(", ")}`
          : `first-funded ${first.chain}=${first.timelockBlocks} > all other legs`,
      expected: `refund timelock on the first-funded leg > claim window on every other leg under ${invariant.path}`
    };
  },

  // Atomicity: the terminal joint settlement is (all legs claimed) XOR (all legs refunded); never a mix,
  // never stuck-locked. Catches partial execution / one-sided settlement / stuck funds.
  // path -> [status, ...] where status in {claimed, refunded, locked}
  "xchain-atomic-settlement": (state, invariant) => {
    const statuses = asArray(getPath(state, invariant.path)).map(String);
    const allClaimed = statuses.length > 0 && statuses.every((s) => s === "claimed");
    const allRefunded = statuses.length > 0 && statuses.every((s) => s === "refunded");
    return {
      passes: allClaimed || allRefunded,
      observed:
        allClaimed || allRefunded
          ? `atomic: all ${statuses.length} leg(s) ${allClaimed ? "claimed" : "refunded"}`
          : `NON-ATOMIC: [${statuses.join(", ")}]`,
      expected: `terminal settlement is all-claimed or all-refunded (no mix, no stuck-locked) under ${invariant.path}`
    };
  },

  // ===== Multi-EVM generalization invariants (registry-driven; any EVM chain) =====

  // Per-chain, registry-driven finality: a settle on chain C needs confirmations >=
  // max(app-required, registry floor[C]), the right confirmationBasis, and no reliance on a reversible
  // soft-confirmation. Catches "12 native confirmations on Base" (Base needs ~65 L1-batch) and trusting
  // an optimistic-rollup sequencer soft-confirm. The floor/basis come from the registry, not state.
  // path -> { appRequiredConfirmations?:@, settles:[{id,chainId,confirmations,confirmationBasis?,basedOnSoftConfirm?}] }
  "xchain-finality-adequacy": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const appReq = Number(x.appRequiredConfirmations ?? 0);
    const settles = asArray(x.settles);
    const issues = [];
    for (const s of settles) {
      const c = resolveChain(s.chainId ?? s.chain);
      if (!c) {
        issues.push(`${s.id}: unknown chain ${s.chainId ?? s.chain}`);
        continue;
      }
      const floor = Math.max(appReq, Number(c.recommendedMinConfirmations ?? 0));
      if (Number(s.confirmations ?? 0) < floor) issues.push(`${s.id}@${c.name}: ${s.confirmations} < ${floor} confirmations`);
      if (s.confirmationBasis != null && c.confirmationBasis != null && String(s.confirmationBasis) !== String(c.confirmationBasis)) {
        issues.push(`${s.id}@${c.name}: basis ${s.confirmationBasis} != required ${c.confirmationBasis}`);
      }
      if (s.basedOnSoftConfirm === true && c.trustSoftConfirm === false) issues.push(`${s.id}@${c.name}: trusts reversible soft-confirmation`);
    }
    return {
      passes: issues.length === 0,
      observed: issues.length === 0 ? `all ${settles.length} settle(s) meet their chain's finality floor + basis` : `FINALITY: ${issues.join("; ")}`,
      expected: `each settle has confirmations >= max(app, registry floor[chain]) on the chain's required basis, under ${invariant.path}`
    };
  },

  // Cross-EVM signature replay: a cross-chain message/attestation must bind its TARGET chain id in the
  // signed payload (and use EIP-155 for raw txs), so one valid signature set can't mint the same
  // withdrawal on a DIFFERENT EVM chain (N-fold inflation). quorum-authorized checks the signers, not
  // that the signed bytes name one chain. path -> { messages:[{id,targetChainId,attestation:{signedPayloadIncludesChainId,signedChainId,eip155?}}] }
  "xchain-chainid-bound": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const messages = asArray(x.messages);
    const issues = [];
    for (const m of messages) {
      const a = m.attestation ?? {};
      if (a.signedPayloadIncludesChainId !== true) issues.push(`${m.id}: signed payload omits chainId (replayable on any chain)`);
      else if (Number(a.signedChainId) !== Number(m.targetChainId)) issues.push(`${m.id}: signed for chain ${a.signedChainId} but applied to ${m.targetChainId}`);
      if (a.eip155 === false) issues.push(`${m.id}: pre-EIP-155 (chainId not bound in v)`);
    }
    return {
      passes: issues.length === 0,
      observed: issues.length === 0 ? `all ${messages.length} message(s) bind their target chain id` : `CHAIN-ID REPLAY: ${issues.join("; ")}`,
      expected: `every cross-chain message's signed payload binds its targetChainId (raw txs use EIP-155), under ${invariant.path}`
    };
  },

  // Multi-EVM replay namespacing: the replay key must be (destChainId, id). A bare-id ledger lets one
  // burn be processed once per chain (double-mint) and can mis-route ids — what single-namespace
  // xchain-replay-safe cannot see. path -> { processed:[{id,sourceChainId,destChainId}], expectedRoute?:{id:destChainId} }
  "xchain-per-chain-replay-namespacing": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const route = x.expectedRoute ?? {};
    const processed = asArray(x.processed);
    const counts = new Map();
    const issues = [];
    for (const p of processed) {
      const key = `${p.destChainId}:${p.id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (p.sourceChainId === undefined || p.sourceChainId === null) issues.push(`${p.id}: missing sourceChainId`);
      if (route[p.id] != null && Number(route[p.id]) !== Number(p.destChainId)) issues.push(`${p.id} misrouted to ${p.destChainId} (expected ${route[p.id]})`);
    }
    for (const [k, n] of counts) if (n > 1) issues.push(`replay ${k} x${n}`);
    return {
      passes: issues.length === 0,
      observed: issues.length === 0 ? `all ${processed.length} message(s) unique per (destChainId,id), source-scoped, correctly routed` : `XCHAIN REPLAY: ${issues.join("; ")}`,
      expected: `each message unique per (destChainId,id), carries a sourceChainId, routed to its expected chain, under ${invariant.path}`
    };
  },

  // EIP-712 domain-separator binding: each EVM endpoint must have a DISTINCT domain (chainId +
  // verifyingContract), re-derived at verify time, and an authorization is valid only at the endpoint
  // whose domain it was bound to. Catches cross-contract / cross-chain signature reuse + stale separators.
  // path -> { endpoints:[{chainId,verifyingContract,domain:{name,version,chainId,verifyingContract},derivesChainIdAtVerify}], authorizations:[{boundDomainHash,usedAtEndpoint}] }
  "xchain-domain-separator-binding": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const endpoints = asArray(x.endpoints);
    const issues = [];
    const hashOf = (d) => createHash("sha256").update(`${d?.name}|${d?.version}|${d?.chainId}|${d?.verifyingContract}`).digest("hex");
    const byEndpoint = new Map();
    const hashes = [];
    for (const e of endpoints) {
      const d = e.domain ?? {};
      if (Number(d.chainId) !== Number(e.chainId)) issues.push(`endpoint ${e.chainId}: domain.chainId ${d.chainId} != ${e.chainId}`);
      if (!d.verifyingContract || /^0x0+$|placeholder/i.test(String(d.verifyingContract))) issues.push(`endpoint ${e.chainId}: missing/placeholder verifyingContract`);
      if (e.derivesChainIdAtVerify !== true) issues.push(`endpoint ${e.chainId}: chainId not re-derived at verify (stale on fork)`);
      const h = hashOf(d);
      byEndpoint.set(Number(e.chainId), h);
      hashes.push(h);
    }
    if (hashes.some((h, i) => hashes.indexOf(h) !== i)) issues.push("duplicate domain separator across endpoints (cross-chain signature reuse)");
    for (const a of asArray(x.authorizations)) {
      if (a.boundDomainHash !== byEndpoint.get(Number(a.usedAtEndpoint))) issues.push(`authorization used at endpoint ${a.usedAtEndpoint} but bound to a different domain`);
    }
    return {
      passes: issues.length === 0,
      observed: issues.length === 0 ? `${endpoints.length} endpoint(s) have distinct, chain-bound, re-derived domains; authorizations match` : `DOMAIN: ${issues.join("; ")}`,
      expected: `each endpoint has a distinct (chainId,verifyingContract) domain re-derived at verify; authorizations valid only at their bound endpoint, under ${invariant.path}`
    };
  },

  // Optimistic-rollup challenge window: a bridge must not credit/mint against an OP-stack/Arbitrum L2
  // withdrawal before its fraud-proof window closes (unless L1-finalized or an LP-bonded fast exit).
  // The model + window come from the registry per chain. path -> { now?, withdrawals:[{id,chainId,l2BurnBlockTime,creditedAtTime,finalizedOnL1,instantLPexit?}] }
  "xchain-challenge-window-respected": (state, invariant) => {
    const x = getPath(state, invariant.path) ?? {};
    const issues = [];
    for (const w of asArray(x.withdrawals)) {
      const c = resolveChain(w.chainId ?? w.chain);
      if (!c) {
        issues.push(`${w.id}: unknown chain ${w.chainId ?? w.chain}`);
        continue;
      }
      // A positive challengeWindowSeconds is the registry's marker for an optimistic/contestable
      // chain — the only family that carries a fraud-proof window. Non-optimistic chains have a 0
      // window and nothing to wait on.
      const window = Number(c.challengeWindowSeconds ?? 0);
      if (window <= 0) continue;
      if (w.finalizedOnL1 === true || w.instantLPexit === true) continue;
      const waited = Number(w.creditedAtTime ?? 0) - Number(w.l2BurnBlockTime ?? 0);
      if (waited < window) {
        issues.push(`${w.id}@${c.name}: credited after ${waited}s, before the ${window}s challenge window (not L1-finalized)`);
      }
    }
    return {
      passes: issues.length === 0,
      observed: issues.length === 0 ? `optimistic-rollup withdrawal(s) credited only after L1-finalization / challenge window / LP-bond` : `CHALLENGE WINDOW: ${issues.join("; ")}`,
      expected: `no optimistic-rollup withdrawal credited before L1-finalization or its challenge window closes, under ${invariant.path}`
    };
  }
});

const CUSTOM_INVARIANT_FUNCTION_NAMES = Object.freeze(Object.keys(CUSTOM_INVARIANT_FUNCTIONS));

const strict = args.includes("--strict");
const ciMode = args.includes("--ci");

main().catch((error) => {
  process.stderr.write(`nocklab: ${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
});

async function main() {
  if (verb === "new-fixture") {
    await runNewFixture(rawArgs.slice(1));
    return;
  }

  if (args.length === 0 || args.includes("--help")) {
    printHelp();
    process.exitCode = args.length === 0 ? 1 : 0;
    return;
  }

  assertKnownFlags();

  const configPath = readFlag("--config");

  if (configPath) {
    let config;
    try {
      config = JSON.parse(await readFileOrThrow(configPath, "config"));
    } catch (error) {
      throw normalizeParseError(error, configPath);
    }
    const results = await runConfig(config, configPath);
    const hasFailure = results.some((result) => result.report.summary.status === "fail");

    if (strict && hasFailure) {
      process.exitCode = 1;
    }
  } else {
    const fixturePath = args[0];

    // did-you-mean: a mistyped subcommand (not an existing file) gets a suggestion.
    if (!existsSync(fixturePath)) {
      const suggestion = suggestVerb(fixturePath);
      if (suggestion) {
        throw new Error(
          `unknown command '${fixturePath}'. Did you mean '${suggestion}'? (or pass a fixture path)`
        );
      }
    }

    const outPath = readFlag("--out");
    const markdownPath = readFlag("--markdown");
    const outDir = readFlag("--out-dir");
    const startedAt = Date.now();
    const fixture = await loadFixture(fixturePath);
    const report = await buildReport(fixture, startedAt, fixturePath);

    if (outDir) {
      await writeReportBundle(report, outDir);
    } else {
      if (outPath) {
        await writeArtifact(outPath, `${JSON.stringify(report, null, 2)}\n`);
      }

      if (markdownPath) {
        await writeArtifact(markdownPath, toMarkdown(report));
      }

      if (!outPath && !markdownPath) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      }
    }

    printRunSummary(report, fixturePath);

    if (strict && report.summary.status === "fail") {
      process.exitCode = 1;
    }
  }
}

async function runNewFixture(verbArgs) {
  const NEW_FIXTURE_VALUE_FLAGS = new Set(["--slug", "--type", "--endpoint", "--out"]);

  const readValue = (flag) => {
    const index = verbArgs.indexOf(flag);
    if (index === -1) return null;
    const value = verbArgs[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    return value;
  };

  for (let index = 0; index < verbArgs.length; index += 1) {
    const token = verbArgs[index];
    if (!token.startsWith("--")) continue;
    if (NEW_FIXTURE_VALUE_FLAGS.has(token)) {
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${token}`);
  }

  const slug = readValue("--slug");
  if (!slug) {
    throw new Error("new-fixture requires --slug <slug>");
  }
  const type = readValue("--type") ?? "peek";
  const endpoint = readValue("--endpoint") ?? "127.0.0.1:5555";

  const fixture = scaffoldFixture({ slug, type, endpoint });

  const errors = validateFixture(fixture);
  if (errors.length > 0) {
    throw new Error(`scaffolded fixture failed validation:\n  - ${errors.join("\n  - ")}`);
  }

  const explicitOut = readValue("--out");
  const outPath = explicitOut ?? path.join("fixtures", `${slug}.lab.json`);

  // Defense-in-depth: when the user did not supply an explicit --out, the path is
  // derived from the (already slug-sanitized) slug under the repo `fixtures/`
  // dir. Assert it actually resolves inside that dir so a future change cannot
  // reintroduce path traversal. An explicit --out is by design an arbitrary path.
  if (!explicitOut) {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const fixturesDir = path.join(repoRoot, "fixtures");
    const resolvedOut = path.resolve(outPath);
    if (resolvedOut !== fixturesDir && !resolvedOut.startsWith(`${fixturesDir}${path.sep}`)) {
      throw new Error(`refusing to write fixture outside ${fixturesDir}: ${resolvedOut}`);
    }
  }

  await writeArtifact(outPath, `${JSON.stringify(fixture, null, 2)}\n`);
  process.stdout.write(`Scaffolded ${type} fixture: ${outPath}\n`);
  // Predictive next step: the obvious move after scaffolding is to run it. Hint goes to
  // stderr so it never pollutes the stdout path that tooling may parse.
  process.stderr.write(
    `${ink.cyan("→ next:")} run it ${ink.bold(`nocklab ${outPath} --strict`)}\n`
  );
}

function assertKnownFlags() {
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      continue;
    }

    if (BOOLEAN_FLAGS.has(token)) {
      continue;
    }

    if (VALUE_FLAGS.has(token)) {
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${token}`);
  }
}

async function readFileOrThrow(filePath, label) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`${label} not found: ${filePath}`);
    }
    throw error;
  }
}

function normalizeParseError(error, filePath) {
  if (error instanceof SyntaxError) {
    return new Error(`${filePath}: ${error.message}`);
  }
  return error;
}

async function runConfig(config, configPath) {
  const configDir = path.dirname(configPath);
  const reportDir = resolveFrom(configDir, config.reportDir ?? ".nocklab");
  const fixtures = config.fixtures ?? [];
  const results = [];

  if (fixtures.length === 0) {
    throw new Error(`No fixtures configured in ${configPath}`);
  }

  for (const fixtureConfig of fixtures) {
    const fixturePath = resolveFrom(configDir, fixtureConfig.path);
    const fixture = await loadFixture(fixturePath);
    const report = await buildReport(fixture, Date.now(), fixturePath);
    const written = await writeReportBundle(report, reportDir, fixtureConfig.slug);
    results.push({ fixturePath, report, written });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    config: configPath,
    reportDir,
    status: summarizeStatuses(results.map((result) => result.report.summary.status)),
    reports: results.map((result) => ({
      fixture: result.report.fixtureId,
      app: result.report.app.slug,
      status: result.report.summary.status,
      json: result.written.json,
      markdown: result.written.markdown
    }))
  };

  const manifestPath = resolveFrom(configDir, config.manifest ?? path.join(reportDir, "manifest.json"));
  await writeArtifact(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (ciMode || config.ci?.summary) {
    const summaryPath = resolveFrom(configDir, config.ci?.summary ?? path.join(reportDir, "summary.md"));
    await writeArtifact(summaryPath, toCiSummary(manifest, results));
  }

  process.stdout.write(
    `NockApp Lab generated ${results.length} report(s): ${manifest.status}\nManifest: ${manifestPath}\n`
  );

  return results;
}

async function loadFixture(fixturePath) {
  let fixture;
  try {
    fixture = JSON.parse(await readFileOrThrow(fixturePath, "fixture"));
  } catch (error) {
    throw normalizeParseError(error, fixturePath);
  }
  const fixtureDir = path.dirname(fixturePath);
  const packs = [];

  for (const packPath of fixture.invariantPacks ?? []) {
    const resolvedPackPath = resolveFrom(fixtureDir, packPath);
    let pack;
    try {
      pack = JSON.parse(await readFileOrThrow(resolvedPackPath, "pack"));
    } catch (error) {
      throw normalizeParseError(error, resolvedPackPath);
    }
    validatePack(pack, resolvedPackPath);
    packs.push({
      id: pack.id,
      name: pack.name,
      domain: pack.domain,
      version: pack.version,
      path: packPath,
      upstreamBasis: pack.upstreamBasis ?? null,
      sourceAnchors: pack.sourceAnchors ?? [],
      invariants: pack.invariants ?? []
    });
  }

  return {
    ...fixture,
    invariantPackRefs: packs.map(({ id, name, domain, version, path, upstreamBasis, sourceAnchors }) => ({
      id,
      name,
      domain,
      version,
      path,
      upstreamBasis,
      sourceAnchors
    })),
    invariants: [
      ...packs.flatMap((pack) =>
        pack.invariants.map((invariant) => ({
          ...invariant,
          packId: pack.id
        }))
      ),
      ...(fixture.invariants ?? [])
    ]
  };
}

function readFlag(flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  process.stdout.write(`Usage:
  nocklab <fixture.json> [--out report.json] [--markdown report.md] [--out-dir .nocklab] [--strict]
  nocklab run --config nocklab.config.json [--ci] [--strict]
  nocklab new-fixture --slug <slug> [--type peek|poke] [--endpoint host:port] [--out path]

Examples:
  npm run lab:sample
  npm run lab:bridge
  npm run lab:ci
  nocklab run --config nocklab.config.json --ci --strict
  nocklab new-fixture --slug my-nockapp --type poke
`);
}

async function buildReport(fixture, startedAt, fixturePath) {
  assertFixture(fixture, fixturePath);

  const initialState = structuredClone(fixture.initialState);
  const state = structuredClone(initialState);
  const actors = new Set((fixture.actors ?? []).map((actor) => actor.name));
  const stateSnapshots = [
    snapshotState({ label: "Initial state", state })
  ];
  const stepReports = [];
  // Per-run context (NOT module-level — lab:ci runs many fixtures in one process). Accumulates the
  // once-per-run live-base read so it is fetched a single time and so buildReport can stamp
  // baseExecuted / baseDeploymentHash onto the report after the steps complete.
  const runCtx = { baseState: undefined };

  for (const [index, step] of fixture.steps.entries()) {
    const stepReport = await runStep({ step, index, state, actors, environment: fixture.environment, runCtx });
    stepReports.push(stepReport);
    stateSnapshots.push(
      snapshotState({
        label: `After ${step.id}`,
        stepId: step.id,
        state
      })
    );
  }
  const invariantReports = fixture.invariants.map((invariant) =>
    evaluateInvariant({ invariant, state, steps: fixture.steps, actors })
  );
  const alertReports = (fixture.alertPolicies ?? []).map((policy) => evaluateAlert(policy, state));
  const adapterObservations = summarizeAdapterObservations(stepReports);
  const failedSteps = stepReports.filter((step) => step.status === "fail").length;
  const failedInvariants = invariantReports.filter((invariant) => invariant.status === "fail").length;
  const criticalAlerts = alertReports.filter(
    (alert) => alert.state === "triggered" && alert.severity === "critical"
  ).length;
  const warningAlerts = alertReports.filter(
    (alert) => alert.state === "triggered" && alert.severity !== "critical"
  ).length;
  const rawStatus =
    failedSteps > 0 || failedInvariants > 0 || criticalAlerts > 0
      ? "fail"
      : warningAlerts > 0
        ? "warn"
        : "pass";
  // `expectRejected` fixtures are negative controls (an exploit attempt that MUST be
  // caught). Invert: a caught exploit (rawStatus "fail") passes; a negative control that
  // did NOT catch the exploit (rawStatus "pass"/"warn") is itself a failure. This lets a
  // proof-of-prevention read CI-green instead of inverting the --strict gate.
  const status = fixture.expectRejected === true ? (rawStatus === "fail" ? "pass" : "fail") : rawStatus;

  // Runner-OWNED promotion fields. A fixture AUTHOR must never be able to inject these to forge an
  // app-report cert (F3): the promotion gate in generated-lab-reports keys on
  // (environment.kernelExecuted && app.kernelHash) || (environment.baseExecuted && app.baseDeploymentHash),
  // so if any were trusted from the fixture an author could satisfy the gate with pure data. We STRIP
  // them from the loaded fixture and set them ONLY from runCtx after a genuine real-VM kernel run /
  // successful live-base read. (app.kernelHash stays an author input — the committed compiled-kernel
  // hash — but is inert without kernelExecuted, which is runner-owned and never set by a model run.)
  const fixtureEnvironment = { ...fixture.environment };
  delete fixtureEnvironment.kernelExecuted;
  delete fixtureEnvironment.baseExecuted;
  const fixtureApp = { ...fixture.app };
  delete fixtureApp.baseDeploymentHash;
  const reportEnvironment = runCtx.baseExecuted === true
    ? { ...fixtureEnvironment, baseExecuted: true }
    : fixtureEnvironment;
  const reportApp = runCtx.baseExecuted === true && runCtx.baseDeploymentHash
    ? { ...fixtureApp, baseDeploymentHash: runCtx.baseDeploymentHash }
    : fixtureApp;

  return {
    reportId: `lab_${fixture.id}_${new Date(startedAt).toISOString().replace(/[-:.TZ]/g, "")}`,
    fixtureId: fixture.id,
    generatedAt: new Date(startedAt).toISOString(),
    app: reportApp,
    environment: reportEnvironment,
    summary: {
      status,
      stepsPassed: stepReports.length - failedSteps,
      stepsFailed: failedSteps,
      invariantsPassed: invariantReports.length - failedInvariants,
      invariantsFailed: failedInvariants,
      alertsClear: alertReports.filter((alert) => alert.state === "clear").length,
      alertsTriggered: alertReports.filter((alert) => alert.state === "triggered").length,
      snapshotsCaptured: stateSnapshots.length,
      durationMs: Math.max(Date.now() - startedAt, stepReports.length * 17),
      expectRejected: fixture.expectRejected === true,
      rawStatus
    },
    invariantPacks: fixture.invariantPackRefs ?? [],
    steps: stepReports,
    invariants: invariantReports,
    alerts: alertReports,
    adapterObservations,
    stateSnapshots,
    stateDiffs: diffState(initialState, state),
    nextActions: [
      "Replace mock poke and peek execution with local fakenet adapter calls.",
      "Replace command-backed fakenet metadata probes with stable gRPC-native probes once node surfaces are available.",
      "Persist generated reports under a project workspace.",
      "Add app-specific invariant packs as the NockApp interface stabilizes."
    ]
  };
}

function assertFixture(fixture, fixturePath) {
  const where = fixturePath ? `${fixturePath}: ` : "";

  for (const key of ["id", "app", "environment", "initialState", "steps", "invariants"]) {
    if (!(key in fixture)) {
      throw new Error(`${where}Fixture is missing required field: ${key}`);
    }
  }
  if (!Array.isArray(fixture.steps) || fixture.steps.length === 0) {
    throw new Error(`${where}Fixture must define at least one step.`);
  }
  if (!Array.isArray(fixture.invariants)) {
    throw new Error(`${where}Fixture invariants must be an array.`);
  }

  fixture.steps.forEach((step, index) => {
    if (!STEP_TYPES.includes(step.type)) {
      throw new Error(
        `${where}steps[${index}].type ${formatValue(step.type)} is not one of ${STEP_TYPES.join("|")}`
      );
    }
  });

  fixture.invariants.forEach((invariant, index) => {
    if (!INVARIANT_KINDS.includes(invariant.kind)) {
      throw new Error(
        `${where}invariants[${index}].kind ${formatValue(invariant.kind)} is not one of ${INVARIANT_KINDS.join("|")}`
      );
    }
    validateInvariantRequiredFields(invariant, index, where);
  });
}

function validateInvariantRequiredFields(invariant, index, where) {
  const requirements = INVARIANT_REQUIRED_FIELDS[invariant.kind] ?? [];
  const label = invariant.id ? ` (${invariant.id})` : "";

  for (const { field, type } of requirements) {
    const value = invariant[field];

    if (type === "number") {
      if (typeof value !== "number") {
        throw new Error(
          `${where}invariants[${index}]${label}: kind ${JSON.stringify(invariant.kind)} requires numeric field ${JSON.stringify(field)}`
        );
      }
      continue;
    }

    if (type === "array") {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(
          `${where}invariants[${index}]${label}: kind ${JSON.stringify(invariant.kind)} requires non-empty array field ${JSON.stringify(field)}`
        );
      }
      continue;
    }

    if (type === "string") {
      if (typeof value !== "string" || value.length === 0) {
        throw new Error(
          `${where}invariants[${index}]${label}: kind ${JSON.stringify(invariant.kind)} requires field ${JSON.stringify(field)}`
        );
      }
      continue;
    }

    // type === "present": any defined value is acceptable (e.g. equals may be any JSON value).
    if (!(field in invariant)) {
      throw new Error(
        `${where}invariants[${index}]${label}: kind ${JSON.stringify(invariant.kind)} requires field ${JSON.stringify(field)}`
      );
    }
  }

  if (invariant.kind === "custom-function" && !(invariant.fn in CUSTOM_INVARIANT_FUNCTIONS)) {
    throw new Error(
      `${where}invariants[${index}]${label}: kind "custom-function" references unknown fn ${JSON.stringify(invariant.fn)}; known: ${CUSTOM_INVARIANT_FUNCTION_NAMES.join(", ")}`
    );
  }
}

function validatePack(pack, packPath) {
  const where = `${packPath}: `;

  for (const key of ["id", "name", "version", "domain"]) {
    if (!(key in pack)) {
      throw new Error(`${where}pack is missing required field: ${key}`);
    }
  }

  if (!PACK_DOMAINS.includes(pack.domain)) {
    throw new Error(`${where}domain ${JSON.stringify(pack.domain)} is not a known domain`);
  }

  if (!Array.isArray(pack.invariants)) {
    throw new Error(`${where}pack invariants must be an array.`);
  }

  pack.invariants.forEach((invariant, index) => {
    for (const key of ["id", "title", "severity", "kind"]) {
      if (!(key in invariant)) {
        throw new Error(`${where}invariants[${index}] is missing required field: ${key}`);
      }
    }
    if (!INVARIANT_SEVERITIES.includes(invariant.severity)) {
      throw new Error(
        `${where}invariants[${index}].severity ${formatValue(invariant.severity)} is not one of ${INVARIANT_SEVERITIES.join("|")}`
      );
    }
    if (!INVARIANT_KINDS.includes(invariant.kind)) {
      throw new Error(
        `${where}invariants[${index}].kind ${formatValue(invariant.kind)} is not one of ${INVARIANT_KINDS.join("|")}`
      );
    }
  });
}

// Read the REAL Base bridge deployment for a mode:"live-base" fakenet step and merge the on-chain
// facts into state so the cross-chain invariants run over live data. The RPC probe + read happen ONCE
// per run (memoized on runCtx); on a successful read it stamps runCtx.baseExecuted + baseDeploymentHash
// so buildReport can promote the report to an app-report. Returns the step's {status, observed,
// expectation, adapter}. Only the redacted RPC URL is ever written to a persisted field.
async function runLiveBaseStep({ step, environment, state, runCtx }) {
  const rpcUrl = resolveEnvValue(environment.baseRpcUrl) || DEFAULT_BASE_SEPOLIA_RPC;
  const safeRpc = redactRpcUrl(rpcUrl);
  const expectation = step.expectation ?? `Base RPC reachable + bridge readable at ${safeRpc}`;
  // Probe once per run — re-probing every step just repeats the same eth_blockNumber/eth_chainId calls.
  runCtx.probe ??= await probeEvmRpcEndpoint(rpcUrl);
  const probe = runCtx.probe;
  // Fail closed if the RPC's actual chain != the declared baseChainId: a mis-pointed RPC would read a
  // different chain's contracts yet stamp a deployment hash for the declared chain. (chainId null =>
  // endpoint did not report eth_chainId; skip the check.)
  const chainMismatch =
    probe.ok && probe.chainId != null && Number(probe.chainId) !== Number(environment.baseChainId);
  if (runCtx.baseState === undefined) {
    if (!probe.ok || chainMismatch) {
      if (chainMismatch) {
        runCtx.baseReadError = `RPC chainId ${probe.chainId} != declared baseChainId ${environment.baseChainId}`;
      }
      runCtx.baseState = null;
    } else {
      try {
        const { createBaseReader, readBaseXchainState } = await import("./lib/base-evm-reader.mjs");
        const reader = await createBaseReader({ rpcUrl, chainId: environment.baseChainId });
        runCtx.baseState = await readBaseXchainState(reader, {
          inboxAddress: environment.baseInboxAddress,
          nockAddress: environment.baseNockAddress,
          fromBlock: environment.baseFromBlock,
          toBlock: environment.baseToBlock,
          requiredConfirmations: environment.baseConfirmationDepth,
          appRequiredConfirmations: environment.baseAppRequiredConfirmations,
          chainId: environment.baseChainId
        });
        runCtx.baseExecuted = true;
        runCtx.baseDeploymentHash = createHash("sha256")
          .update(stableStringify({
            chainId: Number(environment.baseChainId),
            inboxAddress: String(environment.baseInboxAddress ?? "").toLowerCase(),
            nockAddress: String(environment.baseNockAddress ?? "").toLowerCase()
          }))
          .digest("hex");
      } catch (error) {
        // Scrub the raw RPC URL out of viem's error text before it is persisted (redactRpcUrl is a URL
        // parser; a free-form message needs a substring replace).
        runCtx.baseReadError = String(error.message ?? "").split(rpcUrl).join(safeRpc);
        runCtx.baseState = null;
      }
    }
  }
  if (runCtx.baseState) {
    state.xchain = { ...(state.xchain ?? {}), ...runCtx.baseState.xchain };
    const prov = runCtx.baseState.provenance;
    const noEvents = prov.eventCounts.mints === 0;
    return {
      expectation,
      status: "pass",
      observed:
        `live-base read ${prov.inboxAddress} @ chain ${prov.chainId}: ${prov.eventCounts.mints} mint(s), ` +
        `${prov.eventCounts.burns} burn(s), ${prov.signers.length} signer(s)/threshold ${prov.threshold}, head block ${prov.currentBlock}` +
        (noEvents ? " — NO mints observed in this window: invariants pass vacuously, NOT strong evidence" : ""),
      adapter: {
        kind: "live-base",
        grpcEndpoint: safeRpc,
        rpcEndpoint: safeRpc,
        chainId: prov.chainId,
        reachable: true,
        latencyMs: probe.latencyMs,
        checkedAt: probe.checkedAt,
        eventCounts: prov.eventCounts,
        withdrawalsEnabled: prov.withdrawalsEnabled
      }
    };
  }
  return {
    expectation,
    status: "fail",
    observed: `live-base read failed at ${safeRpc}: ${runCtx.baseReadError ?? probe.error ?? "unreachable"}`,
    adapter: {
      kind: "live-base",
      grpcEndpoint: safeRpc,
      rpcEndpoint: safeRpc,
      reachable: probe.ok,
      latencyMs: probe.latencyMs,
      checkedAt: probe.checkedAt,
      error: runCtx.baseReadError ?? probe.error ?? "unreachable"
    }
  };
}

async function runStep({ step, index, state, actors, environment, runCtx = {} }) {
  const before = structuredClone(state);
  const beforeHash = hashState(before);
  const durationMs = 19 + index * 7;
  let status = "pass";
  let observed = "";
  let expectation = step.expectation ?? "step completes";
  let adapter;

  if (step.type === "fakenet") {
    expectation = step.expectation ?? `gRPC endpoint configured at ${environment.grpcEndpoint}`;
    if (environment.mode === "local-fakenet") {
      expectation = step.expectation ?? `gRPC endpoint reachable at ${environment.grpcEndpoint}`;
      const probe = await probeGrpcEndpoint(environment.grpcEndpoint);
      const balance = probe.ok && environment.balanceCheck
        ? await probeNockBalance(environment.balanceCheck)
        : null;
      const chain = probe.ok && environment.chainCheck
        ? await probeChainMetadata(environment.chainCheck)
        : null;
      status = probe.ok ? "pass" : "fail";
      if (balance?.status === "fail") {
        status = "fail";
      }
      if (chain?.status === "fail") {
        status = "fail";
      }
      adapter = {
        kind: "local-fakenet",
        grpcEndpoint: environment.grpcEndpoint,
        reachable: probe.ok,
        latencyMs: probe.latencyMs,
        checkedAt: probe.checkedAt,
        ...(balance ? { balance } : {}),
        ...(chain ? { chain } : {}),
        ...(probe.error ? { error: probe.error } : {})
      };
      observed = describeLocalFakenetObservation({
        endpoint: environment.grpcEndpoint,
        probe,
        balance,
        chain
      });
    } else if (environment.mode === "live-base") {
      ({ status, observed, expectation, adapter } = await runLiveBaseStep({ step, environment, state, runCtx }));
    } else {
      observed = `${environment.mode} profile ready at ${environment.grpcEndpoint}`;
    }
  }

  if (step.type === "poke") {
    if (!step.actor || !actors.has(step.actor)) {
      status = "fail";
      observed = `actor '${step.actor ?? "missing"}' is not declared`;
    } else if (environment.mode === "kernel" && step.adapter?.command) {
      // Run a real Nock toolchain/kernel command (e.g. hoonc compile, or a kernel
      // poke harness) directly — no live node / gRPC probe.
      const run = await probeAdapterCommand(step.adapter, "Kernel");
      status = run.status;
      expectation = step.expectation ?? run.expectation ?? `kernel command exits 0 for ${step.target ?? step.id}`;
      adapter = { kind: "kernel", run, checkedAt: run.checkedAt };
      observed =
        run.status === "pass"
          ? `kernel adapter ${step.target ?? step.id} succeeded: ${singleLine(run.raw).slice(0, 200)}`
          : `kernel adapter ${step.target ?? step.id} failed: ${run.error ?? "non-zero exit"}`;
    } else if (environment.mode === "local-fakenet" && step.adapter?.command) {
      const probe = await probeGrpcEndpoint(environment.grpcEndpoint);
      const poke = probe.ok ? await probeAdapterCommand(step.adapter, "Poke") : null;
      status = probe.ok && poke?.status === "pass" ? "pass" : "fail";
      expectation = step.expectation ?? poke?.expectation ?? `adapter command exits 0 for ${step.target ?? step.id}`;
      adapter = {
        kind: "local-fakenet",
        grpcEndpoint: environment.grpcEndpoint,
        reachable: probe.ok,
        latencyMs: probe.latencyMs,
        checkedAt: probe.checkedAt,
        ...(poke ? { poke } : {}),
        ...(probe.error ? { error: probe.error } : {})
      };
      observed = describeLocalPokeObservation({
        endpoint: environment.grpcEndpoint,
        probe,
        poke
      });
    } else {
      applyStepMutation(step, state);
      const result = evaluateExpectation(step.expect, state);
      status = result.status;
      expectation = result.expectation;
      observed = result.observed;
    }
  }

  if (step.type === "peek") {
    if (environment.mode === "kernel" && step.adapter?.command) {
      const run = await probeAdapterCommand(step.adapter, "Kernel");
      status = run.status;
      expectation = step.expectation ?? run.expectation ?? `kernel command exits 0 for ${step.target ?? step.id}`;
      adapter = { kind: "kernel", run, checkedAt: run.checkedAt };
      observed =
        run.status === "pass"
          ? `kernel adapter ${step.target ?? step.id} succeeded: ${singleLine(run.raw).slice(0, 200)}`
          : `kernel adapter ${step.target ?? step.id} failed: ${run.error ?? "non-zero exit"}`;
    } else if (environment.mode === "local-fakenet" && step.adapter?.command) {
      const probe = await probeGrpcEndpoint(environment.grpcEndpoint);
      const peek = probe.ok ? await probeAdapterCommand(step.adapter, "Peek") : null;
      status = probe.ok && peek?.status === "pass" ? "pass" : "fail";
      expectation = step.expectation ?? peek?.expectation ?? `adapter command exits 0 for ${step.target ?? step.id}`;
      adapter = {
        kind: "local-fakenet",
        grpcEndpoint: environment.grpcEndpoint,
        reachable: probe.ok,
        latencyMs: probe.latencyMs,
        checkedAt: probe.checkedAt,
        ...(peek ? { peek } : {}),
        ...(probe.error ? { error: probe.error } : {})
      };
      observed = describeLocalPeekObservation({
        endpoint: environment.grpcEndpoint,
        probe,
        peek
      });
    } else {
      const result = evaluateExpectation(step.expect, state);
      status = result.status;
      expectation = result.expectation;
      observed = result.observed;
    }
  }

  if (step.type === "bridge" || step.type === "invariant") {
    applyStepMutation(step, state);
    const result = evaluateExpectation(step.expect, state);
    status = result.status;
    expectation = step.expect ? result.expectation : expectation;
    observed = step.expect ? result.observed : JSON.stringify(diffState(before, state));
  }

  const after = structuredClone(state);

  return {
    id: step.id,
    type: step.type,
    title: step.title,
    status,
    actor: step.actor,
    target: step.target,
    expectation,
    observed,
    adapter,
    beforeHash,
    afterHash: hashState(after),
    stateDiffs: diffState(before, after),
    durationMs
  };
}

function summarizeAdapterObservations(stepReports) {
  return stepReports.flatMap((step) => {
    const adapter = step.adapter;

    if (!adapter) {
      return [];
    }

    const base = {
      stepId: step.id,
      kind: adapter.kind
    };
    const observations = [];

    if (typeof adapter.reachable === "boolean") {
      observations.push({
        ...base,
        capability: "health",
        status: adapter.reachable ? "pass" : "fail",
        target: adapter.grpcEndpoint,
        summary: adapter.reachable
          ? `gRPC endpoint reachable at ${adapter.grpcEndpoint}`
          : `gRPC endpoint not reachable at ${adapter.grpcEndpoint}: ${adapter.error ?? "unknown error"}`,
        checkedAt: adapter.checkedAt
      });
    }

    if (adapter.balance) {
      observations.push({
        ...base,
        capability: "balance",
        status: adapter.balance.status,
        target: adapter.balance.address,
        summary:
          adapter.balance.status === "pass"
            ? `Balance ${adapter.balance.amount} ${adapter.balance.unit} for ${adapter.balance.address}`
            : `Balance check failed for ${adapter.balance.address}: ${adapter.balance.error ?? "unknown error"}`,
        checkedAt: adapter.balance.checkedAt
      });
    }

    if (adapter.chain) {
      observations.push({
        ...base,
        capability: "chain",
        status: adapter.chain.status,
        target: adapter.grpcEndpoint,
        summary:
          adapter.chain.status === "pass"
            ? `Chain ${formatChainMetadata(adapter.chain)}`
            : `Chain metadata check failed: ${adapter.chain.error ?? "unknown error"}`,
        checkedAt: adapter.chain.checkedAt
      });
    }

    if (adapter.poke) {
      observations.push({
        ...base,
        capability: "poke",
        status: adapter.poke.status,
        target: step.target,
        summary:
          adapter.poke.status === "pass"
            ? singleLine(adapter.poke.raw)
            : `Poke command failed: ${adapter.poke.error ?? "unknown error"}`,
        checkedAt: adapter.poke.checkedAt
      });
    }

    if (adapter.peek) {
      observations.push({
        ...base,
        capability: "peek",
        status: adapter.peek.status,
        target: step.target,
        summary:
          adapter.peek.status === "pass"
            ? singleLine(adapter.peek.raw)
            : `Peek command failed: ${adapter.peek.error ?? "unknown error"}`,
        checkedAt: adapter.peek.checkedAt
      });
    }

    return observations;
  });
}

// Poke and Peek adapter probes were byte-identical except their exit-code error
// label, so they share one implementation parameterized by `verb` ("Poke" /
// "Peek"). The exit-code error string stays `${verb} command exited ${code}` and
// every result field set (expectation, exitCode placement) is preserved.
// Node-backed adapter commands (e.g. a wallet query against a live node) routinely
// take several seconds to boot/connect, so the adapter timeout is generous by default
// and overridable per step via step.adapter.timeoutMs.
const DEFAULT_ADAPTER_TIMEOUT_MS = 15_000;

async function probeAdapterCommand(adapterConfig, verb) {
  const checkedAt = new Date().toISOString();
  let command;

  try {
    command = normalizeCommand(adapterConfig.command, "step.adapter.command");
  } catch (error) {
    return {
      status: "fail",
      raw: "",
      checkedAt,
      expectation: "adapter command is configured",
      error: error.message
    };
  }

  const timeoutMs =
    Number.isFinite(adapterConfig.timeoutMs) && adapterConfig.timeoutMs > 0
      ? adapterConfig.timeoutMs
      : DEFAULT_ADAPTER_TIMEOUT_MS;
  const result = await runCommand(command, timeoutMs);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  const expectation = describeCommandExpectation(adapterConfig.expect);

  if (result.error) {
    return {
      status: "fail",
      raw,
      checkedAt,
      expectation,
      error: result.error
    };
  }

  if (result.code !== 0) {
    return {
      status: "fail",
      raw,
      checkedAt,
      exitCode: result.code,
      expectation,
      error: `${verb} command exited ${result.code}`
    };
  }

  const expectationResult = evaluateCommandExpectation(adapterConfig.expect, raw);

  if (!expectationResult.ok) {
    return {
      status: "fail",
      raw,
      checkedAt,
      exitCode: result.code,
      expectation,
      error: expectationResult.error
    };
  }

  return {
    status: "pass",
    raw,
    checkedAt,
    exitCode: result.code,
    expectation
  };
}

async function probeChainMetadata(chainCheck) {
  const checkedAt = new Date().toISOString();
  let command;

  try {
    command = normalizeCommand(chainCheck.command, "chainCheck.command");
  } catch (error) {
    return {
      status: "fail",
      raw: "",
      checkedAt,
      error: error.message
    };
  }

  const result = await runCommand(command);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.error) {
    return {
      status: "fail",
      raw,
      checkedAt,
      error: result.error
    };
  }

  if (result.code !== 0) {
    return {
      status: "fail",
      raw,
      checkedAt,
      error: `Chain metadata command exited ${result.code}`
    };
  }

  const metadata = parseChainMetadata(raw);

  if (!metadata) {
    return {
      status: "fail",
      raw,
      checkedAt,
      error: "Could not parse chain metadata from command output"
    };
  }

  return {
    status: "pass",
    ...metadata,
    raw,
    checkedAt
  };
}

async function probeNockBalance(balanceCheck) {
  const checkedAt = new Date().toISOString();
  let command;

  try {
    command = normalizeCommand(balanceCheck.command, "balanceCheck.command");
  } catch (error) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw: "",
      checkedAt,
      error: error.message
    };
  }

  const result = await runCommand(command);
  const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.error) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw,
      checkedAt,
      error: result.error
    };
  }

  if (result.code !== 0) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw,
      checkedAt,
      error: `Balance command exited ${result.code}`
    };
  }

  const amount = parseNockBalance(raw);

  if (amount === null) {
    return {
      status: "fail",
      address: String(balanceCheck.address ?? ""),
      unit: "NOCK",
      raw,
      checkedAt,
      error: "Could not parse NOCK balance from command output"
    };
  }

  return {
    status: "pass",
    address: String(balanceCheck.address ?? ""),
    amount,
    unit: "NOCK",
    raw,
    checkedAt
  };
}

function describeLocalFakenetObservation({ endpoint, probe, balance, chain }) {
  if (!probe.ok) {
    return `local-fakenet gRPC endpoint not reachable at ${endpoint}: ${probe.error}`;
  }

  const parts = [`local-fakenet gRPC endpoint reachable at ${endpoint}`];

  if (balance?.status === "pass") {
    parts.push(`balance ${balance.amount} ${balance.unit} for ${balance.address}`);
  } else if (balance?.status === "fail") {
    parts.push(`balance peek failed for ${balance.address}: ${balance.error}`);
  }

  if (chain?.status === "pass") {
    parts.push(`chain ${formatChainMetadata(chain)}`);
  } else if (chain?.status === "fail") {
    parts.push(`chain metadata peek failed: ${chain.error}`);
  }

  return parts.join("; ");
}

function describeLocalPokeObservation({ endpoint, probe, poke }) {
  if (!probe.ok) {
    return `local-fakenet gRPC endpoint not reachable at ${endpoint}: ${probe.error}`;
  }

  if (poke?.status === "pass") {
    return `local-fakenet adapter poke succeeded at ${endpoint}: ${poke.raw}`;
  }

  return `local-fakenet adapter poke command failed at ${endpoint}: ${poke?.error ?? "unknown error"}`;
}

function describeLocalPeekObservation({ endpoint, probe, peek }) {
  if (!probe.ok) {
    return `local-fakenet gRPC endpoint not reachable at ${endpoint}: ${probe.error}`;
  }

  if (peek?.status === "pass") {
    return `local-fakenet adapter peek succeeded at ${endpoint}: ${peek.raw}`;
  }

  return `local-fakenet adapter peek command failed at ${endpoint}: ${peek?.error ?? "unknown error"}`;
}

// A public Base Sepolia RPC, used when the fixture's baseRpcUrl resolves to nothing. Read-only.
const DEFAULT_BASE_SEPOLIA_RPC = "https://sepolia.base.org";

// Fixture env values like baseRpcUrl may be a literal "${BASE_SEPOLIA_RPC_URL}" so a secret/private
// RPC endpoint is never committed. Substitute from the environment; pass plain values through.
function resolveEnvValue(value) {
  if (typeof value !== "string") return value ?? undefined;
  const match = value.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (match) return process.env[match[1]];
  return value;
}

// Strip credential material from an RPC URL before it is written to a persisted report field.
// Provider keys commonly live in userinfo (user:pass@), a trailing path segment (Alchemy/Infura
// project keys), or query params (?apikey=...). The full URL is used only in-memory for the actual
// request; never echoed to observed/expectation/adapter. (AGENTS.md: do not store/echo API keys.)
function redactRpcUrl(rpcUrl) {
  try {
    const url = new URL(rpcUrl);
    if (url.username || url.password) {
      url.username = "***";
      url.password = "";
    }
    url.pathname = url.pathname.replace(/\/[A-Za-z0-9_-]{16,}(\/?)$/, "/***$1");
    if (url.search) url.search = "?***";
    return url.toString();
  } catch {
    return "[redacted-rpc-url]";
  }
}

// Lightweight liveness + chain-identity probe for an EVM JSON-RPC endpoint (eth_blockNumber +
// eth_chainId). Mirrors probeGrpcEndpoint's result shape and adds the numeric chainId so the
// live-base path can fail closed when the RPC's actual chain != the fixture's declared baseChainId
// (otherwise a mis-pointed RPC would mint a deployment-identity hash for a chain it never read).
async function probeEvmRpcEndpoint(rpcUrl, timeoutMs = 8_000) {
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const call = async (method) => {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message ?? "rpc error");
    return json.result;
  };
  try {
    const blockNumber = await call("eth_blockNumber");
    let chainId = null;
    try {
      chainId = Number(BigInt(await call("eth_chainId")));
    } catch {
      chainId = null; // some endpoints omit eth_chainId; the caller treats null as "unknown, skip check"
    }
    return { ok: true, blockNumber, chainId, latencyMs: Date.now() - startedAt, checkedAt };
  } catch (error) {
    return { ok: false, error: error.name === "AbortError" ? "timed out" : error.message, latencyMs: Date.now() - startedAt, checkedAt };
  } finally {
    clearTimeout(timer);
  }
}

async function probeGrpcEndpoint(endpoint) {
  let target;
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    target = parseGrpcEndpoint(endpoint);
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      latencyMs: Date.now() - startedAt,
      checkedAt
    };
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: target.host,
      port: target.port
    });
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve({
        ...result,
        latencyMs: Date.now() - startedAt,
        checkedAt
      });
    };

    socket.setTimeout(1_000);
    socket.once("connect", () => finish({ ok: true }));
    socket.once("timeout", () => finish({ ok: false, error: "connection timed out" }));
    socket.once("error", (error) => finish({ ok: false, error: error.code ?? error.message }));
  });
}

function describeCommandExpectation(expect) {
  if (expect?.stdoutIncludes !== undefined) {
    return `stdout includes ${JSON.stringify(String(expect.stdoutIncludes))}`;
  }

  return "adapter command exits 0";
}

function evaluateCommandExpectation(expect, raw) {
  if (expect?.stdoutIncludes !== undefined) {
    const expected = String(expect.stdoutIncludes);
    return raw.includes(expected)
      ? { ok: true }
      : { ok: false, error: `Expected stdout to include ${JSON.stringify(expected)}` };
  }

  return { ok: true };
}

function normalizeCommand(command, label = "command") {
  if (!command?.program) {
    throw new Error(`${label}.program is required`);
  }

  return {
    program: String(command.program),
    args: Array.isArray(command.args) ? command.args.map(String) : []
  };
}

function runCommand(command, timeoutMs = 5_000) {
  return new Promise((resolve) => {
    const child = spawn(command.program, command.args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr,
        ...result
      });
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish({ code: null, error: `Command timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => finish({ code: null, error: error.message }));
    child.once("close", (code) => finish({ code }));
  });
}

function parseChainMetadata(output) {
  const raw = String(output);
  const height = parseFirstInteger(raw, /\b(?:block\s+height|tip\s+height|height)\s*[:=]\s*([0-9][0-9,]*)/i);
  const peerCount = parseFirstInteger(
    raw,
    /\b(?:connected\s+peers?|peer\s+count|peer_count|peers?)\s*[:=]\s*([0-9][0-9,]*)/i
  );
  const blockId = raw.match(/\b(?:block\s+id|block_id|tip\s+block)\s*[:=]\s*([^\s,;]+)/i);
  const commitment = raw.match(/\b(?:block\s+commitment|tip\s+commitment|commitment)\s*[:=]\s*([^\s,;]+)/i);
  const metadata = {};

  if (height !== null) {
    metadata.height = height;
  }
  if (peerCount !== null) {
    metadata.peerCount = peerCount;
  }
  if (blockId?.[1]) {
    metadata.blockId = blockId[1];
  }
  if (commitment?.[1]) {
    metadata.blockCommitment = commitment[1];
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function parseFirstInteger(raw, pattern) {
  const match = raw.match(pattern);
  return match?.[1] ? Number(match[1].replaceAll(",", "")) : null;
}

function formatChainMetadata(chain) {
  const parts = [];

  if (typeof chain.height === "number") {
    parts.push(`height ${chain.height}`);
  }
  if (typeof chain.peerCount === "number") {
    parts.push(`${chain.peerCount} peer${chain.peerCount === 1 ? "" : "s"}`);
  }
  if (chain.blockId) {
    parts.push(`block ${chain.blockId}`);
  }
  if (chain.blockCommitment) {
    parts.push(`commitment ${chain.blockCommitment}`);
  }

  return parts.join(", ");
}

function parseNockBalance(output) {
  const matches = [...String(output).matchAll(/([0-9][0-9,]*(?:\.[0-9]+)?)\s+NOCK\b/gi)];
  const amount = matches.at(-1)?.[1];

  if (!amount) {
    return null;
  }

  return Number(amount.replaceAll(",", ""));
}

function parseGrpcEndpoint(endpoint) {
  const rawEndpoint = String(endpoint ?? "").trim();

  if (!rawEndpoint) {
    throw new Error("missing grpcEndpoint");
  }

  const parsed = new URL(rawEndpoint.includes("://") ? rawEndpoint : `tcp://${rawEndpoint}`);
  const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));

  if (!parsed.hostname || !Number.isInteger(port) || port <= 0) {
    throw new Error(`invalid grpcEndpoint '${rawEndpoint}'`);
  }

  return {
    host: parsed.hostname,
    port
  };
}

function applyStepMutation(step, state) {
  for (const operation of normalizeOperations(step)) {
    applyOperation(operation, state);
  }
  mergeState(state, step.statePatch ?? {});
}

function normalizeOperations(step) {
  const operations = [];
  if (step.operation) {
    operations.push(step.operation);
  }
  if (Array.isArray(step.operations)) {
    operations.push(...step.operations);
  }
  return operations;
}

function applyOperation(operation, state) {
  if (operation.kind === "increment") {
    const current = numericOperand(getPath(state, operation.path), operation.path, "increment");
    setPath(state, operation.path, current + Number(operation.by));
    return;
  }

  if (operation.kind === "set") {
    setPath(state, operation.path, structuredClone(operation.value));
    return;
  }

  if (operation.kind === "transfer") {
    const from = numericOperand(getPath(state, operation.fromPath), operation.fromPath, "transfer");
    const to = numericOperand(getPath(state, operation.toPath), operation.toPath, "transfer");
    const amount = Number(operation.amount);
    setPath(state, operation.fromPath, from - amount);
    setPath(state, operation.toPath, to + amount);
    return;
  }

  if (operation.kind === "append-event") {
    const current = getPath(state, operation.path);
    const next = Array.isArray(current) ? [...current, operation.value] : [operation.value];
    setPath(state, operation.path, next);
    return;
  }

  throw new Error(`Unsupported operation kind: ${operation.kind}`);
}

// Resolve the current numeric value at a path for increment/transfer. An absent
// path keeps the legitimate default of 0; a present but non-numeric value is a
// malformed/adversarial fixture and fails loudly rather than coercing to NaN and
// silently corrupting state.
function numericOperand(raw, pathExpression, kind) {
  if (raw == null) {
    return 0;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `${kind} operation at ${pathExpression}: current value ${formatValue(raw)} is not numeric`
    );
  }
  return value;
}

function evaluateExpectation(expect, state) {
  if (!expect?.path) {
    return {
      status: "pass",
      expectation: "no explicit expectation",
      observed: "step accepted"
    };
  }

  const actual = getPath(state, expect.path);
  const matches = deepEqual(actual, expect.equals);

  return {
    status: matches ? "pass" : "fail",
    expectation: `${expect.path} == ${formatValue(expect.equals)}`,
    observed: formatValue(actual)
  };
}

function evaluateInvariant({ invariant, state, steps, actors }) {
  if (invariant.kind === "numeric-min") {
    const actual = getPath(state, invariant.path);
    const passes = typeof actual === "number" && actual >= invariant.min;

    return invariantResult(
      invariant,
      passes,
      formatValue(actual),
      `${invariant.path} >= ${formatValue(invariant.min)}`
    );
  }

  if (invariant.kind === "state-equals" || invariant.kind === "timeline-state") {
    const actual = getPath(state, invariant.path);

    return invariantResult(
      invariant,
      deepEqual(actual, invariant.equals),
      formatValue(actual),
      `${invariant.path} == ${formatValue(invariant.equals)}`
    );
  }

  if (invariant.kind === "poke-actors-declared") {
    const pokeSteps = steps.filter((step) => step.type === "poke");
    const declared = pokeSteps.filter((step) => step.actor && actors.has(step.actor)).length;

    return invariantResult(
      invariant,
      declared === pokeSteps.length,
      `${declared}/${pokeSteps.length} poke steps declared actors`,
      "all poke steps declare actors"
    );
  }

  if (invariant.kind === "supply-conservation") {
    const balances = getPath(state, invariant.balancesPath) ?? {};
    const supply = getPath(state, invariant.supplyPath);
    const total = Object.values(balances).reduce((sum, value) => sum + Number(value), 0);
    // Tolerate IEEE-754 rounding for fractional ledgers (0.1 + 0.2 !== 0.3).
    // Number.isFinite(NaN) is false, so a missing/non-numeric supply still fails.
    const numericSupply = Number(supply);
    const passes = Number.isFinite(numericSupply) && Math.abs(total - numericSupply) <= 1e-9;

    return invariantResult(
      invariant,
      passes,
      `total=${total}, supply=${supply}`,
      `${invariant.balancesPath} sum equals ${invariant.supplyPath}`
    );
  }

  if (invariant.kind === "authorized-actor") {
    const allowedActors = new Set(invariant.actors ?? []);
    const scopedSteps = steps.filter((step) => step.type === (invariant.stepType ?? "poke"));
    const unauthorized = scopedSteps.filter((step) => step.actor && !allowedActors.has(step.actor));

    return invariantResult(
      invariant,
      unauthorized.length === 0,
      unauthorized.length === 0
        ? `${scopedSteps.length}/${scopedSteps.length} ${invariant.stepType ?? "poke"} actors authorized`
        : unauthorized.map((step) => step.actor).join(", "),
      `actors in [${[...allowedActors].join(", ")}]`
    );
  }

  if (invariant.kind === "numeric-range") {
    const actual = getPath(state, invariant.path);
    const passes =
      typeof actual === "number" && actual >= invariant.min && actual <= invariant.max;

    return invariantResult(
      invariant,
      passes,
      formatValue(actual),
      `${formatValue(invariant.min)} <= ${invariant.path} <= ${formatValue(invariant.max)}`
    );
  }

  if (invariant.kind === "array-length-min") {
    const actual = getPath(state, invariant.path);
    const isArray = Array.isArray(actual);

    return invariantResult(
      invariant,
      isArray && actual.length >= invariant.min,
      isArray ? `length=${actual.length}` : `not an array (${formatValue(actual)})`,
      `${invariant.path}.length >= ${invariant.min}`
    );
  }

  if (invariant.kind === "array-length-max") {
    const actual = getPath(state, invariant.path);
    const isArray = Array.isArray(actual);

    return invariantResult(
      invariant,
      isArray && actual.length <= invariant.max,
      isArray ? `length=${actual.length}` : `not an array (${formatValue(actual)})`,
      `${invariant.path}.length <= ${invariant.max}`
    );
  }

  if (invariant.kind === "temporal-ordering") {
    // Deterministic over final state only (no snapshot history): assert `before`
    // appears at a strictly lower index than `after` within an ordered log array.
    const log = getPath(state, invariant.path);
    const list = Array.isArray(log) ? log : [];
    const beforeIndex = list.findIndex(
      (entry) => isPlainObject(entry) && deepEqual(entry[invariant.field], invariant.before)
    );
    const afterIndex = list.findIndex(
      (entry) => isPlainObject(entry) && deepEqual(entry[invariant.field], invariant.after)
    );
    const passes = beforeIndex !== -1 && afterIndex !== -1 && beforeIndex < afterIndex;

    return invariantResult(
      invariant,
      passes,
      Array.isArray(log)
        ? `${formatValue(invariant.before)}@${beforeIndex}, ${formatValue(invariant.after)}@${afterIndex}`
        : `not an array (${formatValue(log)})`,
      `${invariant.path}[].${invariant.field}: ${formatValue(invariant.before)} before ${formatValue(invariant.after)}`
    );
  }

  if (invariant.kind === "monotonic-strict") {
    const sequence = getPath(state, invariant.path);
    const values = Array.isArray(sequence) ? sequence : [];
    let passes = values.length > 0 && values.every((value) => typeof value === "number");
    for (let index = 1; index < values.length && passes; index += 1) {
      if (!(values[index] > values[index - 1])) {
        passes = false;
      }
    }
    return invariantResult(
      invariant,
      passes,
      formatValue(values),
      `${invariant.path} is a strictly-increasing numeric sequence (replay/nonce safety)`
    );
  }

  if (invariant.kind === "custom-function") {
    const fn = CUSTOM_INVARIANT_FUNCTIONS[invariant.fn];
    // Unknown names are rejected at load time; guard defensively here too.
    if (!fn) {
      return invariantResult(invariant, false, `unknown fn ${invariant.fn}`, invariant.fn);
    }
    const outcome = fn(state, invariant);

    return invariantResult(invariant, Boolean(outcome.passes), outcome.observed, outcome.expected);
  }

  return invariantResult(invariant, false, "unsupported invariant kind", invariant.kind);
}

function evaluateAlert(policy, state) {
  const actual = getPath(state, policy.condition.path);
  const triggered = deepEqual(actual, policy.condition.equals);

  return {
    id: policy.id,
    title: policy.title,
    severity: policy.severity,
    state: triggered ? "triggered" : "clear",
    observed: formatValue(actual),
    condition: `${policy.condition.path} == ${formatValue(policy.condition.equals)}`,
    message: triggered ? policy.message : policy.clearMessage
  };
}

function invariantResult(invariant, passes, observed, expected) {
  return {
    id: invariant.id,
    title: invariant.title,
    severity: invariant.severity,
    status: passes ? "pass" : "fail",
    observed,
    expected
  };
}

const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function assertSafeSegment(segment) {
  if (UNSAFE_PATH_SEGMENTS.has(segment)) {
    throw new Error(`unsafe path segment: ${segment}`);
  }
}

function mergeState(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    assertSafeSegment(key);
    if (isPlainObject(value) && isPlainObject(target[key])) {
      mergeState(target[key], value);
    } else {
      target[key] = structuredClone(value);
    }
  }
}

function diffState(before, after, prefix = "") {
  const paths = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diffs = [];

  for (const key of paths) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    if (isPlainObject(beforeValue) && isPlainObject(afterValue)) {
      diffs.push(...diffState(beforeValue, afterValue, pathName));
    } else if (!deepEqual(beforeValue, afterValue)) {
      diffs.push({
        path: pathName,
        before: formatValue(beforeValue),
        after: formatValue(afterValue)
      });
    }
  }

  return diffs;
}

function snapshotState({ label, stepId, state }) {
  const snapshot = {
    label,
    stateHash: hashState(state),
    state: structuredClone(state)
  };

  if (stepId) {
    snapshot.stepId = stepId;
  }

  return snapshot;
}

function hashState(state) {
  return createHash("sha256").update(stableStringify(state)).digest("hex").slice(0, 16);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function getPath(source, pathExpression) {
  return String(pathExpression)
    .split(".")
    .filter(Boolean)
    .reduce((current, segment) => current?.[segment], source);
}

function setPath(target, pathExpression, value) {
  const segments = String(pathExpression).split(".").filter(Boolean);
  for (const segment of segments) {
    assertSafeSegment(segment);
  }
  let current = target;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const existing = current[segment];
    // Decide the container type for this hop by the NEXT segment: a numeric next
    // segment indexes by number, so this container must be an array. Preserve an
    // existing array/object and only create a fresh container when the existing
    // value can't hold the next hop. (The old code used isPlainObject — false for
    // arrays — so writing through "arr.0.field" clobbered the array into {"0":...}.)
    if (isArrayIndexSegment(segments[i + 1])) {
      if (!Array.isArray(existing)) {
        current[segment] = [];
      }
    } else if (!isPlainObject(existing) && !Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments.at(-1)] = value;
}

function isArrayIndexSegment(segment) {
  return /^\d+$/.test(segment);
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatValue(value) {
  if (value === undefined) {
    return "undefined";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function singleLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function writeReportBundle(report, reportDir, overrideSlug) {
  const slug = overrideSlug ?? report.app.slug;
  const json = path.join(reportDir, `${slug}.report.json`);
  const markdown = path.join(reportDir, `${slug}.report.md`);

  await writeArtifact(json, `${JSON.stringify(report, null, 2)}\n`);
  await writeArtifact(markdown, toMarkdown(report));

  return { json, markdown };
}

async function writeArtifact(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

// --- human-facing colorized summary + predictive next-step hints (stderr) ---
// Colors only on a TTY and when NO_COLOR is unset, so piped/CI output stays clean.

const COLOR_ENABLED = Boolean(process.stderr.isTTY) && !process.env.NO_COLOR;

function paint(code, text) {
  return COLOR_ENABLED ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const ink = {
  green: (t) => paint("32", t),
  red: (t) => paint("31", t),
  yellow: (t) => paint("33", t),
  cyan: (t) => paint("36", t),
  dim: (t) => paint("2", t),
  bold: (t) => paint("1", t)
};

function statusGlyph(status) {
  if (status === "pass") return ink.green("✓");
  if (status === "fail") return ink.red("✗");
  if (status === "warn" || status === "triggered") return ink.yellow("⚠");
  return ink.dim("•");
}

function statusBadge(status) {
  const label = ` ${status.toUpperCase()} `;
  if (status === "pass") return paint("42;30", label);
  if (status === "fail") return paint("41;37", label);
  return paint("43;30", label);
}

function statusEmoji(status) {
  if (status === "pass") return "✅";
  if (status === "fail") return "❌";
  if (status === "warn" || status === "triggered") return "⚠️";
  return "•";
}

// Predict the most useful next command(s) from the run outcome — the CLI form of
// "predictive commands": guide devs to the obvious next move without them thinking.
function predictNextSteps(report, fixturePath) {
  const s = report.summary;
  const hints = [];
  if (s.status === "fail") {
    const failingInvariant = report.invariants.find((inv) => inv.status === "fail");
    const failingStep = report.steps.find((step) => step.status === "fail");
    if (failingInvariant) {
      hints.push(`fix invariant ${ink.bold(failingInvariant.id)}`);
    } else if (failingStep) {
      hints.push(`fix step ${ink.bold(failingStep.id)}`);
    }
    hints.push(`re-run ${ink.bold(`nocklab ${fixturePath} --strict`)}`);
  } else if (s.alertsTriggered > 0) {
    const alert = report.alerts.find((a) => a.state === "triggered");
    hints.push(`review alert ${ink.bold(alert?.id ?? "")}`);
    hints.push(`run the suite ${ink.bold("nocklab run --config nocklab.config.json --ci --strict")}`);
  } else {
    hints.push(`run the suite ${ink.bold("nocklab run --config nocklab.config.json --ci --strict")}`);
    hints.push(`scaffold another ${ink.bold("nocklab new-fixture --slug <app>")}`);
  }
  return hints;
}

function printRunSummary(report, fixturePath) {
  const s = report.summary;
  const out = process.stderr;
  out.write(`\n${statusBadge(s.status)} ${ink.bold(report.app.name)} ${ink.dim(`(${report.fixtureId})`)}\n`);
  out.write(
    `  ${s.stepsPassed}/${s.stepsPassed + s.stepsFailed} steps · ` +
      `${s.invariantsPassed}/${s.invariantsPassed + s.invariantsFailed} invariants · ` +
      `${s.alertsTriggered} alert${s.alertsTriggered === 1 ? "" : "s"} · ${ink.dim(`${s.durationMs}ms`)}\n`
  );
  for (const step of report.steps) {
    const timing = step.durationMs != null ? ink.dim(` (${step.durationMs}ms)`) : "";
    out.write(`  ${statusGlyph(step.status)} ${step.id}${timing}\n`);
  }
  for (const inv of report.invariants.filter((entry) => entry.status !== "pass")) {
    out.write(`  ${statusGlyph(inv.status)} ${ink.dim("invariant")} ${inv.id}: ${inv.observed} ${ink.dim(`(expected ${inv.expected})`)}\n`);
  }
  const hints = predictNextSteps(report, fixturePath);
  if (hints.length > 0) {
    out.write(`${ink.cyan("  → next:")} ${hints.join(ink.dim("  ·  "))}\n`);
  }
  out.write("\n");
}

// did-you-mean: suggest the closest known subcommand for a mistyped verb.
function levenshtein(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
    }
  }
  return rows[a.length][b.length];
}

function suggestVerb(token) {
  let best = null;
  let bestDistance = Infinity;
  for (const verb of KNOWN_VERBS) {
    const distance = levenshtein(token, verb);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = verb;
    }
  }
  return bestDistance <= 3 ? best : null;
}

function toMarkdown(report) {
  const s = report.summary;
  const lines = [
    `# ${statusEmoji(s.status)} ${report.app.name} Lab Report`,
    "",
    `> **${s.status.toUpperCase()}** — ${s.stepsPassed}/${s.stepsPassed + s.stepsFailed} steps · ` +
      `${s.invariantsPassed}/${s.invariantsPassed + s.invariantsFailed} invariants · ` +
      `${s.alertsTriggered} alert${s.alertsTriggered === 1 ? "" : "s"} · ${s.durationMs}ms`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Report | \`${report.reportId}\` |`,
    `| Fixture | \`${report.fixtureId}\` |`,
    `| Status | ${statusEmoji(s.status)} ${s.status} |`,
    `| Steps | ${s.stepsPassed} passed, ${s.stepsFailed} failed |`,
    `| Invariants | ${s.invariantsPassed} passed, ${s.invariantsFailed} failed |`,
    `| Alerts | ${s.alertsClear} clear, ${s.alertsTriggered} triggered |`,
    `| Snapshots | ${s.snapshotsCaptured} |`,
    "",
    "## Steps",
    "",
    ...report.steps.flatMap((step) => [
      `- ${statusEmoji(step.status)} \`${step.id}\` — ${step.observed} _(${step.expectation})_; ${step.beforeHash} -> ${step.afterHash}`,
      ...(step.stateDiffs ?? []).map((diff) => `  - ${diff.path}: ${diff.before} -> ${diff.after}`)
    ]),
    "",
    "## Invariants",
    "",
    ...report.invariants.map(
      (invariant) =>
        `- ${statusEmoji(invariant.status)} \`${invariant.id}\` — ${invariant.observed} _(expected ${invariant.expected})_`
    ),
    "",
    "## Alerts",
    "",
    ...(report.alerts.length === 0
      ? ["- No alert policies configured."]
      : report.alerts.map(
          (alert) =>
            `- ${alert.state.toUpperCase()} ${alert.id}: ${alert.observed} (${alert.condition})`
        )),
    "",
    "## Adapter Observations",
    "",
    ...(report.adapterObservations.length === 0
      ? ["- No adapter observations captured."]
      : report.adapterObservations.map(
          (observation) =>
            `- ${observation.status.toUpperCase()} ${observation.stepId} ${observation.capability}: ${observation.summary}`
        )),
    "",
    "## State Diffs",
    "",
    ...report.stateDiffs.map((diff) => `- ${diff.path}: ${diff.before} -> ${diff.after}`),
    "",
    "## Snapshot Timeline",
    "",
    ...report.stateSnapshots.map((snapshot) => `- ${snapshot.label}: ${snapshot.stateHash}`),
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function toCiSummary(manifest, results) {
  const lines = [
    "# NockApp Lab CI Summary",
    "",
    `Status: ${manifest.status}`,
    "",
    "| Fixture | App | Status | Steps | Invariants | Alerts | Snapshots |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...results.map(({ report }) =>
      `| ${[
        report.fixtureId,
        report.app.slug,
        report.summary.status,
        `${report.summary.stepsPassed}/${report.steps.length}`,
        `${report.summary.invariantsPassed}/${report.invariants.length}`,
        `${report.summary.alertsTriggered} triggered`,
        report.summary.snapshotsCaptured
      ].join(" | ")} |`
    )
  ];

  return `${lines.join("\n")}\n`;
}

function summarizeStatuses(statuses) {
  if (statuses.includes("fail")) {
    return "fail";
  }
  if (statuses.includes("warn")) {
    return "warn";
  }
  return "pass";
}

function resolveFrom(basePath, targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(basePath, targetPath);
}
