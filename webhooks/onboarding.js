// Business Onboarding API
// POST /api/onboard — register a new business and get a unique webhook URL

import express from "express";
import { createBusiness, getAllBusinesses, INDUSTRY_PROMPTS } from "../business/store.js";

const router = express.Router();

// Register a new business
router.post("/onboard", (req, res) => {
  const { name, industry, qualifyThreshold, whatsappNumber } = req.body;

  if (!name || !industry || !whatsappNumber) {
    return res.status(400).json({
      success: false,
      error: "name, industry, and whatsappNumber are required"
    });
  }

  if (!INDUSTRY_PROMPTS[industry]) {
    return res.status(400).json({
      success: false,
      error: `Unknown industry. Valid options: ${Object.keys(INDUSTRY_PROMPTS).join(", ")}`
    });
  }

  const business = createBusiness(name, industry, qualifyThreshold, whatsappNumber);

  console.log(`[Onboarding] New business registered: ${business.name} (${business.id})`);

  res.json({
    success: true,
    business: {
      id: business.id,
      name: business.name,
      industry: INDUSTRY_PROMPTS[industry].label,
      qualifyThreshold: business.qualifyThreshold,
      webhookUrl: business.webhookUrl,
      message: `Your lead pipeline is ready. Send leads to POST /api/lead/${business.id}`
    }
  });
});

// List all businesses
router.get("/businesses", (req, res) => {
  const businesses = getAllBusinesses().map(b => ({
    ...b,
    industryLabel: INDUSTRY_PROMPTS[b.industry]?.label || b.industry,
  }));
  res.json({ success: true, businesses });
});

// Get available industries
router.get("/industries", (req, res) => {
  const industries = Object.entries(INDUSTRY_PROMPTS).map(([key, val]) => ({
    key,
    label: val.label,
  }));
  res.json({ success: true, industries });
});

export default router;
