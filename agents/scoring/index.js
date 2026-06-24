// Scoring Agent
// Takes enriched lead data and returns a qualification score 0-100

const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic();

async function scoreLead(enrichedLead) {
  const prompt = `You are a lead qualification expert for real estate businesses.
Score this lead from 0-100 based on how likely they are to convert.
Return ONLY valid JSON: { "score": number, "reason": string }

Lead data:
${JSON.stringify(enrichedLead, null, 2)}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].text.trim();
  return JSON.parse(raw);
}

module.exports = { scoreLead };
