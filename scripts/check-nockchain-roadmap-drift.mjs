#!/usr/bin/env node

// Monitors Nockchain's PUBLIC progress surfaces against a pinned baseline:
//   - nockchain.org/roadmap        (milestone list + status flips)
//   - nockchain.org/writings       (new team posts)
//   - docs.nockchain.org           (GitBook site index + watched pages)
//
// This complements the GitHub-source drift checks (check:nockchain-docs-drift,
// check:nockchain-upstream-drift, ...): those pin the canonical repo, this pins
// the product/roadmap narrative where milestones, upgrade announcements, and
// new Intent Script primitives (zkp/mrk/cmp) surface first. Drift here is a
// prompt to review docs/nockchain-watch.md and the roadmap-alignment doc, not
// protocol authority by itself.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const BASELINE_PATH = "docs/research/nockchain-roadmap-baseline.json";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0 nocksperimental-roadmap-drift";

const ROADMAP_URL = "https://nockchain.org/roadmap";
const WRITINGS_URL = "https://nockchain.org/writings";
const SITE_INDEX_URL = "https://docs.nockchain.org/~gitbook/site-index";

// GitBook serves every docs page as raw markdown at <pathname>.md.
// `signals` are sentinel terms whose appearance/disappearance is itself a
// monitorable event (e.g. a planned opcode going live).
const WATCHED_DOC_PAGES = [
  {
    id: "technical-roadmap",
    url: "https://docs.nockchain.org/architecture/technical-roadmap.md",
    signals: ["optimistic execution", "fraud-proof", "oracle", "prediction market", "token standard", "post-quantum"],
    checklist: true
  },
  {
    id: "intent-script",
    url: "https://docs.nockchain.org/transaction-engine/overview/intent-script.md",
    signals: ["zkp", "mrk", "cmp", "planned"]
  },
  {
    id: "protocol-evolution",
    url: "https://docs.nockchain.org/transaction-engine/overview/protocol-evolution.md",
    signals: ["activation_height", "Bythos", "Aletheia", "Nous"]
  },
  {
    id: "fees",
    url: "https://docs.nockchain.org/transaction-engine/overview/fees.md",
    signals: ["256 nicks", "input-fee-divisor"]
  },
  {
    id: "compute-markets",
    url: "https://docs.nockchain.org/usdnock-asset/what-is-usdnock/compute-markets.md",
    signals: ["Fork A", "Fork B", "trusted-setup", "4,000,000"]
  }
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const observed = options.fixturePath
    ? loadSnapshot(options.fixturePath)
    : await captureSnapshot();

  if (options.updateBaseline) {
    writeFileSync(options.baselinePath, `${JSON.stringify(observed, null, 2)}\n`);
    console.log(`Baseline written: ${options.baselinePath}`);
    return;
  }

  if (!existsSync(options.baselinePath)) {
    throw new Error(
      `Missing baseline ${options.baselinePath} — run with --update-baseline to create it`
    );
  }

  const baseline = loadSnapshot(options.baselinePath);
  const report = createDriftReport(baseline, observed);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printTextReport(report);
  }

  if (report.status !== "in-sync") {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {
    json: false,
    updateBaseline: false,
    fixturePath: "",
    baselinePath: BASELINE_PATH
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--update-baseline") {
      options.updateBaseline = true;
      continue;
    }

    if (arg === "--fixture") {
      const fixturePath = args[index + 1];
      if (!fixturePath) throw new Error("--fixture requires a path");
      options.fixturePath = fixturePath;
      index += 1;
      continue;
    }

    if (arg === "--baseline") {
      const baselinePath = args[index + 1];
      if (!baselinePath) throw new Error("--baseline requires a path");
      options.baselinePath = baselinePath;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function loadSnapshot(snapshotPath) {
  const snapshot = JSON.parse(readFileSync(path.resolve(snapshotPath), "utf8"));

  if (!snapshot || !Array.isArray(snapshot.roadmapMilestones)) {
    throw new Error(`Snapshot ${snapshotPath} must contain a roadmapMilestones array`);
  }

  return snapshot;
}

async function captureSnapshot() {
  const [roadmapHtml, writingsHtml, siteIndexJson] = await Promise.all([
    fetchText(ROADMAP_URL),
    fetchText(WRITINGS_URL),
    fetchText(SITE_INDEX_URL)
  ]);
  const docPages = {};

  await Promise.all(
    WATCHED_DOC_PAGES.map(async (page) => {
      const text = await fetchText(page.url);
      docPages[page.id] = summarizeDocPage(page, text);
    })
  );

  return {
    version: "v0",
    capturedAt: new Date().toISOString(),
    roadmapMilestones: parseRoadmapMilestones(roadmapHtml),
    writings: parseWritingSlugs(writingsHtml),
    docsSiteIndex: parseSiteIndex(siteIndexJson),
    docPages
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/json,text/plain,*/*" }
  });

  if (!response.ok) {
    throw new Error(`Fetch returned ${response.status}: ${url}`);
  }

  return response.text();
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const MILESTONE_STATUSES = new Set(["COMPLETED", "CURRENT", "PLANNED"]);

// The roadmap page renders each milestone as: <date> <STATUS> <title> <blurb>
// <category> <index>. After tag-stripping that becomes consecutive lines, so a
// status keyword followed by a non-status line is a milestone. The trailing
// status legend renders as consecutive status keywords and is skipped by the
// same rule.
function parseRoadmapMilestones(html) {
  const lines = stripHtml(html);
  const milestones = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    const status = lines[index];
    const title = lines[index + 1];

    if (!MILESTONE_STATUSES.has(status) || MILESTONE_STATUSES.has(title)) {
      continue;
    }

    if (/^\d+\s*\/\s*\d+$/.test(title)) {
      continue;
    }

    milestones.push({ status, title });
  }

  return milestones;
}

function parseWritingSlugs(html) {
  const slugs = new Set();
  const pattern = /href="\/writings\/([a-z0-9-]+)"/g;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    slugs.add(match[1]);
  }

  return [...slugs].sort();
}

function parseSiteIndex(json) {
  const index = JSON.parse(json);

  if (!Array.isArray(index.pages)) {
    throw new Error("GitBook site index did not contain a pages array");
  }

  return index.pages.map((page) => page.pathname).sort();
}

function summarizeDocPage(page, text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const summary = {
    url: page.url,
    missing: normalized.startsWith("# Page Not Found"),
    sha256: createHash("sha256").update(normalized, "utf8").digest("hex"),
    signals: {}
  };

  for (const term of page.signals) {
    summary.signals[term] = new RegExp(escapeRegExp(term), "i").test(normalized);
  }

  if (page.checklist) {
    summary.checklist = [...normalized.matchAll(/^\s*\*\s*\[( |x)\]\s*(.+)$/gm)].map((m) => ({
      done: m[1] === "x",
      item: m[2].replace(/\*\*/g, "").slice(0, 120)
    }));
  }

  return summary;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createDriftReport(baseline, observed) {
  const drift = {
    roadmap: diffMilestones(baseline.roadmapMilestones, observed.roadmapMilestones),
    newWritings: difference(observed.writings ?? [], baseline.writings ?? []),
    removedWritings: difference(baseline.writings ?? [], observed.writings ?? []),
    docsPagesAdded: difference(observed.docsSiteIndex ?? [], baseline.docsSiteIndex ?? []),
    docsPagesRemoved: difference(baseline.docsSiteIndex ?? [], observed.docsSiteIndex ?? []),
    docPageChanges: diffDocPages(baseline.docPages ?? {}, observed.docPages ?? {})
  };
  const checks = {
    roadmapUnchanged:
      drift.roadmap.added.length === 0 &&
      drift.roadmap.removed.length === 0 &&
      drift.roadmap.statusChanged.length === 0,
    writingsUnchanged: drift.newWritings.length === 0 && drift.removedWritings.length === 0,
    docsSiteIndexUnchanged: drift.docsPagesAdded.length === 0 && drift.docsPagesRemoved.length === 0,
    watchedDocPagesUnchanged: drift.docPageChanges.length === 0
  };
  const status = Object.values(checks).every(Boolean) ? "in-sync" : "drift";

  return {
    version: "v0",
    status,
    observedAt: observed.capturedAt ?? new Date().toISOString(),
    baselineCapturedAt: baseline.capturedAt ?? null,
    interpretation:
      "Compares Nockchain's public roadmap, writings, and docs-site surfaces against the pinned baseline in docs/research/nockchain-roadmap-baseline.json.",
    snapshot: {
      baselineMilestoneCount: baseline.roadmapMilestones.length,
      observedMilestoneCount: observed.roadmapMilestones.length,
      observedStatusCounts: countStatuses(observed.roadmapMilestones)
    },
    checks,
    drift,
    nextActions: [
      "Review the drifted surfaces and update docs/nockchain-watch.md (status flips, new milestones, new posts).",
      "Re-read changed watched pages before relying on them; signal flips (e.g. zkp/mrk/cmp shipping) feed docs/research/nockchain-roadmap-alignment-2026.md.",
      "After review, re-pin with: npm run check:nockchain-roadmap-drift -- --update-baseline"
    ]
  };
}

