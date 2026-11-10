# Awesome UrStack AI [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated collection of open-source developer tools, CLI utilities, and IDE extensions by [UrStack AI](https://urstack-ai.vercel.app) — the Developer Suite & Intelligence Index.

---

## 🧰 Open-Source Tools

### CLI Utilities

| Tool | Description | Install | Stars |
|------|-------------|---------|-------|
| [urstack-trace](https://github.com/apchow/urstack-trace) | Universal stack trace analyzer — parse & diagnose errors across Python, Node.js, Go, Rust, Java | `npm i -g urstack-trace` | ![GitHub stars](https://img.shields.io/github/stars/apchow/urstack-trace?style=social) |
| [urstack-stackpick](https://github.com/apchow/urstack-stackpick) | AI/LLM stack recommender — detect hardware & get matched with runnable local models | `npm i -g urstack-stackpick` | ![GitHub stars](https://img.shields.io/github/stars/apchow/urstack-stackpick?style=social) |
| [urstack-envscan](https://github.com/apchow/urstack-envscan) | Secret & env scanner — find leaked API keys, exposed .env files, insecure configs | `npm i -g urstack-envscan` | ![GitHub stars](https://img.shields.io/github/stars/apchow/urstack-envscan?style=social) |
| [urstack-costguard](https://github.com/apchow/urstack-costguard) | AI API cost monitor & circuit breaker — prevent runaway LLM bills | `npm i -g urstack-costguard` | ![GitHub stars](https://img.shields.io/github/stars/apchow/urstack-costguard?style=social) |

### IDE Extensions

| Extension | Description | Install |
|-----------|-------------|---------|
| [urstack-snippets](https://github.com/apchow/urstack-snippets) | 200+ AI/LLM integration snippets for VS Code — OpenAI, Claude, Gemini, Ollama, LangChain | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=urstack-ai.urstack-snippets) |

### Sovereign AI

| Project | Description | Link |
|---------|-------------|------|
| [GyanSutr](https://github.com/apchow/gyansutr) | Air-gapped sovereign AI OS — local RAG with Ollama + ChromaDB + Obsidian | [GitHub](https://github.com/apchow/gyansutr) |

---

## 🌐 UrStack AI Platform

| Resource | Description | Link |
|----------|-------------|------|
| 🏠 **Developer Suite** | Production agent workflows, code diagnostics, stack matcher, 76+ tool directory | [urstack-ai.vercel.app](https://urstack-ai.vercel.app) |
| 🔧 **Workflow Vault** | 25+ verified AI agent workflow bundles from $3 | [Browse](https://urstack-ai.vercel.app) |
| 🚑 **Code Rescue Sprint** | 24-hour guaranteed PR bug fix — $17 | [Book](https://urstack-ai.vercel.app) |
| 🧠 **Stack Matcher** | Hardware-matched AI stack recommendations (8GB–32GB) | [Try Free](https://urstack-ai.vercel.app) |
| 📚 **Tool Directory** | 76+ evaluated AI tools across 6 categories | [Explore](https://urstack-ai.vercel.app) |
| 🔒 **Security Scanner** | AST security scanner + human repo audit — $7 | [Details](https://urstack-ai.vercel.app) |

---

## 📖 Quick Start

```bash
# Analyze a stack trace
python buggy_script.py 2>&1 | urstack-trace

# Find which AI models your hardware can run
stackpick recommend --ram 16 --vram 8

# Scan your repo for leaked secrets
envscan .

# Calculate AI API costs before running
costguard calc --tokens 50000 --model claude-sonnet-5
costguard compare --tokens 10000
```

---

## 🤝 Contributing

We welcome contributions to any of our open-source tools! See each repository's CONTRIBUTING guide.

- Found a bug? [Open an issue](https://github.com/apchow/urstackai/issues)
- Want a feature? [Start a discussion](https://github.com/apchow/urstackai/discussions)
- Need help? [UrStack AI Code Rescue](https://urstack-ai.vercel.app) — $17 guaranteed 24-hour PR

---

## 📜 License

All tools are released under the [MIT License](LICENSE).

---

Built with ❤️ by [Apoorv Chowdhary](https://github.com/apchow) · [UrStack AI](https://urstack-ai.vercel.app)
