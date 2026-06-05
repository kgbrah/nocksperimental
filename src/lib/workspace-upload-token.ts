import { createHmac, timingSafeEqual } from "node:crypto";
import {
  registryCanonicalBaseUrl,
  registrySubject
} from "@/lib/registry-manifest";
import { createWorkspaceUploadPolicy } from "@/lib/workspace-upload-policy";

const tokenPrefix = "nockwut_v0";
const verifierPath = "/api/workspaces/upload-token/verify";

type WorkspaceUploadPolicy = NonNullable<ReturnType<typeof createWorkspaceUploadPolicy>>;

type WorkspaceUploadTokenPayload = {
  version: "v0";
  subject: string;
  workspaceSlug: string;
  workspaceId: string;
  tokenType: string;
  audience: string;
  issuerKeyId: string;
  authenticationKeyId: string;
  issuedAt: string;
  expiresAt: string;
  ttlSeconds: number;
  scope: {
    requiredClaims: string[];
    requiredEvidence: string[];
    acceptedContentTypes: string[];
    maxReportBytes: number;
  };
  links: {
    policy: string;
    evidence: string;
    workspace: string;
  };
};

type WorkspaceUploadTokenVerificationInput = {
  token?: string | null;
  now?: Date;
};

export function issueWorkspaceUploadToken(
  policy: WorkspaceUploadPolicy,
  authenticationKeyId: string,
  now = new Date()
) {
  const signingKey = workspaceUploadTokenSigningKey();

  if (!signingKey) {
    return null;
  }

  const issuerKeyId = workspaceUploadTokenIssuerKeyId();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + policy.token.ttlSeconds * 1000).toISOString();
  const payload: WorkspaceUploadTokenPayload = {
    version: "v0",
    subject: policy.subject,
    workspaceSlug: policy.workspace.slug,
    workspaceId: policy.workspace.id,
    tokenType: policy.token.tokenType,
    audience: policy.token.audience,
    issuerKeyId,
    authenticationKeyId,
    issuedAt,
    expiresAt,
    ttlSeconds: policy.token.ttlSeconds,
    scope: {
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
  };
  const encodedPayload = encodeJson(payload);
  const signature = signTokenPayload(encodedPayload, signingKey);

  return {
    tokenValue: `${tokenPrefix}.${encodedPayload}.${signature}`,
    issuerKeyId,
    issuedAt,
    expiresAt,
    payload
  };
}

export function verifyWorkspaceUploadToken({
  token,
  now = new Date()
}: WorkspaceUploadTokenVerificationInput) {
  const tokenValue = token?.trim() ?? "";
  const signingKey = workspaceUploadTokenSigningKey();
  const [prefix, encodedPayload, signature] = tokenValue.split(".");
  const tokenProvided = tokenValue.length > 0;
  const formatValid = tokenProvided && prefix === tokenPrefix && Boolean(encodedPayload && signature);
  const payload = formatValid ? decodePayload(encodedPayload) : null;
  const policy = payload?.workspaceSlug ? createWorkspaceUploadPolicy(payload.workspaceSlug) : null;
  const expectedSignature =
    signingKey && encodedPayload ? signTokenPayload(encodedPayload, signingKey) : "";
  const signatureValid = Boolean(
    formatValid &&
      signingKey &&
      signature &&
      safeCompareSecrets(expectedSignature, signature)
  );
  const notExpired = payload?.expiresAt ? new Date(payload.expiresAt).getTime() > now.getTime() : false;
  const subjectMatched = payload?.subject === registrySubject;
  const workspaceMatched = Boolean(policy && payload?.workspaceSlug === policy.workspace.slug);
  const tokenTypeMatched = Boolean(policy && payload?.tokenType === policy.token.tokenType);
  const audienceMatched = Boolean(policy && payload?.audience === policy.token.audience);
  const verified = Boolean(
    tokenProvided &&
      formatValid &&
      payload &&
      signingKey &&
      signatureValid &&
      notExpired &&
      subjectMatched &&
      workspaceMatched &&
      tokenTypeMatched &&
      audienceMatched
  );

  return {
    version: "v0",
    subject: registrySubject,
    canonicalUrl: workspaceUploadTokenVerifierUrl(),
    verified,
    query: {
      tokenPresent: tokenProvided
    },
    payload: payload
      ? {
          version: payload.version,
          subject: payload.subject,
          workspaceSlug: payload.workspaceSlug,
          workspaceId: payload.workspaceId,
          tokenType: payload.tokenType,
          audience: payload.audience,
          issuerKeyId: payload.issuerKeyId,
          issuedAt: payload.issuedAt,
          expiresAt: payload.expiresAt,
          ttlSeconds: payload.ttlSeconds,
          scope: payload.scope
        }
      : null,
    token: {
      tokenType: payload?.tokenType ?? null,
      issuerKeyId: payload?.issuerKeyId ?? null,
      issuedAt: payload?.issuedAt ?? null,
      expiresAt: payload?.expiresAt ?? null
    },
    checks: {
      tokenProvided,
      formatValid,
      signingKeyConfigured: Boolean(signingKey),
      payloadDecoded: Boolean(payload),
      signatureValid,
      notExpired,
      subjectMatched,
      workspaceMatched,
      tokenTypeMatched,
      audienceMatched
    },
    links: {
      policy: policy?.links.uploadPolicy ?? null,
      evidence: policy?.links.evidence ?? null,
      workspace: policy?.links.workspace ?? null
    }
  };
}

export function createWorkspaceUploadTokenSample(workspaceSlug: string) {
  const policy = createWorkspaceUploadPolicy(workspaceSlug);

  if (!policy) {
    return null;
  }

  const issued = issueWorkspaceUploadToken(policy, "verification-sample");

  if (!issued) {
    return null;
  }

  return {
    workspaceSlug: policy.workspace.slug,
    tokenType: policy.token.tokenType,
    issuerKeyId: issued.issuerKeyId,
    expiresAt: issued.expiresAt,
    url: createWorkspaceUploadTokenVerifyUrl(issued.tokenValue)
  };
}

export function workspaceUploadTokenVerifierUrl() {
  return `${registryCanonicalBaseUrl}${verifierPath}`;
}

export function createWorkspaceUploadTokenVerifyUrl(tokenValue: string) {
  const url = new URL(workspaceUploadTokenVerifierUrl());

  url.searchParams.set("token", tokenValue);

  return url.toString();
}

function workspaceUploadTokenSigningKey() {
  return process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_SIGNING_KEY?.trim() ?? "";
}

function workspaceUploadTokenIssuerKeyId() {
  return process.env.NOCKS_WORKSPACE_UPLOAD_TOKEN_ISSUER_KEY_ID?.trim() || "workspace-upload-token-v0";
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodePayload(encodedPayload: string): WorkspaceUploadTokenPayload | null {
  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as WorkspaceUploadTokenPayload;
  } catch {
    return null;
  }
}

function signTokenPayload(encodedPayload: string, signingKey: string) {
  return createHmac("sha256", signingKey).update(encodedPayload).digest("base64url");
}

function safeCompareSecrets(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.byteLength !== actualBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
