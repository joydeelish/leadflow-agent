// LeadFlow Orchestrator Agent
// Accepts optional business config for per-business scoring prompts and thresholds

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../config/.env") });

import { pay } from "../../payments/arc.js";
import { deliverLeadViaWhatsApp } from "../delivery/whatsapp.js";
import { INDUSTRY_PROMPTS } from "../../business/store.js";

const DEFAULT_THRESHOLD = Number(process.env.QUALIFY_THRESHOLD) || 70;
const DEFAULT_WHATSAPP  = process.env.BUSINESS_WHATSAPP_NUMBER;

const ENRICHMENT_URL = process.env.ENRICHMENT_AGENT_URL || "http://localhost:3001/enrich";
const SCORING_URL    = process.env.SCORING_AGENT_URL    || "http://localhost:3002/score";

/**
 * Process a lead through the full pipeline.
 * @param {object} lead     - Raw lead data
 * @param {object} business - Optional business config from store
 */
export async function processLead(lead, business = null) {
  const threshold  = business?.qualifyThreshold ?? DEFAULT_THRESHOLD;
  const waNumber   = business?.whatsappNumber   ?? DEFAULT_WHATSAPP;
  const industry   = business?.industry         ?? "real_estate";
  const bizName    = business?.name             ?? "LeadFlow Demo";
  const prompt     = INDUSTRY_PROMPTS[industry]?.prompt ?? INDUSTRY_PROMPTS.real_estate.prompt;

  console.log(`\n[Orchestrator] ── New lead: ${lead.email} → ${bizName} (${industry}) ──`);

  // Step 1: Enrich
  console.log("[Orchestrator] Step 1: Paying Enrichment Agent $0.01 USDC...");
  const enriched = await pay(ENRICHMENT_URL, 0.01, lead);
  console.log(`[Orchestrator] ✓ Enriched — ${enriched.company} · ${enriched.jobTitle}`);

  // Step 2: Score using business-specific prompt
  console.log("[Orchestrator] Step 2: Paying Scoring Agent $0.01 USDC...");
  const scoreResult = await pay(SCORING_URL, 0.01, { ...enriched, scoringPrompt: prompt });
  const { score, reason, tier } = scoreResult;
  console.log(`[Orchestrator] ✓ Scored — ${score}/100 (${tier})`);

  // Step 3: Deliver if qualified
  if (score >= threshold) {
    console.log(`[Orchestrator] ✅ QUALIFIED (${score} >= ${threshold}) — delivering to ${bizName}`);
    if (waNumber) {
      await deliverLeadViaWhatsApp(enriched, scoreResult, waNumber, bizName);
    } else {
      console.warn("[Orchestrator] No WhatsApp number set — skipping delivery");
    }
    return { qualified: true, score, tier, reason, data: enriched };
  }

  console.log(`[Orchestrator] ❌ Did not qualify (${score} < ${threshold})`);
  return { qualified: false, score, tier, reason };
}
