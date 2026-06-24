// Arc Payment Module — Buyer Side
// Uses Circle Gateway x402 nanopayments for gas-free USDC settlement on Arc Testnet
// Docs: https://developers.circle.com/gateway/nanopayments

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
 * @param {string} agentUrl - The x402-protected endpoint of the specialist agent
 * @param {number} amountUSDC - Expected price in USDC (e.g. 0.01)
 * @returns {object} - The JSON response from the agent
 */
export async function pay(agentUrl, amountUSDC) {
  const client = getClient();

  console.log(`[Arc] Paying $${amountUSDC} USDC → ${agentUrl}`);

  // Check if the agent supports Gateway payments before attempting
  const support = await client.supports(agentUrl);
  if (!support.supported) {
    throw new Error(`Agent at ${agentUrl} does not support Gateway nanopayments`);
  }

  const { data, status } = await client.pay(agentUrl);

  if (status !== 200) {
    throw new Error(`Payment failed: agent returned status ${status}`);
  }

  console.log(`[Arc] Payment confirmed ✓ $${amountUSDC} USDC settled`);
  return data;
}

/**
 * Get current Gateway wallet balance
 */
export async function getBalance() {
  const client = getClient();
  const balances = await client.getBalances();
  console.log(`[Arc] Gateway balance: ${balances.gateway.formattedAvailable} USDC`);
  console.log(`[Arc] Wallet balance:  ${balances.wallet.formatted} USDC`);
  return balances;
}

/**
 * Deposit USDC into Gateway wallet (one-time setup per orchestrator wallet)
 * @param {string} amountUSDC - Amount to deposit e.g. "10"
 */
export async function depositToGateway(amountUSDC) {
  const client = getClient();
  console.log(`[Arc] Depositing ${amountUSDC} USDC into Gateway...`);
  const deposit = await client.deposit(amountUSDC);
  console.log(`[Arc] Deposit tx: ${deposit.depositTxHash}`);
  return deposit;
}
