// Arc Payment Module - Buyer Side
// Uses Circle Gateway x402 nanopayments for gas-free USDC settlement on Arc Testnet

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import { GatewayClient } from "@circle-fin/x402-batching/client";

let _client = null;

function getClient() {
  if (!_client) {
    if (!process.env.ARC_PRIVATE_KEY) {
      throw new Error("ARC_PRIVATE_KEY is not set in environment");
    }
    _client = new GatewayClient({
      chain: "arcTestnet",
      privateKey: process.env.ARC_PRIVATE_KEY,
    });
  }
  return _client;
}

export async function pay(agentUrl, amountUSDC) {
  const client = getClient();
  console.log("[Arc] Paying $" + amountUSDC + " USDC to " + agentUrl);

  const support = await client.supports(agentUrl);
  if (!support.supported) {
    throw new Error("Agent at " + agentUrl + " does not support Gateway nanopayments");
  }

  const { data, status } = await client.pay(agentUrl);
  if (status !== 200) {
    throw new Error("Payment failed: agent returned status " + status);
  }

  console.log("[Arc] Payment confirmed - $" + amountUSDC + " USDC settled");
  return data;
}

export async function getBalance() {
  const client = getClient();
  const balances = await client.getBalances();
  console.log("[Arc] Gateway balance: " + balances.gateway.formattedAvailable + " USDC");
  console.log("[Arc] Wallet balance:  " + balances.wallet.formatted + " USDC");
  return balances;
}

export async function depositToGateway(amountUSDC) {
  const client = getClient();
  console.log("[Arc] Depositing " + amountUSDC + " USDC into Gateway...");
  const deposit = await client.deposit(amountUSDC);
  console.log("[Arc] Deposit tx: " + deposit.depositTxHash);
  return deposit;
}
