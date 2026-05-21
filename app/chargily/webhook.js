import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies the HMAC-SHA256 signature of an incoming Chargily webhook.
 *
 * Chargily signs the raw request body with the merchant's API secret key
 * (the same key used for API calls — there is no separate webhook secret).
 * The result is sent as a hex digest in the "signature" header.
 *
 * @param {string} rawBody   - The raw request body string (must NOT be parsed first)
 * @param {string} signature - Value from the "signature" request header
 * @param {string} apiKey    - The merchant's Chargily API secret key from DB
 * @returns {boolean} true if the signature is valid
 */
export function verifyChargilySignature(rawBody, signature, apiKey) {
  if (!rawBody || !signature || !apiKey) {
    return false;
  }

  const expected = createHmac("sha256", apiKey)
    .update(rawBody, "utf8")
    .digest("hex");

  // timingSafeEqual prevents timing attacks that could leak the secret
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    // Buffer.from throws if signature is not valid hex
    return false;
  }
}

/**
 * Extracts and parses the raw body from a Remix request.
 * Must be called BEFORE any request.json() / request.text() call.
 *
 * @param {Request} request
 * @returns {Promise<string>} raw body string
 */
export async function getRawBody(request) {
  return request.text();
}
