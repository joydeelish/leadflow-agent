// Facebook OAuth Router
// Handles Connect with Facebook flow for business onboarding
// GET  /auth/facebook          — redirect to Facebook login
// GET  /auth/facebook/callback — receive token, subscribe webhook, save to business

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import express from "express";
import { getBusiness, updateBusinessFacebook } from "../business/store.js";

const router = express.Router();

const FB_APP_ID     = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const APP_URL       = process.env.APP_URL || "http://localhost:3000";
const REDIRECT_URI  = `${APP_URL}/auth/facebook/callback`;

// Step 1 — Redirect business to Facebook login
// Called when business clicks "Connect Facebook" button
// Query param: bizId — the business to attach this Facebook page to
router.get("/facebook", (req, res) => {
  const { bizId } = req.query;
  if (!bizId) return res.status(400).send("Missing bizId");

  const business = getBusiness(bizId);
  if (!business) return res.status(404).send("Business not found");

  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_ads",
    "leads_retrieval",
  ].join(",");

  const fbUrl =
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${FB_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${scopes}` +
    `&state=${bizId}`;

  console.log(`[OAuth] Redirecting ${business.name} to Facebook login`);
  res.redirect(fbUrl);
});

// Step 2 — Facebook redirects back here with a code
router.get("/facebook/callback", async (req, res) => {
  const { code, state: bizId, error } = req.query;

  if (error) {
    console.warn("[OAuth] Facebook denied:", error);
    return res.redirect(`/?oauth=denied&bizId=${bizId}`);
  }

  try {
    // Exchange code for user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&code=${code}`
    );
    const { access_token: userToken } = await tokenRes.json();

    // Get list of pages the user manages
    const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
    const pagesData = await pagesRes.json();
    const pages     = pagesData.data || [];

    if (!pages.length) {
      return res.redirect(`/?oauth=nopages&bizId=${bizId}`);
    }

    // Use the first page (or let user pick — future improvement)
    const page = pages[0];
    const pageToken = page.access_token;
    const pageId    = page.id;

    console.log(`[OAuth] Got page token for: ${page.name} (${pageId})`);

    // Subscribe this page to our webhook for leadgen events
    const subRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscribed_fields: ["leadgen"],
          access_token: pageToken,
        }),
      }
    );
    const subData = await subRes.json();

    if (!subData.success) {
      console.error("[OAuth] Webhook subscription failed:", subData);
      return res.redirect(`/?oauth=subfailed&bizId=${bizId}`);
    }

    console.log(`[OAuth] ✓ Webhook subscribed for page ${pageId}`);

    // Save page token + page ID to business config
    updateBusinessFacebook(bizId, { pageId, pageToken, pageName: page.name });

    // Redirect back to frontend with success
    res.redirect(`/?oauth=success&bizId=${bizId}&page=${encodeURIComponent(page.name)}`);

  } catch (err) {
    console.error("[OAuth] Error:", err.message);
    res.redirect(`/?oauth=error&bizId=${bizId}`);
  }
});

export default router;
