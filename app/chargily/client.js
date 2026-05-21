const API_URLS = {
  test: "https://pay.chargily.net/test/api/v2",
  live: "https://pay.chargily.net/api/v2",
};

function getBaseUrl(isTestMode) {
  return isTestMode ? API_URLS.test : API_URLS.live;
}

async function chargilyFetch(apiKey, isTestMode, method, path, body) {
  const baseUrl = getBaseUrl(isTestMode);
  const url = `${baseUrl}${path}`;

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    // Surface the Chargily error message clearly
    const message = data?.message || `Chargily API error: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Creates a Chargily Pay checkout session.
 *
 * @param {string} apiKey - Chargily secret key
 * @param {boolean} isTestMode
 * @param {object} params
 * @param {number}  params.amount        - Amount in whole DZD (e.g. 1500 = 1500 DZD). NOT centimes.
 * @param {string}  params.successUrl    - Where Chargily redirects after successful payment
 * @param {string}  params.failureUrl    - Where Chargily redirects after failed/canceled payment
 * @param {string}  params.webhookUrl    - Our /app/webhook endpoint URL
 * @param {object}  params.metadata      - Free key-value store — MUST include shopify_payment_id
 * @param {string}  [params.locale]      - "ar" | "en" | "fr" (default: "ar")
 * @param {string}  [params.description] - Optional order description
 * @returns {Promise<object>} Chargily checkout object with checkout_url
 */
export async function createCheckout(apiKey, isTestMode, params) {
  const {
    amount,
    successUrl,
    failureUrl,
    webhookUrl,
    metadata,
    locale = "ar",
    description,
  } = params;

  return chargilyFetch(apiKey, isTestMode, "POST", "/checkouts", {
    amount,
    currency: "dzd",
    success_url: successUrl,
    failure_url: failureUrl,
    webhook_endpoint: webhookUrl,
    locale,
    description,
    // metadata links this checkout to the Shopify payment session
    // shape: { shopify_payment_id: "gid://shopify/PaymentSession/xxx", shop: "..." }
    metadata,
  });
}

/**
 * Retrieves a Chargily checkout by ID.
 * Useful to verify payment status before calling Shopify mutations.
 *
 * @param {string} apiKey
 * @param {boolean} isTestMode
 * @param {string} checkoutId
 * @returns {Promise<object>} Chargily checkout object
 */
export async function getCheckout(apiKey, isTestMode, checkoutId) {
  return chargilyFetch(apiKey, isTestMode, "GET", `/checkouts/${checkoutId}`);
}

/**
 * Retrieves the Chargily account balance.
 * Used to verify API key validity on the config page.
 *
 * @param {string} apiKey
 * @param {boolean} isTestMode
 * @returns {Promise<object>} Balance object
 */
export async function getBalance(apiKey, isTestMode) {
  return chargilyFetch(apiKey, isTestMode, "GET", "/balance");
}
