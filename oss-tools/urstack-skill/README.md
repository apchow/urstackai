# urstack-skill

Scaffold and validate SKILL.md playbooks so an agent gets instructions it can actually
follow.

## Install

Not published on npm yet — run it straight from this repo, or link it so `urstack-skill` is on your PATH:

```bash
git clone https://github.com/apchow/urstackai
cd urstackai/oss-tools/urstack-skill
node bin/urstack-skill.js --help        # run in place, nothing to install
npm link                    # optional: global `urstack-skill` command
```

Node 16+ and nothing else: no dependencies, no network calls, no account.

## Usage

```bash
urstack-skill new "pr review"   # writes skills/pr-review/SKILL.md
urstack-skill check skills/     # validate every skill in a folder
urstack-skill list skills/
```

A valid skill has front matter (`name`, `description`) and five sections:

- `## When to use`
- `## Inputs`
- `## Steps`
- `## Guardrails`
- `## Output`

The validator also fails anything under 60 words, because "too thin" is the usual reason a
playbook does not work when an agent loads it.

## License

MIT (c) 2026 Apoorv Chowdhary (UrStack)
