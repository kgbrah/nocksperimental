// Server-side, READ-ONLY view of the live Nockchain<->Base federated bridge on Base Sepolia, for the
// interactive GUI. Mirrors the forensic reader in scripts/lib/base-evm-reader.mjs but trimmed to what
// the browser panel shows, and kept in src/ so it runs inside the Cloudflare Worker (viem is fetch-based
// and Worker-safe). No keys, no writes — the RPC URL stays server-side (never shipped to the client).

import { createPublicClient, http, type Abi } from "viem";
import { APP_NETWORKS, type AppNetwork } from "@/lib/networks";
import { rpcUrlFor } from "@/lib/base-rpc";

const INBOX_ABI = [
  { type: "function", name: "bridgeNodes", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "THRESHOLD", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "withdrawalsEnabled", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] }
] as const satisfies Abi;

const TIP5 = { type: "tuple", components: [{ name: "limbs", type: "uint64[5]" }] } as const;
const DEPOSIT_PROCESSED = {
  type: "event",
  name: "DepositProcessed",
  inputs: [
    { name: "txId", type: "bytes32", indexed: true },
    { name: "nameFirstHash", type: "bytes32", indexed: true },
    { name: "recipient", type: "address", indexed: true },
    { ...TIP5, name: "txIdFull" },
    { ...TIP5, name: "nameFirst" },
    { ...TIP5, name: "nameLast" },
    { name: "amount", type: "uint256" },
    { name: "blockHeight", type: "uint256" },
    { ...TIP5, name: "asOf" },
    { name: "nonce", type: "uint256" }
  ]
} as const;
const BURN_FOR_WITHDRAWAL = {
  type: "event",
  name: "BurnForWithdrawal",
  inputs: [
    { name: "burner", type: "address", indexed: true },
    { name: "amount", type: "uint256" },
    { name: "lockRoot", type: "bytes32", indexed: true }
  ]
} as const;

const LOOKBACK = BigInt(800); // bounded window keeps getLogs within public-RPC caps

export type BridgeStatus = {
  chainId: number;
  network: string;
  live: boolean;
  inbox: string;
  nock: string;
  headBlock: number;
  signers: string[];
  threshold: number;
  withdrawalsEnabled: boolean | null;
  window: { fromBlock: number; toBlock: number };
  eventCounts: { mints: number; burns: number };
  checkedAt: string;
  error?: string;
};

// Read the live bridge status for a chain that actually has a deployed bridge (currently Base Sepolia).
export async function readBridgeStatus(chainId: number = 84532): Promise<BridgeStatus> {
  const net: AppNetwork | undefined = APP_NETWORKS[chainId];
  const checkedAt = new Date().toISOString();
  const base: BridgeStatus = {
    chainId,
    network: net?.label ?? `Chain ${chainId}`,
    live: false,
    inbox: net?.bridge?.messageInbox ?? "",
    nock: net?.bridge?.nock ?? "",
    headBlock: 0,
    signers: [],
    threshold: 0,
    withdrawalsEnabled: null,
    window: { fromBlock: 0, toBlock: 0 },
    eventCounts: { mints: 0, burns: 0 },
    checkedAt
  };
  if (!net?.bridge) return { ...base, error: "No bridge deployment for this chain." };
  const rpcUrl = rpcUrlFor(chainId);
  if (!rpcUrl) return { ...base, error: "No RPC endpoint configured." };

  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const inbox = net.bridge.messageInbox;
    const nock = net.bridge.nock;

    const head = await client.getBlockNumber();
    const [roster, threshold, withdrawals] = await Promise.all([
      Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          client.readContract({ address: inbox, abi: INBOX_ABI, functionName: "bridgeNodes", args: [BigInt(i)] })
        )
      ),
      client
        .readContract({ address: inbox, abi: INBOX_ABI, functionName: "THRESHOLD" })
        .then((v) => Number(v))
        .catch(() => 3),
      client
        .readContract({ address: inbox, abi: INBOX_ABI, functionName: "withdrawalsEnabled" })
        .then((v) => Boolean(v))
        .catch<boolean | null>(() => null)
    ]);

    const toBlock = head;
    const fromBlock = head > LOOKBACK ? head - LOOKBACK : BigInt(0);
    const [mints, burns] = await Promise.all([
      client.getLogs({ address: inbox, event: DEPOSIT_PROCESSED, fromBlock, toBlock }),
      client.getLogs({ address: nock, event: BURN_FOR_WITHDRAWAL, fromBlock, toBlock })
    ]);

    return {
      ...base,
      live: true,
      headBlock: Number(head),
      signers: roster.map((a) => String(a)),
      threshold,
      withdrawalsEnabled: withdrawals,
      window: { fromBlock: Number(fromBlock), toBlock: Number(toBlock) },
      eventCounts: { mints: mints.length, burns: burns.length }
    };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : "RPC read failed" };
  }
}
