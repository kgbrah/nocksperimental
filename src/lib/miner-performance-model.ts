// Miner performance predictor. Pure + deterministic so the browser tool and the
// Node test shard compute identical numbers. Two PoW regimes:
//
//   "current"  — today's zkPoW GPU proving. CALIBRATED: a least-squares fit over
//                our 7 real goldenminer measurements (MEASURED_BENCHMARKS), so a
//                prediction is anchored to data, not a spec-sheet guess. We expose
//                the fit's residual band + R² for honesty.
//   "forkA"    — the upcoming "matmul PoUW" (~Jun 2026). MODELED, low-confidence:
//                mining work becomes matrix-multiply AI work, so proof-rate tracks
//                TENSOR throughput, and datacenters merge-mining AI dilute solo
//                proofpower. Anchored to the 4090's current rate for continuity so
//                the regime toggle shows how a card's RANK shifts, not magnitudes.
//
// Nothing here hard-codes the emission split or activation-era issuance (roadmap
// risk #4): network size, daily emission, and the dilution factor live in REGIME
// constants and are overridable from the UI, so the cutover is a one-place edit.

import {
  ARCH_EFFICIENCY,
  gpuByModel,
  gpuCatalog,
  MEASURED_BENCHMARKS,
  VRAM_PROVING_FLOOR_GB,
  type GpuSpec,
} from "./miner-specs";

export type Regime = "current" | "forkA";
export type MinerMode = "gpu" | "hybrid" | "auto";
export type EconomicsMode = "rented" | "owned";

// ---- current-regime feature vector ------------------------------------------
// [intercept, FP32·archEfficiency, bandwidth/1000]. Arch efficiency keeps a
// high-bandwidth Ampere card from being over-credited vs a leaner Ada card.
function currentFeatures(spec: GpuSpec): [number, number, number] {
  return [1, spec.fp32Tflops * ARCH_EFFICIENCY[spec.arch], spec.memBandwidthGBs / 1000];
}

// ---- tiny linear algebra: solve a 3x3 system (Gaussian elimination) ----------
function solve3x3(A: number[][], b: number[]): [number, number, number] {
  // augment + eliminate with partial pivoting
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col += 1) {
    let piv = col;
    for (let r = col + 1; r < 3; r += 1) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    [m[col], m[piv]] = [m[piv], m[col]];
    const d = m[col][col] || 1e-9;
    for (let r = 0; r < 3; r += 1) {
      if (r === col) continue;
      const f = m[r][col] / d;
      for (let c = col; c < 4; c += 1) m[r][c] -= f * m[col][c];
    }
  }
  return [m[0][3] / (m[0][0] || 1e-9), m[1][3] / (m[1][1] || 1e-9), m[2][3] / (m[2][2] || 1e-9)];
}

// ---- calibrate the current-regime model from the real measurements -----------
type Fit = { w: [number, number, number]; residualStd: number; r2: number; n: number };

function fitCurrentRegime(): Fit {
  const rows = MEASURED_BENCHMARKS.map((b) => {
    const spec = gpuByModel(b.model);
    return spec ? { x: currentFeatures(spec), y: b.proofsPerSec } : null;
  }).filter((r): r is { x: [number, number, number]; y: number } => r !== null);

  // normal equations: (XᵀX) w = Xᵀy
  const XtX = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const Xty = [0, 0, 0];
  for (const { x, y } of rows) {
    for (let i = 0; i < 3; i += 1) {
      Xty[i] += x[i] * y;
      for (let j = 0; j < 3; j += 1) XtX[i][j] += x[i] * x[j];
    }
  }
  const w = solve3x3(XtX, Xty);

  // residual std + R² over the calibration points
  const yMean = rows.reduce((s, r) => s + r.y, 0) / rows.length;
  let ssRes = 0;
  let ssTot = 0;
  for (const { x, y } of rows) {
    const yhat = w[0] * x[0] + w[1] * x[1] + w[2] * x[2];
    ssRes += (y - yhat) ** 2;
    ssTot += (y - yMean) ** 2;
  }
  return {
    w,
    residualStd: Math.sqrt(ssRes / Math.max(1, rows.length - 3)),
    r2: ssTot > 0 ? 1 - ssRes / ssTot : 1,
    n: rows.length,
  };
}

