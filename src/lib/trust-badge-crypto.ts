import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

// PKCS8 DER prefix for an Ed25519 private key; concatenated with a 32-byte seed
// it yields a full PKCS8 key Node can import. Lets us derive a deterministic
// keypair from a seed without any external dependency.
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

// Dev-only issuer seeds. These are PUBLIC and only ever sign demo badges in the
// committed data so tests and reviewers can regenerate identical signatures.
// Production issuance signs with NOCKS_BADGE_ISSUER_SIGNING_SEED (32-byte hex),
// which is supplied via the environment and never committed.
export const DEV_ISSUER_SEEDS: Record<string, string> = {
  "nocksperimental-registry-ed25519-dev-v0":
    "1100000000000000000000000000000000000000000000000000000000000001",
  "nocksperimental-registry-ed25519-dev-v1":
    "2200000000000000000000000000000000000000000000000000000000000002"
};

export const ACTIVE_DEV_ISSUER_KEY_ID = "nocksperimental-registry-ed25519-dev-v1";

export type BadgeSignatureResult = {
  signature: string;
  payloadDigest: string;
  algorithm: "ed25519";
};

export function canonicalizeBadgePayload(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeBadgePayload(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      // Drop undefined-valued keys, mirroring JSON.stringify (which omits them).
      // Without this, undefined would interpolate as the literal text "undefined"
      // and make canon({a:1,b:undefined}) != canon({a:1}), breaking sign/verify
      // symmetry for any future optional signed field. null stays distinct.
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeBadgePayload(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function badgePayloadDigest(payload: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalizeBadgePayload(payload)).digest("hex")}`;
}

function privateKeyFromSeed(seedHex: string) {
  const seed = Buffer.from(seedHex, "hex");

  if (seed.length !== 32) {
    throw new Error(`Ed25519 seed must be 32 bytes (64 hex chars); received ${seed.length} bytes`);
  }

  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8"
  });
}

export function publicKeySpkiFromSeed(seedHex: string): string {
  const publicKey = createPublicKey(privateKeyFromSeed(seedHex));

  return publicKey.export({ format: "der", type: "spki" }).toString("base64");
}

export function signBadgePayload(payload: unknown, seedHex: string): BadgeSignatureResult {
  const message = Buffer.from(canonicalizeBadgePayload(payload), "utf8");
  const signature = sign(null, message, privateKeyFromSeed(seedHex)).toString("base64");

  return {
    signature,
    payloadDigest: badgePayloadDigest(payload),
    algorithm: "ed25519"
  };
}

export function verifyBadgeSignature({
  payload,
  signature,
  publicKeySpkiBase64
}: {
  payload: unknown;
  signature: string;
  publicKeySpkiBase64: string;
}): boolean {
  if (!signature || !publicKeySpkiBase64) {
    return false;
  }

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeySpkiBase64, "base64"),
      format: "der",
      type: "spki"
    });
    const message = Buffer.from(canonicalizeBadgePayload(payload), "utf8");

    return verify(null, message, publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

function envIssuerSigningSeed(): string | undefined {
  const envSeed = process.env.NOCKS_BADGE_ISSUER_SIGNING_SEED;

  if (envSeed && envSeed.trim().length > 0) {
    return envSeed.trim();
  }

  return undefined;
}

// The keyId every signer stamps onto a receipt/attestation. When a production
// signing seed is supplied via the environment, signers stamp the matching
// production keyId (NOCKS_BADGE_ISSUER_KEY_ID, defaulting to the active dev key
// id when not overridden) so verifiers resolve the seed's published public key.
// When the env seed is unset, this is byte-identical to the committed dev key.
export function resolveActiveIssuerKeyId(): string {
  if (envIssuerSigningSeed()) {
    const envKeyId = process.env.NOCKS_BADGE_ISSUER_KEY_ID;

    if (envKeyId && envKeyId.trim().length > 0) {
      return envKeyId.trim();
    }
  }

  return ACTIVE_DEV_ISSUER_KEY_ID;
}

// When a production signing seed is configured, expose the keyId -> SPKI overlay
// it implies so issuer-key discovery/lookup can serve the production public key
// alongside the committed registry. Returns undefined in the dev/env-unset path
// so the committed registry is used verbatim.
export function issuerEnvKeyOverlay(): { keyId: string; publicKeySpki: string } | undefined {
  const envSeed = envIssuerSigningSeed();

  if (!envSeed) {
    return undefined;
  }

  return {
    keyId: resolveActiveIssuerKeyId(),
    publicKeySpki: publicKeySpkiFromSeed(envSeed)
  };
}

// Fail-closed guard run at sign time. When a production signing seed is
// configured, the public key it derives MUST match the COMMITTED published SPKI
// for the keyId being stamped (when that keyId already exists in the committed
// registry). Otherwise an operator who set the seed but pointed the keyId at an
// existing committed key (e.g. forgot NOCKS_BADGE_ISSUER_KEY_ID, defaulting to
// the active dev key) would emit signatures that fail against the committed
// trust-issuer-keys.json that offline consumers ship with. A keyId NOT present
// in the committed registry is a fresh production key and is allowed (the env
// overlay publishes it). No-op in the dev/env-unset path.
export function assertIssuerSeedMatchesPublishedKey(
  keyId: string,
  committedPublicKeySpkiBase64: string | undefined
): void {
  const overlay = issuerEnvKeyOverlay();

  if (!overlay) {
    return;
  }

  if (committedPublicKeySpkiBase64 && overlay.publicKeySpki !== committedPublicKeySpkiBase64) {
    throw new Error(
      `Production signing seed does not match the committed published public key for issuer key ${keyId}`
    );
  }
}

export function badgeIssuerSigningSeed(keyId: string = ACTIVE_DEV_ISSUER_KEY_ID): string {
  const envSeed = envIssuerSigningSeed();

  if (envSeed) {
    return envSeed;
  }

  const devSeed = DEV_ISSUER_SEEDS[keyId];

  if (!devSeed) {
    throw new Error(`No signing seed available for issuer key ${keyId}`);
  }

  return devSeed;
}
