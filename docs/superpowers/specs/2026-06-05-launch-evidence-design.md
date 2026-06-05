# NockApp Launch Evidence Design

## Status

Approved direction.

Build Launch Evidence as the first paid Nocksperimental product lane. Serve
NockApp builders and auditors first, while designing the evidence model so miner
operators, wallet teams, funds, explorers, and integrators can reuse it later.

## Context

Nocksperimental already has the foundation for an evidence business:

- fixture-driven lab reports
- local fakenet diagnostics
- bring-your-own fakenet profiles
- persisted fakenet evidence receipts
- private workspace models
- workspace upload policies and upload tokens
- generated report history
- verified badges and badge embeds
- trust updates, registry checkpoints, OpenAPI, and `.well-known` discovery
- a VESL evidence bridge design for NockApp lifecycle evidence

Mainline Nockchain is moving toward a more serious application and operator
surface: PMA-backed persistence, `nockup` templates and extension hooks,
NockApp state export, wallet blobs and memos, benchmark tooling, x402 and
agentic payments work, compute/AI proof-of-work experiments, and practical
fakenet/operator workflows.

Nocksperimental should complement those maintainers by owning the surrounding
evidence layer. It should not compete with protocol work, official docs,
explorers, or launchpads. It should make serious NockApps easier to test,
review, launch, and trust.

## Product Thesis

NockApp teams will need public and private proof that their app behaved
correctly before users, funds, wallets, solvers, or compute buyers rely on it.

The paid wedge is:

> Generate, store, verify, and publish launch-readiness evidence for NockApps.

The same primitives can later serve miner/node operators and integrators:

- evidence source
- normalized report
- invariant results
- private workspace
- persisted receipt
- signed badge
- trust registry event
- public verification endpoint

## Customer Lanes

### Lane 1: NockApp Builders And Auditors

This is the first customer.

They need:

- launch-readiness reports
- deterministic local/fakenet test evidence
- VESL and `nockup` lifecycle evidence
- private audit workspaces
- signed receipts for reviewed evidence
- public badges when a report is ready to share
- a durable URL that reviewers can inspect

### Lane 2: Miners, Nodes, And Operators

This lane should reuse the same receipt/report model after the builder lane is
real.

They need:

- node readiness evidence
- PMA upgrade and resource evidence
- fakenet and mainnet connectivity diagnostics
- miner/pool attribution receipts
- uptime and performance support bundles
- public or private operational health badges

### Lane 3: Wallets, Funds, Explorers, And Integrators

This lane becomes valuable once the registry has enough trusted evidence.

They need:

- API access to trust status
- app and token compatibility reports
- badge verification
- counterparty scorecards
- stable registry checkpoints
- machine-readable risk and readiness signals

## First Paid Product

### Launch Evidence Report

A Launch Evidence Report is a paid review package for one NockApp, app release,
template, token, bridge flow, or lifecycle milestone.

Inputs:

- lab fixture reports
- local fakenet evidence submissions
- VESL evidence submissions
- optional `nockup` template metadata
- optional exported NockApp state snapshots when upstream support lands
- reviewer notes and operator-supplied context

Outputs:

- normalized launch-readiness report
- invariant pass/warn/fail summary
- evidence receipt id
- report hash and snapshot root
- private workspace entry
- optional public registry entry
- optional verified badge and embed

The first paid version can be white-glove. Self-serve upload and billing can
come after the evidence shape is proven with real builders.

## Revenue Model

Start with services and evidence retention, then add software/API revenue.

- One-time Launch Evidence Report: paid review and report generation for a
  release, integration, or launch milestone.
- Private Evidence Workspace: recurring hosted report history, upload-token
  gates, receipt retention, and collaborator access.
- Verified Badge Issuance: premium public badge, registry entry, and embeddable
  verification bundle.
- Trust API Access: paid API use for wallets, funds, explorers, launchpads,
  agents, and integrators.
- Operator Evidence Pack: later paid diagnostics and receipts for nodes,
  miners, pools, and PMA upgrades.

Accepting NOCK as revenue is desirable, but the first implementation should not
block on payment rails. The product should record invoice/payment metadata in a
provider-neutral way so USD, NOCK, x402, or manual settlement can be attached
later.

## Architecture

Launch Evidence should be a thin product layer over existing primitives.

### Evidence Intake

Add a unified intake concept that can accept evidence from multiple sources:

- generated lab reports
- fakenet receipt submissions
- VESL bridge submissions
- workspace uploads
- future `nockup` and NockApp state exports

Each source keeps its own raw adapter, but Launch Evidence consumes a normalized
summary with:

- source kind
- subject identity
- generated timestamp
- report hash
- snapshot root
- invariant summary
- verification status
- public/private visibility
- reviewer notes when applicable

### Workspace Layer

Private workspaces become the paid customer container.

A workspace should contain:

- account or team identity
- app/project identity
- evidence submissions
- launch reports
- receipt ids
- badge requests
- upload policy
- invoice/payment metadata
- public disclosure preferences

Initial storage can remain static/KV-backed where appropriate, but the shape
should make a later Durable Object, D1, or external billing system migration
boring.

### Report Layer

Launch reports should preserve the existing deterministic report posture:

- stable ids
- hashes over normalized evidence
- snapshot roots
- pass/warn/fail status
- machine-readable JSON
- human-readable public page
- private workspace view
- OpenAPI and `.well-known` discoverability

### Trust Layer

A verified badge should be issued only after an evidence review passes the
published policy.

Badge state should support:

- requested
- issued
- verified
- watch
- revoked
- expired

The trust registry should remain append-friendly and verifier-first. A public
claim should always map back to receipts and report hashes.

