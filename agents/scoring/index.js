// Scoring Agent - Seller Side
// POST /score — payment-gated at $0.01 USDC via Arc Gateway x402
// Uses scoringPrompt from request body if provided (per-business config)

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../config/.env") });

import express from "express";
import OpenAI from "openai";
import { createAgentGateway } from "../../payments/gatewayMiddleware.js";
import { INDUSTRY_PROMPTS } from "../../business/store.js";

const app = express();
app.use(express.json());

const gateway = createAgentGateway("SCORING_AGENT_WALLET");
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_PROMPT = INDUSTRY_PROMPTS.real_estate.prompt;

app.post("/score", gateway.require("$0.01"), async (req, res) => {
  const { scoringPrompt, ...enrichedLead } = req.body;
  const prompt = scoringPrompt || DEFAULT_PROMPT;

  console.log(`[Scoring] Scoring: ${enrichedLead.email} | Paid by: ${req.payment?.payer}`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 256,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `Score this lead:\n${JSON.stringify(enrichedLead, null, 2)}` },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content);
  console.log(`[Scoring] Score: ${result.score}/100 (${result.tier})`);
  res.json(result);
});


app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'scoring-agent', ts: new Date().toISOString() });
});

const PORT = process.env.SCORING_PORT || 3002;
app.listen(PORT, () => {
  console.log(`[Scoring Agent] Running on port ${PORT} — $0.01 USDC/call`);
});

export { app };