export const CURRENT_FIT: Fit = fitCurrentRegime();

/** Calibration provenance for the UI's methodology panel. */
export const calibration = {
  measuredCount: CURRENT_FIT.n,
  r2: CURRENT_FIT.r2,
  residualStdPs: CURRENT_FIT.residualStd,
};

// ---- regime constants (overridable from the UI) ------------------------------
// Network size + daily emission are unknowable from the browser, so they default
// to a documented snapshot and are exposed as inputs. Fork A adds a dilution
// factor: datacenters merge-mining AI inflate network proofpower, shrinking a
// solo miner's share.
export type RegimeParams = {
  /** total network proof-rate (p/s-equivalent) used to compute your share. */
  networkRate: number;
  /** NOCK minted per day to miners (snapshot; changes at emission steps). */
  dailyEmissionNock: number;
  /** Fork A only: solo proofpower share multiplier after datacenter dilution. */
  dilution: number;
};

export const REGIME_DEFAULTS: Record<Regime, RegimeParams> = {
  // Placeholder network/emission snapshot — the UI lets miners override both.
  current: { networkRate: 2_000_000, dailyEmissionNock: 100_000, dilution: 1 },
  forkA: { networkRate: 2_000_000, dailyEmissionNock: 100_000, dilution: 0.4 },
};

// ---- single-card base rate per regime ----------------------------------------
const REFERENCE_MODEL = "RTX 4090";

/** Current-regime proof-rate (p/s) for one card, from the calibrated fit. */
export function currentProofsPerSec(spec: GpuSpec): number {
  const f = currentFeatures(spec);
  return Math.max(0, CURRENT_FIT.w[0] * f[0] + CURRENT_FIT.w[1] * f[1] + CURRENT_FIT.w[2] * f[2]);
}

/**
 * Fork A "matmul PoUW" proof-rate-equivalent for one card. Proof-rate tracks
 * tensor (FP16) throughput; anchored so the reference card keeps its current
 * rate, which makes the regime toggle a clean re-ranking rather than a unit
 * change. Modeled — see the low-confidence label in the UI.
 */
export function forkAProofsPerSec(spec: GpuSpec): number {
  const ref = gpuByModel(REFERENCE_MODEL);
  if (!ref) return spec.tensorFp16Tflops;
  const anchor = currentProofsPerSec(ref) / ref.tensorFp16Tflops;
  return spec.tensorFp16Tflops * anchor;
}

// ---- miner-setting multipliers (shared across regimes) -----------------------
const MODE_MULTIPLIER: Record<MinerMode, number> = { gpu: 1.0, hybrid: 1.1, auto: 1.05 };

/** threads-per-card effect, relative to the auto-tuned optimum, gated by VRAM. */
export function threadsMultiplier(threadsPerCard: number, spec: GpuSpec): number {
  const t = Math.max(1, Math.round(threadsPerCard));
  // concave ramp: 1 thread underutilizes; ~4 is the practical optimum.
  const ramp = Math.min(1, 0.7 + 0.3 * Math.min(1, (t - 1) / 3));
  // VRAM penalty: each ~6 GB of VRAM comfortably backs one extra thread; beyond
  // that the prover thrashes/falls back, costing throughput.
  const supportedThreads = Math.max(1, Math.floor(spec.vramGB / 6));
  const overcommit = t > supportedThreads ? 1 - Math.min(0.4, 0.12 * (t - supportedThreads)) : 1;
  return ramp * overcommit;
}

/** near-linear multi-GPU scaling with a small per-extra-card coordination cost. */
export function gpuCountMultiplier(gpuCount: number): number {
  const n = Math.max(1, Math.round(gpuCount));
  return n * (1 - 0.01 * (n - 1));
}

export type PredictInput = {
  spec: GpuSpec;
  regime: Regime;
  mode: MinerMode;
  threadsPerCard: number;
  gpuCount: number;
};

