// Lead Intake Webhook
// Receives leads from the frontend form or Facebook Lead Ads

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import express from "express";
import { processLead } from "../agents/orchestrator/index.js";

const router = express.Router();

router.post("/lead", async (req, res) => {
  try {
    const lead = req.body;
    console.log("[Intake] New lead received:", lead.email);
    const result = await processLead(lead);
    res.json({ success: true, result });
  } catch (err) {
    console.error("[Intake] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
