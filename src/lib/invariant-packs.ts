import paymentsPack from "../../packs/payments.invariants.json";
import intentsPack from "../../packs/intents.invariants.json";
import tokensPack from "../../packs/tokens.invariants.json";
import bridgePack from "../../packs/bridge.invariants.json";
import pmaSafetyPack from "../../packs/pma-safety.invariants.json";
import miningPowPack from "../../packs/mining-pow.invariants.json";

export type InvariantPackUpstreamBasis = {
  repo: string;
  commit: string;
  build?: string;
  protocolTrack?: string;
};

export type InvariantPackSourceAnchor = {
  id: string;
  upstreamRepo?: string;
  upstreamFile: string;
  upstreamUrl?: string;
  docTier?: string;
  note?: string;
};

export type InvariantPackSummary = {
  id: string;
  name: string;
  version: string;
  domain: string;
  description: string;
  upstreamBasis: InvariantPackUpstreamBasis | null;
  sourceAnchors: InvariantPackSourceAnchor[];
  invariantIds: string[];
  invariantCount: number;
  path: string;
};

type RawInvariantPack = {
  id: string;
  name: string;
  version: string;
  domain: string;
  description: string;
  upstreamBasis?: InvariantPackUpstreamBasis;
  sourceAnchors?: InvariantPackSourceAnchor[];
  invariants: Array<{ id: string }>;
};

const rawPacks: Array<{ pack: RawInvariantPack; path: string }> = [
  { pack: paymentsPack as RawInvariantPack, path: "packs/payments.invariants.json" },
  { pack: intentsPack as RawInvariantPack, path: "packs/intents.invariants.json" },
  { pack: tokensPack as RawInvariantPack, path: "packs/tokens.invariants.json" },
  { pack: bridgePack as RawInvariantPack, path: "packs/bridge.invariants.json" },
  { pack: pmaSafetyPack as RawInvariantPack, path: "packs/pma-safety.invariants.json" },
  { pack: miningPowPack as RawInvariantPack, path: "packs/mining-pow.invariants.json" }
];

export const invariantPacks: InvariantPackSummary[] = rawPacks.map(({ pack, path }) => ({
  id: pack.id,
  name: pack.name,
  version: pack.version,
  domain: pack.domain,
  description: pack.description,
  upstreamBasis: pack.upstreamBasis ?? null,
  sourceAnchors: pack.sourceAnchors ?? [],
  invariantIds: pack.invariants.map((invariant) => invariant.id),
  invariantCount: pack.invariants.length,
  path
}));

export function invariantPackForId(id: string): InvariantPackSummary | undefined {
  return invariantPacks.find((pack) => pack.id === id);
}
