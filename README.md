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

## Open-Source Developer Tools

`oss-tools/` ships six MIT-licensed projects, each self-contained and publishable as its own repository:

| Project | Kind | Purpose |
| --- | --- | --- |
| [`oss-tools/urstack-trace`](oss-tools/urstack-trace) | CLI | Universal stack trace analyzer across Python, Node, Java, Go and Rust |
| [`oss-tools/urstack-envscan`](oss-tools/urstack-envscan) | CLI | Scan repos for leaked API keys, committed `.env` files and insecure SSH config |
| [`oss-tools/urstack-costguard`](oss-tools/urstack-costguard) | CLI | AI API cost monitor and circuit breaker with hard spend ceilings |
| [`oss-tools/urstack-stackpick`](oss-tools/urstack-stackpick) | CLI | Hardware-aware local-AI stack recommender |
| [`oss-tools/urstack-snippets`](oss-tools/urstack-snippets) | VS Code extension | 200+ provider integration snippets |
| [`oss-tools/awesome-urstack`](oss-tools/awesome-urstack) | List | Curated agent-workflow and local-AI index |

Split them into standalone repos (each with description, homepage and topics pointing at https://urstack-ai.vercel.app):

```bash
export GITHUB_TOKEN=ghp_xxx   # token with 'repo' scope
./oss-tools/publish-repos.sh
```

## Included Files
- `index.html`: Complete UrStack AI Single-Page App with secret coupon code `2026`, 16 fulfillment generators, and Client Ticket Intake Portal.
- `vercel.json`: Clean URL routing and automatic Netlify rewrite compatibility.
- `api/payu-callback.js`: Vercel Serverless function for PayU return verification.
- `api/notify-rescue.js`: Priority webhook & Resend notification dispatcher.
- `llms.txt`: Machine-readable directory for Perplexity, ChatGPT, and Claude indexing.
