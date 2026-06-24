// Arc Gateway Seller Middleware
// Wraps specialist agent routes with x402 payment gating
// Docs: https://developers.circle.com/gateway/nanopayments/quickstarts/seller

import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";

/**
 * Create a payment-gated Express middleware for a specialist agent.
 * @param {string} sellerWalletEnvVar - env var name holding this agent's wallet address
 * @returns {object} - { gateway, require } for use in Express routes
 */
export function createAgentGateway(sellerWalletEnvVar) {
  const sellerAddress = process.env[sellerWalletEnvVar];
  if (!sellerAddress) {
    throw new Error(`${sellerWalletEnvVar} is not set in environment`);
  }

  const gateway = createGatewayMiddleware({
    sellerAddress,
    facilitatorUrl: "https://gateway-api-testnet.circle.com",
    networks: ["eip155:5042002"], // Arc Testnet chain ID
  });

  return gateway;
}
