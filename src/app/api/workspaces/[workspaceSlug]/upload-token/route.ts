import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  issueWorkspaceUploadToken,
  workspaceUploadTokenVerifierUrl
} from "@/lib/workspace-upload-token";
import { createWorkspaceUploadPolicy } from "@/lib/workspace-upload-policy";

export const dynamic = "force-dynamic";

type WorkspaceUploadTokenRouteContext = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

type WorkspaceUploadKey = {
  keyId: string;
  secret: string;
};

export async function GET(request: Request, { params }: WorkspaceUploadTokenRouteContext) {
  const { workspaceSlug } = await params;
  const policy = createWorkspaceUploadPolicy(workspaceSlug);

  if (!policy) {
    return NextResponse.json({ error: "Workspace not found", workspaceSlug }, { status: 404 });
  }

  const authenticatedKey = authenticateWorkspaceUpload(request);

  if (!authenticatedKey) {
    return NextResponse.json(
      {
        error: "unauthorized workspace upload token",
        workspaceSlug,
        authenticationRequired: true,
        links: {
          policy: `/api/workspaces/${workspaceSlug}/upload-policy`
        }
      },
      { status: 401 }
    );
  }

  const issuedToken = issueWorkspaceUploadToken(policy, authenticatedKey.keyId);

  if (issuedToken) {
    return NextResponse.json({
      version: "v0",
      subject: policy.subject,
      workspace: policy.workspace,
      status: "token-issued",
      authentication: {
        keyId: authenticatedKey.keyId
      },
      token: {
        tokenType: policy.token.tokenType,
        issuanceStatus: "issued",
        tokenValue: issuedToken.tokenValue,
        issuerKeyId: issuedToken.issuerKeyId,
        issuedAt: issuedToken.issuedAt,
        expiresAt: issuedToken.expiresAt,
        ttlSeconds: policy.token.ttlSeconds,
        authenticationRequired: true
      },
      challenge: {
        tokenType: policy.token.tokenType,
        audience: policy.token.audience,
        ttlSeconds: policy.token.ttlSeconds,
        requiredClaims: policy.token.requiredClaims,
        requiredEvidence: policy.reportContract.requiredEvidence,
        acceptedContentTypes: policy.reportContract.acceptedContentTypes,
        maxReportBytes: policy.reportContract.maxReportBytes
      },
      links: {
        policy: policy.links.uploadPolicy,
        evidence: policy.links.evidence,
        workspace: policy.links.workspace,
        verify: workspaceUploadTokenVerifierUrl()
      }
    });
  }

  return NextResponse.json({
    version: "v0",
    subject: policy.subject,
    workspace: policy.workspace,
    status: "challenge-issued",
    authentication: {
      keyId: authenticatedKey.keyId
    },
    token: {
      tokenType: policy.token.tokenType,
      issuanceStatus: "not-issued",
      tokenValue: null,
      authenticationRequired: true
    },
    challenge: {
      tokenType: policy.token.tokenType,
      audience: policy.token.audience,
      ttlSeconds: policy.token.ttlSeconds,
      requiredClaims: policy.token.requiredClaims,
      requiredEvidence: policy.reportContract.requiredEvidence,
      acceptedContentTypes: policy.reportContract.acceptedContentTypes,
      maxReportBytes: policy.reportContract.maxReportBytes
    },
    links: {
      policy: policy.links.uploadPolicy,
      evidence: policy.links.evidence,
      workspace: policy.links.workspace
    }
  });
}

function authenticateWorkspaceUpload(request: Request) {
  const requestKeyId = request.headers.get("x-nocks-workspace-upload-key-id") ?? "";
  const requestKey = request.headers.get("x-nocks-workspace-upload-key") ?? "";
  const configuredKey = parseWorkspaceUploadKeys().find((key) => key.keyId === requestKeyId);

  if (!configuredKey || !requestKey) {
    return null;
  }

  return safeCompareSecrets(configuredKey.secret, requestKey) ? { keyId: configuredKey.keyId } : null;
}

function parseWorkspaceUploadKeys() {
  return (process.env.NOCKS_WORKSPACE_UPLOAD_KEYS ?? "")
    .split(",")
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex === -1) {
        return null;
      }

      const keyId = entry.slice(0, separatorIndex).trim();
      const secret = entry.slice(separatorIndex + 1).trim();

      if (!keyId || !secret) {
        return null;
      }

      return { keyId, secret };
    })
    .filter((entry): entry is WorkspaceUploadKey => Boolean(entry));
}

function safeCompareSecrets(expected: string, actual: string) {
  const expectedHash = createHash("sha256").update(expected).digest();
  const actualHash = createHash("sha256").update(actual).digest();

  return timingSafeEqual(expectedHash, actualHash);
}
