# Jivora Care - Clinic Management SaaS Platform

A modern, full-stack SaaS platform for clinic management. Built with a ruthless focus on **clarity, ROI, and product stickiness**. 

## Our Product Philosophy: The "No BS" Approach

We build for real-world clinic workflows. Our priority is creating immense value for doctors and clinics, rather than just adding "AI hype" for the sake of it.

**The Golden Rule:**
> If you remove the AI → the product still works beautifully.  
> If you remove the Prescription/Billing engine → the product dies.

### Core Metrics for Success
- **Monetization potential:** Built around workflows clinics actually pay for.
- **Daily usage frequency:** Built for lightning speed, used by doctors on every single patient.
- **Stickiness & Switching Cost:** Driven by patient history lock-in.

---

## The Product Roadmap & Priority Stack

We are building in disciplined tiers. We do not move to the next tier until the current one is flawless, fast, and indispensable.

### Tier 1: The Core MVP (Must Have)
*If we don't build these perfectly, we don't build anything.*
- **Prescription Engine (5/5):** The heart of the product. Fast, local, and zero-friction. 
- **Patient History System (5/5):** Real-time access to past data. This creates the switching cost.
- **Billing + Revenue Tracking (5/5):** Direct money value. This is the revenue driver, not the AI.
- **Medicine Autocomplete / Suggestion (5/5):** Instant time-saver. Local DB-backed for speed.
- **Basic Prescription Summary (5/5):** Auto-generated for records and immediate sharing.

### Tier 2: The Stickiness Layer (Make it Addictive)
*Differentiation layer features that add massive lock-in value.*
- **Patient Compliance Tracking (4.5/5):** Improves outcomes. Few competitors do this well.
- **WhatsApp Sharing (4/5):** Mandatory in India. Zero learning curve.
- **Medicine Notifications (4/5):** Simple, reliable nudges for patient recovery.
- **Insurance-ready Structured Summaries (4.5/5):** Premium tier monetization.

### Tier 3 & 4: Power-Ups & AI Scale
*Future-proofing the platform (Only touched after Tier 1 & 2).*
- **Patient Language Explainer (5/5 in India):** Massive differentiation for rural/older patients.
- **Clinical Risk Alerts (5/5):** Drug interaction and safety alerts.
- **Voice-to-Prescription (4/5):** High speed boost and wow factor.
- **AI Case Assist & Auto Medical Coding (4/5):** Workflow enhancements and insurance automation.

---

## System Architecture

- **/mnm-nextjs**: The premium frontend built with Next.js 16 (App Router), Tailwind CSS 4, and Supabase SSR.
- **/backend**: Robust Node.js API server handling heavy operations, API integrations, and secure administrative tasks.

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A Supabase project with the database schema initialized.

### 2. Environment Setup
Create a `.env` file in the `backend` folder and a `.env.local` file in the `mnm-nextjs` folder with your Supabase credentials.

### 3. Run the Development Servers
From the root directory, run:
```bash
npm run dev
```
*(This launches the frontend at `http://localhost:3000` and the backend at `http://localhost:4000` concurrently.)*

---
© 2026 Jivora Care SaaS Solutions. Built for impact. Built to last.
