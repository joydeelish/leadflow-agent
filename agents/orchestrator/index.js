// LeadFlow Orchestrator Agent
// Receives leads, coordinates specialist agents, settles payments on Arc

const { enrichLead } = require("../enrichment");
const { scoreLead } = require("../scoring");
const { pay } = require("../../payments/arc");

const ENRICHMENT_COST = 0.01;   // USDC
const SCORING_COST = 0.01;       // USDC
const QUALIFY_THRESHOLD = 70;    // score out of 100

async function processLead(lead) {
  console.log(`[Orchestrator] Processing lead: ${lead.email}`);

  // Step 1: Pay enrichment agent and get enriched data
  await pay(process.env.ENRICHMENT_AGENT_WALLET, ENRICHMENT_COST);
  const enriched = await enrichLead(lead);
  console.log(`[Orchestrator] Lead enriched`, enriched);

  // Step 2: Pay scoring agent and get score
  await pay(process.env.SCORING_AGENT_WALLET, SCORING_COST);
  const { score, reason } = await scoreLead(enriched);
  console.log(`[Orchestrator] Lead scored: ${score}/100 — ${reason}`);

  if (score >= QUALIFY_THRESHOLD) {
    console.log(`[Orchestrator] Lead qualified. Delivering to business.`);
    // TODO: deliver to WhatsApp / CRM + charge business wallet
    return { qualified: true, score, data: enriched };
  }

  console.log(`[Orchestrator] Lead did not qualify (score: ${score})`);
  return { qualified: false, score };
}

module.exports = { processLead };
