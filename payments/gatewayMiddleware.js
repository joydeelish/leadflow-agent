// Arc Gateway Seller Middleware
// Wraps specialist agent routes with x402 payment gating

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";

export function createAgentGateway(sellerWalletEnvVar) {
  const sellerAddress = process.env[sellerWalletEnvVar];
  if (!sellerAddress) {
    throw new Error(sellerWalletEnvVar + " is not set in environment");
  }

  const gateway = createGatewayMiddleware({
    sellerAddress,
    facilitatorUrl: "https://gateway-api-testnet.circle.com",
    networks: ["eip155:5042002"],
  });

  return gateway;
}
