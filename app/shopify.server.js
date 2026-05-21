import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server.js";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,

  // Called after a merchant installs or re-installs the app.
  // This is the only moment we can capture the offline access token.
  hooks: {
    afterAuth: async ({ session }) => {
      // session.accessToken is the offline token when isOnline === false
      if (!session.isOnline) {
        await prisma.merchantConfig.upsert({
          where: { shop: session.shop },
          update: {
            offlineAccessToken: session.accessToken,
          },
          create: {
            shop: session.shop,
            offlineAccessToken: session.accessToken,
            // Merchant must fill these in the config page after install
            chargilyApiKey: "",
            chargilyWebhookSecret: "",
            isTestMode: true,
          },
        });
      }
    },
  },

  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
