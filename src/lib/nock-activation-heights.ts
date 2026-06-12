// Canonical registry of Nockchain height-gated protocol activations.
//
// Cutovers are SILENT — there is no in-band signaling, and a lagging node simply
// FORKS at the activation height. So a casino/bridge node must upgrade AHEAD of each
// activation_height, not at it. Heights can also SLIP before they finalize (v1 moved
// 37,350 → 39,000): treat any non-activated height as PROVISIONAL and re-verify
// against the upstream changelog — this registry is a watch aid, not protocol truth.
// (nockchain roadmap alignment 2026: "changelog watch + upgrade-ahead discipline".)

export type ActivationNetwork = "fakenet" | "mainnet";
export type ActivationStatus = "activated" | "scheduled" | "provisional";

export type ProtocolActivation = {
  id: string;
  title: string;
  network: ActivationNetwork;
  /** height-gate; null marks an era activation that isn't a single-height cutover. */
  height: number | null;
  status: ActivationStatus;
  note?: string;
};

export const NOCK_ACTIVATIONS: readonly ProtocolActivation[] = [
  {
    id: "aletheia",
    title: "Aletheia — Phase 2 consensus (ASERT difficulty, 150s block time, 80/20 coinbase split)",
    network: "mainnet",
    height: null,
    status: "activated",
    note: "block time 600s→150s; emission decay ~6 months post-Aletheia. See nock-chain-params.ts.",
  },
  {
    id: "bythos",
    title: "Bythos — word-count fee model; mempool drops (not queues) context-invalid txs",
    network: "mainnet",
    height: null,
    status: "activated",
    note: "fee = max(256, seed·128 + witness·32). See nock-fee-estimator.ts.",
  },
  {
    id: "v1-fakenet",
    title: "v1 lock/proof semantics (fakenet)",
    network: "fakenet",
    height: 39000,
    status: "activated",
    note: "set --fakenet-v1-phase 1 (else v0 semantics are tested); height slipped 37,350 → 39,000 before finalizing.",
  },
];

/** Fakenet difficulty-epoch bug stalls mining at this height — a known hazard, not an upgrade. */
export const FAKENET_DIFFICULTY_EPOCH_STALL_HEIGHT = 2016;

/** Whether activation `id` is in effect at `height` on `network` (null if unknown id). */
export function isActivatedAt(id: string, height: number, network: ActivationNetwork = "mainnet"): boolean | null {
  const a = NOCK_ACTIVATIONS.find((x) => x.id === id && x.network === network);
  if (!a) return null;
  if (a.height == null) return a.status === "activated"; // era marker, not a single-height gate
  return height >= a.height;
}

/** The next height-gated activation strictly after `height` on `network`, or null. */
export function nextActivation(height: number, network: ActivationNetwork): ProtocolActivation | null {
  const upcoming = NOCK_ACTIVATIONS.filter((a) => a.network === network && a.height != null && (a.height as number) > height).sort(
    (a, b) => (a.height as number) - (b.height as number)
  );
  return upcoming[0] ?? null;
}

/**
 * Upgrade-ahead guard: a node at `nodeHeight` is at fork risk if the next height-gated
 * activation on `network` lands within `leadBlocks`. Returns that activation, or null.
 */
export function upgradeAheadDue(nodeHeight: number, network: ActivationNetwork, leadBlocks: number): ProtocolActivation | null {
  const next = nextActivation(nodeHeight, network);
  if (!next || next.height == null) return null;
  return (next.height as number) - nodeHeight <= leadBlocks ? next : null;
}
