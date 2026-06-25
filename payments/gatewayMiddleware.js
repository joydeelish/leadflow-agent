// Arc Gateway Seller Middleware
// Returns HTTP 402 + PAYMENT-REQUIRED header on unpaid requests.
// GatewayClient on the buyer side handles signing and retry automatically.

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";

/**
 * Create a payment-gated Express middleware for a specialist agent.
 * @param {string} sellerWalletEnvVar - name of env var holding this agent's wallet address
 * @returns Express middleware factory with .require(price) method
 */
export function createAgentGateway(sellerWalletEnvVar) {
  const sellerAddress = process.env[sellerWalletEnvVar];
  if (!sellerAddress) {
    throw new Error(`${sellerWalletEnvVar} is not set in environment`);
  }

  // Arc Testnet chain ID: eip155:5042002
  // Hosted testnet facilitator handles verification + settlement
  const gateway = createGatewayMiddleware({
    sellerAddress,
    facilitatorUrl: "https://gateway-api-testnet.circle.com",
    networks: ["eip155:5042002"],
  });

  return gateway;
}
