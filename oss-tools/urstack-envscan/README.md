# urstack-envscan

**Scan a repository for leaked secrets before you push.**

`envscan` walks a repo and reports what actually leaks in practice: committed `.env` files, provider API keys pasted into source or config, private SSH keys, connection strings with embedded credentials, and insecure SSH settings.

Zero dependencies. Nothing leaves your machine.

## Install

Not published on npm yet — run it straight from this repo, or link it so `urstack-envscan` is on your PATH:

```bash
git clone https://github.com/apchow/urstackai
cd urstackai/oss-tools/urstack-envscan
node bin/cli.js --help        # run in place, nothing to install
npm link                    # optional: global `urstack-envscan` command
```

Node 16+ and nothing else: no dependencies, no network calls, no account.

## Usage

```bash
envscan                 # scan the current directory
envscan ./my-repo       # scan a specific path
envscan --path /repo
```

## What it flags

- `.env`, `.env.local`, `.env.production` committed to the tree
- Anthropic, OpenAI, Google, AWS, GitHub, Slack, Resend and Stripe key formats
- Private keys (`-----BEGIN ... PRIVATE KEY-----`)
- Connection strings with embedded passwords
- `StrictHostKeyChecking no` and world-readable SSH keys

Secrets are masked in output, so a scan is safe to paste into a ticket.

## Related

Workflow packs, AST security audits and the 24-hour PR rescue:
**https://urstack-ai.vercel.app**

## License

MIT © Apoorv Chowdhary
