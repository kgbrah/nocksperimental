import {
  registryCanonicalBaseUrl,
  registryEndpoints,
  registryServiceName
} from "@/lib/registry-manifest";
import { METERED_RESOURCES } from "@/lib/x402/pricing";

const meteredOpenApiPaths = new Set(
  METERED_RESOURCES.map((resource) => resource.pathPattern.replace(/\[([^\]]+)\]/g, "{$1}"))
);

type OpenApiPath = {
  get: {
    summary: string;
    responses: {
      "200": {
        description: string;
      };
      "402"?: {
        description: string;
      };
    };
  };
  post?: {
    summary: string;
    responses: {
      "200": {
        description: string;
      };
      "400"?: {
        description: string;
      };
    };
  };
};

const wellKnownEndpoint = {
  id: "well-known",
  path: "/.well-known/nocksperimental.json",
  description: "Nocksperimental trust discovery manifest"
};

const badgeVerificationEndpoint = {
  id: "badge-verification",
  path: "/api/trust/badges/{badgeId}/verification",
  description: "Badge verification bundle"
};

const badgeEmbedEndpoint = {
  id: "badge-embed",
  path: "/api/trust/badges/{badgeId}/embed",
  description: "Badge embed bundle"
};

const badgeVerifierEndpoint = {
  id: "badge-verifier",
  path: "/api/trust/badges/verify",
  description: "Badge issuance verifier"
};

const solverScorecardDetailEndpoint = {
  id: "solver-scorecard-detail",
  path: "/api/trust/solver-scores/{scorecardId}",
  description: "Solver scorecard detail"
};

const tokenCompatibilityDetailEndpoint = {
  id: "token-compatibility-detail",
  path: "/api/trust/token-compatibility/{reportId}",
  description: "Token compatibility report detail"
};

const computeBenchmarkDetailEndpoint = {
  id: "compute-benchmark-detail",
  path: "/api/trust/compute-benchmarks/{profileId}",
  description: "Compute benchmark profile detail"
};

const trustUpdateDetailEndpoint = {
  id: "trust-update-detail",
  path: "/api/trust/updates/{updateId}",
  description: "Trust update entry detail"
};

const trustUpdateVerifierEndpoint = {
  id: "trust-update-verifier",
  path: "/api/trust/updates/verify",
  description: "Trust update entry verifier"
};

const trustConsumerDetailEndpoint = {
  id: "trust-consumer-detail",
  path: "/api/trust/consumers/{consumerId}",
  description: "Trust consumer detail"
};

const workspaceDetailEndpoint = {
  id: "workspace-detail",
  path: "/api/workspaces/{workspaceSlug}",
  description: "Workspace detail"
};

const workspaceEvidenceEndpoint = {
  id: "workspace-evidence",
  path: "/api/workspaces/{workspaceSlug}/evidence",
  description: "Workspace evidence capsule"
};

const workspaceUploadPolicyEndpoint = {
  id: "workspace-upload-policy",
  path: "/api/workspaces/{workspaceSlug}/upload-policy",
  description: "Workspace upload policy"
};

const workspaceUploadTokenEndpoint = {
  id: "workspace-upload-token",
  path: "/api/workspaces/{workspaceSlug}/upload-token",
  description: "Workspace upload token gate"
};

const workspaceUploadTokenVerifierEndpoint = {
  id: "workspace-upload-token-verifier",
  path: "/api/workspaces/upload-token/verify",
  description: "Workspace upload token verifier"
};

const workspaceEvidenceVerifierEndpoint = {
  id: "workspace-evidence-verifier",
  path: "/api/workspaces/evidence/verify",
  description: "Workspace evidence verifier"
};

const generatedReportProvenanceEndpoint = {
  id: "generated-report-provenance",
  path: "/api/reports/generated/{appSlug}/provenance",
  description: "Generated report provenance bundle"
};

const generatedReportEvidenceEndpoint = {
  id: "generated-report-evidence",
  path: "/api/reports/generated/{appSlug}/evidence",
  description: "Generated report evidence bundle"
};

const generatedReportVerifierEndpoint = {
  id: "generated-report-verifier",
  path: "/api/reports/generated/verify",
  description: "Generated report evidence verifier"
};

