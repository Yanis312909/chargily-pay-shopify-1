import { authenticate, unauthenticated } from "../shopify.server.js";

/**
 * POST /app/refund
 *
 * Called by Shopify when a merchant requests a refund from the Shopify admin.
 *
 * Chargily Pay V2 does not expose a refund API endpoint for DZD transactions.
 * Refunds must be processed manually from the Chargily Pay merchant dashboard.
 *
 * This handler calls refundSessionReject to inform Shopify the refund cannot
 * be processed automatically, and surfaces a clear message to the merchant.
 */
export async function action({ request }) {
  let payload, session;
  try {
    ({ payload, session } = await authenticate.public.checkout(request));
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const shop = session.shop;

  try {
    const { admin } = await unauthenticated.admin(shop);

    const response = await admin.graphql(
      `#graphql
      mutation RefundSessionReject($id: ID!, $reason: RefundSessionRejectionReasonInput!) {
        refundSessionReject(id: $id, reason: $reason) {
          refundSession {
            id
            state {
              ... on RefundSessionStateRejected {
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
          id: payload.id,
          reason: {
            code: "PROCESSING_ERROR",
            merchantMessage:
              "Chargily Pay does not support automatic refunds for DZD transactions. " +
              "Please process this refund manually from your Chargily Pay dashboard at " +
              "https://pay.chargily.dz/dashboard.",
          },
        },
      }
    );

    const body = await response.json();
    const errors = body?.data?.refundSessionReject?.userErrors;
    if (errors?.length) {
      console.error("[Shopify] refundSessionReject userErrors:", errors);
      return new Response("Mutation error", { status: 500 });
    }
  } catch (error) {
    console.error("[Shopify] refundSessionReject failed:", error.message);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
