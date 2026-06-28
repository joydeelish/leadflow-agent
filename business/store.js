// Business Config Store
// Reads and writes business configs to /data/businesses.json
// Each business gets a unique ID, industry config, and webhook URL

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../data");
const DB_PATH   = join(DATA_DIR, "businesses.json");

// Industry scoring prompts
export const INDUSTRY_PROMPTS = {
  real_estate: {
    label: "Real Estate",
    prompt: `You are a lead qualification expert for real estate businesses.
Score this lead from 0-100 based on likelihood to convert to a property purchase.
Consider: budget signals, job title, company, location, message intent, and urgency.
Return ONLY valid JSON: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }`,
  },
  saas: {
    label: "SaaS / Software",
    prompt: `You are a lead qualification expert for B2B SaaS companies.
Score this lead from 0-100 based on likelihood to convert to a paying software customer.
Consider: company size, job title (decision maker?), industry fit, pain points mentioned, and budget signals.
Return ONLY valid JSON: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }`,
  },
  recruitment: {
    label: "Recruitment / HR",
    prompt: `You are a lead qualification expert for recruitment agencies.
Score this lead from 0-100 based on likelihood to become a hiring client.
Consider: company size, industry, hiring urgency, job title (HR/C-suite?), and team size signals.
Return ONLY valid JSON: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }`,
  },
  legal: {
    label: "Legal Services",
    prompt: `You are a lead qualification expert for law firms and legal service providers.
Score this lead from 0-100 based on likelihood to become a paying legal client.
Consider: business type, urgency of legal need, company size, and decision-maker signals.
Return ONLY valid JSON: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }`,
  },
  finance: {
    label: "Finance / Fintech",
    prompt: `You are a lead qualification expert for financial services and fintech companies.
Score this lead from 0-100 based on likelihood to convert to a paying client.
Consider: company size, revenue signals, job title (CFO/Finance?), and specific financial pain points.
Return ONLY valid JSON: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }`,
  },
  ecommerce: {
    label: "E-commerce",
    prompt: `You are a lead qualification expert for e-commerce solution providers.
Score this lead from 0-100 based on likelihood to convert to a paying merchant customer.
Consider: business size, monthly orders signal, tech stack, and growth intent.
Return ONLY valid JSON: { "score": number, "reason": string, "tier": "hot"|"warm"|"cold" }`,
  },
};

function loadDB() {
  if (!existsSync(DB_PATH)) return {};
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function saveDB(db) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function createBusiness(name, industry, qualifyThreshold, whatsappNumber) {
  const db = loadDB();
  const id = "biz_" + randomBytes(4).toString("hex");
  db[id] = {
    id,
    name,
    industry,
    qualifyThreshold: Number(qualifyThreshold) || 70,
    whatsappNumber,
    webhookUrl: `/api/lead/${id}`,
    createdAt: new Date().toISOString(),
    leadsProcessed: 0,
    leadsQualified: 0,
  };
  saveDB(db);
  return db[id];
}

export function getBusiness(id) {
  const db = loadDB();
  return db[id] || null;
}

export function getAllBusinesses() {
  return Object.values(loadDB());
}

export function updateBusinessStats(id, qualified) {
  const db = loadDB();
  if (!db[id]) return;
  db[id].leadsProcessed++;
  if (qualified) db[id].leadsQualified++;
  saveDB(db);
}
