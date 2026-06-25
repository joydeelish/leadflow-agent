// Scoring Agent - Seller Side
// POST /score — payment-gated at $0.01 USDC via Arc Gateway x402
// Uses OpenAI gpt-4o-mini to score enriched lead data

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../config/.env") });

import express from "express";
import OpenAI from "openai";
import { createAgentGateway } from "../../payments/gatewayMiddleware.js";

const app = express();
app.use(express.json());

const gateway = createAgentGateway("SCORING_AGENT_WALLET");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/score", gateway.require("$0.01"), async (req, res) => {
  const enrichedLead = req.body;
  console.log(`[Scoring] Scoring: ${enrichedLead.email} | Paid by: ${req.payment?.payer}`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 256,
    messages: [
      {
        role: "system",
        content:
          "You are a lead qualification expert for real estate businesses in Nigeria. " +
          "Score leads from 0-100 based on likelihood to convert to a property purchase. " +
          "Consider: budget signals, job title, company size, location, and message intent. " +
          'Return ONLY valid JSON: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }',
      },
      {
        role: "user",
        content: `Score this lead:\n${JSON.stringify(enrichedLead, null, 2)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content);
  console.log(`[Scoring] Score: ${result.score}/100 (${result.tier})`);
  res.json(result);
});

const PORT = process.env.SCORING_PORT || 3002;
app.listen(PORT, () => {
  console.log(`[Scoring Agent] Running on port ${PORT} — $0.01 USDC/call`);
});

export { app };
