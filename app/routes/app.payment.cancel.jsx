import { authenticate, unauthenticated } from "../shopify.server.js";

/**
 * POST /app/payment/cancel
 *
 * Called by Shopify when a payment session needs to be canceled
 * (e.g. merchant cancels the order from Shopify admin while payment is pending).
 *
 * Flow:
 *   1. Authenticate the Shopify request
 *   2. Call paymentSessionReject with reason RISKY (customer-initiated or admin cancel)
 *   3. Respond 200 to acknowledge
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
          id: payload.id,
          reason: {
            code: "RISKY",
            merchantMessage: "Payment session was canceled.",
          },
        },
      }
    );

    const body = await response.json();
    const errors = body?.data?.paymentSessionReject?.userErrors;
    if (errors?.length) {
      console.error("[Shopify] cancel paymentSessionReject userErrors:", errors);
      return new Response("Mutation error", { status: 500 });
    }
  } catch (error) {
    console.error("[Shopify] cancel paymentSessionReject failed:", error.message);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
