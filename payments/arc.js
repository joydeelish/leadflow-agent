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

/**
 * Pay an agent for a service via Arc Gateway x402 nanopayment.
 * Sends the request directly - the agent returns 402 if payment is needed,
 * the client signs offchain and retries automatically.
 *
 * @param {string} agentUrl - The x402-protected endpoint of the specialist agent
 * @param {number} amountUSDC - Expected price in USDC (e.g. 0.01)
 * @param {object} body - Request body to send to the agent
 * @returns {object} - The JSON response from the agent
 */
export async function pay(agentUrl, amountUSDC, body = {}) {
  const client = getClient();
  console.log("[Arc] Paying $" + amountUSDC + " USDC to " + agentUrl);

  try {
    const { data, status } = await client.pay(agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (status !== 200) {
      throw new Error("Agent returned status " + status);
    }

    console.log("[Arc] Payment confirmed - $" + amountUSDC + " USDC settled");
    return data;

  } catch (err) {
    // If Gateway payment fails, fall back to direct call for local dev
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Arc] Gateway pay failed, falling back to direct call: " + err.message);
      const res = await fetch(agentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Direct call failed: " + res.status);
      return res.json();
    }
    throw err;
  }
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
