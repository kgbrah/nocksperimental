import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Code2,
  GitPullRequest,
  ListChecks,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { createNockchainPrRadar } from "@/lib/nockchain-pr-radar";

export const dynamic = "force-dynamic";

const priorityPrNumbers = [125, 113, 116, 103, 119, 126, 124, 118] as const;
const priorityRiskClasses = [
  "nockup-fixture-manifest",
  "pma-runtime-persistence",
  "wallet-transaction-metadata",
  "offline-wallet-signing",
  "nockapp-state-export",
  "benchmarking",
  "compute-proof-puzzle",
  "runtime-stack-size",
  "runtime-stack-frame-safety",
  "jam-cue-hardening",
  "grpc-message-size"
] as const;
const highlightedForbiddenFields = ["rawStateJam", "rawPmaSlab", "walletSeedPhrase"] as const;
const highlightedDriftCommand = "npm run check:nockchain-pr-radar-drift -- --json";
const highlightedPullRequestsApiSource =
  "https://api.github.com/repos/nockchain/nockchain/pulls?state=open&per_page=100&sort=updated&direction=desc";
const pr125Label = "PR #125";
const pr113Label = "PR #113";
const pr116Label = "PR #116";
const pr103Label = "PR #103";
const pr119Label = "PR #119";
const pr100Label = "PR #100";
const pr94Label = "PR #94";
const pr83Label = "PR #83";
const pr79Label = "PR #79";
const issue121Label = "Issue #121";
const noOpenIssuesLabel = "No open non-PR issues";

