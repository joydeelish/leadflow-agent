// Scoring Agent — Seller Side
// Exposes a paid endpoint at POST /score (price: $0.01 USDC)
// Payment settled via Arc Gateway x402 nanopayments

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createAgentGateway } from "../../payments/gatewayMiddleware.js";

const app = express();
app.use(express.json());

const gateway = createAgentGateway("SCORING_AGENT_WALLET");
const anthropic = new Anthropic();

/**
 * POST /score — payment-gated lead scoring endpoint
 * Accepts enriched lead data and returns a qualification score (0-100).
 * Price: $0.01 USDC per call, settled on Arc Testnet.
 */
app.post("/score", gateway.require("$0.01"), async (req, res) => {
  const enrichedLead = req.body;
  console.log(`[Scoring] Scoring lead: ${enrichedLead.email} | Paid by: ${req.payment?.payer}`);

  const prompt = `You are a lead qualification expert for real estate businesses in Nigeria.
Score this lead from 0 to 100 based on likelihood to convert to a property purchase.
Consider: budget signals, company size, location, engagement, and intent.
Return ONLY valid JSON with no extra text: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }

Lead data:
${JSON.stringify(enrichedLead, null, 2)}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const result = JSON.parse(response.content[0].text.trim());
  console.log(`[Scoring] Score: ${result.score}/100 (${result.tier}) — ${result.reason}`);
  res.json(result);
});

const PORT = process.env.SCORING_PORT || 3002;
app.listen(PORT, () => {
  console.log(`[Scoring Agent] Running on port ${PORT} — payment: $0.01 USDC/call`);
});

export { app };
