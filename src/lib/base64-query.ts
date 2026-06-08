// Restore a standard-base64 value (e.g. an Ed25519 signature) read from a URL query
// parameter. Query strings use application/x-www-form-urlencoded decoding, which maps
// '+' to a space — so a standard-base64 value containing '+' arrives with those '+'
// turned into spaces (observed on the Cloudflare Worker runtime). Standard base64 never
// contains a space, so converting spaces back to '+' losslessly restores the original.
// base64 '/' and '=' survive query transport intact, so only '+' needs repair.
//
// Without this, the verify routes' signatureMatched check (a string compare of the
// caller-supplied signature against the stored one) fails for any real base64 signature
// that happens to contain a '+', even though the signature is correct.
export function restoreBase64QueryParam(value: string | null): string | null {
  return value === null ? null : value.replace(/ /g, "+");
}
