// Server-side HOUSE operator for the on-chain ForfeitFlip game. Holds the house key (a Worker secret),
// signs openRound/reveal, and derives each round's serverSeed DETERMINISTICALLY from the key + contract +
// roundId so the operator is stateless (no database): the seed is secret (depends on the key), unique per
// (contract, round), and re-derivable at reveal. Never expose a serverSeed before its round is settled.
//
// Two stake assets share this operator: the native-ETH game and the tNOCK ERC20 game. openRound/reveal/
// getRound/nextRoundId are identical across both contract ABIs, so the only per-asset differences are the
// contract address, the ABI used for reads/writes, and the seed domain (which binds to the address).
//
// Safety: only openRound/reveal/cancel are house-signed here; nothing pushes player funds. A rare
// roundId-prediction race at open just yields an un-revealable round, which the contract's reveal-window
// timeout refunds to the player — so no funds are ever at risk from the operator.

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  decodeEventLog,
  type Hex,
  type Address
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { forfeitFlipAbi } from "@/lib/abi/forfeit-flip";
import { forfeitFlipTokenAbi } from "@/lib/abi/forfeit-flip-token";
import { forfeitFlipAddress, tNockAddress, FlipStatus, type FlipAsset } from "@/lib/game-contracts";
import { rpcUrlFor } from "@/lib/base-rpc";

const HOUSE_CHAIN_ID = 84532;
const SEED_DOMAIN = "nocksperimental/forfeit-flip/serverseed/v1";

// The shared round-lifecycle ABI surface is identical in both artifacts; pick by asset for type-safety.
function abiFor(asset: FlipAsset) {
  return asset === "tnock" ? forfeitFlipTokenAbi : forfeitFlipAbi;
}

function publicClient() {
  return createPublicClient({ chain: baseSepolia, transport: http(rpcUrlFor(HOUSE_CHAIN_ID)) });
}

export type HouseError = { ok: false; error: string };

function houseKey(): Hex | null {
  const k = (process.env.NOCKS_FLIP_HOUSE_KEY || "").trim();
  return /^0x[0-9a-fA-F]{64}$/.test(k) ? (k as Hex) : null;
}

export function houseConfigured(asset: FlipAsset = "eth"): boolean {
  return houseKey() !== null && forfeitFlipAddress(HOUSE_CHAIN_ID, asset) !== undefined;
}

// serverSeed = keccak256(domain ‖ contract ‖ houseKey ‖ roundId). Binding the contract address keeps the
// seed unique per game even when both games share a roundId. commit = keccak256(serverSeed) (the contract's
// reveal check is keccak256(abi.encodePacked(serverSeed)) == commit). The key never leaves the server.
function deriveServerSeed(key: Hex, address: Address, roundId: bigint): Hex {
  return keccak256(
    encodePacked(["string", "address", "bytes32", "uint256"], [SEED_DOMAIN, address, key, roundId])
  );
}

// Read-only public client (no key) for config/state the browser shows before connecting.
export async function readFlipState(asset: FlipAsset = "eth") {
  const address = forfeitFlipAddress(HOUSE_CHAIN_ID, asset);
  if (!address) return { configured: false as const };
  const client = publicClient();
  const abi = abiFor(asset);
  const read = (functionName: "minStake" | "maxStake" | "revealWindow" | "houseBankroll" | "nextRoundId") =>
    client.readContract({ address, abi, functionName }) as Promise<bigint>;
  try {
    const [minStake, maxStake, revealWindow, bankroll, nextRoundId] = await Promise.all([
      read("minStake"),
      read("maxStake"),
      read("revealWindow"),
      read("houseBankroll"),
      read("nextRoundId")
    ]);
    return {
      configured: true as const,
      houseConfigured: houseConfigured(asset),
      asset,
      address,
      token: asset === "tnock" ? tNockAddress(HOUSE_CHAIN_ID) : undefined,
      chainId: HOUSE_CHAIN_ID,
      minStake: minStake.toString(),
      maxStake: maxStake.toString(),
      revealWindowSeconds: Number(revealWindow),
      bankroll: bankroll.toString(),
      nextRoundId: nextRoundId.toString()
    };
  } catch (error) {
    return {
      configured: true as const,
      houseConfigured: houseConfigured(asset),
      asset,
      address,
      chainId: HOUSE_CHAIN_ID,
      error: error instanceof Error ? error.message : "read failed"
    };
  }
}

