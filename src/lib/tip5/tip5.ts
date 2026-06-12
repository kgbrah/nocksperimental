// Tip5 algebraic sponge hash (Goldilocks, 16-wide state, 7 rounds) — a bit-exact
// port of nockchain crates/nockchain-math/src/tip5/{mod.rs,hash.rs}. The state is
// carried in Montgomery form through the permutation (the S-box lookup acts on the
// Montgomery byte-representation; round constants are montified) exactly as the
// canonical implementation, so outputs match the chain's hashes byte-for-byte.
// Validated against the upstream known-answer vectors in scripts/test-tip5-kat.mjs.

import { LOOKUP_TABLE, ROUND_CONSTANTS, MDS_MATRIX } from "@/lib/tip5/constants";
import { P, badd, bmul, bpow, montify, montReduction } from "@/lib/tip5/field";

const STATE_SIZE = 16;
const RATE = 10;
const NUM_ROUNDS = 7;
const NUM_SPLIT_AND_LOOKUP = 4;
const DIGEST_LENGTH = 5;
const R = 1n << 64n; // 2^64
const R_MOD_P = 4294967295n; // R mod P (== montify(1)); the fixed-sponge capacity fill

const norm = (x: bigint): bigint => ((x % P) + P) % P;

function sboxLayer(state: bigint[]): bigint[] {
  const res = new Array<bigint>(STATE_SIZE);
  for (let i = 0; i < NUM_SPLIT_AND_LOOKUP; i++) {
    // byte-wise lookup over the little-endian bytes of the state element
    const v = state[i];
    let out = 0n;
    for (let k = 0; k < 8; k++) {
      const byte = Number((v >> BigInt(8 * k)) & 0xffn);
      out |= BigInt(LOOKUP_TABLE[byte]) << BigInt(8 * k);
    }
    res[i] = out;
  }
  for (let j = NUM_SPLIT_AND_LOOKUP; j < STATE_SIZE; j++) {
    res[j] = bpow(state[j], 7n); // x^7
  }
  return res;
}

function linearLayer(state: bigint[]): bigint[] {
  const result = new Array<bigint>(STATE_SIZE);
  for (let i = 0; i < STATE_SIZE; i++) {
    let acc = 0n;
    for (let j = 0; j < STATE_SIZE; j++) {
      acc = badd(acc, bmul(BigInt(MDS_MATRIX[i][j]), state[j]));
    }
    result[i] = acc;
  }
  return result;
}

/** The 7-round Tip5 permutation, in place (mod.rs permute). */
export function permute(sponge: bigint[]): void {
  for (let i = 0; i < NUM_ROUNDS; i++) {
    const a = sboxLayer(sponge);
    const b = linearLayer(a);
    for (let j = 0; j < STATE_SIZE; j++) {
      const rCons = (ROUND_CONSTANTS[i * STATE_SIZE + j] * R) % P; // montified round constant
      sponge[j] = badd(rCons, b[j]);
    }
  }
}

/** Fixed-length hash of exactly 10 field elements (hash.rs hash_10). The merkle
 *  fold (hash-ten-cell) is hash10 over the concatenated child digests. */
export function hash10(input: bigint[]): bigint[] {
  if (input.length !== 10) throw new Error(`hash10 expects 10 elements, got ${input.length}`);
  const mont = input.map((x) => montify(norm(x)));
  const sponge = new Array<bigint>(STATE_SIZE).fill(0n);
  for (let i = RATE; i < STATE_SIZE; i++) sponge[i] = R_MOD_P; // fixed capacity
  for (let i = 0; i < RATE; i++) sponge[i] = mont[i];
  permute(sponge);
  const digest: bigint[] = [];
  for (let i = 0; i < DIGEST_LENGTH; i++) digest.push(montReduction(sponge[i]));
  return digest;
}

/** Variable-length sponge hash (hash.rs hash_varlen). */
export function hashVarlen(input: bigint[]): bigint[] {
  const vec = input.map(norm);
  const r = vec.length % RATE;
  vec.push(1n);
  for (let i = 0; i < RATE - r - 1; i++) vec.push(0n);
  const mont = vec.map((x) => montify(x));
  const sponge = new Array<bigint>(STATE_SIZE).fill(0n);
  for (let off = 0; off < mont.length; off += RATE) {
    for (let i = 0; i < RATE; i++) sponge[i] = mont[off + i];
    permute(sponge);
  }
  const digest: bigint[] = [];
  for (let i = 0; i < DIGEST_LENGTH; i++) digest.push(montReduction(sponge[i]));
  return digest;
}

export { DIGEST_LENGTH };
