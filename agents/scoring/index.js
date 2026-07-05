// Scoring Agent - Seller Side
// POST /score — payment-gated at $0.01 USDC via Arc Gateway x402

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localEnv  = resolve(__dirname, "../../config/.env");
const rootEnv   = resolve(__dirname, "../../.env");
dotenv.config({ path: existsSync(localEnv) ? localEnv : rootEnv });

import express from "express";
import OpenAI from "openai";
import { createAgentGateway } from "../../payments/gatewayMiddleware.js";
import { INDUSTRY_PROMPTS } from "../../business/store.js";

const app = express();
app.use(express.json());

const gateway = createAgentGateway("SCORING_AGENT_WALLET");
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DEFAULT_PROMPT = INDUSTRY_PROMPTS.real_estate.prompt;

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "scoring-agent" });
});

app.post("/score", gateway.require("$0.01"), async (req, res) => {
  const { scoringPrompt, ...enrichedLead } = req.body;
  const prompt = scoringPrompt || DEFAULT_PROMPT;

  console.log(`[Scoring] Scoring: ${enrichedLead.email}`);

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

const PORT = process.env.SCORING_PORT || process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[Scoring Agent] Running on port ${PORT}`);
});

export { app };
