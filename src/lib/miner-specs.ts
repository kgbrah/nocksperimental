// GPU spec catalog + the real benchmark measurements that calibrate the miner
// performance model. Pure data, no imports — so the Node test shard can
// transpile-load it standalone (same discipline as pocgames.ts).
//
// Two hardware-feature families, because two PoW regimes reward different silicon:
//   - CURRENT zkPoW: GPU proving is FP32 + memory-bandwidth bound (NTT/MSM-ish).
//     Calibrated on MEASURED_BENCHMARKS below (goldenminer GPU prover v0.3.6,
//     mode=gpu, NOCK pool — measured by us on vast.ai this session).
//   - Fork A "matmul PoUW" (~Jun 2026): mining work becomes matrix-multiply AI
//     work, so value shifts to TENSOR throughput (FP16/BF16 TOPS) + VRAM. No real
//     data yet — modeled from spec-sheet tensor numbers, flagged low-confidence.

export type GpuArch = "Ada" | "Ampere" | "Blackwell" | "Hopper";

export type GpuSpec = {
  model: string;
  arch: GpuArch;
  /** dense FP32 (TFLOPS) — the current-regime driver. */
  fp32Tflops: number;
  /** memory bandwidth (GB/s) — secondary current-regime driver (NTT/MSM bound). */
  memBandwidthGBs: number;
  /** dense FP16 tensor w/ FP32 accumulate (TFLOPS) — the matmul-PoUW driver. */
  tensorFp16Tflops: number;
  /** VRAM (GB) — a hard gate for zkVM proving; below the floor you must cut threads. */
  vramGB: number;
  /** CUDA compute capability (>= 8.6 needed for modern zkVM provers). */
  computeCapability: number;
  /** board power (W) — for owned-hardware economics. */
  tdpWatts: number;
  /** datacenter parts can merge-mine AI work — relevant to the PoUW dilution story. */
  datacenter?: boolean;
};

// Spec sheets are approximate (dense tensor FP16/FP32-accumulate); the model
// treats Fork A as a low-confidence estimate, so ~10% spec error is acceptable.
export const gpuCatalog: GpuSpec[] = [
  // --- consumer Ada (RTX 40xx) ---
  { model: "RTX 5090", arch: "Blackwell", fp32Tflops: 104.8, memBandwidthGBs: 1792, tensorFp16Tflops: 450, vramGB: 32, computeCapability: 12.0, tdpWatts: 575 },
  { model: "RTX 4090", arch: "Ada", fp32Tflops: 82.6, memBandwidthGBs: 1008, tensorFp16Tflops: 330, vramGB: 24, computeCapability: 8.9, tdpWatts: 450 },
  { model: "RTX 4080 Super", arch: "Ada", fp32Tflops: 52.2, memBandwidthGBs: 736, tensorFp16Tflops: 208, vramGB: 16, computeCapability: 8.9, tdpWatts: 320 },
  { model: "RTX 4080", arch: "Ada", fp32Tflops: 48.7, memBandwidthGBs: 717, tensorFp16Tflops: 195, vramGB: 16, computeCapability: 8.9, tdpWatts: 320 },
  { model: "RTX 4070 Ti Super", arch: "Ada", fp32Tflops: 44.1, memBandwidthGBs: 672, tensorFp16Tflops: 176, vramGB: 16, computeCapability: 8.9, tdpWatts: 285 },
  { model: "RTX 4070 Ti", arch: "Ada", fp32Tflops: 40.1, memBandwidthGBs: 504, tensorFp16Tflops: 160, vramGB: 12, computeCapability: 8.9, tdpWatts: 285 },
  { model: "RTX 4070 Super", arch: "Ada", fp32Tflops: 35.5, memBandwidthGBs: 504, tensorFp16Tflops: 142, vramGB: 12, computeCapability: 8.9, tdpWatts: 220 },
  { model: "RTX 4070", arch: "Ada", fp32Tflops: 29.1, memBandwidthGBs: 504, tensorFp16Tflops: 117, vramGB: 12, computeCapability: 8.9, tdpWatts: 200 },
  { model: "RTX 4060 Ti", arch: "Ada", fp32Tflops: 22.1, memBandwidthGBs: 288, tensorFp16Tflops: 88, vramGB: 16, computeCapability: 8.9, tdpWatts: 165 },
  { model: "RTX 4060", arch: "Ada", fp32Tflops: 15.1, memBandwidthGBs: 272, tensorFp16Tflops: 61, vramGB: 8, computeCapability: 8.9, tdpWatts: 115 },
  // --- consumer Ampere (RTX 30xx) ---
  { model: "RTX 3090 Ti", arch: "Ampere", fp32Tflops: 40.0, memBandwidthGBs: 1008, tensorFp16Tflops: 160, vramGB: 24, computeCapability: 8.6, tdpWatts: 450 },
  { model: "RTX 3090", arch: "Ampere", fp32Tflops: 35.6, memBandwidthGBs: 936, tensorFp16Tflops: 142, vramGB: 24, computeCapability: 8.6, tdpWatts: 350 },
  { model: "RTX 3080 Ti", arch: "Ampere", fp32Tflops: 34.1, memBandwidthGBs: 912, tensorFp16Tflops: 136, vramGB: 12, computeCapability: 8.6, tdpWatts: 350 },
  { model: "RTX 3080", arch: "Ampere", fp32Tflops: 29.8, memBandwidthGBs: 760, tensorFp16Tflops: 119, vramGB: 10, computeCapability: 8.6, tdpWatts: 320 },
  { model: "RTX 3070 Ti", arch: "Ampere", fp32Tflops: 21.7, memBandwidthGBs: 608, tensorFp16Tflops: 87, vramGB: 8, computeCapability: 8.6, tdpWatts: 290 },
  { model: "RTX 3070", arch: "Ampere", fp32Tflops: 20.3, memBandwidthGBs: 448, tensorFp16Tflops: 81, vramGB: 8, computeCapability: 8.6, tdpWatts: 220 },
  { model: "RTX 3060 Ti", arch: "Ampere", fp32Tflops: 16.2, memBandwidthGBs: 448, tensorFp16Tflops: 65, vramGB: 8, computeCapability: 8.6, tdpWatts: 200 },
  { model: "RTX 3060", arch: "Ampere", fp32Tflops: 12.7, memBandwidthGBs: 360, tensorFp16Tflops: 51, vramGB: 12, computeCapability: 8.6, tdpWatts: 170 },
  // --- workstation / datacenter (can merge-mine AI -> matters for the PoUW story) ---
  { model: "RTX A6000", arch: "Ampere", fp32Tflops: 38.7, memBandwidthGBs: 768, tensorFp16Tflops: 155, vramGB: 48, computeCapability: 8.6, tdpWatts: 300, datacenter: true },
  { model: "RTX A5000", arch: "Ampere", fp32Tflops: 27.8, memBandwidthGBs: 768, tensorFp16Tflops: 111, vramGB: 24, computeCapability: 8.6, tdpWatts: 230, datacenter: true },
  { model: "RTX A4000", arch: "Ampere", fp32Tflops: 19.2, memBandwidthGBs: 448, tensorFp16Tflops: 77, vramGB: 16, computeCapability: 8.6, tdpWatts: 140, datacenter: true },
  { model: "L40S", arch: "Ada", fp32Tflops: 91.6, memBandwidthGBs: 864, tensorFp16Tflops: 362, vramGB: 48, computeCapability: 8.9, tdpWatts: 350, datacenter: true },
  { model: "A100 80GB", arch: "Ampere", fp32Tflops: 19.5, memBandwidthGBs: 2039, tensorFp16Tflops: 312, vramGB: 80, computeCapability: 8.0, tdpWatts: 400, datacenter: true },
  { model: "H100 80GB", arch: "Hopper", fp32Tflops: 67.0, memBandwidthGBs: 3350, tensorFp16Tflops: 990, vramGB: 80, computeCapability: 9.0, tdpWatts: 700, datacenter: true },
];

