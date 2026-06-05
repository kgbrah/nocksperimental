import scoreHistoryData from "@/data/trust-score-history.json";

export type ScoreHistorySignalKind = "solver-score" | "token-compatibility" | "compute-benchmark";
export type ScoreTrend = "up" | "flat" | "down";

export type ScoreHistoryPoint = {
  recordedAt: string;
  score: number;
  status: string;
  reportSlug: string;
  fixtureId: string;
  evidenceHash: string;
};

export type ScoreHistory = {
  id: string;
  signalKind: ScoreHistorySignalKind;
  signalId: string;
  label: string;
  sampleWindowDays: number;
  sourceReports: string[];
  points: ScoreHistoryPoint[];
};

export type ScoreHistoryRegistry = {
  version: string;
  storage: {
    backend: "static-json";
    source: string;
    updatedAt: string;
  };
  histories: ScoreHistory[];
};

export type ScoreHistorySummary = {
  id: string;
  signalKind: ScoreHistorySignalKind;
  signalId: string;
  label: string;
  latestRecordedAt: string;
  latestScore: number;
  previousScore: number;
  delta: number;
  trend: ScoreTrend;
  pointCount: number;
  sampleWindowDays: number;
  sparkline: string;
  storageSource: string;
};

export const scoreHistoryRegistry = scoreHistoryData as ScoreHistoryRegistry;
export const scoreHistories = scoreHistoryRegistry.histories;
export const scoreHistorySummaries = scoreHistories.map(createScoreHistorySummary);

export function scoreHistoryForSignal(kind: ScoreHistorySignalKind, signalId: string) {
  return scoreHistories.find((history) => history.signalKind === kind && history.signalId === signalId);
}

export function scoreHistorySummaryForSignal(kind: ScoreHistorySignalKind, signalId: string) {
  return scoreHistorySummaries.find(
    (summary) => summary.signalKind === kind && summary.signalId === signalId
  );
}

export function scoreHistorySummariesForKind(kind: ScoreHistorySignalKind) {
  return scoreHistorySummaries.filter((summary) => summary.signalKind === kind);
}

function createScoreHistorySummary(history: ScoreHistory): ScoreHistorySummary {
  const points = [...history.points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const latest = points[points.length - 1];
  const previous = points[points.length - 2] ?? latest;
  const delta = latest.score - previous.score;

  return {
    id: history.id,
    signalKind: history.signalKind,
    signalId: history.signalId,
    label: history.label,
    latestRecordedAt: latest.recordedAt,
    latestScore: latest.score,
    previousScore: previous.score,
    delta,
    trend: trendForDelta(delta),
    pointCount: points.length,
    sampleWindowDays: history.sampleWindowDays,
    sparkline: points.map((point) => point.score).join(","),
    storageSource: scoreHistoryRegistry.storage.source
  };
}

function trendForDelta(delta: number): ScoreTrend {
  if (delta > 0) {
    return "up";
  }
  if (delta < 0) {
    return "down";
  }
  return "flat";
}
