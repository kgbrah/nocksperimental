// TypeScript mirror of zkvesl/x402-nockchain `x402-types` wire shapes.
//
// Fidelity goal: a `PaymentPayload` produced by a real x402 client (see
// `golden_1.json` in x402-nockchain) deserializes into these types unchanged,
// and a `PaymentRequired` we emit is accepted by a real x402 client.
//
// Conventions: camelCase keys; monetary amounts are decimal strings in
// `nicks` (the NOCK smallest unit); network ids are CAIP-2
// (e.g. "nockchain:mainnet" / "nockchain:fakenet").

/** One entry of a 402 response's `accepts` array — how the client may pay. */
export interface PaymentRequirements {
  /** Payment scheme identifier (e.g. "exact"). */
  scheme: string;
  /** CAIP-2 network identifier (e.g. "nockchain:fakenet"). */
  network: string;
  /** Max chargeable amount, nicks as decimal string. */
  maxAmountRequired: string;
  /** Absolute URL of the resource being paid for. */
  resource: string;
  /** Asset identifier (Nockchain: "NOCK"). */
  asset: string;
  /** Base58 pkh of the payee. MUST equal `Authorization.to`. */
  payTo: string;
  /** Hard upper bound (seconds) the server waits for settlement. */
  maxTimeoutSeconds: number;
  description?: string;
  mimeType?: string;
  outputSchema?: unknown;
  /** Scheme-/network-specific extras (e.g. minFee). */
  extra?: unknown;
  /** v2 extension blocks keyed by name (e.g. "bazaar"). */
  extensions?: Record<string, unknown>;
}

/** Resource-level metadata carried on the 402 envelope. */
export interface PaymentResource {
  url: string;
  description?: string;
  mimeType?: string;
}

/** The 402 response body when a resource requires payment. */
export interface PaymentRequired {
  /** Protocol version. MUST be 2. */
  x402Version: number;
  /** Short human-readable error string ("Payment required"). */
  error: string;
  resource: PaymentResource;
  accepts: PaymentRequirements[];
  extensions?: Record<string, unknown>;
}

/** Two-hash Nockchain note name (base58 Tip5 hashes). */
export interface NoteName {
  first: string;
  last: string;
}

/** Lock a note is held under (defaults to simple-pkh when omitted). */
export type NoteLock =
  | { kind: "simple-pkh" }
  | { kind: "coinbase-pkh"; timelockMin: number };

/** Reference to a specific Nockchain note (UTXO). */
export interface NoteRef {
  name: NoteName;
  /** Amount held by this note, nicks as decimal string. */
  assets: string;
  lock?: NoteLock;
}

/** The authorization object the payer signs (§5.3.2). */
export interface Authorization {
  /** Base58 pkh of the payer. */
  from: string;
  /** Base58 pkh of the payee. MUST match `PaymentRequirements.payTo`. */
  to: string;
  /** Amount to transfer, nicks as decimal string. */
  value: string;
  /** Transaction fee, nicks as decimal string. */
  fee: string;
  /** Unique replay-protection nonce (base58 Tip5 hash). */
  nonce: string;
  /** Unix seconds; payment invalid before this time. */
  validAfter: number;
  /** Unix seconds; payment invalid after this time. */
  validBefore: number;
  notes: NoteRef[];
  changeAddress: string;
}

/** Schnorr-over-Cheetah signature + signer public key (§5.3.1). */
export interface SchnorrSignatureJson {
  /** Base58-encoded Schnorr (Cheetah) public key of the payer. */
  pubkey: string;
  /** Challenge + signature, each 8 Belt values as decimal strings. */
  schnorr: {
    chal: string[];
    sig: string[];
  };
}

/** The `(exact, nockchain)` payload variant — matches `golden_1.json`. */
export interface ExactNockchainPayload {
  signature: SchnorrSignatureJson;
  authorization: Authorization;
}

/** Top-level envelope the client ships back in the payment header. */
export interface PaymentPayload<P = unknown> {
  /** Protocol version. MUST be 2. */
  x402Version: number;
  /** MUST match the selected `PaymentRequirements.scheme`. */
  scheme: string;
  /** MUST match the selected `PaymentRequirements.network`. */
  network: string;
  /** Scheme-/network-specific payload. */
  payload: P;
  extensions?: Record<string, unknown>;
}

export type NockchainPaymentPayload = PaymentPayload<ExactNockchainPayload>;

// --- Facilitator contracts (POST /verify, POST /settle) ---

export interface VerifyRequest {
  payload: PaymentPayload;
  requirements: PaymentRequirements;
}

export interface FacilitatorError {
  code: string;
  message: string;
}

export interface VerifyResponse {
  valid: boolean;
  error?: FacilitatorError;
}

export interface TransactionStatus {
  txId: string;
  blockHeight?: number | null;
  status: string;
}

export interface SettleResponse {
  success: boolean;
  transaction?: TransactionStatus;
  error?: FacilitatorError;
}

// --- Bazaar discovery (http-query subset we advertise) ---

export interface BazaarHttpQueryInput {
  type: "http";
  method: "GET" | "HEAD" | "DELETE";
  queryParams?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface BazaarDiscoveryInfo {
  input: BazaarHttpQueryInput;
  output?: { type: string; format?: string; example?: unknown };
}

export interface BazaarExtension {
  info: BazaarDiscoveryInfo;
  /** JSON Schema (Draft 2020-12) validating `info`. */
  schema: unknown;
}
