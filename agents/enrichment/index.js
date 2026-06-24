// Enrichment Agent
// Accepts a raw lead and returns enriched profile data

async function enrichLead(lead) {
  // TODO: integrate with enrichment API (e.g. Clearbit, Apollo, or Claude web search)
  return {
    ...lead,
    company: "Unknown",
    companySize: null,
    linkedIn: null,
    location: null,
    enrichedAt: new Date().toISOString(),
  };
}

module.exports = { enrichLead };
