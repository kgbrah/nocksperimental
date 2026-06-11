"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Cpu, DollarSign, Gauge, Layers, Zap } from "lucide-react";
import { gpuCatalog } from "@/lib/miner-specs";
import {
  REGIME_DEFAULTS,
  calibration,
  computeEconomics,
  effectiveMatmulTflops,
  isMatmulMeasured,
  matmulCalibration,
  predictRate,
  rankCatalog,
  type EconomicsMode,
  type MinerMode,
  type Regime,
} from "@/lib/miner-performance-model";

// Interactive miner performance lab: pick a GPU + miner settings and see the
// PREDICTED proof-rate and economics — for both the current zkPoW regime
// (calibrated on our real measurements) and the upcoming Fork A "matmul PoUW"
// regime (modeled) — without renting or running anything.
export function MinerLab() {
  const [model, setModel] = useState("RTX 4090");
  const [regime, setRegime] = useState<Regime>("current");
  const [mode, setMode] = useState<MinerMode>("gpu");
  const [threads, setThreads] = useState(4);
  const [gpuCount, setGpuCount] = useState(1);
  const [economics, setEconomics] = useState<EconomicsMode>("rented");
  const [nockPrice, setNockPrice] = useState(0.5);
  const [rentPerHr, setRentPerHr] = useState(0.4);
  const [kwh, setKwh] = useState(0.12);
  const [hardwareUsd, setHardwareUsd] = useState(1800);

  const spec = useMemo(() => gpuCatalog.find((g) => g.model === model)!, [model]);
  const params = REGIME_DEFAULTS[regime];

  const rate = useMemo(
    () => predictRate({ spec, regime, mode, threadsPerCard: threads, gpuCount }),
    [spec, regime, mode, threads, gpuCount]
  );

  const econ = useMemo(
    () =>
      computeEconomics({
        rate: rate.totalRate,
        spec,
        gpuCount,
        regime,
        params,
        nockPriceUsd: nockPrice,
        economics,
        rentUsdPerHrPerCard: rentPerHr,
        electricityUsdPerKwh: kwh,
        hardwareUsd,
      }),
    [rate.totalRate, spec, gpuCount, regime, params, nockPrice, economics, rentPerHr, kwh, hardwareUsd]
  );

  // Rank under each regime (current settings) for the compare chart + shift callout.
  const ranked = useMemo(() => rankCatalog(regime, mode, threads, gpuCount), [regime, mode, threads, gpuCount]);
  const curRank = useMemo(() => rankCatalog("current", mode, threads, gpuCount).map((r) => r.spec.model), [mode, threads, gpuCount]);
  const faRank = useMemo(() => rankCatalog("forkA", mode, threads, gpuCount).map((r) => r.spec.model), [mode, threads, gpuCount]);
  const curPos = curRank.indexOf(model);
  const faPos = faRank.indexOf(model);
  const maxRate = ranked[0]?.totalRate ?? 1;

  const unit = regime === "current" ? "p/s" : "pp"; // current=proofs/s, forkA=proofpower-equiv

  return (
    <div className="space-y-4">
      {/* Calibration honesty banner */}
      <div className="border-2 border-[#0B0B0B] bg-[#FFF4D6] p-4 shadow-[4px_4px_0_#0B0B0B]">
        <p className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.12em]">
          <Gauge size={15} aria-hidden="true" /> Calibrated estimate — not a guarantee
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#3A3A3A]">
          The <strong>current zkPoW</strong> regime is calibrated on{" "}
          <strong>{calibration.measuredCount} real goldenminer measurements</strong> (fit R²={" "}
          {calibration.r2.toFixed(3)}, ±{calibration.residualStdPs.toFixed(1)} p/s). The{" "}
          <strong>Fork A &ldquo;matmul PoUW&rdquo;</strong> regime is now calibrated on{" "}
          <strong>{matmulCalibration.measuredCount} real GEMM-throughput benchmarks</strong> we ran — measured
          matmul is ~half the spec-sheet peak, and consumer/workstation cards run tensor at half rate (real/spec
          ≈ {matmulCalibration.specToRealFactors.Ampere.toFixed(2)}) while full-rate datacenter parts hit ≈
          {matmulCalibration.specToRealFactors.fullrate.toFixed(2)}. Cards we didn&apos;t measure use their
          architecture&apos;s measured factor (wider band). It still models a not-yet-live protocol — treat it as a
          forecast, not a promise.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* ---- controls ---- */}
        <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]">
            <Cpu size={15} aria-hidden="true" /> Hardware &amp; settings
          </p>

          <Label>GPU (incl. cards you don&apos;t own — that&apos;s the point)</Label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full border-2 border-[#0B0B0B] bg-[#FFFFFF] px-3 py-2 font-mono text-sm"
          >
            {gpuCatalog.map((g) => (
              <option key={g.model} value={g.model}>
                {g.model} — {g.vramGB}GB · {g.fp32Tflops} TF32 · {g.tensorFp16Tflops} TF16{g.datacenter ? " · DC" : ""}
              </option>
            ))}
          </select>

          <Label>PoW regime</Label>
          <Toggle
            options={[
              { v: "current", label: "Current zkPoW" },
              { v: "forkA", label: "Fork A · matmul PoUW" },
            ]}
            value={regime}
            onChange={(v) => setRegime(v as Regime)}
          />

          <Label>Miner mode (--mode)</Label>
          <Toggle
            options={[
              { v: "gpu", label: "gpu" },
              { v: "hybrid", label: "hybrid +10%" },
              { v: "auto", label: "auto" },
            ]}
            value={mode}
            onChange={(v) => setMode(v as MinerMode)}
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>threads-per-card: {threads}</Label>
              <input type="range" min={1} max={16} value={threads} onChange={(e) => setThreads(Number(e.target.value))} className="mt-1 w-full accent-[#0B0B0B]" />
            </div>
            <div>
              <Label>GPU count: {gpuCount}</Label>
              <input type="range" min={1} max={8} value={gpuCount} onChange={(e) => setGpuCount(Number(e.target.value))} className="mt-1 w-full accent-[#0B0B0B]" />
            </div>
          </div>

          <div className="mt-4 border-t-2 border-dashed border-[#0B0B0B] pt-3">
            <Label>Economics</Label>
            <Toggle
              options={[
                { v: "rented", label: "Rented (vast.ai)" },
                { v: "owned", label: "Owned (electricity)" },
              ]}
              value={economics}
              onChange={(v) => setEconomics(v as EconomicsMode)}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumberField label="NOCK price (USD)" value={nockPrice} step={0.05} onChange={setNockPrice} />
              {economics === "rented" ? (
                <NumberField label="rent $/hr per card" value={rentPerHr} step={0.01} onChange={setRentPerHr} />
              ) : (
                <NumberField label="electricity $/kWh" value={kwh} step={0.01} onChange={setKwh} />
              )}
              {economics === "owned" ? (
                <NumberField label="hardware $ (total)" value={hardwareUsd} step={50} onChange={setHardwareUsd} />
              ) : null}
            </div>
          </div>
        </div>

        {/* ---- results ---- */}
        <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]">
            <Zap size={15} aria-hidden="true" /> Predicted (
            {regime === "current"
              ? "calibrated"
              : isMatmulMeasured(spec)
                ? "GEMM-measured"
                : "matmul-modeled"}
            )
          </p>
          {regime === "forkA" ? (
            <p className="mt-1 font-mono text-[11px] text-[#737373]">
              effective matmul ≈ {effectiveMatmulTflops(spec).toFixed(0)} TFLOPS{" "}
              {isMatmulMeasured(spec) ? "(measured GEMM)" : `(${spec.tensorFp16Tflops} spec × ${spec.fullRateTensor ? "full-rate" : spec.arch} factor)`}
            </p>
          ) : null}

          {rate.vramGated ? (
            <p className="mt-3 inline-flex items-center gap-2 border-2 border-[#B91C1C] bg-[#FEF2F2] px-3 py-2 font-mono text-[11px] uppercase text-[#B91C1C]">
              <AlertTriangle size={13} aria-hidden="true" /> VRAM below the proving floor — may not prove / must cut threads
            </p>
          ) : null}

          <div className="mt-3 flex items-baseline justify-between border-b-2 border-[#0B0B0B] pb-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em]">proof-rate ({gpuCount}× {spec.model})</span>
            <span className="text-3xl font-semibold tabular-nums">
              {rate.totalRate.toFixed(0)} <span className="text-base text-[#737373]">{unit}</span>
            </span>
          </div>
          <p className="mt-1 text-right font-mono text-[11px] text-[#737373]">
            ± {rate.bandPs.toFixed(0)} {unit} · {rate.baseRatePerCard.toFixed(0)} {unit}/card before settings
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric icon={<DollarSign size={13} />} label={economics === "rented" ? "proof-rate per $ rent/day" : "NOCK / day"}
              value={economics === "rented" ? `${(econ.psPerDollar).toFixed(1)} ${unit}/$` : econ.nockPerDay.toLocaleString("en-US", { maximumFractionDigits: 2 })} />
            <Metric icon={<DollarSign size={13} />} label="NOCK / day" value={econ.nockPerDay.toLocaleString("en-US", { maximumFractionDigits: 2 })} sub={`share ${(econ.networkShare * 100).toExponential(1)}%`} />
            <Metric icon={<DollarSign size={13} />} label="revenue / day" value={`$${econ.revenueUsdPerDay.toFixed(2)}`} />
            <Metric icon={<DollarSign size={13} />} label={economics === "rented" ? "rent / day" : "power / day"} value={`$${econ.costUsdPerDay.toFixed(2)}`} />
            <Metric icon={<DollarSign size={13} />} label="profit / day"
              value={`${econ.profitUsdPerDay >= 0 ? "" : "-"}$${Math.abs(econ.profitUsdPerDay).toFixed(2)}`}
              danger={econ.profitUsdPerDay < 0} />
            {economics === "owned" ? (
              <Metric icon={<DollarSign size={13} />} label="break-even" value={econ.breakevenDays && econ.breakevenDays > 0 ? `${econ.breakevenDays.toFixed(0)} days` : "never (loss)"} danger={!econ.breakevenDays} />
            ) : null}
          </div>

          <p className="mt-4 border-t-2 border-dashed border-[#0B0B0B] pt-3 font-mono text-[11px] leading-relaxed text-[#4A4A4A]">
            NOCK/day depends on your network-size &amp; emission snapshot (defaults: {params.networkRate.toLocaleString()} {unit} network,{" "}
            {params.dailyEmissionNock.toLocaleString()} NOCK/day{regime === "forkA" ? `, ×${params.dilution} datacenter dilution` : ""}). The
            robust, calibrated outputs are <strong>proof-rate</strong> and <strong>per-$ value</strong>.
          </p>
        </div>
      </div>

      {/* ---- regime-shift callout ---- */}
      <div className="border-2 border-[#0B0B0B] bg-[#F5F5F5] p-4">
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]">
          <Layers size={15} aria-hidden="true" /> How {spec.model}&apos;s rank shifts when matmul PoUW lands
        </p>
        <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">
          Among {gpuCatalog.length} cards, the {spec.model} ranks{" "}
          <strong>#{curPos + 1}</strong> under today&apos;s zkPoW but{" "}
          <strong>#{faPos + 1}</strong> under Fork A matmul PoUW —{" "}
          {faPos < curPos ? (
            <span className="font-semibold text-[#15803D]">up {curPos - faPos} (its tensor cores matter more)</span>
          ) : faPos > curPos ? (
            <span className="font-semibold text-[#B91C1C]">down {faPos - curPos} (FP32 advantage fades; datacenter tensor silicon overtakes it)</span>
          ) : (
            <span className="font-semibold">unchanged</span>
          )}
          . Datacenters merge-mining AI work at ~zero marginal cost is the dilution this models.
        </p>
      </div>

      {/* ---- compare chart ---- */}
      <div className="border-2 border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
        <p className="font-mono text-xs uppercase tracking-[0.14em]">
          Catalog ranked by predicted {unit} — {regime === "current" ? "current zkPoW (calibrated)" : "Fork A matmul PoUW (modeled)"} · {mode} · {threads} thr · {gpuCount}×
        </p>
        <div className="mt-3 space-y-1">
          {ranked.map(({ spec: g, totalRate }) => {
            const selected = g.model === model;
            return (
              <button
                key={g.model}
                type="button"
                onClick={() => setModel(g.model)}
                className="flex w-full items-center gap-2 text-left"
                title={`${g.model}: ${totalRate.toFixed(0)} ${unit}`}
              >
                <span className={`w-36 shrink-0 truncate font-mono text-[11px] ${selected ? "font-bold text-[#0B0B0B]" : "text-[#4A4A4A]"}`}>
                  {g.model}
                </span>
                <span className="relative h-4 flex-1 bg-[#F5F5F5]">
                  <span
                    className={`absolute left-0 top-0 h-4 ${selected ? "bg-[#0B0B0B]" : g.datacenter ? "bg-[#737373]" : "bg-[#BFBFBF]"}`}
                    style={{ width: `${Math.max(2, (totalRate / maxRate) * 100)}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#4A4A4A]">{totalRate.toFixed(0)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9A9A9A]">
          dark = selected · gray = datacenter card · light = consumer · click a bar to select
        </p>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">{children}</p>;
}

function Toggle<T extends string>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`border-2 border-[#0B0B0B] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] ${
            value === o.v ? "bg-[#0B0B0B] text-[#FFFFFF]" : "bg-[#FFFFFF] text-[#0B0B0B]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full border-2 border-[#0B0B0B] bg-[#FFFFFF] px-2 py-1.5 font-mono text-sm"
      />
    </div>
  );
}

function Metric({ icon, label, value, sub, danger }: { icon: React.ReactNode; label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className={`border-2 p-3 ${danger ? "border-[#B91C1C] bg-[#FEF2F2]" : "border-[#0B0B0B]"}`}>
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#737373]">
        {icon} {label}
      </p>
      <p className={`mt-1 font-mono text-base font-semibold ${danger ? "text-[#B91C1C]" : ""}`}>{value}</p>
      {sub ? <p className="mt-0.5 font-mono text-[10px] text-[#9A9A9A]">{sub}</p> : null}
    </div>
  );
}
