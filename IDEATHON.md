# IDEATHON.md — 5-minute pitch + 2-minute Q&A

Everything here is rehearsed against what the repo **actually does**. The demo commands
below were run and verified. Nothing in the script claims a feature that does not exist.

**Read this first:** the Guard page on the live site says "two invariants, tested in CI"
and describes browser paste interception. Neither exists in the repo — there are zero
paste listeners, no tests, and no `.github/workflows`. The redaction **engine** is real
and runs. So the pitch below is framed as *"working core, browser layer is the next
milestone."* That is a strong ideathon position. Claiming a shipped extension is not, and
one judge question will expose it.

---

## 1. The one-liner

> UrStack strips secrets and personal data out of text *before* it gets pasted into an AI
> tool — and keeps the text useful enough to still answer your question.

---

## 2. Five-minute script (300 seconds)

Speak at ~140 words/minute. Timings are cumulative. `[SCREEN]` marks what is on screen.

### 0:00 – 0:35 · Hook `[SCREEN: terminal, demo.txt open]`

> "This is a support ticket an engineer is about to paste into ChatGPT.
>
> It has a customer's email, their phone number, an AWS key someone committed by mistake,
> and a card number.
>
> He's not doing anything wrong. He's debugging. But the moment he hits enter, all four of
> those are on someone else's server — retained, logged, and possibly trained on.
>
> That happens thousands of times a day in every company using AI. Today the only options
> are 'don't use AI' or 'hope for the best.'"

### 0:35 – 1:15 · Problem `[SCREEN: stay on the raw file]`

> "Existing answers don't fit. Enterprise DLP is built for email and file uploads, not for
> a prompt box in a browser tab. Cloud 'AI gateways' route your data through *another*
> vendor — you've added a party, not removed one. And blanket blocking kills adoption:
> engineers just switch to a personal account, and now you have zero visibility.
>
> The real requirement is narrower and harder: let the prompt through, but not the
> sensitive parts — and don't wreck the prompt in the process."

### 1:15 – 2:00 · The insight `[SCREEN: slide or the rule table on the site]`

> "Our insight is that **redaction has to preserve meaning, not just delete characters.**
>
> If you replace everything with asterisks, the model can't help you — 'email *** about
> ***' is useless. So we replace each finding with a *typed, numbered placeholder*:
> `<EMAIL_1>`, `<AWS_KEY_1>`. The prompt still reads. The model still answers. And the map
> back to the real values never leaves your machine.
>
> Second insight: **checksums, not just regex.** A 13-digit order number looks like a card
> number. We run Luhn validation, so we redact the card and leave the order ID alone.
> That's the difference between a tool people keep on and a tool they uninstall in a day."

### 2:00 – 3:15 · Live demo

**Recommended: use the browser demo — it is more visual than a terminal and a judge can
repeat it themselves.** Open https://urstack-ai.vercel.app/guard, scroll to **"Try it now"**,
and click *Redact locally*. The sample is pre-filled. Then open DevTools → Network, click
it again, and show the request list staying empty. That single moment proves "local-first"
better than any slide.

Say the same words as below; they apply to both surfaces.

**Terminal alternative** (use if the venue wifi is unreliable — it needs no network at all):

```bash
cat demo.txt
node oss-tools/urstack-redact/bin/urstack-redact.js demo.txt --map
```

> "Here's the file. Email, phone, AWS key, a card number — plus an order ID and a date that
> must survive.
>
> One command. No install, no account, no network call.
>
> Four spans replaced. Email, phone, AWS key, card — all now typed placeholders.
>
> Now look at what *didn't* change. The order ID is still there, because it fails Luhn. The
> date is still there, because it isn't a phone number. That precision is the whole
> product.
>
> And this text still works as a prompt. 'Reply to `<EMAIL_1>` about the failed charge on
> `<PAN_1>`' is a question a model can answer — without ever seeing either value.
>
> Eighty-one lines of JavaScript. Twelve rules. Zero dependencies. You can read the entire
> engine in one sitting — which is the point, because you're trusting it with your
> secrets."

### Optional 10-second beats (both verified — use if you have time or get challenged)

Placeholder stability — the same value always maps to the same placeholder:

```bash
printf 'From jane.doe@example.com to bob@example.com.\nReply jane.doe@example.com again.\n' \
  | node oss-tools/urstack-redact/bin/urstack-redact.js
# From <EMAIL_1> to <EMAIL_2>.
# Reply <EMAIL_1> again.
```

