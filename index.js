import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "./config/.env") });

import express from "express";
import { createRequire } from "module";
import intakeRouter from "./webhooks/intake.js";

const app = express();
app.use(express.json());

// Serve frontend
app.use(express.static(join(__dirname, "public")));

// Enable CORS for local dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use("/api", intakeRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("");
  console.log("  LeadFlow Agent running");
  console.log("  Local:   http://localhost:" + PORT);
  console.log("");
});
