# urstack-skill

Scaffold and validate SKILL.md playbooks so an agent gets instructions it can actually
follow.

## Install

```bash
npx urstack-skill new "pr review"
cd oss-tools/urstack-skill && npm link
```

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
