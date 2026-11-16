# urstack-stackpick

**Match your hardware to an AI stack you can actually run.**

`stackpick` reads your CPU, RAM and (where available) GPU/VRAM, then recommends local models, runtimes and tooling that fit — instead of suggesting a 70B model on an 8 GB laptop.

Zero dependencies. Works offline.

## Install

Not published on npm yet — run it straight from this repo, or link it so `urstack-stackpick` is on your PATH:

```bash
git clone https://github.com/apchow/urstackai
cd urstackai/oss-tools/urstack-stackpick
node bin/cli.js --help        # run in place, nothing to install
npm link                    # optional: global `urstack-stackpick` command
```

Node 16+ and nothing else: no dependencies, no network calls, no account.

## Usage

```bash
stackpick            # detect hardware, recommend a stack
stackpick --json     # machine-readable recommendation
```

## What it recommends

- Quantized local models sized to available RAM/VRAM
- Runtimes (Ollama, llama.cpp, LM Studio) appropriate to the machine
- Whether a hosted API is the pragmatic choice for that tier
- Companion blueprints from the UrStack workflow vault

## Related

Free AI stack builder and local-AI blueprints:
**https://urstack-ai.vercel.app**

## License

MIT © Apoorv Chowdhary