Luhn precision — one digit wrong is not a card number:

```bash
printf 'valid   4111111111111111\ninvalid 4111111111111112\n' \
  | node oss-tools/urstack-redact/bin/urstack-redact.js
# valid   <PAN_1>
# invalid 4111111111111112
```

### 3:15 – 4:00 · What's built, what's next `[SCREEN: repo file tree, then the site]`

> "Let me be precise about state, because it matters.
>
> **Built and running:** the rule engine, the live in-browser demo you just used, seven
> more MIT tools, and the full platform — five views, twenty-eight workflow bundles, a
> seventy-six-tool directory, Google sign-in, payments, serverless backend. It's live at
> urstack-ai.vercel.app.
>
> **Next milestone, and it's a small one:** the browser extension that runs this same
> engine automatically on the paste event in ChatGPT, Claude and Gemini. Today you paste
> into our demo box; the extension removes that step. The hard part — detection with low
> false positives — is done. The remaining work is a content script plus two invariants
> enforced in CI: no raw sensitive value ever reaches the outgoing prompt, and the
> placeholder map dies when the tab closes.
>
> One shared engine, two surfaces. That's the architecture."

### 4:00 – 4:30 · Why this wins `[SCREEN: free vs enterprise tiers]`

> "Distribution is bottom-up. The engine is MIT and free forever — no account, no
> telemetry — so an engineer adopts it in thirty seconds without asking procurement.
>
> Then the company pays for what an individual can't build: shared policy packs, SSO,
> audit retention, SIEM export, a DPA. Free tool at the bottom, per-seat compliance at the
> top.
>
> And because it runs locally, 'your data never leaves the building' is an architectural
> fact, not a promise in a privacy policy."

### 4:30 – 5:00 · Close `[SCREEN: repo URL + live URL]`

> "Every company is being told to adopt AI faster. Nobody is being given a safe way to do
> it. The gap isn't model capability — it's the paste event.
>
> The engine works today. It's open source, it's eighty-one lines, and you can run it
> before this session ends.
>
> github.com/apchow/urstackai. Thank you."

---

## 3. Two-minute Q&A

Two minutes is **four questions at ~30 seconds**. Rehearse the four marked ★ until they
are automatic. Keep every answer under 60 words — then stop talking.

### ★ Q1: "Is the browser extension actually working?"

> "The engine works and you can use it right now in the browser — that demo is real, runs
> locally, and makes no network call. What doesn't exist yet is the extension that fires
> automatically on paste in ChatGPT. Today you paste into our box; the extension removes
> that step. Detection is solved; the content script is plumbing."

Never bluff this. Volunteering the boundary is what makes the rest credible.

### ★ Q2: "How is this different from enterprise DLP / a cloud AI gateway?"

> "DLP watches email and uploads, not a prompt box. A gateway adds another vendor to your
> data path. We run entirely on the machine, before the paste, so there's no new party and
> nothing to intercept in transit. And we preserve prompt meaning instead of blocking."

### ★ Q3: "What about false positives? Won't this break people's prompts?"

> "That's the main risk, and it's why we use checksums. Luhn on card numbers, a date guard
> on phone patterns. In the demo the order ID and date survived untouched. Typed
> placeholders also mean a false positive degrades the prompt instead of destroying it."

### ★ Q4: "How do you make money if it's free and open source?"

> "Free engine for individuals, paid per seat for company controls — shared policies, SSO,
> audit retention, SIEM export, DPA. Engineers adopt it without approval; security teams
> buy the governance layer. We also sell workflow bundles at three to seventeen dollars."

### Q5: "Can't the model just be told to ignore sensitive data?"

> "Prompting is not a control. Once the value is transmitted it's already leaked,
> regardless of what the model does with it. We remove it before transmission."

### Q6: "Regex will miss things. What about names, addresses, free text?"

> "Correct — regex plus checksums covers structured secrets and identifiers well, and
> that's where the acute risk is. Names and addresses need NER, which is on the roadmap
> and can run locally on a small model. We'd rather be precise on twelve rules than
> unreliable on fifty."

### Q7: "Why should I trust your code with my secrets?"

> "Because you can read all of it. Eighty-one lines, one import — `fs`. No network calls,
> no telemetry, MIT. The placeholder map is per-run and never contains the original value.
> Auditability is the security model."