export type RatePrediction = {
  /** per-card base rate before settings (p/s-equivalent). */
  baseRatePerCard: number;
  /** total rate across all cards after mode/threads/count. */
  totalRate: number;
  /** ± band (p/s) from the current-regime fit residual; widened for Fork A. */
  bandPs: number;
  /** true when VRAM is below the proving floor (the card may not prove at all). */
  vramGated: boolean;
};

export function predictRate(input: PredictInput): RatePrediction {
  const { spec, regime, mode, threadsPerCard, gpuCount } = input;
  const base = regime === "current" ? currentProofsPerSec(spec) : forkAProofsPerSec(spec);
  const settings = MODE_MULTIPLIER[mode] * threadsMultiplier(threadsPerCard, spec);
  const perCard = base * settings;
  const totalRate = perCard * gpuCountMultiplier(gpuCount);
  // Fork A is modeled, so its band is deliberately wider than the calibrated fit's.
  const band = regime === "current" ? CURRENT_FIT.residualStd : Math.max(CURRENT_FIT.residualStd, base * 0.35);
  return {
    baseRatePerCard: base,
    totalRate,
    bandPs: band * gpuCountMultiplier(gpuCount),
    vramGated: spec.vramGB < VRAM_PROVING_FLOOR_GB,
  };
}

// ---- economics ---------------------------------------------------------------
export type EconomicsInput = {
  rate: number; // total proof-rate from predictRate
  spec: GpuSpec;
  gpuCount: number;
  regime: Regime;
  params: RegimeParams;
  nockPriceUsd: number;
  economics: EconomicsMode;
  rentUsdPerHrPerCard: number; // rented
  electricityUsdPerKwh: number; // owned
  hardwareUsd?: number; // owned: total upfront, for break-even
};

export type EconomicsResult = {
  networkShare: number;
  nockPerDay: number;
  revenueUsdPerDay: number;
  costUsdPerDay: number;
  profitUsdPerDay: number;
  /** rented: NOCK proofs per US dollar of rent — the calibrated, robust value metric. */
  psPerDollar: number;
  /** owned only: days to recoup hardwareUsd at the current profit rate (null if never). */
  breakevenDays: number | null;
};

export function computeEconomics(e: EconomicsInput): EconomicsResult {
  const effectiveRate = e.rate * (e.regime === "forkA" ? e.params.dilution : 1);
  const networkShare = effectiveRate / (effectiveRate + e.params.networkRate);
  const nockPerDay = networkShare * e.params.dailyEmissionNock;
  const revenueUsdPerDay = nockPerDay * e.nockPriceUsd;

  let costUsdPerDay: number;
  if (e.economics === "rented") {
    costUsdPerDay = e.rentUsdPerHrPerCard * 24 * Math.max(1, e.gpuCount);
  } else {
    const kw = (e.spec.tdpWatts * Math.max(1, e.gpuCount)) / 1000;
    costUsdPerDay = kw * 24 * e.electricityUsdPerKwh;
  }

  const profitUsdPerDay = revenueUsdPerDay - costUsdPerDay;
  const rentPerDay = e.rentUsdPerHrPerCard * 24 * Math.max(1, e.gpuCount);
  const psPerDollar = rentPerDay > 0 ? e.rate / rentPerDay : 0;

  let breakevenDays: number | null = null;
  if (e.economics === "owned" && e.hardwareUsd && e.hardwareUsd > 0) {
    breakevenDays = profitUsdPerDay > 0 ? e.hardwareUsd / profitUsdPerDay : null;
  }

  return {
    networkShare,
    nockPerDay,
    revenueUsdPerDay,
    costUsdPerDay,
    profitUsdPerDay,
    psPerDollar,
    breakevenDays,
  };
}

/** Convenience: rank the whole catalog by predicted rate for a regime + settings. */
export function rankCatalog(
  regime: Regime,
  mode: MinerMode = "gpu",
  threadsPerCard = 4,
  gpuCount = 1
): { spec: GpuSpec; totalRate: number }[] {
  return gpuCatalog
    .map((spec) => ({ spec, totalRate: predictRate({ spec, regime, mode, threadsPerCard, gpuCount }).totalRate }))
    .sort((a, b) => b.totalRate - a.totalRate);
}
