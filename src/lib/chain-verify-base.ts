// Independent chain re-verification for an EVM (Base) ChainAnchor. Re-fetches the
// tx receipt + block straight from the chain (server-side viem, RPC URL never
// shipped to the client) and confirms every claim in the anchor. This is the
// zero-trust half: the chain is the source of truth, not the issuer's signature.

import { createPublicClient, http } from "viem";
import { rpcUrlFor } from "@/lib/base-rpc";
import type { ChainAnchor } from "@/lib/chain-anchor";

export type ChainVerifyChecks = {
  txMined: boolean; // receipt exists + status success
  blockMatched: boolean; // receipt.blockHash + number == anchor
  blockExists: boolean; // block re-fetched by hash, number matches
  logMatched: boolean; // a log at logIndex with the bound contract + topic exists
};

export type ChainVerifyResult = {
  verifiability: ChainAnchor["verifiability"];
  onChain: boolean; // all required checks passed
  checks: ChainVerifyChecks;
  explorerTxUrl?: string;
  explorerBlockUrl?: string;
  error?: string;
};

const EXPLORER: Record<number, string> = {
  84532: "https://sepolia.basescan.org",
  8453: "https://basescan.org",
};

export async function verifyBaseAnchor(anchor: ChainAnchor): Promise<ChainVerifyResult> {
  const checks: ChainVerifyChecks = { txMined: false, blockMatched: false, blockExists: false, logMatched: false };
  const chainId = anchor.chainId ?? 84532;
  const explorer = EXPLORER[chainId];
  const result: ChainVerifyResult = {
    verifiability: anchor.verifiability,
    onChain: false,
    checks,
    explorerTxUrl: explorer ? `${explorer}/tx/${anchor.txId}` : undefined,
    explorerBlockUrl: explorer ? `${explorer}/block/${anchor.blockHeight}` : undefined,
  };

  const rpcUrl = rpcUrlFor(chainId);
  if (!rpcUrl) {
    result.error = `no RPC configured for chain ${chainId}`;
    return result;
  }

  try {
    const client = createPublicClient({ transport: http(rpcUrl) });

    // 1. tx receipt — mined + successful
    const receipt = await client.getTransactionReceipt({ hash: anchor.txId as `0x${string}` });
    checks.txMined = !!receipt && receipt.status === "success";

    // 2. receipt's block matches the anchor (hash + height)
    checks.blockMatched =
      !!receipt &&
      receipt.blockHash.toLowerCase() === anchor.blockHash.toLowerCase() &&
      Number(receipt.blockNumber) === anchor.blockHeight;

    // 3. the bound event log is actually in this tx (contract + topic0 + index)
    if (receipt && anchor.contract && anchor.eventTopic && typeof anchor.logIndex === "number") {
      const log = receipt.logs.find((l) => Number(l.logIndex) === anchor.logIndex);
      checks.logMatched =
        !!log &&
        log.address.toLowerCase() === anchor.contract.toLowerCase() &&
        (log.topics[0] ?? "").toLowerCase() === anchor.eventTopic.toLowerCase();
    }

    // 4. independently re-fetch the block by hash; confirm it exists + height agrees
    const block = await client.getBlock({ blockHash: anchor.blockHash as `0x${string}` });
    checks.blockExists = !!block && Number(block.number) === anchor.blockHeight;

    result.onChain = checks.txMined && checks.blockMatched && checks.blockExists && checks.logMatched;
    return result;
  } catch (e) {
    result.error = e instanceof Error ? e.message : "chain read failed";
    return result;
  }
}
