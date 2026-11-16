# urstack-snippets

**40 copy-paste snippets for AI/LLM integration, as a VS Code extension.**

Stop rewriting the same provider boilerplate: streaming handlers, retry-with-backoff
wrappers, tool-calling loops, embeddings and local Ollama calls for OpenAI,
Anthropic Claude, Google Gemini and Ollama — in Python, JavaScript and TypeScript.

## Install (local VSIX)

```bash
cd oss-tools/urstack-snippets
npx @vscode/vsce package
code --install-extension urstack-snippets-1.0.0.vsix
```

## Snippet groups

Type `ur-` in any Python, JavaScript or TypeScript file to see every snippet:

- `ur-openai-client` / `ur-openai-chat` / `ur-openai-stream` / `ur-openai-function`
- `ur-anthropic-chat` — Anthropic Claude
- `ur-gemini-chat` — Google Gemini
- `ur-ollama-chat` — local models, no cloud dependency
- `ur-retry-backoff` — exponential backoff with jitter
- `ur-env-safe` — fail fast on missing API keys
- `ur-embeddings` / `ur-chunking` — RAG building blocks
- `ur-ai-route` — FastAPI / Next.js / Express server-side proxy
- `ur-next-ai-route` / `ur-express-ai` / `ur-sse-stream` — JavaScript routes
- `ur-tool-loop` — multi-turn tool calling (TypeScript)
- `ur-cost-guard` — hard per-task spend ceiling
- `ur-token-count` / `ur-token-estimate` — pre-flight token checks
- `ur-structured-output` / `ur-json-mode` — typed JSON responses

## Commands

- **UrStack: Analyze Selected Error** — local diagnosis of the selected stack trace
- **UrStack: Open AI Tool Directory** — open the AI tool directory

## Related

Full workflow packs, the free error analyzer and the 24-hour fix sprint:
**https://urstack-ai.vercel.app**

## License

MIT © Apoorv Chowdhary
