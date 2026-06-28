// Lead Intake Webhook
// POST /api/lead          — generic lead (uses default config from .env)
// POST /api/lead/:bizId   — business-specific lead (uses business config)
// GET  /api/webhook       — Facebook Lead Ads verification
// POST /api/webhook       — Facebook Lead Ads lead delivery

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import express from "express";
import { processLead } from "../agents/orchestrator/index.js";
import { getBusiness, updateBusinessStats } from "../business/store.js";

const router = express.Router();

// ── Generic lead (default config) ──────────────────────────────────────────
router.post("/lead", async (req, res) => {
  try {
    const lead = req.body;
    console.log("[Intake] Generic lead:", lead.email);
    const result = await processLead(lead);
    res.json({ success: true, result });
  } catch (err) {
    console.error("[Intake] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Business-specific lead ──────────────────────────────────────────────────
router.post("/lead/:bizId", async (req, res) => {
  try {
    const { bizId } = req.params;
    const business = getBusiness(bizId);

    if (!business) {
      return res.status(404).json({ success: false, error: "Business not found" });
    }

    const lead = { ...req.body, bizId, businessName: business.name };
    console.log(`[Intake] Lead for ${business.name} (${business.industry}):`, lead.email);

    const result = await processLead(lead, business);
    updateBusinessStats(bizId, result.qualified);

    res.json({ success: true, result, business: business.name });
  } catch (err) {
    console.error("[Intake] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Facebook Lead Ads — Verification ───────────────────────────────────────
router.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    console.log("[Facebook] Webhook verified ✓");
    return res.status(200).send(challenge);
  }

  console.warn("[Facebook] Webhook verification failed — token mismatch");
  res.sendStatus(403);
});

// ── Facebook Lead Ads — Lead Delivery ──────────────────────────────────────
router.post("/webhook", async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== "page") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId    = change.value?.form_id;
        const bizId     = change.value?.ad_id; // map ad_id to bizId if set

        console.log(`[Facebook] New leadgen event — leadgen_id: ${leadgenId}`);

        // Fetch lead details from Meta Graph API
        const metaRes = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${process.env.WHATSAPP_TOKEN}`
        );
        const metaData = await metaRes.json();

        if (!metaData.field_data) {
          console.warn("[Facebook] No field_data in lead response");
          continue;
        }

        // Parse Meta field_data into a flat lead object
        const lead = { source: "Facebook Lead Ad", formId };
        for (const field of metaData.field_data) {
          const key = field.name.toLowerCase().replace(/\s+/g, "_");
          lead[key] = field.values?.[0] || null;
        }

        // Normalize common field names
        lead.name    = lead.full_name || lead.name || null;
        lead.email   = lead.email || null;
        lead.phone   = lead.phone_number || lead.phone || null;
        lead.message = lead.message || lead.comments || null;

        console.log("[Facebook] Lead parsed:", lead.email);

        // Route to business if bizId found, else use default
        const business = bizId ? getBusiness(bizId) : null;
        const result   = await processLead(lead, business || undefined);

        if (business) updateBusinessStats(bizId, result.qualified);
      }
    }
  } catch (err) {
    console.error("[Facebook] Processing error:", err.message);
  }
});

export default router;
