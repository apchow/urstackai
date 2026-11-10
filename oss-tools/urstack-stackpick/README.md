# urstack-stackpick

**Match your hardware to an AI stack you can actually run.**

`stackpick` reads your CPU, RAM and (where available) GPU/VRAM, then recommends local models, runtimes and tooling that fit — instead of suggesting a 70B model on an 8 GB laptop.

Zero dependencies. Works offline.

## Install

```bash
npx urstack-stackpick
```

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
