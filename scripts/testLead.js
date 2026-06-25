// Test Script - run a sample lead through the full pipeline
// Usage: node scripts/testLead.js

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../config/.env") });

import { processLead } from "../agents/orchestrator/index.js";

const testLead = {
  name: "Chidi Okeke",
  email: "chidi.okeke@gmail.com",
  phone: "+2348012345678",
  message: "I am interested in buying a 3-bedroom apartment in Lekki. Budget around 80 million naira.",
  location: "Lagos, Nigeria",
  source: "Facebook Lead Ad"
};

console.log("=== LeadFlow Agent - Demo Run ===");
console.log("Lead:", testLead);
console.log("");

processLead(testLead)
  .then(result => {
    console.log("");
    console.log("=== RESULT ===");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(console.error);
