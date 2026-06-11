// Single source of truth for DONATION config: the project's receiving addresses, the per-chain Base
// NOCK ERC20 token, exact NICKS<->NOCK math, and the literal `nockchain-wallet create-tx` command we
// show donors. This module is SERVER-SAFE: no React, no `window`, no viem — so it imports cleanly from
// both server pages and client components, and is unit-testable as a plain Node script.
//
// SECURITY POSTURE (mirrors AGENTS.md anti-patterns):
//   - It only ever handles *destination* addresses and amounts. There is NO parameter for a private key,
//     seed phrase, or wallet export anywhere in here — by construction it cannot echo a secret.
//   - Defaults are clearly-labelled sentinels, never a real address, so an unconfigured deploy fails
//     CLOSED (the UI shows "owner: set your address" instead of sending funds to a placeholder).
//   - `buildCreateTxCommand` is copy-pasted into a user's shell, so the recipient address is validated
//     against a strict base58 charset (which excludes every shell metacharacter) before assembly.

// 65536 nicks = 1 NOCK. Nicks are the indivisible base unit (no fractional nicks). 65536 = 2^16.
// (BigInt(...) form, not a 65536n literal — this repo's tsconfig target predates bigint literals.)
export const NICKS_PER_NOCK = BigInt(65536);

// 5^16. Because 65536 = 2^16 and 10^16 = 2^16 * 5^16, any whole number of nicks r (< 65536) maps to an
// EXACT terminating decimal r/65536 = (r * 5^16) / 10^16. Used by nicksToNock for lossless formatting.
const FIVE_POW_16 = BigInt(152587890625);

// ---------------------------------------------------------------------------------------------------
// Placeholders / fail-closed sentinels
// ---------------------------------------------------------------------------------------------------

// Native Nockchain (P2PKH base58) sentinel. The leading "SET_" token is what isPlaceholder() keys off.
export const PLACEHOLDER_NOCK_ADDRESS = "SET_NOCK_DONATION_ADDRESS";
// EVM sentinel: the zero address. Never a real receiver.
export const PLACEHOLDER_BASE_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// ---------------------------------------------------------------------------------------------------
// Receiving addresses (env-overridable). These are DESTINATIONS, not secrets, so NEXT_PUBLIC_* is correct.
// The committed defaults are the project's live donation addresses; override per-deploy via env.
// ---------------------------------------------------------------------------------------------------

// Project donation addresses (public destinations). Override via NEXT_PUBLIC_* without a code change.
const DEFAULT_NOCK_DONATION_ADDRESS = "532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ";
const DEFAULT_BASE_DONATION_ADDRESS = "0xb405EbdE5F5c84372b5663D9D3A5758bb38025Da";

export const NOCK_DONATION_ADDRESS: string =
  process.env.NEXT_PUBLIC_NOCK_DONATION_ADDRESS?.trim() || DEFAULT_NOCK_DONATION_ADDRESS;

export const BASE_DONATION_ADDRESS: `0x${string}` =
  (process.env.NEXT_PUBLIC_BASE_DONATION_ADDRESS?.trim() as `0x${string}` | undefined) ||
  DEFAULT_BASE_DONATION_ADDRESS;

// ---------------------------------------------------------------------------------------------------
// Per-chain Base NOCK ERC20. `decimals` is the EXPECTED value (mainnet NOCK is verified 16-decimals,
// NOT 18). The donate panel still reads decimals() live on-chain before scaling a real transfer, so a
// wrong constant here can never silently mis-scale funds — this is a display hint / fallback only.
// ---------------------------------------------------------------------------------------------------

export type NockToken = { address: `0x${string}`; decimals: number; symbol: "NOCK" };

export const NOCK_TOKENS: Record<number, NockToken> = {
  // Base mainnet — verified ERC20 (name "Nock", symbol "NOCK", decimals 16), pure transfer, ~live liquidity.
  8453: { address: "0x9B5E262cF9bb04869ab40b19AF91D2dc85761722", decimals: 16, symbol: "NOCK" },
  // Base Sepolia — the bridged NOCK used by the federated bridge (see networks.ts bridge.nock).
  84532: { address: "0xA9cd4087D9B050D8B35727AAf810296CA957c7B3", decimals: 16, symbol: "NOCK" }
};

export function nockToken(chainId: number | undefined): NockToken | undefined {
  return chainId == null ? undefined : NOCK_TOKENS[chainId];
}

// ---------------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------------

// Base58 alphabet (Bitcoin/IPFS style): no 0, O, I, l. This charset deliberately excludes EVERY shell
// metacharacter (space ' " ; $ ` \ newline | & < > etc.), so a valid address is shell-injection-safe.
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
// Nockchain p2pkh base58 addresses are long; bound generously rather than guessing an exact length.
const NOCK_ADDR_MIN = 32;
const NOCK_ADDR_MAX = 128;

export function isValidNockAddress(address: string | undefined): boolean {
  if (!address) return false;
  if (address.length < NOCK_ADDR_MIN || address.length > NOCK_ADDR_MAX) return false;
  return BASE58_RE.test(address);
}

const EVM_ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export function isValidEvmAddress(address: string | undefined): boolean {
  return !!address && EVM_ADDR_RE.test(address);
}