**Verified proof you can run live if challenged.** Block every network and subprocess
module, then run the engine — it still works, exit code 0:

```bash
cat > block-net.js <<'EOF'
const Module = require('module');
const banned = new Set(['net','http','https','http2','dns','tls','dgram','child_process','worker_threads']);
const orig = Module._load;
Module._load = function (request) {
  if (banned.has(request.replace(/^node:/, ''))) {
    console.error('NETWORK ATTEMPT BLOCKED: ' + request);
    process.exit(99);
  }
  return orig.apply(this, arguments);
};
EOF
node --require ./block-net.js oss-tools/urstack-redact/bin/urstack-redact.js demo.txt --map
echo "exit: $?"
rm block-net.js
```

This was run and passed. It is a much stronger answer than asserting "no network" —
the process had no ability to make a network call and still redacted correctly.

### Q8: "Who else is doing this?"

> "Cloud AI gateways and DLP vendors are adjacent, but they sit in the data path or watch
> the wrong channel. A local, meaning-preserving layer at the paste event is the gap. Our
> wedge is that it's free, readable and instant to adopt."

### Q9: "What's your traction?"

> Give real numbers only. If you have none: *"Live platform, eight open-source tools, and
> a working engine. Pre-launch on the extension — this ideathon is where we get design
> partners."* Never invent users or revenue.

### Q10: "What breaks at scale?"

> "The engine is O(n) per rule on the client, so it scales with the user, not with us —
> there's no server in the hot path. The scaling work is policy management and audit
> storage for enterprise, which is ordinary backend work."

### If you don't know

> "I don't know — I'd want to test that rather than guess. Here's how I'd find out: …"

Judges reward this. They punish confident invention.

---

## 4. Recording runbook

I can't record your screen or voice — that has to be you. Here is the exact setup so you
can do it in one take.

### Prepare (10 minutes)

1. `demo.txt` is **already committed at the repo root** — nothing to create. Confirm it:
   ```bash
   cat demo.txt
   ```
   Every value in it is synthetic: `example.com` is a reserved domain,
   `AKIAIOSFODNN7EXAMPLE` is AWS's own documentation example key, and `4111 1111 1111 1111`
   is the standard Visa test number. Never swap in a real key or a real card number.

2. Rehearse the demo once so the output is not a surprise:
   ```bash
   cat demo.txt
   node oss-tools/urstack-redact/bin/urstack-redact.js demo.txt --map
   ```

3. Terminal: font size **20+**, dark background, clear the scrollback, `cd` into the repo
   so the prompt is short. Type the two commands into a scratch note to paste fast.

4. Browser: two tabs only — `https://urstack-ai.vercel.app/guard` and
   `https://github.com/apchow/urstackai`. Zoom 110%. Close everything else.

5. Turn off notifications, hide the bookmarks bar, and use a clean desktop wallpaper.

### Record

6. OBS Studio → Sources: **Display Capture** + **Audio Input Capture** (mic).
   Settings → Video: 1920×1080, 30 fps. Output: MP4, ~8 Mbps.

7. Record in **three separate clips**, not one take. Mistakes stay local:
   - **Clip A** — 0:00–2:00, hook + problem + insight (terminal / rule table)
   - **Clip B** — 2:00–3:15, the demo (terminal only)
   - **Clip C** — 3:15–5:00, state + business + close (repo tree, then site)

8. Do a 10-second mic test first and listen back. Bad audio sinks a pitch faster than
   bad slides.

9. Stitch A+B+C in any editor. Add a title card with the repo URL at the end.

### Submit

10. Watch it once at full speed with the script beside you. Cut anything over 5:00 —
    time limits are usually enforced hard.

11. Export 1080p MP4. Keep a copy of the script for the live Q&A.

---

## 5. Fix before you present

Two things on the live site will contradict you if a judge clicks through:

1. **"Two invariants, tested in CI"** — there is no CI and there are no tests. Either add
   a real test file and a workflow, or change the copy to "two invariants we enforce" /
   "on the roadmap". Cheapest honest fix: reword.
2. **Paste interception described as shipping** — no paste listener exists. Mark it
   "coming next" on the page.

Also worth doing: `llms.txt` still describes the pre-Guard product, and `/api/ai-chat` is
an unauthenticated proxy to a paid API — put auth on it before you show the URL to a room
full of people.