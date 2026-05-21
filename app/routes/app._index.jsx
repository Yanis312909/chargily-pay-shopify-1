import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Banner,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Divider,
} from "@shopify/polaris";
import { authenticate, unauthenticated } from "../shopify.server.js";
import prisma from "../db.server.js";
import { getBalance } from "../chargily/client.js";

// ── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.merchantConfig.findUnique({ where: { shop } });

  let balance = null;
  if (config?.chargilyApiKey) {
    try {
      balance = await getBalance(config.chargilyApiKey, config.isTestMode);
    } catch {
      // Invalid key or Chargily unreachable — show form without balance
    }
  }

  return json({
    config: config
      ? {
          chargilyApiKey: config.chargilyApiKey,
          isTestMode: config.isTestMode,
        }
      : null,
    balance,
    appUrl: process.env.SHOPIFY_APP_URL,
  });
}

// ── Action ────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const chargilyApiKey = formData.get("chargilyApiKey")?.trim();
  const isTestMode = formData.get("isTestMode") === "true";

  if (!chargilyApiKey) {
    return json({ error: "La clé API est obligatoire." }, { status: 400 });
  }

  // Validate the API key by calling Chargily balance endpoint
  let balance;
  try {
    balance = await getBalance(chargilyApiKey, isTestMode);
  } catch {
    return json(
      { error: "Clé API Chargily invalide. Vérifiez votre clé et le mode (test/live)." },
      { status: 400 }
    );
  }

  // Save to DB
  await prisma.merchantConfig.upsert({
    where: { shop },
    update: { chargilyApiKey, isTestMode },
    create: {
      shop,
      chargilyApiKey,
      isTestMode,
      offlineAccessToken: "",
    },
  });

  // Tell Shopify this payment gateway is ready to accept payments
  try {
    const { admin } = await unauthenticated.admin(shop);
    await admin.graphql(
      `#graphql
      mutation PaymentsAppConfigure($externalHandle: String!, $ready: Boolean!) {
        paymentsAppConfigure(externalHandle: $externalHandle, ready: $ready) {
          paymentsAppConfiguration {
            externalHandle
            ready
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { externalHandle: "chargily-payment", ready: true } }
    );
  } catch (error) {
    console.error("[Shopify] paymentsAppConfigure failed:", error.message);
  }

  return json({ success: true, balance });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConfigPage() {
  const { config, balance: initialBalance, appUrl } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isSubmitting = navigation.state === "submitting";

  const [apiKey, setApiKey] = useState(config?.chargilyApiKey ?? "");
  const [testMode, setTestMode] = useState(String(config?.isTestMode ?? true));

  const balance = actionData?.balance ?? initialBalance;

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("chargilyApiKey", apiKey);
    formData.append("isTestMode", testMode);
    submit(formData, { method: "POST" });
  }, [apiKey, testMode, submit]);

  const modeOptions = [
    { label: "Mode Test (sandbox)", value: "true" },
    { label: "Mode Live (production)", value: "false" },
  ];

  const formatWallet = (wallet) =>
    `${Number(wallet.balance).toLocaleString("fr-DZ")} ${wallet.currency.toUpperCase()} (disponible: ${Number(wallet.ready_for_payout).toLocaleString("fr-DZ")})`;

  return (
    <Page
      title="Chargily Pay — Configuration"
      subtitle="Connectez votre compte Chargily Pay pour accepter les paiements Edahabia et CIB."
    >
      <BlockStack gap="500">

        {(testMode === "true") && (
          <Banner tone="warning" title="Mode Test actif">
            Aucun vrai paiement ne sera traité. Activez le Mode Live avant de publier votre boutique.
          </Banner>
        )}

        {actionData?.success && (
          <Banner tone="success" title="Configuration sauvegardée">
            Votre passerelle Chargily Pay est active et prête à recevoir des paiements.
          </Banner>
        )}

        {actionData?.error && (
          <Banner tone="critical" title="Erreur de configuration">
            {actionData.error}
          </Banner>
        )}

        {balance && (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="headingMd">Solde Chargily Pay</Text>
                <Badge tone={testMode === "true" ? "warning" : "success"}>
                  {testMode === "true" ? "Test" : "Live"}
                </Badge>
              </InlineStack>
              <Divider />
              {balance.wallets?.map((wallet) => (
                <Text key={wallet.currency} variant="bodyMd">
                  {formatWallet(wallet)}
                </Text>
              ))}
            </BlockStack>
          </Card>
        )}

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">Clé API Chargily Pay</Text>
            <Text variant="bodyMd" tone="subdued">
              Récupérez votre clé secrète depuis{" "}
              <a href="https://pay.chargily.dz/dashboard/developers" target="_blank" rel="noreferrer">
                Chargily Pay Dashboard → Developers Corner
              </a>
            </Text>
            <FormLayout>
              <Select
                label="Mode"
                options={modeOptions}
                value={testMode}
                onChange={setTestMode}
                helpText="Utilisez le Mode Test pendant le développement et le Mode Live en production."
              />
              <TextField
                label="Chargily API Secret Key"
                value={apiKey}
                onChange={setApiKey}
                type="password"
                autoComplete="off"
                placeholder="test_sk_..."
                helpText="Cette clé sert aussi à vérifier les webhooks entrants — une seule clé suffit."
              />
            </FormLayout>
            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!apiKey}
              >
                Vérifier &amp; Sauvegarder
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Configuration du Webhook</Text>
            <Text variant="bodyMd">
              Dans votre dashboard Chargily Pay → Developers Corner, ajoutez l&apos;URL de webhook suivante :
            </Text>
            <Text variant="bodyMd" fontWeight="bold">
              {`${appUrl}/app/webhook?shop=VOTRE-BOUTIQUE.myshopify.com`}
            </Text>
            <Text variant="bodyMd" tone="subdued">
              Remplacez <code>VOTRE-BOUTIQUE</code> par le sous-domaine de votre boutique Shopify.
              Chargily Pay utilise votre clé API secrète pour signer les webhooks — pas besoin de clé séparée.
            </Text>
          </BlockStack>
        </Card>

      </BlockStack>
    </Page>
  );
}
