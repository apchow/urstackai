# urstack-trace

**One stack trace analyzer for every language you ship.**

`urstack-trace` parses crash output from Python, Node.js, Java, Go and Rust, isolates the frame that belongs to your code, and maps the error to a plain-English cause with concrete next steps.

Zero dependencies. Runs offline.

## Install

Not published on npm yet — run it straight from this repo, or link it so `urstack-trace` is on your PATH:

```bash
git clone https://github.com/apchow/urstackai
cd urstackai/oss-tools/urstack-trace
node bin/cli.js --help        # run in place, nothing to install
npm link                    # optional: global `urstack-trace` command
```

Node 16+ and nothing else: no dependencies, no network calls, no account.

## Usage

```bash
urstack-trace crash.log          # analyze a log file
cat error.txt | urstack-trace    # read from stdin
urstack-trace --help             # all flags
```

## What it does

- Detects the language and traceback format automatically
- Skips framework and vendor frames so you land on your own line
- Groups repeated errors so a noisy log collapses into a few root causes
- Suggests fixes based on the recognized error class
- Works in CI: exits non-zero when a trace cannot be diagnosed

## Related

The interactive, browser-based analyzer plus the 24-hour done-for-you PR rescue:
**https://urstack-ai.vercel.app**

## License

MIT © Apoorv Chowdhary
