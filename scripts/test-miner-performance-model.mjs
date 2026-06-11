#!/usr/bin/env node

// Correctness gate for the miner performance model (src/lib/miner-performance-model.ts
// + src/lib/miner-specs.ts). The browser Miner Lab relies on this code to predict
// proof-rate and economics from public GPU specs, so the calibration must stay
// anchored to our real measurements and the regime/economics logic must hold.

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// Recursive transpile-loader: the model imports ./miner-specs, so resolve relative
// TS imports on the fly (same idea as test-pocgames-verifier's loader, extended).
const cache = {};
function loadTs(absPath) {
  if (cache[absPath]) return cache[absPath];
  const out = ts.transpileModule(readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  cache[absPath] = mod.exports;
  const dir = path.dirname(absPath);
  const localRequire = (spec) => (spec.startsWith(".") ? loadTs(path.resolve(dir, spec) + ".ts") : require(spec));
  new Function("exports", "require", "module", "__filename", "__dirname", out)(mod.exports, localRequire, mod, absPath, dir);
  return mod.exports;
}

let pass = 0;
const assert = (cond, label) => {
  if (!cond) throw new Error(`assertion failed: ${label}`);
  console.log("  ✓ " + label);
  pass += 1;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}

function main() {
  const root = process.cwd();
  const m = loadTs(path.join(root, "src/lib/miner-performance-model.ts"));
  const s = loadTs(path.join(root, "src/lib/miner-specs.ts"));

  // 1) Calibration is anchored to the real measurements.
  console.log("1. calibration fit");
  assert(m.CURRENT_FIT.n === s.MEASURED_BENCHMARKS.length, "fit uses every measured point");
  assert(m.CURRENT_FIT.r2 > 0.95, `current-regime fit R² > 0.95 (got ${m.CURRENT_FIT.r2.toFixed(4)})`);
  for (const b of s.MEASURED_BENCHMARKS) {
    const spec = s.gpuByModel(b.model);
    assert(spec, `measured GPU ${b.model} exists in the catalog`);
    const pred = m.currentProofsPerSec(spec);
    // every measured point predicts within ~2.5σ of the fit residual.
    assert(near(pred, b.proofsPerSec, 2.5 * m.CURRENT_FIT.residualStd + 1),
      `${b.model} predicts ${pred.toFixed(1)} ≈ measured ${b.proofsPerSec} (within band)`);
  }

  // 2) Monotonicity: more compute / more GPUs => more proof-rate.
  console.log("2. monotonicity");
  const r4090 = m.predictRate({ spec: s.gpuByModel("RTX 4090"), regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 1 }).totalRate;
  const r4060 = m.predictRate({ spec: s.gpuByModel("RTX 4060 Ti"), regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 1 }).totalRate;
  assert(r4090 > r4060, "a 4090 out-proofs a 4060 Ti (current regime)");
  const r1 = m.predictRate({ spec: s.gpuByModel("RTX 4090"), regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 1 }).totalRate;
  const r4 = m.predictRate({ spec: s.gpuByModel("RTX 4090"), regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 4 }).totalRate;
  assert(r4 > r1 * 3.5 && r4 <= r1 * 4, "4 GPUs scale near-linearly (>3.5x, <=4x of one)");

  // 3) Setting multipliers behave.
  console.log("3. settings");
  assert(m.threadsMultiplier(4, s.gpuByModel("RTX 4090")) > m.threadsMultiplier(1, s.gpuByModel("RTX 4090")),
    "more threads-per-card beats a single thread (up to the optimum)");
  const gpuRate = m.predictRate({ spec: s.gpuByModel("RTX 4090"), regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 1 }).totalRate;
  const hybridRate = m.predictRate({ spec: s.gpuByModel("RTX 4090"), regime: "current", mode: "hybrid", threadsPerCard: 4, gpuCount: 1 }).totalRate;
  assert(hybridRate > gpuRate && near(hybridRate / gpuRate, 1.1, 0.001), "hybrid mode is ~+10% over pure gpu");
  assert(m.gpuCountMultiplier(1) === 1 && m.gpuCountMultiplier(2) < 2 && m.gpuCountMultiplier(2) > 1.9,
    "multi-GPU scaling is near-linear with a small coordination cost");

  // 4) Regime re-ranking: matmul PoUW promotes tensor-heavy datacenter silicon.
  console.log("4. regime re-ranking (the Fork A story)");
  const currentRank = m.rankCatalog("current").map((r) => r.spec.model);
  const forkARank = m.rankCatalog("forkA").map((r) => r.spec.model);
  const h100CurrentPos = currentRank.indexOf("H100 80GB");
  const h100ForkAPos = forkARank.indexOf("H100 80GB");
  assert(h100ForkAPos < h100CurrentPos, `H100 ranks higher under Fork A (${h100ForkAPos} < ${h100CurrentPos})`);
  const a100CurrentPos = currentRank.indexOf("A100 80GB");
  const a100ForkAPos = forkARank.indexOf("A100 80GB");
  assert(a100ForkAPos < a100CurrentPos, "A100 ranks higher under Fork A (tensor-bound work)");
  // the reference card keeps its rate across regimes (anchoring) — clean toggle.
  const ref = s.gpuByModel("RTX 4090");
  assert(near(m.currentProofsPerSec(ref), m.forkAProofsPerSec(ref), 0.01), "reference card (4090) is regime-anchored");

  // 4b) Fork A is calibrated on REAL measured GEMM throughput.
  console.log("4b. matmul calibration");
  assert(m.matmulCalibration.measuredCount === s.MEASURED_MATMUL.length, "uses every measured GEMM point");
  // measured cards use their measurement directly.
  for (const mm of s.MEASURED_MATMUL) {
    const spec = s.gpuByModel(mm.model);
    assert(spec && m.isMatmulMeasured(spec), `${mm.model} is flagged matmul-measured`);
    assert(near(m.effectiveMatmulTflops(spec), mm.tflops, 0.01), `${mm.model} effective matmul = measured ${mm.tflops}`);
  }
  // the consumer/full-rate split the measurements revealed: consumer Ampere runs
  // tensor at far below the full-rate datacenter parts.
  assert(m.matmulCalibration.specToRealFactors.Ampere < m.matmulCalibration.specToRealFactors.fullrate,
    "consumer Ampere spec→real factor < full-rate datacenter factor (half-rate tensor)");
  assert(m.matmulCalibration.specToRealFactors.Ampere < m.matmulCalibration.specToRealFactors.Ada,
    "consumer Ampere underperforms consumer Ada at matmul");
  // A workstation Ampere part (A6000) is NOT full-rate — it inherits the half-rate
  // consumer factor, so it must NOT be modeled near the A100.
  const a6000 = s.gpuByModel("RTX A6000");
  const a100 = s.gpuByModel("A100 80GB");
  assert(m.effectiveMatmulTflops(a6000) < m.effectiveMatmulTflops(a100) * 0.5,
    "workstation A6000 (half-rate) is far below the full-rate A100 at matmul");
  // the data-backed re-ranking: the A100 leaps up under Fork A on its REAL number.
  assert(forkARank.indexOf("A100 80GB") < currentRank.indexOf("A100 80GB"), "A100 climbs under Fork A (measured matmul)");

  // 5) A measured Fork A card gets a tighter band than a modeled one; both regimes
  //    differ in band per their evidence.
  console.log("5. honesty band");
  const cur = m.predictRate({ spec: ref, regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 1 });
  const faMeasured = m.predictRate({ spec: ref, regime: "forkA", mode: "gpu", threadsPerCard: 4, gpuCount: 1 });
  const modeledCard = s.gpuCatalog.find((g) => !m.isMatmulMeasured(g) && g.tensorFp16Tflops > 0);
  const faModeled = m.predictRate({ spec: modeledCard, regime: "forkA", mode: "gpu", threadsPerCard: 4, gpuCount: 1 });
  // band as a fraction of the rate: a measured card is tighter than a modeled one.
  assert(faMeasured.bandPs / faMeasured.totalRate < faModeled.bandPs / faModeled.totalRate,
    "a GEMM-measured Fork A card has a tighter relative band than a modeled one");

  // 6) Economics: signs, value metric, break-even.
  console.log("6. economics");
  const rate = cur.totalRate;
  const rented = m.computeEconomics({
    rate, spec: ref, gpuCount: 1, regime: "current", params: m.REGIME_DEFAULTS.current,
    nockPriceUsd: 0.5, economics: "rented", rentUsdPerHrPerCard: 0.4, electricityUsdPerKwh: 0.12,
  });
  assert(near(rented.profitUsdPerDay, rented.revenueUsdPerDay - rented.costUsdPerDay, 1e-6), "rented profit = revenue - rent");
  assert(near(rented.costUsdPerDay, 0.4 * 24, 1e-6), "rented cost = rent/hr * 24");
  assert(rented.psPerDollar > 0, "p/s-per-dollar is positive");
  const owned = m.computeEconomics({
    rate, spec: ref, gpuCount: 1, regime: "current", params: m.REGIME_DEFAULTS.current,
    nockPriceUsd: 5, economics: "owned", rentUsdPerHrPerCard: 0, electricityUsdPerKwh: 0.12, hardwareUsd: 1600,
  });
  const expectedPower = (ref.tdpWatts / 1000) * 24 * 0.12;
  assert(near(owned.costUsdPerDay, expectedPower, 1e-6), "owned cost = TDP * hours * $/kWh");
  if (owned.profitUsdPerDay > 0) assert(owned.breakevenDays !== null && owned.breakevenDays > 0, "break-even days positive when profitable");
  // Fork A dilution shrinks a solo miner's share vs the same rate under current.
  const shareCurrent = m.computeEconomics({ rate, spec: ref, gpuCount: 1, regime: "current", params: m.REGIME_DEFAULTS.current, nockPriceUsd: 1, economics: "rented", rentUsdPerHrPerCard: 0.4, electricityUsdPerKwh: 0.12 }).networkShare;
  const shareForkA = m.computeEconomics({ rate, spec: ref, gpuCount: 1, regime: "forkA", params: m.REGIME_DEFAULTS.forkA, nockPriceUsd: 1, economics: "rented", rentUsdPerHrPerCard: 0.4, electricityUsdPerKwh: 0.12 }).networkShare;
  assert(shareForkA < shareCurrent, "Fork A dilution lowers a solo miner's network share");

  // 7) VRAM gate flags cards below the proving floor.
  console.log("7. vram gate");
  const lowVram = s.gpuCatalog.find((g) => g.vramGB < s.VRAM_PROVING_FLOOR_GB);
  if (lowVram) {
    assert(m.predictRate({ spec: lowVram, regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 1 }).vramGated,
      `${lowVram.model} (<${s.VRAM_PROVING_FLOOR_GB}GB) is flagged vram-gated`);
  }
  assert(!m.predictRate({ spec: ref, regime: "current", mode: "gpu", threadsPerCard: 4, gpuCount: 1 }).vramGated, "24GB 4090 is not vram-gated");

  // 8) Dataset/provenance consistency: the JSON record matches the model's points.
  console.log("8. dataset consistency");
  const ds = JSON.parse(readFileSync(path.join(root, "src/data/gpu-benchmarks.json"), "utf8"));
  assert(Array.isArray(ds.currentRegime) && ds.currentRegime.length === s.MEASURED_BENCHMARKS.length,
    "gpu-benchmarks.json currentRegime count matches MEASURED_BENCHMARKS");
  for (const b of s.MEASURED_BENCHMARKS) {
    const row = ds.currentRegime.find((r) => r.model === b.model);
    assert(row && near(row.proofsPerSec, b.proofsPerSec, 0.001), `dataset matches model for ${b.model}`);
  }

  console.log(`\ntest-miner-performance-model: all ${pass} assertions passed`);
}
