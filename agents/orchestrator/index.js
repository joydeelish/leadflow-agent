// LeadFlow Orchestrator Agent
// Routes leads through specialist agents using Arc Gateway x402 nanopayments

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../config/.env") });

import { pay } from "../../payments/arc.js";

const QUALIFY_THRESHOLD = Number(process.env.QUALIFY_THRESHOLD) || 70;

const ENRICHMENT_URL = process.env.ENRICHMENT_AGENT_URL || "http://localhost:3001/enrich";
const SCORING_URL    = process.env.SCORING_AGENT_URL    || "http://localhost:3002/score";

export async function processLead(lead) {
  console.log("[Orchestrator] New lead: " + lead.email);

  // Step 1: Pay enrichment agent $0.01 USDC, send lead data, get enriched profile
  console.log("[Orchestrator] Step 1: Paying Enrichment Agent...");
  const enriched = await pay(ENRICHMENT_URL, 0.01, lead);
  console.log("[Orchestrator] Enrichment complete - company: " + enriched.company);

  // Step 2: Pay scoring agent $0.01 USDC, send enriched data, get score
  console.log("[Orchestrator] Step 2: Paying Scoring Agent...");
  const { score, reason, tier } = await pay(SCORING_URL, 0.01, enriched);
  console.log("[Orchestrator] Score: " + score + "/100 (" + tier + ")");

  if (score >= QUALIFY_THRESHOLD) {
    console.log("[Orchestrator] Lead QUALIFIED - delivering to business");
    return { qualified: true, score, tier, reason, data: enriched };
  }

  console.log("[Orchestrator] Lead did not qualify (score: " + score + ", threshold: " + QUALIFY_THRESHOLD + ")");
  return { qualified: false, score, tier, reason };
}