export default function NockchainPrRadarPage() {
  const radar = createNockchainPrRadar();
  const priorityPullRequests = priorityPrNumbers
    .map((number) => radar.pullRequests.find((pullRequest) => pullRequest.number === number))
    .filter((pullRequest): pullRequest is NonNullable<typeof pullRequest> => Boolean(pullRequest));
  const remainingPullRequests = radar.pullRequests.filter(
    (pullRequest) => !priorityPrNumbers.includes(pullRequest.number as (typeof priorityPrNumbers)[number])
  );
  const priorityIssues = radar.openIssues.filter((issue) => issue.priority === "high");
  const priorityClasses = priorityRiskClasses
    .map((id) => radar.riskClasses.find((riskClass) => riskClass.id === id))
    .filter((riskClass): riskClass is NonNullable<typeof riskClass> => Boolean(riskClass));
  const remainingClasses = radar.riskClasses.filter(
    (riskClass) =>
      !priorityRiskClasses.includes(riskClass.id as (typeof priorityRiskClasses)[number])
  );

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#0B0B0B]">
      <section className="border-b border-[#0B0B0B] bg-[#FFFFFF]">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link className="inline-flex items-center gap-2 text-sm font-medium" href="/nockchain">
            <ArrowLeft size={16} aria-hidden="true" />
            Nockchain evidence
          </Link>
          <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#0B0B0B]">
                Upstream early warning
              </p>
              <h1 className="mt-2 text-4xl font-semibold">Nockchain PR Radar</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4A4A4A]">
                Open upstream pull requests grouped by Nocksperimental risk class,
                target surface, receipt impact, and verification command so incoming
                Nockchain work can be reviewed before it silently changes test assumptions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-[#0B0B0B] px-4 py-2 text-sm font-medium text-white"
                href="/api/nockchain/pr-radar" target="_blank" rel="noreferrer"
              >
                <Code2 size={16} aria-hidden="true" />
                PR API
              </Link>
              <Link
                className="inline-flex w-fit items-center gap-2 border border-[#0B0B0B] bg-white px-4 py-2 text-sm font-medium text-[#0B0B0B]"
                href="/nockchain/watch"
              >
                <BellRing size={16} aria-hidden="true" />
                Watch
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4 lg:px-8">
        <Metric label="Open PRs" value={radar.snapshot.openPullRequestCount.toString()} />
        <Metric label="Open Issues" value={radar.snapshot.openIssueCount.toString()} />
        <Metric label="High Priority" value={radar.snapshot.highPriorityCount.toString()} />
        <Metric label="Drafts" value={radar.snapshot.draftCount.toString()} />
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Open Pull Requests</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityPullRequests.map((pullRequest) => (
              <PullRequestCard pullRequest={pullRequest} key={pullRequest.number} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Operator Queue</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label={pr125Label} value={radar.operatorQueue[0]} />
            <Callout label={pr113Label} value={radar.operatorQueue[1]} />
            <Callout label={pr116Label} value={radar.operatorQueue[2]} />
            <Callout label={pr103Label} value={radar.operatorQueue[3]} />
            <Callout label={issue121Label} value={radar.operatorQueue[4]} />
            <Callout label={pr119Label} value={radar.operatorQueue[5]} />
            <Callout
              label={pr100Label}
              value="Track PMA checkpoint-stream persistence before changing state-artifact provenance."
            />
            <Callout
              label={pr94Label}
              value="Track JAM cue hardening before changing runtime safety diagnostics."
            />
            <Callout
              label={pr83Label}
              value="Track gRPC message-size controls before changing wallet/API command limits."
            />
            <Callout
              label={pr79Label}
              value="Track peek v1 transaction support before changing transaction inspection receipts."
            />
            {radar.operatorQueue.slice(6).map((item) => (
              <Callout key={item} label="review" value={item} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Open Issues</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityIssues.length > 0 ? (
              priorityIssues.map((issue) => <OpenIssueCard issue={issue} key={issue.number} />)
            ) : (
              <Callout
                label="openIssueSnapshot"
                value={`${noOpenIssuesLabel} in the current GitHub snapshot.`}
              />
            )}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Risk Classes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {priorityClasses.map((riskClass) => (
              <RiskClassCard riskClass={riskClass} key={riskClass.id} />
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-8 lg:grid-cols-[1fr_1fr] lg:px-8">
        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Review Contract</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="requiredFields" value={radar.reviewContract.requiredFields.join(", ")} />
            <Callout label="forbiddenFields" value={radar.reviewContract.forbiddenFields.join(", ")} />
            <Callout label="highlightedForbidden" value={highlightedForbiddenFields.join(", ")} />
            {radar.reviewContract.reviewRules.map((rule) => (
              <Callout key={rule} label="rule" value={rule} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#E7F7FF] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Drift Check</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Callout label="status" value={radar.driftCheck.status} />
            <Callout label="command" value={radar.driftCheck.command} />
            <Callout label="highlightedCommand" value={highlightedDriftCommand} />
            <Callout label="testCommand" value={radar.driftCheck.testCommand} />
            <Callout label="highlightedPullRequestsApi" value={highlightedPullRequestsApiSource} />
            <Callout label="sourceUrls" value={radar.driftCheck.sourceUrls.join(", ")} />
            <Callout label="compareFields" value={radar.driftCheck.compareFields.join(", ")} />
            <Callout label="interpretation" value={radar.driftCheck.interpretation} />
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Pull Requests</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingPullRequests.map((pullRequest) => (
              <PullRequestCard pullRequest={pullRequest} key={pullRequest.number} />
            ))}
          </div>
        </article>

        <article className="border border-[#0B0B0B] bg-[#FFFFFF] p-5 shadow-[4px_4px_0_#0B0B0B]">
          <div className="flex items-center gap-2">
            <ListChecks size={18} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Additional Risk Classes</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {remainingClasses.map((riskClass) => (
              <RiskClassCard riskClass={riskClass} key={riskClass.id} />
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function OpenIssueCard({
  issue
}: {
  issue: ReturnType<typeof createNockchainPrRadar>["openIssues"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        Issue #{issue.number}
      </p>
      <h3 className="mt-2 text-sm font-semibold leading-6">{issue.title}</h3>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A]">
        {issue.priority} / {issue.riskClass}
      </p>
      <Callout label="targetSurfaces" value={issue.targetSurfaces.join(", ")} />
      <Callout label="receiptFields" value={issue.receiptFields.join(", ")} />
      <Callout label="verificationCommand" value={issue.verificationCommand} />
      <Callout label="action" value={issue.nocksperimentalAction} />
    </div>
  );
}

function PullRequestCard({
  pullRequest
}: {
  pullRequest: ReturnType<typeof createNockchainPrRadar>["pullRequests"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        PR #{pullRequest.number}
      </p>
      <h3 className="mt-2 text-sm font-semibold leading-6">{pullRequest.title}</h3>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-[#4A4A4A]">
        {pullRequest.priority} / {pullRequest.riskClass}
      </p>
      <Callout label="targetSurfaces" value={pullRequest.targetSurfaces.join(", ")} />
      <Callout label="receiptFields" value={pullRequest.receiptFields.join(", ")} />
      <Callout label="verificationCommand" value={pullRequest.verificationCommand} />
      <Callout label="action" value={pullRequest.nocksperimentalAction} />
    </div>
  );
}

function RiskClassCard({
  riskClass
}: {
  riskClass: ReturnType<typeof createNockchainPrRadar>["riskClasses"][number];
}) {
  return (
    <div className="border border-[#0B0B0B] bg-white p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        {riskClass.id}
      </p>
      <h3 className="mt-2 text-sm font-semibold leading-6">{riskClass.label}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">{riskClass.receiptImpact}</p>
      <Callout label="escalation" value={riskClass.escalation} />
      <Callout label="targetSurfaces" value={riskClass.targetSurfaces.join(", ")} />
      <Callout label="verificationCommand" value={riskClass.verificationCommand} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#0B0B0B] bg-[#FFFFFF] p-5">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">
        <ShieldCheck size={14} aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2 break-all text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 border border-[#0B0B0B] bg-white p-3 first:mt-0">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#0B0B0B]">{label}</div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-[#4A4A4A]">{value}</p>
    </div>
  );
}
