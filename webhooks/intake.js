// Lead Intake Webhook
// Receives leads from Facebook Lead Ads or web forms

const express = require("express");
const { processLead } = require("../agents/orchestrator");

const router = express.Router();

router.post("/lead", async (req, res) => {
  try {
    const lead = req.body;
    const result = await processLead(lead);
    res.json({ success: true, result });
  } catch (err) {
    console.error("[Intake] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
