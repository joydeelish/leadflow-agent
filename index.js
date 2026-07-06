import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localEnv  = resolve(__dirname, "./config/.env");
dotenv.config({ path: existsSync(localEnv) ? localEnv : resolve(__dirname, ".env") });

import express from "express";
import OpenAI from "openai";
import { createAgentGateway } from "./payments/gatewayMiddleware.js";
import { INDUSTRY_PROMPTS } from "./business/store.js";
import intakeRouter from "./webhooks/intake.js";
import onboardingRouter from "./webhooks/onboarding.js";
import oauthRouter from "./webhooks/oauth.js";
import { deliverLeadViaWhatsApp } from "./agents/delivery/whatsapp.js";
import { pay } from "./payments/arc.js";

// ── Main App (frontend + API) ───────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "leadflow-all-in-one", ts: new Date().toISOString() });
});

app.use(express.static(join(__dirname, "public")));

app.get("/config.js", (req, res) => {
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  res.setHeader("Content-Type", "application/javascript");
  res.send(`window.APP_URL = "${appUrl}";`);
});

app.use("/api", intakeRouter);
app.use("/api", onboardingRouter);
app.use("/api", oauthRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Main] LeadFlow running on port ${PORT}`);
});

// ── Enrichment Agent (internal, no payment gate in single-service mode) ─────
const enrichApp = express();
enrichApp.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

enrichApp.get("/health", (req, res) => res.json({ status: "ok", service: "enrichment" }));

enrichApp.post("/enrich", async (req, res) => {
  const lead = req.body;
  console.log(`[Enrichment] Processing: ${lead.email}`);
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input:
        `Search the web and find professional information about this person. ` +
        `Name: ${lead.name || "unknown"}, Email: ${lead.email || "unknown"}. ` +
        `Return ONLY a JSON object: { "company": string|null, "jobTitle": string|null, ` +
        `"industry": string|null, "companySize": string|null, "location": string|null, ` +
        `"linkedIn": string|null, "notes": string|null }. No extra text.`,
    });

    const raw = response.output
      .filter((b) => b.type === "message")
      .flatMap((b) => b.content.filter((c) => c.type === "output_text").map((c) => c.text))
      .join("");

    const match = raw.match(/\{[\s\S]*\}/);
    const data  = match ? JSON.parse(match[0]) : {};

    res.json({
      ...lead,
      company:     data.company     || null,
      jobTitle:    data.jobTitle    || null,
      industry:    data.industry    || null,
      companySize: data.companySize || null,
      location:    data.location    || lead.location || null,
      linkedIn:    data.linkedIn    || null,
      notes:       data.notes       || null,
      enrichedAt:  new Date().toISOString(),
      enrichedBy:  "LeadFlow Enrichment Agent v1",
    });
  } catch (err) {
    console.error(`[Enrichment] Error: ${err.message}`);
    res.json({ ...lead, enrichedAt: new Date().toISOString(), enrichmentError: err.message });
  }
});

const ENRICHMENT_PORT = process.env.ENRICHMENT_PORT || 3001;
enrichApp.listen(ENRICHMENT_PORT, () => {
  console.log(`[Enrichment] Running on port ${ENRICHMENT_PORT}`);
});

// ── Scoring Agent (internal, no payment gate in single-service mode) ────────
const scoreApp = express();
scoreApp.use(express.json());

const DEFAULT_PROMPT = INDUSTRY_PROMPTS.real_estate.prompt;

scoreApp.get("/health", (req, res) => res.json({ status: "ok", service: "scoring" }));

scoreApp.post("/score", async (req, res) => {
  const { scoringPrompt, ...enrichedLead } = req.body;
  const prompt = scoringPrompt || DEFAULT_PROMPT;
  console.log(`[Scoring] Scoring: ${enrichedLead.email}`);

  try {
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
  } catch (err) {
    console.error(`[Scoring] Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const SCORING_PORT = process.env.SCORING_PORT || 3002;
scoreApp.listen(SCORING_PORT, () => {
  console.log(`[Scoring] Running on port ${SCORING_PORT}`);
});
