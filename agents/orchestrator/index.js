// LeadFlow Orchestrator Agent
// Routes leads through specialist agents using Arc Gateway x402 nanopayments
// Each agent handoff costs $0.01 USDC settled on Arc Testnet

import { pay } from "../../payments/arc.js";

const QUALIFY_THRESHOLD = 70; // score out of 100

// Agent endpoint URLs (override via .env for production)
const ENRICHMENT_URL = process.env.ENRICHMENT_AGENT_URL || "http://localhost:3001/enrich";
const SCORING_URL    = process.env.SCORING_AGENT_URL    || "http://localhost:3002/score";

/**
 * Process a raw lead through the full payment-gated pipeline.
 * Total cost per lead: ~$0.02 USDC in agent fees.
 * Revenue per qualified lead: $0.50–$2.00 USDC from business client.
 *
 * @param {object} lead - { name, email, phone, message, location, ... }
 * @returns {object} - { qualified, score, tier, data }
 */
export async function processLead(lead) {
  console.log(`
[Orchestrator] ── New lead: ${lead.email} ──`);

  // Step 1: Pay enrichment agent $0.01 USDC → get enriched profile
  console.log("[Orchestrator] Step 1: Paying Enrichment Agent...");
  const enriched = await pay(ENRICHMENT_URL, 0.01);
  console.log("[Orchestrator] Enrichment complete ✓");

  // Step 2: Pay scoring agent $0.01 USDC → get qualification score
  console.log("[Orchestrator] Step 2: Paying Scoring Agent...");
  const { score, reason, tier } = await pay(SCORING_URL, 0.01);
  console.log(`[Orchestrator] Score: ${score}/100 (${tier})`);

  if (score >= QUALIFY_THRESHOLD) {
    console.log("[Orchestrator] ✅ Lead QUALIFIED — delivering to business");
    // TODO: charge business wallet $0.50–$2 USDC via Arc
    // TODO: send to WhatsApp / CRM
    return { qualified: true, score, tier, reason, data: enriched };
  }

  console.log(`[Orchestrator] ❌ Lead did not qualify (score: ${score}, threshold: ${QUALIFY_THRESHOLD})`);
  return { qualified: false, score, tier, reason };
}
