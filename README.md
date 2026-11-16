# UrStack — stop company data leaking into AI tools

**Live:** https://urstack-ai.vercel.app · **Guard route:** https://urstack-ai.vercel.app/guard

People paste production logs, customer records and credentials into ChatGPT, Claude and
Gemini every day. Once it leaves the browser it is out of your control — retained, logged,
sometimes trained on. UrStack sits *before* that paste and strips the sensitive parts while
keeping the text useful enough to still answer the question.

This repository holds the whole product: the website, its serverless backend, and eight
MIT-licensed tools you can run locally with no account and no network calls.

---

## What actually works today

Be clear about this when you demo it. The detection engine is real and runnable; the
browser interception layer is not built yet.

| Piece | Status | Where |
| --- | --- | --- |
| Redaction rule engine (12 rules, Luhn validation, stable placeholders) | **Working** | [`oss-tools/urstack-redact`](oss-tools/urstack-redact) |
| In-browser demo — paste text, redact it locally, zero network calls | **Working** | `#guardDemo` in [`index.html`](index.html), live at [/guard](https://urstack-ai.vercel.app/guard) |
| Six other MIT CLIs + VS Code snippets | **Working** | [`oss-tools/`](oss-tools) |
| Website, 5 views, 28 workflows, 76-tool directory | **Working** | [`index.html`](index.html) |
| Google sign-in, PayU checkout, notifications, AI proxy | **Working** (needs env vars) | [`api/`](api) |
| Browser extension that intercepts paste on ChatGPT/Claude/Gemini | **Not implemented** — no paste listener exists in this repo |
| "Two invariants, tested in CI" (INV-1 / INV-2) | **Not implemented** — no tests and no `.github/workflows` yet |
| Enterprise policy packs, SSO, SIEM export, 90-day retention | **Roadmap** |

The Guard page currently describes the extension and the CI-tested invariants as if they
ship. They do not. Treat that copy as the spec for the next milestone, and see
[`IDEATHON.md`](IDEATHON.md) for how to present this honestly.

---

## Try it without installing anything

Open https://urstack-ai.vercel.app/guard and use the **"Try it now"** panel: paste text,
hit *Redact locally*, and the sensitive spans become typed placeholders. It runs the same
12 rules as the CLI, in the page. Open DevTools → Network while you do it — no request is
made. Output is written with `textContent`, never `innerHTML`, so pasted markup cannot
execute.

The browser engine and the CLI are verified to produce identical output. They are two
copies of the same rules, so **keep them in sync** — the CLI is the source of truth.

## The core idea, in one example

`demo.txt` ships in the repo root, so this runs on a fresh clone with no setup:

```bash
node oss-tools/urstack-redact/bin/urstack-redact.js demo.txt --map
```

Input (`demo.txt` — every value is synthetic test data):

```
Ping me at jane.doe@example.com or 9876543210.
AWS key AKIAIOSFODNN7EXAMPLE was committed.
Card 4111 1111 1111 1111 and order id 1234567890123.
Date 2026-11-17 stays.
```

Output:

```
Ping me at <EMAIL_1> or <PHONE_1>.
AWS key <AWS_KEY_1> was committed.
Card <PAN_1> and order id 1234567890123.
Date 2026-11-17 stays.

urstack-redact: 4 span(s) replaced — AWS_KEY×1, EMAIL×1, PAN×1, PHONE×1
```

Three things matter here:

1. **The text still works.** `<EMAIL_1>` is a stable, numbered placeholder, so "email
   `<EMAIL_1>` again" is still a coherent instruction. Blanking everything with `***`
   destroys the prompt; typed placeholders preserve it.
2. **It does not over-redact.** The 13-digit order ID is left alone because it fails the
   Luhn check; the date is left alone because it is not a phone number. Checksum
   validation is what keeps false positives down.
3. **Nothing leaves the machine.** No dependencies, no network calls, no account, no
   telemetry. The placeholder map is per-run and never contains the original value.

Rules covered: AWS keys, GitHub tokens, Stripe keys, OpenAI keys, Google keys, Slack
tokens, Resend keys, PEM private-key blocks, JWTs, emails, Luhn-valid card numbers, phones.

---

## Repository layout

```
index.html          The entire front end — one file, 5 client-side views, no build step
demo.txt            Synthetic sample input for the redaction demo (safe to share)
api/                8 Vercel serverless functions (see below)
oss-tools/          8 MIT projects, each self-contained and separately publishable
vercel.json         Rewrites (/guard → /), Netlify compat, security headers
llms.txt            Machine-readable summary for AI crawlers (currently out of date)
robots.txt          Crawler rules
sitemap.xml         Sitemap
og-image.png        Social share card (1792×1024)
payu-cli.js         Local PayU hash signer/verifier for testing (Node built-ins only)
notify-cli.js       Local notification dispatcher test harness
instruction.md      Exact step-by-step setup, run and deploy instructions
IDEATHON.md         5-minute pitch script, demo runbook and Q&A prep
```

### The five views

`index.html` is a single-page app. All five views are `<section class="page-view">`
elements toggled client-side; there is no router and no framework.

| View | id | What it does |
| --- | --- | --- |
| Guard | `guardPage` | Landing page. Product story, rule table, free vs enterprise tiers |
| Workflow Vault | `workflowsPage` | 28 paid agent-workflow bundles, searchable and category-filtered |
| Debugger | `debuggerPage` | Free interactive traceback / error analyzer |
| Stack Matcher | `matcherPage` | Matches local AI models to your hardware |
| Directory | `directoryPage` | 76 evaluated AI tools with verdicts and pricing |

Workflow and directory cards are **pre-rendered into the HTML** as well as rendered by JS,
so crawlers and AI engines see the content without executing scripts. The render functions
clear their grid (`grid.innerHTML = ""`) before repainting, so there is no duplication.

### Backend (`api/`)

| Endpoint | Purpose |
| --- | --- |
| `auth-google.js` | Verifies a Google Sign-In ID token against Google's JWKS, issues a signed HttpOnly `urstack_session` cookie |
| `auth-me.js` | Returns the current session identity |
| `auth-logout.js` | Clears the session cookie |
| `auth-config.js` | Exposes the public Google client ID to the browser |
| `ai-chat.js` | Server-side proxy to an OpenAI-compatible chat API; also handles reply feedback ratings |
| `payu-initiate.js` / `payu-callback.js` | Unified PayU handler: signs the SHA-512 checkout request, and verifies the reverse hash on return |
| `notify-rescue.js` | Multi-channel dispatcher (signup, newsletter, purchase, help) via webhook and Resend |

Secrets stay server-side. The browser never sees `AUTH_SECRET`, `PAYU_MERCHANT_SALT`,
`COARENA_API_KEY` or `RESEND_API_KEY`. See [`instruction.md`](instruction.md) for the full
env var list.

> **Known gap:** `/api/ai-chat` has no authentication or rate limit. Anyone who finds the
> URL can spend your `COARENA_API_KEY` quota. Add auth before sharing the endpoint widely.

### The eight tools (`oss-tools/`)

All MIT, all Node 16+, none with runtime dependencies.

| Project | Kind | Purpose |
| --- | --- | --- |
| [`urstack-redact`](oss-tools/urstack-redact) | CLI | Strip secrets and PII from text before it reaches an AI tool |
| [`urstack-trace`](oss-tools/urstack-trace) | CLI | Stack trace analyzer across Python, Node, Go, Rust, Java |
| [`urstack-envscan`](oss-tools/urstack-envscan) | CLI | Find leaked keys, committed `.env` files, risky SSH and IDE-extension config |
| [`urstack-costguard`](oss-tools/urstack-costguard) | CLI | AI spend monitor and circuit breaker with hard ceilings |
| [`urstack-stackpick`](oss-tools/urstack-stackpick) | CLI | Hardware-aware local-model recommender |
| [`urstack-skill`](oss-tools/urstack-skill) | CLI | Scaffold and validate `SKILL.md` playbooks |
| [`urstack-snippets`](oss-tools/urstack-snippets) | VS Code extension | 40 LLM integration snippets (15 Python, 15 JavaScript, 10 TypeScript) |
| [`awesome-urstack`](oss-tools/awesome-urstack) | List | Curated agent-workflow and local-AI index |

Run any of them in place — nothing is published to npm yet:

```bash
node oss-tools/urstack-trace/bin/cli.js crash.log
node oss-tools/urstack-envscan/bin/cli.js .
node oss-tools/urstack-costguard/bin/cli.js --help
```

---

## Tiers

**Free, forever, no account:** the redaction engine and all eight tools, the traceback
debugger, the stack matcher, the tool directory, and 38 playbooks.

**Enterprise (custom, per seat/year):** shared policy packs, SSO, 90-day audit retention,
SIEM export, self-hosted GyanSutr, DPA. This tier is a roadmap, not a shipped product.

Workflow bundles are sold individually ($3–$17) through PayU.

---

## Quick start

```bash
git clone https://github.com/apchow/urstackai
cd urstackai

# Run the site — it is a static file, any server works
npx serve .            # then open http://localhost:3000

# Try the engine on the bundled demo file — no install, no account
node oss-tools/urstack-redact/bin/urstack-redact.js demo.txt --map
```

For env vars, serverless functions locally, and deployment, follow
[`instruction.md`](instruction.md) step by step.

---

## Contributing

The highest-value work right now, in order:

1. **Build the paste-interception extension** — the rule engine already exists in
   `urstack-redact`; port it to a content script and wire up the placeholder map.
2. **Add the tests and CI that the copy already claims** — INV-1 (no raw sensitive value
   ever reaches the outgoing prompt) and INV-2 (token maps are cleared when the tab closes).
3. **Extract one shared rule engine.** The rules now exist in two places — the CLI and
   `GUARD_DEMO_RULES` in `index.html`. They are tested to match today, but they will drift.
4. Authenticate and rate-limit `/api/ai-chat`.
5. Refresh `llms.txt`, which still describes the pre-Guard product.

## License

MIT. See [`oss-tools/LICENSE`](oss-tools/LICENSE).