# urstack-snippets

**200+ copy-paste snippets for AI/LLM integration, as a VS Code extension.**

Stop rewriting the same provider boilerplate: streaming handlers, retry-with-backoff wrappers, tool-calling loops, embeddings and local Ollama calls for OpenAI, Anthropic Claude, Google Gemini, OpenRouter and Ollama.

## Install (local VSIX)

```bash
cd oss-tools/urstack-snippets
npx @vscode/vsce package
code --install-extension urstack-snippets-*.vsix
```

## Snippet groups

- Provider clients: OpenAI, Anthropic, Gemini, OpenRouter, Ollama
- Streaming with token accounting
- Retry with exponential backoff and 429 handling
- Function/tool calling loops
- Embeddings and chunking
- Local-model calls with no cloud dependency

## Related

Full workflow packs and the 24-hour fix sprint:
**https://urstack-ai.vercel.app**

## License

MIT © Apoorv Chowdhary
