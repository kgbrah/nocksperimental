// POC Games — provably-fair game metadata + an in-browser forensic verifier.
//
// This module is the browser-side twin of the standalone reference verifiers in the
// forfeit-flip repo (verifier/forfeit-flip-verifier.mjs, forfeit-dice-verifier.mjs).
// The /pocgames client components import these functions so a visitor can RECOMPUTE a
// round's outcome from public data alone — the whole point of the forensic-proof system
// is that a dispute is settled by recomputation, never by trusting the house.
//
// SHA-256 is implemented here synchronously (no WebCrypto, no Node crypto) so the
// distribution proof can recompute thousands of rolls instantly in the browser and so the
// logic is identical across server, browser, and the Node test shard. It is checked against
// known test vectors AND the committed fixture commitments in scripts/test-pocgames-verifier.mjs.
//
// HASH NOTE (honest, mirrors the dossiers): SHA-256 here keeps the verifier trivially
// cross-runtime and self-checking. Mainnet on-chain settlement would switch the kernel +
// verifier to tip5 (Nockchain's native hash) so the kernel commitment and the on-chain %hax
// hashlock are the same object; the chi-square proof is over the published rolls and is
// independent of the hash choice.

// ---- synchronous SHA-256 (dependency-free) ----------------------------------

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(message: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLength = message.length * 8;
  const withOne = message.length + 1;
  const padZeros = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + padZeros + 8;
  const buffer = new Uint8Array(total);
  buffer.set(message);
  buffer[message.length] = 0x80;
  const view = new DataView(buffer.buffer);
  // 64-bit big-endian length; messages here are far below 2^32 bytes so the high word is 0.
  view.setUint32(total - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(total - 4, bitLength >>> 0, false);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0 >>> 0, false);
  outView.setUint32(4, h1 >>> 0, false);
  outView.setUint32(8, h2 >>> 0, false);
  outView.setUint32(12, h3 >>> 0, false);
  outView.setUint32(16, h4 >>> 0, false);
  outView.setUint32(20, h5 >>> 0, false);
  outView.setUint32(24, h6 >>> 0, false);
  outView.setUint32(28, h7 >>> 0, false);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`hex string must have even length, got ${hex.length}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/** sha256 over the concatenation of the given hex byte-strings, returned as hex. */
export function hashHex(...hexParts: string[]): string {
  let length = 0;
  const parts = hexParts.map((part) => {
    const bytes = hexToBytes(part);
    length += bytes.length;
    return bytes;
  });
  const joined = new Uint8Array(length);
  let cursor = 0;
  for (const part of parts) {
    joined.set(part, cursor);
    cursor += part.length;
  }
  return bytesToHex(sha256Bytes(joined));
}

/** commitment to a seed: exactly what the kernel's peek surface is allowed to expose. */
export function commit(seedHex: string): string {
  return hashHex(seedHex);
}

function nonceHex(nonce: number): string {
  const buffer = new Uint8Array(8);
  new DataView(buffer.buffer).setBigUint64(0, BigInt(nonce), false);
  return bytesToHex(buffer);
}

// ---- forfeit flip ------------------------------------------------------------

export type FlipRound = {
  nonce: number;
  commitHouse: string;
  commitClient: string;
  serverSeed: string;
  clientSeed: string;
  declaredWinner?: "house" | "player";
};

/** outcome of a flip round: 0 = house wins, 1 = player wins. */
export function flipOutcome({
  serverSeed,
  clientSeed,
  nonce
}: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}): 0 | 1 {
  const digest = hashHex(serverSeed, clientSeed, nonceHex(nonce));
  return (parseInt(digest.slice(-1), 16) & 1) as 0 | 1;
}

export const flipWinnerOf = (round: FlipRound) =>
  flipOutcome(round) === 1 ? "player" : "house";

export type FlipVerification = {
  verified: boolean;
  recomputedWinner: "house" | "player";
  checks: {
    houseCommitBindsSeed: boolean;
    playerCommitBindsSeed: boolean;
    declaredWinnerCorrect: boolean;
  };
};

/** verify a published flip round from public data alone. */
export function verifyFlipRound(round: FlipRound): FlipVerification {
  const recomputedWinner = flipWinnerOf(round);
  const checks = {
    houseCommitBindsSeed: commit(round.serverSeed) === round.commitHouse,
    playerCommitBindsSeed: commit(round.clientSeed) === round.commitClient,
    declaredWinnerCorrect:
      round.declaredWinner === undefined || round.declaredWinner === recomputedWinner
  };
  return {
    verified: Object.values(checks).every(Boolean),
    recomputedWinner,
    checks
  };
}

/** build a fair flip round (what an honest kernel run produces). */
export function playFairFlipRound(input: {
  nonce: number;
  serverSeed?: string;
  clientSeed?: string;
}): Required<FlipRound> {
  const serverSeed = input.serverSeed ?? randomSeedHex();
  const clientSeed = input.clientSeed ?? randomSeedHex();
  const base: FlipRound = {
    nonce: input.nonce,
    commitHouse: commit(serverSeed),
    commitClient: commit(clientSeed),
    serverSeed,
    clientSeed
  };
  return { ...base, declaredWinner: flipWinnerOf(base) };
}

// ---- forfeit dice ------------------------------------------------------------

export const DICE_LINE = 5000;
export const DICE_MODULUS = 10000;
// chi-square critical value, df=9, p=0.001 — a strict significance level so honest
// sampling variation never false-flags but a real bias (chi2 in the tens-to-hundreds)
// is caught cleanly.
export const CHI2_CRIT_DF9 = 27.877;

const DICE_MODULUS_BIG = BigInt(DICE_MODULUS);
// largest multiple of MODULUS below 2^256 — the rejection-sampling ceiling that removes
// the modulo bias a naive `mod 10000` would introduce.
// 2^256 without BigInt literal syntax (the project targets ES2017; only the `n`
// literal needs ES2020, the BigInt type/operators are available via the esnext lib).
const TWO_POW_256 = BigInt(2) ** BigInt(256);
const DICE_LIMIT = (TWO_POW_256 / DICE_MODULUS_BIG) * DICE_MODULUS_BIG;

function bigToHex32(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

export type DiceRound = {
  nonce: number;
  commitHouse: string;
  commitClient: string;
  serverSeed: string;
  clientSeed: string;
  roll?: number;
  rejectionIndex?: number;
  declaredWinner?: "house" | "player";
};

/** recompute the roll + rejection-index from the two seeds + nonce. */
export function diceRollFrom({
  serverSeed,
  clientSeed,
  nonce
}: {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}): { roll: number; rejectionIndex: number } {
  let h = BigInt(`0x${hashHex(serverSeed, clientSeed, nonceHex(nonce))}`);
  let rejectionIndex = 0;
  while (h >= DICE_LIMIT) {
    h = BigInt(`0x${hashHex(bigToHex32(h), nonceHex(rejectionIndex))}`);
    rejectionIndex += 1;
  }
  return { roll: Number(h % DICE_MODULUS_BIG), rejectionIndex };
}

export const diceWinnerOf = (round: DiceRound) =>
  diceRollFrom(round).roll >= DICE_LINE ? "player" : "house";

export type DiceVerification = {
  verified: boolean;
  recomputedRoll: number;
  recomputedWinner: "house" | "player";
  checks: {
    houseCommitBindsSeed: boolean;
    playerCommitBindsSeed: boolean;
    rollRecomputes: boolean;
    rejectionIndexRecomputes: boolean;
    declaredWinnerCorrect: boolean;
  };
};

/** verify a published dice round from public data alone. */
export function verifyDiceRound(round: DiceRound): DiceVerification {
  const { roll, rejectionIndex } = diceRollFrom(round);
  const recomputedWinner = roll >= DICE_LINE ? "player" : "house";
  const checks = {
    houseCommitBindsSeed: commit(round.serverSeed) === round.commitHouse,
    playerCommitBindsSeed: commit(round.clientSeed) === round.commitClient,
    rollRecomputes: round.roll === undefined || round.roll === roll,
    rejectionIndexRecomputes:
      round.rejectionIndex === undefined || round.rejectionIndex === rejectionIndex,
    declaredWinnerCorrect:
      round.declaredWinner === undefined || round.declaredWinner === recomputedWinner
  };
  return {
    verified: Object.values(checks).every(Boolean),
    recomputedRoll: roll,
    recomputedWinner,
    checks
  };
}

/** build a fair dice round. */
export function playFairDiceRound(input: {
  nonce: number;
  serverSeed?: string;
  clientSeed?: string;
}): Required<DiceRound> {
  const serverSeed = input.serverSeed ?? randomSeedHex();
  const clientSeed = input.clientSeed ?? randomSeedHex();
  const { roll, rejectionIndex } = diceRollFrom({ serverSeed, clientSeed, nonce: input.nonce });
  return {
    nonce: input.nonce,
    commitHouse: commit(serverSeed),
    commitClient: commit(clientSeed),
    serverSeed,
    clientSeed,
    roll,
    rejectionIndex,
    declaredWinner: roll >= DICE_LINE ? "player" : "house"
  };
}

export type ChiSquareResult = {
  chi2: number;
  buckets: number[];
  uniform: boolean;
  criticalValue: number;
};

/** chi-square goodness-of-fit over published rolls: 10 equal buckets, df=9. */
export function chiSquareOverRolls(rolls: number[]): ChiSquareResult {
  const buckets = new Array(10).fill(0) as number[];
  for (const roll of rolls) {
    buckets[Math.min(9, Math.floor(roll / 1000))] += 1;
  }
  const expected = rolls.length / 10;
  const chi2 = buckets.reduce((sum, observed) => sum + (observed - expected) ** 2 / expected, 0);
  return { chi2, buckets, uniform: chi2 < CHI2_CRIT_DF9, criticalValue: CHI2_CRIT_DF9 };
}

// Deterministic seed for reproducible (non-flaky) distribution demos + auditing.
export function deterministicSeed(tag: string, index: number): string {
  const label = `forfeit-dice|${tag}|${index}`;
  let hex = "";
  for (let i = 0; i < label.length; i += 1) {
    hex += label.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hashHex(hex);
}

// ---- seed generation ---------------------------------------------------------

const SEED_BYTES = 32;

/** a fresh 32-byte seed as hex, using the platform CSPRNG (browser or Node). */
export function randomSeedHex(): string {
  const bytes = new Uint8Array(SEED_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// ---- game catalog ------------------------------------------------------------

export type PocGameId = "forfeit-flip" | "forfeit-dice";

export type PocGame = {
  id: PocGameId;
  kind: "flip" | "dice";
  name: string;
  tagline: string;
  /** the public outcome construction, rendered verbatim in the UI. */
  construction: string;
  badgeId: string;
  caseId: string;
  fixtureSlug: string;
  dossier: string;
  line?: number;
  modulus?: number;
};

export const pocGames: PocGame[] = [
  {
    id: "forfeit-flip",
    kind: "flip",
    name: "Forfeit Flip",
    tagline: "Provably-fair coin flip — even money, recomputable by either party.",
    construction: "outcome = lowbit( H(serverSeed ‖ clientSeed ‖ nonce) )  →  0 = house, 1 = player",
    badgeId: "badge-forfeit-flip-verified",
    caseId: "case-forfeit-flip-launch-001",
    fixtureSlug: "forfeit-flip-fairness",
    dossier: "docs/FAIRNESS-DOSSIER.md"
  },
  {
    id: "forfeit-dice",
    kind: "dice",
    name: "Forfeit Dice",
    tagline: "Provably-fair, provably-uniform dice — even money over a fixed line.",
    construction:
      "roll = rejection-sampled H(serverSeed ‖ clientSeed ‖ nonce) mod 10000  →  player wins iff roll ≥ 5000",
    badgeId: "badge-forfeit-dice-verified",
    caseId: "case-forfeit-dice-launch-001",
    fixtureSlug: "forfeit-dice-fairness",
    dossier: "docs/FORFEIT-DICE-DOSSIER.md",
    line: DICE_LINE,
    modulus: DICE_MODULUS
  }
];

export function pocGameById(id: string): PocGame | undefined {
  return pocGames.find((game) => game.id === id);
}
