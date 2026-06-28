import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "./config/.env") });

import express from "express";
import intakeRouter from "./webhooks/intake.js";
import onboardingRouter from "./webhooks/onboarding.js";
import oauthRouter from "./webhooks/oauth.js";

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Serve frontend
app.use(express.static(join(__dirname, "public")));

// Inject APP_URL into frontend so it works on any domain
app.get("/config.js", (req, res) => {
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  res.setHeader("Content-Type", "application/javascript");
  res.send(`window.APP_URL = "${appUrl}";`);
});

// API routes
app.use("/api", intakeRouter);
app.use("/api", onboardingRouter);
app.use("/auth", oauthRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("");
  console.log("  LeadFlow Agent running");
  console.log("  Local:   http://localhost:" + PORT);
  console.log("  Onboard: POST http://localhost:" + PORT + "/api/onboard");
  console.log("  Webhook: POST http://localhost:" + PORT + "/api/webhook");
  console.log("");
});