function diffMilestones(baselineMilestones, observedMilestones) {
  const key = (m) => m.title;
  const baselineByTitle = new Map(baselineMilestones.map((m) => [key(m), m]));
  const observedByTitle = new Map(observedMilestones.map((m) => [key(m), m]));
  const added = observedMilestones.filter((m) => !baselineByTitle.has(key(m)));
  const removed = baselineMilestones.filter((m) => !observedByTitle.has(key(m)));
  const statusChanged = [];

  for (const [title, baselineMilestone] of baselineByTitle) {
    const observedMilestone = observedByTitle.get(title);

    if (observedMilestone && observedMilestone.status !== baselineMilestone.status) {
      statusChanged.push({ title, from: baselineMilestone.status, to: observedMilestone.status });
    }
  }

  return { added, removed, statusChanged };
}

function diffDocPages(baselinePages, observedPages) {
  const changes = [];
  const ids = new Set([...Object.keys(baselinePages), ...Object.keys(observedPages)]);

  for (const id of [...ids].sort()) {
    const baselinePage = baselinePages[id];
    const observedPage = observedPages[id];

    if (!baselinePage || !observedPage) {
      changes.push({ id, change: baselinePage ? "page-removed-from-watch" : "page-added-to-watch" });
      continue;
    }

    if (baselinePage.sha256 === observedPage.sha256) {
      continue;
    }

    const signalFlips = [];

    for (const term of Object.keys(observedPage.signals ?? {})) {
      const before = baselinePage.signals?.[term];
      const after = observedPage.signals[term];

      if (before !== undefined && before !== after) {
        signalFlips.push({ term, from: before, to: after });
      }
    }

    changes.push({
      id,
      change: "content-changed",
      missing: observedPage.missing === true,
      signalFlips
    });
  }

  return changes;
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item)).sort();
}

function countStatuses(milestones) {
  const counts = {};

  for (const milestone of milestones) {
    counts[milestone.status] = (counts[milestone.status] ?? 0) + 1;
  }

  return counts;
}

function printTextReport(report) {
  console.log(`Nockchain roadmap drift: ${report.status}`);
  console.log(
    `Milestones: ${report.snapshot.observedMilestoneCount} observed (${JSON.stringify(report.snapshot.observedStatusCounts)})`
  );

  if (report.status === "in-sync") {
    return;
  }

  console.log(JSON.stringify(report.drift, null, 2));
  console.log("Next actions:");

  for (const action of report.nextActions) {
    console.log(`  - ${action}`);
  }
}
