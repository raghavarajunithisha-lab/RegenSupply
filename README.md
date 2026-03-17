# RegenSupply | CMO Compliance & Risk Engine

A proof-of-concept Validation Engineering tool designed to track, calculate, and visualize regulatory compliance risks across a network of global Contract Manufacturing Organizations (CMOs). 

This project bridges the gap between **Supplier Procurement** and **Quality Assurance (QA)** by transforming raw FDA compliance data into actionable, quantitative risk metrics (0-100) before a pharmaceutical company signs a contract.

---

## 🎯 Project Objective

This project was engineered to demonstrate a deep, technical understanding of **Pharmaceutical Validation Engineering** and FDA regulatory affairs (specifically 21 CFR Part 211). 

While most enterprise companies rely on heavy, expensive software suites (like ValGenesis or TrackWise) for end-to-end lifecycle management, **RegenSupply** is designed to prove that I understand the **underlying architecture of compliance data**. By building the API integrations, database schemas, and mathematical risk algorithms from scratch, I am demonstrating the technical capability to not just *use* enterprise Quality Systems, but to deeply understand, validate, and troubleshoot them from the inside out.

---

## 📊 Data Architecture: Real vs. Simulated 

To build a functional prototype without access to a Fortune 500 company's internal ERP system or paid proprietary databases, this app uses a "hybrid" data architecture.

### 1. The Seed List (Simulating SAP/ERP)
*   **The Concept:** In a production environment, this application would query an internal ERP (like SAP) to retrieve the FDA FEI (Facility Establishment Identifier) numbers of all active vendors.
*   **The Implementation:** Because I do not have access to an internal supplier database, the local SQLite database is initialized ("seeded") with a hardcoded list of 16 of the world's largest biological CMOs (e.g., Catalent, Lonza, WuXi) and their actual, real-world 10-digit FEI numbers. 

### 2. Live Enforcement Actions (Real Data)
*   **The Concept:** When a vendor receives a Warning Letter, Import Alert, or is forced to recall a product, QA needs to know immediately.
*   **The Implementation:** This app connects directly to the **public openFDA API**. When you click "Sync FDA Databases," the Python backend makes live HTTP requests to the US Government's database using the 16 FEI numbers to pull down *real, legitimate* enforcement actions and formats them for the dashboard.

### 3. Form 483 Inspection History (Simulated Data)
*   **The Concept:** To calculate a vendor's "Risk Score," we need to know how they performed on routine FDA audits (OAI, VAI, or NAI classifications).
*   **The Implementation:** The FDA does **not** provide granular Form 483 observation data via a free API (obtaining this requires manual FOIA requests or expensive enterprise subscriptions). Therefore, to prove out the math of the Risk Algorithm, the historical inspection data is **synthesized/simulated**. 
    *   *Note on Realism:* While the history is generated, the algorithm strictly uses real **21 CFR Part 211 citations** (e.g., *211.68(b) Data Integrity*, *211.113(b) Microbiological Contamination*) to trigger the weighted penalty scores, proving an understanding of severe compliance failures.

---

## ⚙️ The Risk Algorithm

The core of RegenSupply is the Python Risk Engine. It calculates a unified score (`0` = Perfect Compliance, `100` = Critical Risk) based on the following weighted mathematical logic:

1.  **Enforcement Actions & Recalls (Highest Penalty):** 
    *   If the live openFDA API returns a recent Warning Letter or severe enforcement action, a **+45 point absolute penalty** is applied.
2.  **Inspection Classifications:**
    *   `OAI` (Official Action Indicated): Severe penalty of **+30 points** per occurrence.
    *   `VAI` (Voluntary Action Indicated): Moderate penalty of **+15 points** per occurrence.
    *   `NAI` (No Action Indicated): Proves compliance and adds **0 points**.
3.  **Critical 483 Multipliers:** 
    *   If a historical inspection was flagged for severe 21 CFR violations (specifically Data Integrity or Microbiological Contamination), the engine applies a **1.5x multiplier** to the *total* score, instantly pushing the vendor into the "High Risk" tier (capped at 100).
4.  **Recency Weighting:** 
    *   All penalties are time-weighted. Older infractions naturally decay in their risk contribution to prioritize current vendor health.

> **💡 Note on the "Stress Test" Environment:**
> If you run this project locally, you will notice many vendors flagged as "High Risk" with scores of 100. This is intentional. Because this is a proof-of-concept, the historical inspection simulator is programmed to be **aggressively pessimistic**. It deliberately assigns high frequencies of OAI classifications and critical Part 211 violations to stress-test the Risk Engine math and verify that the UI correctly handles severe penalty multipliers, sorting, and High-Risk visual indicators. In a live production environment connected to an ERP, the baseline risk distribution would be significantly lower.


---

## 🚀 Tech Stack

*   **Backend:** Python, FastAPI, SQLite, httpx (Async API requests)
*   **Frontend:** TypeScript, Next.js (React), Tailwind CSS v4
*   **Design:** Modern Glassmorphism UI, Responsive Data Tables

---

## 💻 How to Run Locally

### 1. Start the Backend API (Python)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```
*Wait for the server to start on `http://localhost:8000`*

### 2. Start the Frontend Dashboard (Next.js)
Open a **new** terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser.*
