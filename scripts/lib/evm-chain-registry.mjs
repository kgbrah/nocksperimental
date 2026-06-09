// Shared EVM chain registry resolver. The conservative, adversarially-verified per-chain finality/hash
// profiles live in src/data/evm-chains.json (model inputs, NOT a live oracle). Both the lab runner
// (run-lab.mjs) and the standalone forensic verifier (xchain-verifier.mjs) resolve chains through this
// one module so the lookup + alias map are not duplicated. (The independent invariant/property CHECKS
// stay separate in each file by design — only this data-lookup glue is shared.)
//
// Loaded relative to this module so cwd does not matter, and degrades gracefully to a families-only
// registry if the data file is not co-located (e.g. the extracted published `nocklab`): per-chain
// lookups then resolve to undefined while family-based hash support still works.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let EVM_CHAINS;
try {
  EVM_CHAINS = JSON.parse(
    readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/data/evm-chains.json"), "utf8")
  );
} catch {
  EVM_CHAINS = { families: { evm: { nativeHashes: ["keccak256", "sha256"] }, nock: { nativeHashes: ["tip5"] } }, chains: {} };
}

export { EVM_CHAINS };

// Resolve a chain reference (numeric chainId, string chainId, or a legacy name like "base"/"nockchain")
// to its registry profile, or undefined if unknown.
export function resolveChain(ref) {
  if (ref === undefined || ref === null) return undefined;
  const direct = EVM_CHAINS.chains[String(ref)];
  if (direct) return direct;
  // A numeric chainId may be stored under a different key (e.g. Nockchain is keyed "nockchain" with
  // chainId 0) — match the chainId field too. Only treat GENUINE numeric refs as a chainId: a bare
  // Number(ref) would coerce "", false, [] and " " to 0 and silently resolve them to Nockchain.
  const num =
    typeof ref === "number" ? ref
      : typeof ref === "string" && /^[0-9]+$/.test(ref.trim()) ? Number(ref.trim())
        : NaN;
  if (Number.isFinite(num)) {
    const byId = Object.values(EVM_CHAINS.chains).find((c) => Number(c.chainId) === num);
    if (byId) return byId;
  }
  const lname = String(ref).toLowerCase();
  const aliases = { nockchain: "nockchain", nock: "nockchain", base: "8453", ethereum: "1", evm: "1" };
  if (aliases[lname]) return EVM_CHAINS.chains[aliases[lname]];
  return Object.values(EVM_CHAINS.chains).find((c) => c.name?.toLowerCase() === lname);
}

// Native hash algorithms computable on a chain: the resolved chain's own nativeHashes, else its family's
// (or, for an unresolved ref, the passed family's), else []. Every registry chain carries nativeHashes,
// so the family fallback only applies to an unresolved ref with a known family.
export function hashesForChain(ref, family) {
  const c = resolveChain(ref);
  if (c) return c.nativeHashes ?? EVM_CHAINS.families[c.family]?.nativeHashes ?? [];
  if (family) return EVM_CHAINS.families[family]?.nativeHashes ?? [];
  return [];
}
