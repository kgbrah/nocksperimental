// Goldilocks field arithmetic (p = 2^64 - 2^32 + 1), a bit-exact port of
// nockchain crates/nockchain-math/src/belt.rs. All values are field elements in
// [0, P) held as bigint; intermediate products use 128-bit-wide bigint exactly
// as the Rust uses u128. This is the substrate the Tip5 permutation runs on.

export const P = 0xffffffff00000001n; // Goldilocks prime (== PRIME_128 in belt.rs)
const R2 = 0xfffffffe00000001n; // R^2 mod P, for montify
const MASK64 = (1n << 64n) - 1n;
const MASK32 = (1n << 32n) - 1n;

/** Montgomery reduction of a 128-bit value (belt.rs mont_reduction). */
export function montReduction(a: bigint): bigint {
  const x1 = (a >> 32n) & MASK32;
  const x2 = a >> 64n;
  const x0 = a & MASK32;
  const c = (x0 + x1) << 32n;
  const f = c >> 64n;
  const d = c - (x1 + f * P);
  return x2 >= d ? x2 - d : x2 + P - d;
}

/** Montgomery multiply (belt.rs montiply): both args in Montgomery form. */
export function montMul(a: bigint, b: bigint): bigint {
  return montReduction(a * b);
}

/** Bring a field element into Montgomery form (belt.rs montify). */
export function montify(a: bigint): bigint {
  return montReduction(a * R2);
}

/** Goldilocks add (belt.rs badd). */
export function badd(a: bigint, b: bigint): bigint {
  const bb = (P - b) & MASK64;
  const r = (a - bb) & MASK64;
  const adj = a < bb ? 0xffffffffn : 0n; // 0u32.wrapping_sub(borrow)
  return (r - adj) & MASK64;
}

/** Goldilocks subtract (belt.rs bsub). */
export function bsub(a: bigint, b: bigint): bigint {
  const r = (a - b) & MASK64;
  const adj = a < b ? 0xffffffffn : 0n;
  return (r - adj) & MASK64;
}

/** Reduce a 159-bit number presented as (low:u64, mid:u32, high:u64) — belt.rs reduce_159. */
function reduce159(low: bigint, mid: bigint, high: bigint): bigint {
  let low2 = (low - high) & MASK64;
  if (low < high) low2 = (low2 + P) & MASK64;
  let product = (mid << 32n) & MASK64;
  product = (product - (product >> 32n)) & MASK64;
  let result = low2 + product;
  const carry = result > MASK64;
  result &= MASK64;
  if (carry) result = (result - P) & MASK64;
  if (result >= P) result -= P;
  return result;
}

/** Reduce a 128-bit product mod P (belt.rs reduce). */
export function reduce(n: bigint): bigint {
  return reduce159(n & MASK64, (n >> 64n) & MASK32, (n >> 96n) & MASK64);
}

/** Normal (non-Montgomery) Goldilocks multiply (belt.rs bmul). */
export function bmul(a: bigint, b: bigint): bigint {
  return reduce(a * b);
}

/** Modular exponentiation via reduce-multiply. Exponentiation is order-independent,
 *  so this equals belt.rs bpow for the same (a, e). Used for the x^7 S-box. */
export function bpow(a: bigint, e: bigint): bigint {
  if (e === 0n) return 1n;
  let result = 1n;
  let base = a;
  let exp = e;
  while (exp > 0n) {
    if (exp & 1n) result = bmul(result, base);
    base = bmul(base, base);
    exp >>= 1n;
  }
  return result;
}
