# UrStack AI — Turnkey Vercel Deployment

## Quick Deploy to Vercel (Free 6,000 build minutes/month)

### Option 1: GitHub Connect (1-Click)
1. Push this folder to a GitHub repository (e.g. `github.com/apchow/urstack-ai`).
2. Go to https://vercel.com/new and click **Import**.
3. Framework Preset: **Other** (leave Root Directory as `./` and Build Command empty).
4. Click **Deploy**.

### Option 2: Command Line (15 Seconds)
1. Unzip this package on your PC.
2. Open terminal in the unzipped folder and run:
   ```bash
   npx vercel
   ```
3. Press Enter to confirm defaults. Your site is instantly live!

## Included Files
- `index.html`: Complete UrStack AI Single-Page App with secret coupon code `2026`, 16 fulfillment generators, and Client Ticket Intake Portal.
- `vercel.json`: Clean URL routing and automatic Netlify rewrite compatibility.
- `api/payu-callback.js`: Vercel Serverless function for PayU return verification.
- `api/notify-rescue.js`: Priority webhook & Resend notification dispatcher.
- `llms.txt`: Machine-readable directory for Perplexity, ChatGPT, and Claude indexing.
