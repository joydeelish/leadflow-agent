// Facebook OAuth Flow
// GET /api/auth/facebook/:bizId     — redirect to Facebook login
// GET /api/auth/facebook/callback   — handle OAuth callback

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localEnv  = resolve(__dirname, "../config/.env");
dotenv.config({ path: existsSync(localEnv) ? localEnv : resolve(__dirname, "../.env") });

import express from "express";
import { getBusiness, updateBusinessFacebook } from "../business/store.js";

const router = express.Router();

const FB_APP_ID     = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const APP_URL       = process.env.APP_URL || "http://localhost:3000";
const REDIRECT_URI  = `${APP_URL}/api/auth/facebook/callback`;

// Permissions needed:
// pages_show_list       — see which pages they manage
// pages_read_engagement — read page info
// leads_retrieval       — fetch lead data from Lead Ads
const SCOPES = "pages_show_list,pages_read_engagement,leads_retrieval";

// ── Step 1: Redirect business owner to Facebook login ──────────────────────
router.get("/auth/facebook/:bizId", (req, res) => {
  const { bizId } = req.params;
  const business  = getBusiness(bizId);

  if (!business) {
    return res.status(404).send("Business not found. Please register first.");
  }

  // Encode bizId in state param so we get it back in the callback
  const state = Buffer.from(JSON.stringify({ bizId })).toString("base64");

  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id",     FB_APP_ID);
  authUrl.searchParams.set("redirect_uri",  REDIRECT_URI);
  authUrl.searchParams.set("scope",         SCOPES);
  authUrl.searchParams.set("state",         state);
  authUrl.searchParams.set("response_type", "code");

  console.log(`[OAuth] Redirecting ${business.name} to Facebook login`);
  res.redirect(authUrl.toString());
});

// ── Step 2: Facebook redirects back here with ?code= ──────────────────────
router.get("/auth/facebook/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error("[OAuth] Facebook login cancelled:", error);
    return res.redirect("/?fb=cancelled");
  }

  if (!code || !state) {
    return res.status(400).send("Missing code or state parameter.");
  }

  let bizId;
  try {
    bizId = JSON.parse(Buffer.from(state, "base64").toString()).bizId;
  } catch {
    return res.status(400).send("Invalid state parameter.");
  }

  const business = getBusiness(bizId);
  if (!business) {
    return res.status(404).send("Business not found.");
  }

  try {
    // Exchange code for user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${FB_APP_ID}&` +
      `client_secret=${FB_APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
    }

    const userToken = tokenData.access_token;
    console.log(`[OAuth] Got user access token for ${business.name}`);

    // Fetch list of pages the user manages
    const pagesRes  = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data?.length) {
      throw new Error("No Facebook pages found. Make sure you manage at least one page.");
    }

    // Use the first page (or let them pick — for now use first)
    const page      = pagesData.data[0];
    const pageId    = page.id;
    const pageToken = page.access_token; // page token is long-lived
    const pageName  = page.name;

    console.log(`[OAuth] Connected page: ${pageName} (${pageId})`);

    // Subscribe the page to our webhook for leadgen events
    const subscribeRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?` +
      `subscribed_fields=leadgen&` +
      `access_token=${pageToken}`,
      { method: "POST" }
    );
    const subscribeData = await subscribeRes.json();
    console.log(`[OAuth] Webhook subscription:`, JSON.stringify(subscribeData));

    // Save to business config
    updateBusinessFacebook(bizId, pageId, pageToken, pageName);

    console.log(`[OAuth] ✓ ${business.name} connected to Facebook page: ${pageName}`);

    // Redirect back to frontend with success
    res.redirect(`/?fb=connected&biz=${bizId}&page=${encodeURIComponent(pageName)}`);

  } catch (err) {
    console.error("[OAuth] Error:", err.message);
    res.redirect(`/?fb=error&message=${encodeURIComponent(err.message)}`);
  }
});

export default router;
