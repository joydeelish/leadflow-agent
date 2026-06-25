// LeadFlow Orchestrator Agent
// Coordinates enrichment → scoring → delivery via Arc Gateway x402 nanopayments

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../config/.env") });

import { pay } from "../../payments/arc.js";
import { deliverLeadViaWhatsApp } from "../delivery/whatsapp.js";

const QUALIFY_THRESHOLD = Number(process.env.QUALIFY_THRESHOLD) || 70;
const BUSINESS_WHATSAPP = process.env.BUSINESS_WHATSAPP_NUMBER;

const ENRICHMENT_URL = process.env.ENRICHMENT_AGENT_URL || "http://localhost:3001/enrich";
const SCORING_URL    = process.env.SCORING_AGENT_URL    || "http://localhost:3002/score";

/**
 * Full lead processing pipeline:
 * 1. Pay Enrichment Agent $0.01 USDC → get enriched profile
 * 2. Pay Scoring Agent $0.01 USDC → get qualification score
 * 3. If score >= threshold → deliver to business via WhatsApp
 *
 * Total cost per lead: ~$0.02 USDC
 * Revenue per qualified lead: $0.50–$2.00 USDC (charge business client)
 */
export async function processLead(lead) {
  console.log(`\n[Orchestrator] ── New lead: ${lead.email} ──`);

  // Step 1: Enrich
  console.log("[Orchestrator] Step 1: Paying Enrichment Agent $0.01 USDC...");
  const enriched = await pay(ENRICHMENT_URL, 0.01, lead);
  console.log(`[Orchestrator] ✓ Enriched — company: ${enriched.company}, title: ${enriched.jobTitle}`);

  // Step 2: Score
  console.log("[Orchestrator] Step 2: Paying Scoring Agent $0.01 USDC...");
  const scoreResult = await pay(SCORING_URL, 0.01, enriched);
  const { score, reason, tier } = scoreResult;
  console.log(`[Orchestrator] ✓ Scored — ${score}/100 (${tier})`);

  // Step 3: Deliver if qualified
  if (score >= QUALIFY_THRESHOLD) {
    console.log(`[Orchestrator] ✅ QUALIFIED (${score} >= ${QUALIFY_THRESHOLD}) — delivering to business`);

    if (BUSINESS_WHATSAPP) {
      await deliverLeadViaWhatsApp(enriched, scoreResult, BUSINESS_WHATSAPP);
    } else {
      console.warn("[Orchestrator] BUSINESS_WHATSAPP_NUMBER not set — skipping WhatsApp delivery");
    }

    return { qualified: true, score, tier, reason, data: enriched };
  }

  console.log(`[Orchestrator] ❌ Did not qualify (${score} < ${QUALIFY_THRESHOLD})`);
  return { qualified: false, score, tier, reason };
}
