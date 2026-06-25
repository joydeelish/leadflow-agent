// Arc Payment Module - Buyer Side
// Uses Circle Gateway x402 nanopayments for gas-free USDC settlement on Arc Testnet
// Docs: https://www.npmjs.com/package/@circle-fin/x402-batching

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
 * Pay an agent endpoint via Arc Gateway x402 nanopayment.
 *
 * Flow (handled automatically by GatewayClient):
 *   1. POST to agentUrl with body
 *   2. Agent returns 402 + PAYMENT-REQUIRED header
 *   3. Client signs EIP-3009 TransferWithAuthorization offchain (no gas)
 *   4. Client retries with Payment-Signature header
 *   5. Agent verifies via Circle Gateway facilitator
 *   6. Agent returns 200 + response data
 *
 * @param {string} agentUrl  - The x402-protected endpoint
 * @param {number} amountUSDC - Price in USDC (for logging only; enforced by agent)
 * @param {object} body       - JSON body to send to the agent
 * @returns {object}          - Parsed JSON response from the agent
 */
export async function pay(agentUrl, amountUSDC, body = {}) {
  const client = getClient();
  console.log(`[Arc] Paying $${amountUSDC} USDC → ${agentUrl}`);

  const { data, status } = await client.pay(agentUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (status !== 200) {
    throw new Error(`[Arc] Agent at ${agentUrl} returned status ${status}`);
  }

  console.log(`[Arc] ✓ Payment settled — $${amountUSDC} USDC`);
  return data;
}

export async function getBalance() {
  const client = getClient();
  const balances = await client.getBalances();
  console.log(`[Arc] Gateway balance: ${balances.gateway.formattedAvailable} USDC`);
  console.log(`[Arc] Wallet balance:  ${balances.wallet.formatted} USDC`);
  return balances;
}

export async function depositToGateway(amountUSDC) {
  const client = getClient();
  console.log(`[Arc] Depositing ${amountUSDC} USDC into Gateway...`);
  const deposit = await client.deposit(amountUSDC);
  console.log(`[Arc] Deposit tx: ${deposit.depositTxHash}`);
  return deposit;
}
