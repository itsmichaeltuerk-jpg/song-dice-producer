# 💰 Song Dice: Cost & Pricing Breakdown

Here is the complete breakdown of costs for building, hosting, and using **Song Dice**:

---

## 1. 🆓 Gemini API Costs (The AI Composer)

Song Dice uses **`gemini-2.5-flash`** to generate structured music arrangement JSON (chords, melody, bass, and drum timing).

### Google AI Studio (Free Tier)
- **Cost:** **$0.00 (Free)**
- Google AI Studio provides a **generous Free Tier** for Gemini models.
- **Rate Limits:** Up to **15 requests per minute (RPM)** and **1,500 requests per day (RPD)** for `gemini-2.5-flash`.
- For personal use, bedroom producing, and testing, **you will never pay a cent** under the free tier.

### Google Cloud / Vertex AI (Pay-As-You-Go Tier)
If you exceed free tier limits or deploy commercially on Google Cloud / Vertex AI, pricing is token-based:
- **Input Tokens:** ~$0.075 per 1,000,000 tokens
- **Output Tokens:** ~$0.30 per 1,000,000 tokens
- **Average Roll in Song Dice:**
  - Prompt: ~350 tokens
  - JSON Arrangement Output: ~550 tokens
  - **Total Cost per Roll:** **~$0.00019 (less than 2 hundredths of a cent per roll!)**
  - **1,000 rolls cost approx. $0.19 (19 cents).**

---

## 2. ⚡ Browser Client-Side Audio & MIDI (Zero Server Costs)

- **Audio Engine:** 100% Web Audio API running locally on the user's device. No audio streaming servers or GPU audio renderers needed.
- **MIDI Generation:** Synthesized in JavaScript directly into Standard MIDI File (SMF Type 1) binary arrays and downloaded locally.
- **Storage:** Session history and favorites are stored in browser `localStorage` at **$0 server cost**.

---

## 3. 🌐 Web Hosting Options

Song Dice is a static Single Page Application (SPA). You can host it for free on:
- **Vercel** (Free Hobby Tier)
- **Netlify** (Free Starter Tier)
- **GitHub Pages** (Free)
- **Cloudflare Pages** (Free with unlimited bandwidth)

---

## Summary
| Layer | Service | Cost |
|---|---|---|
| **AI Arrangement Engine** | Gemini 2.5 Flash | **FREE** (up to 15 rolls/min) or ~$0.0002/roll |
| **Audio Synthesis** | Web Audio API (Browser) | **$0.00 (Free)** |
| **MIDI Export** | Pure Client-Side Binary | **$0.00 (Free)** |
| **Hosting & Frontend** | Static SPA (Vercel/Cloudflare) | **$0.00 (Free)** |
