// Setup Script - run once before first use
// Checks Gateway balance and deposits USDC if needed
// Usage: node scripts/setupWallet.js

import "dotenv/config";
import { getBalance, depositToGateway } from "../payments/arc.js";

const MIN_BALANCE_USDC = 1;

async function setup() {
  console.log("=== LeadFlow Agent - Wallet Setup ===");

  const balances = await getBalance();
  const available = Number(balances.gateway.formattedAvailable);

  if (available < MIN_BALANCE_USDC) {
    console.log("Gateway balance low. Depositing " + MIN_BALANCE_USDC + " USDC...");
    console.log("Note: You need testnet USDC from https://faucet.circle.com first.");
    await depositToGateway(String(MIN_BALANCE_USDC));
    console.log("Deposit complete. Re-checking balance...");
    await getBalance();
  } else {
    console.log("Gateway balance sufficient: " + available + " USDC");
    console.log("You are ready to process leads.");
  }
}

setup().catch(console.error);