## Data Model Additions

Add a Launch Evidence entity family.

### LaunchEvidenceCase

Represents a paid or prospective review case.

Fields:

- `caseId`
- `workspaceSlug`
- `subjectSlug`
- `subjectType`: `nockapp`, `template`, `token`, `bridge`, `operator`, or `other`
- `status`: `draft`, `submitted`, `reviewing`, `verified`, `watch`, `blocked`, or `closed`
- `visibility`: `private`, `shared-link`, or `public`
- `createdAt`
- `updatedAt`
- `requestedBy`
- `payment`: provider-neutral payment metadata
- `evidenceIds`
- `reportSlug`
- `badgeId`

### LaunchEvidenceSubmission

Represents one evidence payload attached to a case.

Fields:

- `evidenceId`
- `caseId`
- `sourceKind`: `lab`, `fakenet`, `vesl`, `workspace-upload`, `nockup`, `state-export`, or `manual`
- `sourceUrl`
- `submittedAt`
- `submittedBy`
- `status`: `accepted`, `attention`, `rejected`, or `verified`
- `reportHash`
- `snapshotRoot`
- `receiptId`
- `redactionSummary`

### LaunchReadinessReport

Represents the review output.

Fields:

- `reportSlug`
- `caseId`
- `summaryStatus`: `verified`, `watch`, or `blocked`
- `score`
- `requiredChecks`
- `recommendedChecks`
- `evidenceSummary`
- `reviewerNotes`
- `publicSummary`
- `generatedAt`
- `reportHash`
- `snapshotRoot`

## User Workflow

### White-Glove First Slice

1. Builder contacts Nocksperimental with a NockApp or app milestone.
2. Nocksperimental creates a private workspace case.
3. Builder runs existing lab/fakenet/VESL commands and submits evidence.
4. Nocksperimental stores receipts and produces a launch-readiness report.
5. Builder receives a private report URL.
6. If checks pass, Nocksperimental issues a public badge and registry entry.
7. Builder can share the badge, report, or verification endpoint.

### Later Self-Serve Slice

1. Builder creates a workspace.
2. Builder pays or opens a trial case.
3. Builder uploads evidence or connects a repo.
4. Nocksperimental runs automated checks.
5. Builder requests human review for badge issuance.
6. Public registry signals update after issuance.

## Coordination Requirements

This repo may be edited by multiple agents. Every implementation pass must start
with an in-flight work check:

- fetch all refs and prune stale refs
- inspect local status
- inspect local and remote branches
- inspect GitHub PRs
- inspect GitHub issues
- check relevant docs/specs before editing

If another agent is already working the same area, continue from that branch,
issue, or PR rather than recreating the work.

## CodeGraph Requirements

Use CodeGraph for all structural work in this repo and relevant local
Nockchain-adjacent repos.

Required first checks:

- `codegraph_status` for each relevant local repo
- `codegraph_context` before architecture, feature, or bug work
- `codegraph_files` before file-structure exploration

Use native search only for literal strings, markdown-only discovery, generated
artifacts, or files outside CodeGraph coverage.

## Implementation Slices

### Slice 1: Static Launch Evidence Case Model

Goal: prove the product shape without live billing.

Ship:

- launch evidence data model
- sample launch case
- launch readiness report
- private workspace link to launch case
- public report page
- API endpoints for launch case and report detail
- OpenAPI and `.well-known` capability entries
- tests and verification command

### Slice 2: Evidence Intake Normalization

Goal: attach existing evidence sources to a launch case.

Ship:

- normalized submission type
- mapping from generated lab report
- mapping from fakenet receipt
- mapping from VESL evidence once the VESL bridge lands
- redaction summary
- receipt linkage
- report hash and snapshot root verification

### Slice 3: Badge Request And Issuance Flow

Goal: make Launch Evidence visible as trust.

Ship:

- badge request state
- launch-readiness policy
- issued badge entry
- registry update
- embed bundle
- verification endpoint

### Slice 4: Payment Metadata And Paid Workspace Readiness

Goal: prepare revenue without coupling to one payment rail.

Ship:

- payment metadata schema
- manual invoice status
- optional NOCK payment reference field
- paid workspace entitlement flags
- private report retention policy

### Slice 5: Operator And Integrator Expansion

Goal: reuse the evidence core for lanes 2 and 3.

Ship:

- operator evidence case type
- PMA/node readiness report type
- miner/pool attribution receipt type
- trust API consumer profile
- compatibility and scorecard links to Launch Evidence reports

## Testing

Each slice should include:

- focused API tests
- page smoke tests where a page is added
- registry and OpenAPI contract tests when discovery changes
- verifier tests for hashes, roots, receipts, and badges
- Cloudflare deployment smoke updates if bindings or runtime behavior change

For implementation work, run the narrow test first, then the relevant verify
script, then `npm test` when the change touches shared trust or registry
behavior.

## Success Criteria

Launch Evidence is working when a real NockApp builder can:

- receive a private workspace
- submit at least one evidence payload
- get a deterministic report
- verify the report through a public endpoint
- request or receive a badge
- share a URL that makes the app easier to trust

The ecosystem goal is not to certify everything. The goal is to make evidence
boring, inspectable, durable, and useful enough that serious NockApp teams want
it before launch.

## Self-Review

- No incomplete markers remain.
- The first customer is explicit: NockApp builders and auditors.
- The miner/operator and integrator lanes are included as expansion paths, not
  competing first products.
- Revenue is designed around current evidence primitives and does not require
  payment rails before value exists.
- Coordination and CodeGraph requirements are explicit for future agents.
