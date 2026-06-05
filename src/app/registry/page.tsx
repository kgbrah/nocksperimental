import {
  ArrowLeft,
  ArrowUpRight,
  Blocks,
  CheckCircle2,
  Code2,
  Fingerprint,
  Globe2,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createRegistryCheckpoint } from "@/lib/registry-checkpoint";
import { createRegistryManifest } from "@/lib/registry-manifest";

export const dynamic = "force-dynamic";

export default function RegistryPage() {
  const manifest = createRegistryManifest();
  const checkpoint = createRegistryCheckpoint();
  const registryChecks = [
    {
      label: "Append-only updates",
      value: checkpoint.checks.appendOnlyTrustUpdates
    },
    {
      label: "Valid signatures",
      value: checkpoint.checks.validTrustUpdateSignatures
    },
    {
      label: "Generated reports",
      value: checkpoint.checks.generatedReportsAvailable
    },
    {
      label: "Local fakenet evidence",
      value: checkpoint.checks.localFakenetEvidenceAvailable
    },
    {
      label: "Public badges",
      value: checkpoint.checks.publicBadgesAvailable
    }
  ];

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#dce8ee]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            Lab dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Public discovery surface
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Registry</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3d3d35]">
                {manifest.service} publishes {manifest.endpoints.length} endpoint records for{" "}
                {manifest.canonicalBaseUrl}. The latest trust update is{" "}
                {manifest.latestTrustUpdate.status} at {manifest.latestTrustUpdate.rootHash}.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                <span>{manifest.counts.badges} badges</span>
                <span>{manifest.counts.generatedReports} generated reports</span>
                <span>{manifest.counts.trustUpdates} trust updates</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
                href="/api/registry"
              >
                <Code2 size={16} aria-hidden="true" />
                Manifest
              </a>
              <a
                className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
                href="/api/registry/checkpoint"
              >
                <Fingerprint size={16} aria-hidden="true" />
                Checkpoint
              </a>
              <a
                className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
                href="/openapi.json"
              >
                <Globe2 size={16} aria-hidden="true" />
                OpenAPI
              </a>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
                href="/verify"
              >
                <ShieldCheck size={16} aria-hidden="true" />
                Verify
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-white px-4 py-2 text-sm font-medium text-[#171717]"
                href="/trust/feed"
              >
                <Blocks size={16} aria-hidden="true" />
                Feed
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Badges" value={manifest.counts.badges.toString()} />
        <Metric label="Generated reports" value={manifest.counts.generatedReports.toString()} />
        <Metric label="Trust consumers" value={manifest.counts.trustConsumers.toString()} />
        <Metric label="Fakenet reports" value={checkpoint.counts.localFakenetReports.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <Fingerprint size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Checkpoint Roots</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="Checkpoint" value={checkpoint.roots.checkpoint} />
            <Callout label="Trust signals" value={checkpoint.roots.trustSignals} />
            <Callout label="Generated reports" value={checkpoint.roots.generatedReports} />
            <Callout label="Local fakenet evidence" value={checkpoint.roots.localFakenetEvidence} />
            <Callout label="Trust updates" value={checkpoint.roots.trustUpdates} />
          </div>
        </article>

        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Registry Checks</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {registryChecks.map((check) => (
              <div className="border border-[#8b8b7a] bg-white p-3" key={check.label}>
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                  {check.label}
                </div>
                <p className="mt-2 text-2xl font-semibold">{check.value ? "valid" : "attention"}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="Fakenet evidence" value={checkpoint.fakenetEvidence.status} />
            <Callout label="Fakenet endpoint" value={checkpoint.fakenetEvidence.endpoint ?? "none"} />
            <Callout
              label="Fakenet verifier"
              value={checkpoint.fakenetEvidence.verifierReady ? "ready" : "blocked"}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 lg:px-8">
        <article className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Endpoint index
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Canonical Registry Links</h2>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#536023]">
              {manifest.publishedAt}
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {manifest.endpoints.map((endpoint) => (
              <a
                className="border border-[#8b8b7a] bg-white p-3"
                href={toSameOriginHref(endpoint.url)}
                key={endpoint.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                      {endpoint.id}
                    </p>
                    <h3 className="mt-1 font-semibold">{endpoint.description}</h3>
                  </div>
                  <ArrowUpRight className="mt-1 size-4 shrink-0" aria-hidden="true" />
                </div>
                <p className="mt-3 break-all font-mono text-xs leading-5 text-[#3f3f38]">
                  {endpoint.url}
                </p>
              </a>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#242424] bg-[#fdfbf4] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#8b8b7a] bg-white p-3">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#3f3f38]">{value}</p>
    </div>
  );
}

function toSameOriginHref(url: string) {
  try {
    const parsed = new URL(url);

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
