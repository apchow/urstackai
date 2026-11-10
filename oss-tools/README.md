# UrStack open-source developer tools

Six MIT-licensed projects, each self-contained and publishable as its own repository. They target the failure modes that break real AI/agent stacks: leaked keys, runaway spend, dependency drift, and stack traces nobody wants to read.

| Project | Kind | Purpose |
| --- | --- | --- |
| [`urstack-trace`](./urstack-trace) | CLI | Universal stack trace analyzer — parse, diagnose and fix errors across Python, Node, Java, Go and Rust |
| [`urstack-envscan`](./urstack-envscan) | CLI | Scan repos for leaked API keys, committed `.env` files, private keys and insecure SSH config |
| [`urstack-costguard`](./urstack-costguard) | CLI | AI API cost monitor and circuit breaker — hard spend ceilings for runaway LLM bills |
| [`urstack-stackpick`](./urstack-stackpick) | CLI | Hardware-aware AI stack recommender — match local models to your CPU/RAM/VRAM |
| [`urstack-snippets`](./urstack-snippets) | VS Code extension | 200+ snippets for OpenAI, Anthropic, Gemini, OpenRouter and Ollama |
| [`awesome-urstack`](./awesome-urstack) | List | Curated index of agent workflows, local-AI tooling and diagnostics |

Live site: **https://urstack-ai.vercel.app**

## Try them

```bash
node oss-tools/urstack-trace/bin/cli.js --help
node oss-tools/urstack-envscan/bin/cli.js --help
node oss-tools/urstack-costguard/bin/cli.js --help
node oss-tools/urstack-stackpick/bin/cli.js --help
```

## Publish each as a standalone GitHub repository

Every project already declares `homepage`, `repository` and `license`.

```bash
export GITHUB_TOKEN=ghp_xxx   # classic token with 'repo' scope
./oss-tools/publish-repos.sh
```

That creates `apchow/urstack-trace`, `apchow/urstack-envscan`, `apchow/urstack-costguard`, `apchow/urstack-stackpick`, `apchow/urstack-snippets` and `apchow/awesome-urstack`, pushes each folder as `main`, and sets description, homepage and topics pointing at https://urstack-ai.vercel.app.

## License

MIT © Apoorv Chowdhary
