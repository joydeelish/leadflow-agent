// Lead Intake Webhook
// POST /api/lead          — generic lead (default config)
// POST /api/lead/:bizId   — business-specific lead
// GET  /api/webhook       — Facebook verification challenge
// POST /api/webhook       — Facebook Lead Ads delivery

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import express from "express";
import { processLead } from "../agents/orchestrator/index.js";
import { getBusiness, updateBusinessStats } from "../business/store.js";

const router = express.Router();

// ── Generic lead ────────────────────────────────────────────────────────────
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

// ── Facebook Webhook — Verification ────────────────────────────────────────
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

// ── Facebook Webhook — Lead Delivery ────────────────────────────────────────
router.post("/webhook", async (req, res) => {
  res.sendStatus(200); // always respond immediately

  try {
    const body = req.body;
    if (body.object !== "page") return;

    for (const entry of body.entry || []) {
      const pageId = entry.id;

      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId    = change.value?.form_id;

        console.log(`[Facebook] Leadgen event — page: ${pageId}, leadgen_id: ${leadgenId}`);

        // Find business by pageId so we use their own page token
        const allBusinesses = (await import("../business/store.js")).getAllBusinesses();
        const business = allBusinesses.find(b => b.pageId === pageId) || null;
        const accessToken = business?.pageToken || process.env.WHATSAPP_TOKEN;

        if (!accessToken) {
          console.warn("[Facebook] No access token available for page:", pageId);
          continue;
        }

        // Fetch lead details from Meta Graph API using the business's own page token
        const metaRes  = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`
        );
        const metaData = await metaRes.json();

        if (!metaData.field_data) {
          console.warn("[Facebook] No field_data in response:", JSON.stringify(metaData));
          continue;
        }

        // Parse field_data into flat lead object
        const lead = { source: "Facebook Lead Ad", formId };
        for (const field of metaData.field_data) {
          const key = field.name.toLowerCase().replace(/\s+/g, "_");
          lead[key] = field.values?.[0] || null;
        }

        // Normalize field names
        lead.name    = lead.full_name || lead.name || null;
        lead.email   = lead.email || null;
        lead.phone   = lead.phone_number || lead.phone || null;
        lead.message = lead.message || lead.comments || null;

        console.log("[Facebook] Lead parsed:", lead.email, "→", business?.name || "default");

        const result = await processLead(lead, business || undefined);
        if (business) updateBusinessStats(business.id, result.qualified);
      }
    }
  } catch (err) {
    console.error("[Facebook] Processing error:", err.message);
  }
});

export default router;
