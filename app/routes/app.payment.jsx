import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "../shopify.server.js";
import prisma from "../db.server.js";
import { createCheckout } from "../chargily/client.js";

/**
 * POST /app/payment
 *
 * Called by Shopify when a customer selects "Chargily Pay" at checkout.
 * Flow:
 *   1. Authenticate the Shopify request
 *   2. Load merchant's Chargily credentials from DB
 *   3. Create a Chargily checkout with shopify_payment_id in metadata
 *   4. Return the Chargily checkout URL so Shopify redirects the customer
 */
export async function action({ request }) {
  // Step 1 — Verify this request is genuinely from Shopify
  // authenticate.public.checkout validates the HMAC signature Shopify sends
  let payload, session;
  try {
    ({ payload, session } = await authenticate.public.checkout(request));
  } catch {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const shop = session.shop;

  // Step 2 — Load this merchant's Chargily configuration
  const merchantConfig = await prisma.merchantConfig.findUnique({
    where: { shop },
  });

  if (!merchantConfig || !merchantConfig.chargilyApiKey) {
    // merchantConfig may exist (afterAuth ran) but keys not yet filled by merchant
    await rejectPaymentSession(shop, payload.id, "PROCESSING_ERROR");
    return json({ error: "Chargily not configured" }, { status: 422 });
  }

  // Step 3 — Convert amount: Shopify sends a decimal string, Chargily wants whole DZD integer
  const amount = Math.round(parseFloat(payload.amount));

  // Build the URLs Chargily will use after payment
  const appUrl = process.env.SHOPIFY_APP_URL;
  const successUrl = `${appUrl}/app/payment/success?shop=${shop}`;
  const failureUrl = `${appUrl}/app/payment/failure?shop=${shop}`;
  const webhookUrl = `${appUrl}/app/webhook?shop=${shop}`;

  // Step 4 — Create Chargily checkout
  let checkout;
  try {
    checkout = await createCheckout(
      merchantConfig.chargilyApiKey,
      merchantConfig.isTestMode,
      {
        amount,
        successUrl,
        failureUrl,
        webhookUrl,
        // metadata is the critical link: webhook handler reads shopify_payment_id
        // to resolve or reject the correct Shopify payment session
        metadata: {
          shopify_payment_id: payload.id,
          shop,
        },
        locale: mapLocale(payload.merchantLocale),
        description: `Shopify order — ${shop}`,
      }
    );
  } catch (error) {
    console.error("[Chargily] createCheckout failed:", error.message);
    await rejectPaymentSession(shop, payload.id, "PROCESSING_ERROR");
    return json({ error: "Failed to create Chargily checkout" }, { status: 502 });
  }

  // Step 5 — Return the redirect URL to Shopify
  // Shopify will redirect the customer's browser to this URL
  return json({ redirect_url: checkout.checkout_url });
}

/**
 * Calls Shopify paymentSessionReject using unauthenticated.admin —
 * the correct approach when no OAuth session is active (payment flow context).
 *
 * @param {string} shop       - e.g. "my-store.myshopify.com"
 * @param {string} paymentId  - Shopify PaymentSession GID
 * @param {string} reasonCode - "PROCESSING_ERROR" | "RISKY"
 */
async function rejectPaymentSession(shop, paymentId, reasonCode) {
  try {
    const { admin } = await unauthenticated.admin(shop);
    const response = await admin.graphql(
      `#graphql
      mutation PaymentSessionReject($id: ID!, $reason: PaymentSessionRejectionReasonInput!) {
        paymentSessionReject(id: $id, reason: $reason) {
          paymentSession {
            id
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
            merchantMessage: "Chargily Pay configuration error. Please contact the store owner.",
          },
        },
      }
    );
    const body = await response.json();
    const errors = body?.data?.paymentSessionReject?.userErrors;
    if (errors?.length) {
      console.error("[Shopify] paymentSessionReject userErrors:", errors);
    }
  } catch (error) {
    console.error("[Shopify] paymentSessionReject failed:", error.message);
  }
}

/**
 * Maps Shopify merchant locale to Chargily supported locales.
 *
 * @param {string} locale - e.g. "fr-DZ", "ar", "en-US"
 * @returns {"ar"|"fr"|"en"}
 */
function mapLocale(locale) {
  if (!locale) return "ar";
  const lang = locale.split("-")[0].toLowerCase();
  if (lang === "fr") return "fr";
  if (lang === "en") return "en";
  return "ar"; // default to Arabic for Algerian market
}
