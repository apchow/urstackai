# instruction.md — exact steps

Follow these in order. Every command is copy-pasteable. Steps marked **VERIFY** must pass
before you move on.

Repo: https://github.com/apchow/urstackai · Live: https://urstack-ai.vercel.app

---

## Part 0 — Prerequisites

1. Install Node 16 or newer. Check:
   ```bash
   node -v
   git --version
   ```
   **VERIFY:** Node prints `v16` or higher.

2. Confirm your git identity is the one that owns the Vercel team. This matters — see
   step 24.
   ```bash
   git config user.name
   git config user.email
   ```
   **VERIFY:** the email is a member of the Vercel team that owns `urstack-ai`. If it is
   a placeholder like `dev@example.com`, every git-triggered deploy will be **blocked**.
   Fix it with your real address before committing.

---

## Part 1 — Get the code

3. Clone and enter:
   ```bash
   git clone https://github.com/apchow/urstackai
   cd urstackai
   ```

4. Sync with the remote:
   ```bash
   git pull origin main --rebase
   ```

5. Look at what is there:
   ```bash
   ls -1
   git log --oneline -5
   ```
   **VERIFY:** you see `index.html`, `api/`, `oss-tools/`, `vercel.json`.

> If you also have an old `urstack_vercel_deployment.zip`, **do not extract it over the
> repo.** The repo is newer; the zip will regress the Guard rebuild. Compare timestamps
> first.

---

## Part 2 — Run the site locally

6. The front end is one static file. No build step, no `npm install`.
   ```bash
   npx serve .
   ```
   Open http://localhost:3000

7. If `serve` fails, use Python instead:
   ```bash
   python -m http.server 4820
   ```
   Open http://localhost:4820

8. **VERIFY:** click through all five nav items — Guard, Workflows, Debugger, Matcher,
   Directory. Each must show content.

9. **VERIFY:** on the Workflows view, no card may say `undefined`. Check in the browser
   console:
   ```js
   document.querySelectorAll('#workflowsGrid .desc').length      // expect 28
   [...document.querySelectorAll('#workflowsGrid .desc')]
     .filter(e => /undefined/.test(e.textContent)).length         // expect 0
   ```

> A plain static server will **not** run `api/`. For the backend, use step 12.

---

## Part 3 — Environment variables

10. Create `.env.local` in the repo root. It is already gitignored via `.env*`.

    ```
    AUTH_SECRET=<long random string>
    GOOGLE_CLIENT_ID=<your Google OAuth client id>

    COARENA_API_KEY=<chat provider key>
    COARENA_BASE_URL=https://coarena.ai/api/v1
    COARENA_MODEL=claude-fable-5

    PAYU_MERCHANT_KEY=<PayU key>
    PAYU_MERCHANT_SALT=<PayU salt>
    PAYU_ENV=test
    PAYU_ACTION_URL=https://test.payu.in/_payment

    RESEND_API_KEY=<Resend key>
    SENDER_EMAIL=<verified sender>
    NOTIFY_EMAIL=<where alerts go>
    NOTIFY_WEBHOOK_URL=<optional webhook>
    ```

    Generate a strong `AUTH_SECRET`:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

11. **VERIFY — this is the most important check in the document:**
    ```bash
    git check-ignore -v .env.local
    git status --short
    ```
    **VERIFY:** `git check-ignore` prints a match, and `.env.local` does **not** appear in
    `git status`. Never commit it. Never paste its contents into an AI tool.

---

## Part 4 — Run the backend locally

12. Install the Vercel CLI and link to the **correct project**:
    ```bash
    npm i -g vercel
    vercel link --project urstack-ai
    ```
    **VERIFY:** when asked to choose a scope/team, pick the team that owns
    `urstack-ai.vercel.app`. There is a similarly named decoy project
    (`urstack_vercel_deploymentnew`) — linking to it deploys to the wrong domain.

    Confirm:
    ```bash
    vercel project ls
    cat .vercel/project.json
    ```
    **VERIFY:** `projectName` is `urstack-ai`.

13. `vercel link` may write a fresh `VERCEL_OIDC_TOKEN` into `.env.local`. That is fine
    locally, but do not commit it (step 11 already covers this).

14. Run the full stack:
    ```bash
    vercel dev
    ```

15. **VERIFY:** the AI proxy reports its config without leaking the key:
    ```bash
    curl http://localhost:3000/api/ai-chat
    ```
    Expect `{"status":"ok","baseUrl":...,"model":...}`. If you get
    `missing_server_credentials`, `COARENA_API_KEY` is not set.

---

## Part 5 — Run the tools

16. Redact secrets from a file:
    ```bash
    node oss-tools/urstack-redact/bin/urstack-redact.js notes.txt --map
    ```

17. Pipe text in:
    ```bash
    cat draft.txt | node oss-tools/urstack-redact/bin/urstack-redact.js
    ```

18. **VERIFY** the engine against the committed demo file (`demo.txt` ships in the repo
    root, all values synthetic):
    ```bash
    node oss-tools/urstack-redact/bin/urstack-redact.js demo.txt --map
    ```
    **VERIFY:** exactly 4 spans replaced — `AWS_KEY×1, EMAIL×1, PAN×1, PHONE×1`. The order
    ID `1234567890123` and the date `2026-11-17` must survive unchanged; that proves the
    Luhn check and the date guard work.

