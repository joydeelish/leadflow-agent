// Enrichment Agent — Seller Side
// Exposes a paid endpoint at POST /enrich (price: $0.01 USDC)
// Payment settled via Arc Gateway x402 nanopayments

import express from "express";
import { createAgentGateway } from "../../payments/gatewayMiddleware.js";

const app = express();
app.use(express.json());

const gateway = createAgentGateway("ENRICHMENT_AGENT_WALLET");

/**
 * POST /enrich — payment-gated enrichment endpoint
 * Accepts a raw lead and returns enriched profile data.
 * Price: $0.01 USDC per call, settled on Arc Testnet.
 */
app.post("/enrich", gateway.require("$0.01"), async (req, res) => {
  const lead = req.body;
  console.log(`[Enrichment] Processing lead: ${lead.email} | Paid by: ${req.payment?.payer}`);

  // TODO: replace with real enrichment API (Apollo, Clearbit, etc.)
  const enriched = {
    ...lead,
    company: lead.company || "Unknown",
    companySize: null,
    linkedIn: null,
    location: lead.location || null,
    industry: null,
    enrichedAt: new Date().toISOString(),
    enrichedBy: "LeadFlow Enrichment Agent v1",
  };

  res.json(enriched);
});

const PORT = process.env.ENRICHMENT_PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Enrichment Agent] Running on port ${PORT} — payment: $0.01 USDC/call`);
});

export { app };
