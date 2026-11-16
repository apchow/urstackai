# urstack-costguard

**Stop a runaway agent loop before it burns your balance.**

`urstack-costguard` tracks LLM API spend per task and per hour, and trips a deterministic circuit breaker when a ceiling is crossed. Built for the classic failure mode: a retry loop or recursive agent that quietly spends hundreds of dollars overnight.

Zero dependencies.

## Install

Not published on npm yet — run it straight from this repo, or link it so `urstack-costguard` is on your PATH:

```bash
git clone https://github.com/apchow/urstackai
cd urstackai/oss-tools/urstack-costguard
node bin/cli.js --help        # run in place, nothing to install
npm link                    # optional: global `urstack-costguard` command
```

Node 16+ and nothing else: no dependencies, no network calls, no account.

## Usage

```bash
costguard --help
```

Set hard limits with environment variables:

```bash
export MAX_COST_PER_TASK=2      # USD
export MAX_COST_PER_HOUR=5      # USD
costguard monitor
```

## What it does

- Converts token usage into cost using per-model price tables
- Enforces a per-task and per-hour ceiling instead of only alerting
- Stops execution (non-zero exit) when a ceiling trips, so a wrapper can abort
- Breaks retry storms with capped exponential backoff
- Prints a running spend summary you can log alongside agent output

## Related

The full multi-model cost router workflow and spend-guard blueprints:
**https://urstack-ai.vercel.app**

## License

MIT © Apoorv Chowdhary