19. The other CLIs:
    ```bash
    node oss-tools/urstack-trace/bin/cli.js crash.log
    node oss-tools/urstack-envscan/bin/cli.js .
    node oss-tools/urstack-costguard/bin/cli.js --help
    node oss-tools/urstack-stackpick/bin/cli.js
    node oss-tools/urstack-skill/bin/urstack-skill.js --help
    ```

20. Optional — put a tool on your PATH:
    ```bash
    cd oss-tools/urstack-redact && npm link && cd ../..
    urstack-redact --help
    ```

21. Test the VS Code snippets extension:
    ```bash
    cd oss-tools/urstack-snippets
    npx @vscode/vsce package        # produces a .vsix (gitignored)
    ```
    Then in VS Code: Extensions → `...` → Install from VSIX. Type `llm` in a `.py` file.
    **VERIFY:** 40 snippets are available (15 Python, 15 JavaScript, 10 TypeScript).

---

## Part 6 — Validate before committing

22. Check the inline JavaScript still parses. Extract and syntax-check:
    ```bash
    node -e "
    const fs=require('fs');
    const s=fs.readFileSync('index.html','utf8');
    const m=[...s.matchAll(/<script(?![^>]*type=[\"']application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
    fs.writeFileSync('.tmp-check.js', m.map(x=>x[1]).join('\n;\n'));
    console.log('extracted', m.length, 'script blocks');
    "
    node --check .tmp-check.js && echo "JS OK"
    rm .tmp-check.js
    ```
    **VERIFY:** prints `JS OK`.

23. Review exactly what you are about to commit:
    ```bash
    git status --short
    git diff --stat
    ```
    **VERIFY:** no `.env*`, no `node_modules/`, no `*.vsix`.

---

## Part 7 — Commit and push

24. Stage **explicitly by name**. Do not use `git add -A` — it has previously swept in
    `node_modules/`.
    ```bash
    git add README.md instruction.md IDEATHON.md
    git add .gitignore api/ai-chat.js
    git add oss-tools/urstack-snippets
    git status --short
    ```

25. Commit and push:
    ```bash
    git commit -m "Document the repo and add setup and ideathon guides"
    git push origin main
    git rev-parse HEAD
    ```

26. **VERIFY on GitHub:** open https://github.com/apchow/urstackai/commits/main and
    confirm your SHA is at the top.

27. **VERIFY the deploy actually happened.** A clean push does **not** guarantee a live
    site:
    ```bash
    vercel ls urstack-ai
    ```
    If the newest deployment says
    `blocked because the commit author doesn't have permission to create deployments`,
    your git email is not a team member. Fix step 2, or use Part 8.

28. **VERIFY the live site:**
    ```bash
    curl -s https://urstack-ai.vercel.app/ | grep -o "<title>[^<]*</title>"
    curl -s -o /dev/null -w "%{http_code}\n" https://urstack-ai.vercel.app/guard
    curl -s -o /dev/null -w "%{http_code}\n" https://urstack-ai.vercel.app/robots.txt
    curl -s -o /dev/null -w "%{http_code}\n" https://urstack-ai.vercel.app/sitemap.xml
    ```
    **VERIFY:** title mentions UrStack; all three routes return `200`.

---

## Part 8 — Manual deploy (only if step 27 was blocked)

Use this when git-triggered builds are blocked by commit-author permissions. Deploying
from a **non-git** directory avoids the attribution check entirely.

29. Create a clean staging copy outside the repo:
    ```bash
    mkdir -p ~/urstack-prod-deploy
    git archive HEAD | tar -x -C ~/urstack-prod-deploy
    ```

30. Link that directory to the right project:
    ```bash
    cd ~/urstack-prod-deploy
    vercel link --project urstack-ai
    ```

31. Remove any OIDC token file `vercel link` created, so it is not uploaded:
    ```bash
    rm -f .env.local
    ```

32. Deploy:
    ```bash
    vercel deploy --prod
    ```

33. **VERIFY** the alias in the output is `urstack-ai.vercel.app`, **not**
    `urstackverceldeploymentnew.vercel.app`. Then repeat step 28.

---

## Part 9 — Publishing the tools as standalone repos (optional, public)

This creates **public** GitHub repositories. Confirm you want that before running it.

34. Read the script first:
    ```bash
    cat oss-tools/publish-repos.sh
    ```

35. Export a token with `repo` scope and run:
    ```bash
    export GITHUB_TOKEN=<token>
    ./oss-tools/publish-repos.sh
    ```
    Each repo gets a description, topics and a homepage link back to
    https://urstack-ai.vercel.app.

36. **VERIFY:** each new repo exists and its README links to the live site.

> npm publishing is a separate, deliberate step. Nothing is on npm today; the READMEs
> correctly tell users to run from the repo.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Cards show `undefined` | Workflow object missing `description`/`outcome` | Normalize to `title/category/outcome/description/packPrice/prompt` |
| Wrong workflow opens in modal | Modal used the filtered index | Use the real array index from `forEach((w, realIdx)` |
| Push succeeds, site unchanged | Commit author not on Vercel team | Step 2, or Part 8 |
| Deployed to the wrong domain | Linked to the decoy project | `vercel link --project urstack-ai` |
| `/api/*` 404 locally | Plain static server | Use `vercel dev` (step 14) |
| `missing_server_credentials` | Env var not set | Step 10 |
| `git add -A` staged 592K of deps | `node_modules/` not ignored | It is ignored now; still stage by name |
| Crawlers see an empty page | Content was JS-only | Cards are pre-rendered; keep it that way |