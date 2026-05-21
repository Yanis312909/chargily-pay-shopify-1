import prisma from "../db.server.js";
import { unauthenticated } from "../shopify.server.js";
import { verifyChargilySignature, getRawBody } from "../chargily/webhook.js";

/**
 * POST /app/webhook?shop=my-store.myshopify.com
 *
 * Receives Chargily Pay webhook events and maps them to Shopify payment mutations.
 *
 * Flow:
 *   1. Read raw body (must happen before any parsing)
 *   2. Verify HMAC-SHA256 signature using merchant's webhook secret
 *   3. Load merchant config from DB using shop param
 *   4. Map Chargily event type to Shopify mutation
 *   5. Call paymentSessionResolve or paymentSessionReject
 */
export async function action({ request }) {
  // Step 1 — Read raw body before any parsing (required for HMAC verification)
  const rawBody = await getRawBody(request);
  const signature = request.headers.get("signature");
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return new Response("Missing shop parameter", { status: 400 });
  }

  // Step 2 — Load merchant config (needed for webhook secret + offline token)
  const merchantConfig = await prisma.merchantConfig.findUnique({
    where: { shop },
  });

  if (!merchantConfig) {
    // Unknown shop — respond 200 to avoid Chargily retry loops
    console.warn("[Chargily Webhook] Unknown shop:", shop);
    return new Response("OK", { status: 200 });
  }

  // Step 3 — Verify signature
  const isValid = verifyChargilySignature(
    rawBody,
    signature,
    merchantConfig.chargilyApiKey
  );

  if (!isValid) {
    console.error("[Chargily Webhook] Invalid signature for shop:", shop);
    return new Response("Unauthorized", { status: 403 });
  }

  // Step 4 — Parse event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const checkoutData = event.data;
  const shopifyPaymentId = checkoutData?.metadata?.shopify_payment_id;

  if (!shopifyPaymentId) {
    // Webhook is not related to a Shopify payment (e.g. manual checkout) — ignore
    return new Response("OK", { status: 200 });
  }

  // Step 5 — Map Chargily event to Shopify mutation
  try {
    if (event.type === "checkout.paid") {
      await resolvePaymentSession(shop, shopifyPaymentId);
    } else if (event.type === "checkout.failed") {
      const reason = checkoutData.status === "canceled" ? "RISKY" : "PROCESSING_ERROR";
      await rejectPaymentSession(shop, shopifyPaymentId, reason);
    } else {
      // Unknown event type — log and acknowledge
      console.info("[Chargily Webhook] Unhandled event type:", event.type);
    }
  } catch (error) {
    console.error("[Chargily Webhook] Shopify mutation failed:", error.message);
    // Return 500 so Chargily retries the webhook
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

/**
 * Returns an authenticated Shopify admin client for a given shop,
 * using the offline session stored in Prisma by the OAuth flow.
 * Designed for use in contexts without an active OAuth session (webhooks, cron jobs).
 *
 * @param {string} shop - e.g. "my-store.myshopify.com"
 * @returns {Promise<object>} Shopify admin client with .graphql() method
 */
async function buildShopifyClient(shop) {
  const { admin } = await unauthenticated.admin(shop);
  return admin;
}

/**
 * Calls Shopify paymentSessionResolve — marks the payment as successful.
 *
 * @param {string} shop
 * @param {string} paymentId - Shopify PaymentSession GID
 */
async function resolvePaymentSession(shop, paymentId) {
  const admin = await buildShopifyClient(shop);

  const response = await admin.graphql(
    `#graphql
    mutation PaymentSessionResolve($id: ID!) {
      paymentSessionResolve(id: $id) {
        paymentSession {
          id
          state {
            ... on PaymentSessionStateResolved {
              code
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { id: paymentId } }
  );

  const body = await response.json();
  const errors = body?.data?.paymentSessionResolve?.userErrors;
  if (errors?.length) {
    throw new Error(`paymentSessionResolve userErrors: ${JSON.stringify(errors)}`);
  }
}

/**
 * Calls Shopify paymentSessionReject — marks the payment as failed.
 *
 * @param {string} shop
 * @param {string} paymentId - Shopify PaymentSession GID
 * @param {string} reasonCode - "PROCESSING_ERROR" | "RISKY"
 */
async function rejectPaymentSession(shop, paymentId, reasonCode) {
  const admin = await buildShopifyClient(shop);

  const response = await admin.graphql(
    `#graphql
    mutation PaymentSessionReject($id: ID!, $reason: PaymentSessionRejectionReasonInput!) {
      paymentSessionReject(id: $id, reason: $reason) {
        paymentSession {
          id
          state {
            ... on PaymentSessionStateRejected {
              code
              merchantMessage
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        id: paymentId,
        reason: {
          code: reasonCode,
          merchantMessage:
            reasonCode === "RISKY"
              ? "Payment was canceled by the customer."
              : "Payment failed. Please try again or use a different method.",
        },
      },
    }
  );

  const body = await response.json();
  const errors = body?.data?.paymentSessionReject?.userErrors;
  if (errors?.length) {
    throw new Error(`paymentSessionReject userErrors: ${JSON.stringify(errors)}`);
  }
}