export function gpuByModel(model: string): GpuSpec | undefined {
  return gpuCatalog.find((g) => g.model === model);
}

// REAL measured proof-rate (proofs/sec) on the current zkPoW regime — goldenminer
// GPU prover v0.3.6, --mode=gpu, single card, NOCK pool — collected by us on
// vast.ai. These 7 points are the calibration set for the current-regime model.
// `rentUsdPerHr` is the vast.ai price observed at measurement time (context only).
export type MeasuredBenchmark = {
  model: string;
  proofsPerSec: number;
  rentUsdPerHr: number;
};

export const MEASURED_BENCHMARKS: MeasuredBenchmark[] = [
  { model: "RTX 4090", proofsPerSec: 131.5, rentUsdPerHr: 0.401 },
  { model: "RTX 4070 Ti Super", proofsPerSec: 83.8, rentUsdPerHr: 0.158 },
  { model: "RTX 4070 Ti", proofsPerSec: 75.6, rentUsdPerHr: 0.134 },
  { model: "RTX 3080 Ti", proofsPerSec: 60.6, rentUsdPerHr: 0.167 },
  { model: "RTX 4060 Ti", proofsPerSec: 43.5, rentUsdPerHr: 0.085 },
  { model: "RTX A4000", proofsPerSec: 33.1, rentUsdPerHr: 0.085 },
  { model: "RTX 3060", proofsPerSec: 28.2, rentUsdPerHr: 0.052 },
];

// Per-architecture efficiency for the current-regime model: Ada extracts more
// proof-rate per FP32-TFLOP than Ampere (the 3080 Ti has huge bandwidth yet
// trails Ada cards on p/s-per-TFLOP). Used as a feature so the fit isn't fooled
// by a high-bandwidth Ampere card.
export const ARCH_EFFICIENCY: Record<GpuArch, number> = {
  Blackwell: 1.05,
  Ada: 1.0,
  Hopper: 0.95,
  Ampere: 0.86,
};

// Minimum VRAM (GB) a modern zkVM prover needs before it must cut threads-per-card.
export const VRAM_PROVING_FLOOR_GB = 8;