const launchEvidenceCaseDetailEndpoint = {
  id: "launch-evidence-case-detail",
  path: "/api/launch-evidence/{caseId}",
  description: "Launch Evidence case detail"
};

const fakenetEvidenceReceiptDetailEndpoint = {
  id: "fakenet-evidence-receipt-detail",
  path: "/api/fakenet/evidence/receipts/{receiptId}",
  description: "Read persisted fakenet evidence receipt"
};

const veslEvidenceReceiptDetailEndpoint = {
  id: "vesl-evidence-receipt-detail",
  path: "/api/vesl/evidence/receipts/{receiptId}",
  description: "Read persisted VESL evidence receipt"
};

const bazaarListingDetailEndpoint = {
  id: "bazaar-listing-detail",
  path: "/api/bazaar/{listingId}",
  description: "Verified Bazaar listing detail"
};

const nockupValidationReceiptDetailEndpoint = {
  id: "nockup-validation-receipt-detail",
  path: "/api/nockchain/nockup/receipts/{receiptId}",
  description: "Read persisted Nockup validation receipt"
};

export function createOpenApiSpec() {
  const endpoints = [
    wellKnownEndpoint,
    ...registryEndpoints,
    badgeVerificationEndpoint,
    badgeEmbedEndpoint,
    badgeVerifierEndpoint,
    solverScorecardDetailEndpoint,
    tokenCompatibilityDetailEndpoint,
    computeBenchmarkDetailEndpoint,
    trustUpdateDetailEndpoint,
    trustUpdateVerifierEndpoint,
    trustConsumerDetailEndpoint,
    workspaceDetailEndpoint,
    workspaceEvidenceEndpoint,
    workspaceUploadPolicyEndpoint,
    workspaceUploadTokenEndpoint,
    workspaceUploadTokenVerifierEndpoint,
    workspaceEvidenceVerifierEndpoint,
    generatedReportVerifierEndpoint,
    generatedReportProvenanceEndpoint,
    generatedReportEvidenceEndpoint,
    launchEvidenceCaseDetailEndpoint,
    fakenetEvidenceReceiptDetailEndpoint,
    veslEvidenceReceiptDetailEndpoint,
    bazaarListingDetailEndpoint,
    nockupValidationReceiptDetailEndpoint
  ];

  return {
    openapi: "3.1.0",
    info: {
      title: "Nocksperimental Trust Registry API",
      version: "v0",
      description:
        "Public trust, report, and registry discovery endpoints for Nocksperimental NockApp evidence."
    },
    servers: [
      {
        url: registryCanonicalBaseUrl
      }
    ],
    paths: endpoints.reduce<Record<string, OpenApiPath>>((paths, endpoint) => {
      paths[endpoint.path] = {
        get: {
          summary: endpoint.description,
          responses: {
            "200": {
              description: `${registryServiceName} ${endpoint.description}`
            }
          }
        }
      };

      if (meteredOpenApiPaths.has(endpoint.path)) {
        paths[endpoint.path].get.responses["402"] = {
          description: "Payment required (x402): present a PAYMENT-SIGNATURE header to access this resource"
        };
      }

      if (
        endpoint.path === "/api/fakenet/connect" ||
        endpoint.path === "/api/fakenet/evidence/submit" ||
        endpoint.path === "/api/vesl/evidence/submit" ||
        endpoint.path === "/api/nockchain/nockup/submit" ||
        endpoint.path === "/api/launch-evidence/verify"
      ) {
        paths[endpoint.path].post = {
          summary: endpoint.description,
          responses: {
            "200": {
              description: `${registryServiceName} ${endpoint.description}`
            },
            "400": {
              description: createPostErrorDescription(endpoint.path)
            }
          }
        };
      }

      return paths;
    }, {})
  };
}

function createPostErrorDescription(path: string) {
  if (path === "/api/fakenet/connect") {
    return "Invalid fakenet connection profile";
  }

  if (path === "/api/fakenet/evidence/submit") {
    return "Invalid fakenet evidence submission";
  }

  if (path === "/api/nockchain/nockup/submit") {
    return "Invalid Nockup validation submission";
  }

  if (path === "/api/launch-evidence/verify") {
    return "Invalid Launch Evidence verification input";
  }

  return "Invalid VESL evidence submission";
}
