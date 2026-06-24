# LeadFlow Agent

> AI-powered lead capture, qualification, and micro-payment system built on Arc (Circle's stablecoin-native L1) — submitted for the Lepton Agents Hackathon 2026.

## What it does

LeadFlow Agent is a multi-agent system where each step in the lead pipeline is handled by a specialist agent — and every handoff is settled with a real USDC micro-payment on Arc.

```
Ad Form Submission
      ↓
Lead Orchestrator Agent  (holds USDC budget)
      ↓ pays $0.01 USDC → Data Enrichment Agent
      ↓ pays $0.01 USDC → Lead Scoring Agent
      ↓ if score > threshold
Business Client pays $0.50 USDC per qualified lead
      ↓
WhatsApp / CRM Delivery
```

## Tech Stack

- **Arc** — sub-second USDC settlement
- **Circle SDK** — USDC, CCTP, App Kit
- **Claude API** — agent intelligence
- **Node.js** — agent runtime
- **Express** — webhook intake

## Project Structure

```
leadflow-agent/
├── agents/
│   ├── orchestrator/     # Main lead routing agent
│   ├── enrichment/       # Data enrichment agent
│   └── scoring/          # Lead scoring agent
├── payments/             # Arc/Circle payment logic
├── webhooks/             # Lead intake endpoints
├── config/               # Environment config
└── index.js              # Entry point
```

## Setup

```bash
npm install
cp config/.env.example config/.env
# Fill in your Arc wallet keys and Circle API credentials
node index.js
```

## Hackathon

Built for [Lepton Agents Hackathon](https://thecanteenapp.com) — June 15–29, 2026
Powered by Arc + Circle USDC nanopayments.
