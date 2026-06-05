import {
  registryCanonicalBaseUrl,
  registryServiceName,
  registrySubject
} from "@/lib/registry-manifest";
import { nockchainUpstreamIntelligence } from "@/lib/nockchain-upstream";

export const zorpStateJamDriveFolderUrl =
  "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw";

export function createNockchainStateJamRegistry() {
  const upstream = nockchainUpstreamIntelligence;

  return {
    version: "v0",
    service: registryServiceName,
    subject: registrySubject,
    canonicalUrl: `${registryCanonicalBaseUrl}/api/nockchain/state-jams`,
    generatedAt: "2026-06-05T19:30:00.000Z",
    policy: {
      mode: "metadata-only",
      rawArtifactStorage: "forbidden",
      posture: upstream.safety.stateArtifacts.posture,
      doNotStore: upstream.safety.stateArtifacts.doNotStore,
      rationale:
        "State jams and PMA data are durable chain/runtime state. Nocksperimental tracks identity and provenance so test operators can reason about trust without redistributing raw state."
    },
    requiredMetadata: upstream.safety.stateArtifacts.metadataToTrack,
    sources: [
      {
        id: "zorp-state-jam-drive",
        label: "Zorp state-jam folder",
        kind: "google-drive-folder",
        custodian: "Zorp",
        url: zorpStateJamDriveFolderUrl,
        status: "watching",
        network: "nockchain",
        artifactPolicy: "metadata-only",
        classification:
          "Operator-provided Zorp state-jam/checkpoint folder. Contents must be inventoried as metadata before any test receipt treats them as trusted bootstrap state.",
        watchReasons: [
          "state-jam/checkpoint provenance",
          "PMA migration and decode safety",
          "fakenet bootstrap reproducibility",
          "Nockchain build and protocol-track alignment"
        ],
        verificationQuestions: [
          "Which Nockchain commit/build produced it?",
          "Which network, height, or event boundary does it represent?",
          "What filename, size, and hash identify the artifact?",
          "Who produced it, and how was it transferred?",
          "Does the consumer Nockchain build include compatible state-jam decode behavior?"
        ],
        knownArtifacts: []
      }
    ],
    upstream: {
      scannedAt: upstream.scannedAt,
      repository: upstream.repository.fullName,
      commit: {
        shortSha: upstream.latestCommit.shortSha,
        sha: upstream.latestCommit.sha,
        committedAt: upstream.latestCommit.committedAt,
        message: upstream.latestCommit.message
      },
      release: upstream.latestRelease,
      protocol: {
        authority: upstream.protocol.authority,
        next: upstream.protocol.currentTrack.next,
        draft: upstream.protocol.currentTrack.draft,
        previous: upstream.protocol.currentTrack.previous
      }
    },
    links: {
      upstream: upstream.canonicalUrl,
      repository: upstream.links.repository,
      zorp: upstream.links.zorp,
      release: upstream.links.release,
      driveFolder: zorpStateJamDriveFolderUrl,
      registry: `${registryCanonicalBaseUrl}/api/registry`,
      checkpoint: `${registryCanonicalBaseUrl}/api/registry/checkpoint`
    }
  };
}