// True when the address is unset / a sentinel / structurally invalid. The UI MUST gate every send and
// every command on this so funds can never flow to a placeholder.
export function isPlaceholder(address: string | undefined): boolean {
  if (!address) return true;
  if (address === PLACEHOLDER_NOCK_ADDRESS || address.startsWith("SET_")) return true;
  if (address.toLowerCase() === PLACEHOLDER_BASE_ADDRESS) return true;
  // A structurally-invalid value is treated as "not configured" too (fail closed).
  if (address.startsWith("0x")) return !isValidEvmAddress(address);
  return !isValidNockAddress(address);
}

// ---------------------------------------------------------------------------------------------------
// NICKS <-> NOCK (exact, bigint; native Nockchain side)
// ---------------------------------------------------------------------------------------------------

const DECIMAL_RE = /^\d+(\.\d+)?$/;

// Convert a NOCK amount (e.g. "1", "0.5", 2) to whole nicks. Exact: rejects values finer than 1 nick,
// and rejects negatives / NaN / non-numeric. Never multiplies a float by 65536.
export function nockToNicks(nock: number | string): bigint {
  const raw = typeof nock === "number" ? numberToDecimalString(nock) : nock.trim();
  if (!DECIMAL_RE.test(raw)) throw new Error(`Invalid NOCK amount: ${JSON.stringify(nock)}`);
  const [intPart, fracPart = ""] = raw.split(".");
  const scale = BigInt(10) ** BigInt(fracPart.length); // denominator D = 10^fracDigits
  const numerator = BigInt(intPart + fracPart); // N = nock * D, as an integer
  const nicksTimesScale = numerator * NICKS_PER_NOCK; // nicks * D
  if (nicksTimesScale % scale !== BigInt(0)) {
    throw new Error(`NOCK amount ${raw} is finer than one nick (1 nick = 1/65536 NOCK)`);
  }
  return nicksTimesScale / scale;
}

// Convert whole nicks back to an exact NOCK decimal string (no trailing zeros, no float).
export function nicksToNock(nicks: bigint): string {
  if (nicks < BigInt(0)) throw new Error("nicks must be non-negative");
  const whole = nicks / NICKS_PER_NOCK;
  const rem = nicks % NICKS_PER_NOCK;
  if (rem === BigInt(0)) return whole.toString();
  // rem/65536 as an exact 16-digit fraction = rem * 5^16, zero-padded, trailing zeros trimmed.
  const frac = (rem * FIVE_POW_16).toString().padStart(16, "0").replace(/0+$/, "");
  return `${whole}.${frac}`;
}

function numberToDecimalString(n: number): string {
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid NOCK amount: ${n}`);
  // Avoid scientific notation for small/large values; nockToNicks re-validates the shape.
  return n.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
}

// ---------------------------------------------------------------------------------------------------
// CLI command builder (display/copy-only — there is NO web protocol to a local CLI wallet)
// ---------------------------------------------------------------------------------------------------

export type CreateTxArgs = {
  address: string; // recipient base58 (the project's NOCK_DONATION_ADDRESS at call sites)
  nock: number | string; // gift AMOUNT in NOCK (converted to nicks)
  feeNicks: number | string; // fee in NICKS (fees are nick-denominated; the CLI docs use e.g. --fee 10)
  names?: string; // input-note selector the donor fills in from `nockchain-wallet list-notes`
};

// Placeholder the donor must replace with their own input-note names. Kept free of shell metacharacters.
export const CREATE_TX_NAMES_PLACEHOLDER = "[first1 last1]";

// Validate + normalize a whole-nicks integer (fees are nick-denominated; no fractional nicks exist).
function toWholeNicks(value: number | string): string {
  const s = typeof value === "number" ? numberToDecimalString(value) : value.trim();
  if (!/^\d+$/.test(s)) throw new Error(`Fee must be a whole number of nicks: ${JSON.stringify(value)}`);
  return BigInt(s).toString(); // normalize (strip leading zeros)
}

// Returns the EXACT command a donor pastes into their terminal. The recipient address is validated as
// strict base58 first (rejecting all shell metacharacters); amount + fee are coerced through bigint so
// only digits reach the string. Throws on a placeholder/invalid address rather than emitting a bad cmd.
export function buildCreateTxCommand(args: CreateTxArgs): string {
  const { address } = args;
  if (isPlaceholder(address) || !isValidNockAddress(address)) {
    throw new Error("Refusing to build create-tx for a missing/invalid Nockchain address");
  }
  const names = args.names && args.names.trim() ? args.names.trim() : CREATE_TX_NAMES_PLACEHOLDER;
  // Allowlist the note-name grammar (admits the "[first1 last1]" shape). The value is embedded in a shell
  // string the donor pastes, so we reject anything outside [ ] / alphanumerics / space / _ - — a denylist
  // can miss chars that stay special inside double quotes (e.g. bash history-expansion on `!`, plus \r/tab).
  if (!/^[\][A-Za-z0-9 _-]+$/.test(names)) {
    throw new Error("Invalid --names value (allowed: letters, digits, space, [ ] _ -)");
  }
  const amountNicks = nockToNicks(args.nock).toString();
  const feeNicks = toWholeNicks(args.feeNicks);
  const recipient = `{"kind":"p2pkh","address":"${address}","amount":${amountNicks}}`;
  return [
    "nockchain-wallet create-tx",
    `--names "${names}"`,
    `--recipient '${recipient}'`,
    `--fee ${feeNicks}`
  ].join(" ");
}

// Short display form for an address chip: keeps head + tail, elides the middle.
export function shortNockAddress(address: string, head = 6, tail = 6): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}
