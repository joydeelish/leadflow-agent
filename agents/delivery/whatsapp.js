// WhatsApp Delivery Agent
// Sends qualified lead summary to a business owner via WhatsApp

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../config/.env") });

const WA_TOKEN    = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_API_URL  = `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`;

export async function deliverLeadViaWhatsApp(lead, score, toPhone, businessName = "LeadFlow") {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.warn("[WhatsApp] Credentials not set — skipping delivery");
    return null;
  }

  const tierEmoji = score.tier === "hot" ? "🔥" : score.tier === "warm" ? "⚡" : "❄️";

  const message =
    `${tierEmoji} *New Qualified Lead — ${businessName}*\n\n` +
    `*Name:* ${lead.name || "N/A"}\n` +
    `*Phone:* ${lead.phone || "N/A"}\n` +
    `*Email:* ${lead.email || "N/A"}\n` +
    `*Company:* ${lead.company || "N/A"}\n` +
    `*Job Title:* ${lead.jobTitle || "N/A"}\n` +
    `*Industry:* ${lead.industry || "N/A"}\n` +
    `*Location:* ${lead.location || "N/A"}\n` +
    `*LinkedIn:* ${lead.linkedIn || "N/A"}\n\n` +
    `*Message:* ${lead.message || "N/A"}\n\n` +
    `*Lead Score:* ${score.score}/100 (${score.tier.toUpperCase()})\n` +
    `*Why:* ${score.reason}\n\n` +
    `_Delivered by LeadFlow Agent • Powered by Arc USDC_`;

  const res = await fetch(WA_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: toPhone, type: "text", text: { body: message } }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[WhatsApp] Delivery failed:", JSON.stringify(data));
    throw new Error(`WhatsApp API error: ${data.error?.message}`);
  }

  console.log(`[WhatsApp] ✓ Lead delivered to ${toPhone}`);
  return data;
}