function clients(key: Hex, asset: FlipAsset) {
  const account = privateKeyToAccount(key);
  const pc = publicClient();
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrlFor(HOUSE_CHAIN_ID)) });
  return { account, publicClient: pc, walletClient, address: forfeitFlipAddress(HOUSE_CHAIN_ID, asset) as Address };
}

/// Open a fresh round: predict the next roundId, commit to its derived serverSeed, and submit.
/// Returns the actual roundId (parsed from the RoundOpened event) so the player can play it.
export async function openRound(asset: FlipAsset = "eth"): Promise<{ ok: true; roundId: string; commit: Hex } | HouseError> {
  const key = houseKey();
  const address = forfeitFlipAddress(HOUSE_CHAIN_ID, asset);
  if (!key || !address) return { ok: false, error: "house not configured" };
  const { publicClient, walletClient } = clients(key, asset);
  const abi = abiFor(asset);

  try {
    const predicted = (await publicClient.readContract({ address, abi, functionName: "nextRoundId" })) as bigint;
    const serverSeed = deriveServerSeed(key, address, predicted);
    const commit = keccak256(encodePacked(["bytes32"], [serverSeed]));

    const hash = await walletClient.writeContract({ address, abi, functionName: "openRound", args: [commit] });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    let actual: bigint | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
        if (decoded.eventName === "RoundOpened") {
          actual = (decoded.args as { roundId: bigint }).roundId;
          break;
        }
      } catch {
        /* not our event */
      }
    }
    if (actual === undefined) return { ok: false, error: "open succeeded but RoundOpened not found" };
    if (actual !== predicted) {
      // Rare roundId race: the committed seed won't match this id. Cancel it (housekeeping) and ask to retry.
      await walletClient
        .writeContract({ address, abi, functionName: "cancelRound", args: [actual] })
        .catch(() => undefined);
      return { ok: false, error: "roundId race; please retry" };
    }
    return { ok: true, roundId: actual.toString(), commit };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "openRound failed" };
  }
}

/// Reveal a Played round so it settles on-chain. Idempotent + safe: re-derives the serverSeed, verifies
/// it matches the on-chain commit, and only reveals a Played round.
export async function revealRound(roundId: bigint, asset: FlipAsset = "eth"): Promise<{ ok: true; txHash: Hex } | HouseError> {
  const key = houseKey();
  const address = forfeitFlipAddress(HOUSE_CHAIN_ID, asset);
  if (!key || !address) return { ok: false, error: "house not configured" };
  const { publicClient, walletClient } = clients(key, asset);
  const abi = abiFor(asset);

  try {
    const round = (await publicClient.readContract({ address, abi, functionName: "getRound", args: [roundId] })) as {
      status: number;
      commit: Hex;
    };
    if (round.status !== FlipStatus.Played) return { ok: false, error: "round is not awaiting reveal" };

    const serverSeed = deriveServerSeed(key, address, roundId);
    if (keccak256(encodePacked(["bytes32"], [serverSeed])) !== round.commit) {
      return { ok: false, error: "seed/commit mismatch (round not openable by this operator)" };
    }
    const hash = await walletClient.writeContract({ address, abi, functionName: "reveal", args: [roundId, serverSeed] });
    await publicClient.waitForTransactionReceipt({ hash });
    return { ok: true, txHash: hash };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "reveal failed" };
  }
}
