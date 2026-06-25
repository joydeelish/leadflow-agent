// Enrichment Agent - Seller Side
// POST /enrich — payment-gated at $0.01 USDC via Arc Gateway x402
// Uses OpenAI web search to enrich raw lead data

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

const gateway = createAgentGateway("ENRICHMENT_AGENT_WALLET");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/enrich", gateway.require("$0.01"), async (req, res) => {
  const lead = req.body;
  console.log(`[Enrichment] Processing: ${lead.email} | Paid by: ${req.payment?.payer}`);

  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input:
        `Search the web and find professional information about this person. ` +
        `Name: ${lead.name || "unknown"}, Email: ${lead.email || "unknown"}. ` +
        `Return ONLY a JSON object with these exact fields: ` +
        `{ "company": string|null, "jobTitle": string|null, "industry": string|null, ` +
        `"companySize": string|null, "location": string|null, "linkedIn": string|null, "notes": string|null }. ` +
        `No extra text. Just the JSON object.`,
    });

    const raw = response.output
      .filter((b) => b.type === "message")
      .flatMap((b) => b.content.filter((c) => c.type === "output_text").map((c) => c.text))
      .join("");

    const match = raw.match(/\{[\s\S]*\}/);
    const enrichmentData = match ? JSON.parse(match[0]) : {};

    const enriched = {
      ...lead,
      company: enrichmentData.company || null,
      jobTitle: enrichmentData.jobTitle || null,
      industry: enrichmentData.industry || null,
      companySize: enrichmentData.companySize || null,
      location: enrichmentData.location || lead.location || null,
      linkedIn: enrichmentData.linkedIn || null,
      notes: enrichmentData.notes || null,
      enrichedAt: new Date().toISOString(),
      enrichedBy: "LeadFlow Enrichment Agent v1",
    };

    console.log(`[Enrichment] Done — company: ${enriched.company}, title: ${enriched.jobTitle}`);
    res.json(enriched);
  } catch (err) {
    console.error(`[Enrichment] Error: ${err.message}`);
    res.json({
      ...lead,
      enrichedAt: new Date().toISOString(),
      enrichedBy: "LeadFlow Enrichment Agent v1 (fallback)",
      enrichmentError: err.message,
    });
  }
});

const PORT = process.env.ENRICHMENT_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Enrichment Agent] Running on port ${PORT} — $0.01 USDC/call`);
});

export { app };
