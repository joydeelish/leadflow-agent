// Arc Gateway Seller Middleware

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localEnv  = resolve(__dirname, "../config/.env");
const rootEnv   = resolve(__dirname, "../.env");
dotenv.config({ path: existsSync(localEnv) ? localEnv : rootEnv });

import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";

export function createAgentGateway(sellerWalletEnvVar) {
  const sellerAddress = process.env[sellerWalletEnvVar];
  if (!sellerAddress) {
    throw new Error(`${sellerWalletEnvVar} is not set in environment`);
  }

  const gateway = createGatewayMiddleware({
    sellerAddress,
    facilitatorUrl: "https://gateway-api-testnet.circle.com",
    networks: ["eip155:5042002"],
  });

  return gateway;
}
