#!/usr/bin/env bash
# Publish each UrStack open-source tool as its own GitHub repository.
#
#   export GITHUB_TOKEN=ghp_xxx      # classic token with 'repo' scope
#   ./oss-tools/publish-repos.sh
#
# Optional: GITHUB_OWNER=apchow ./oss-tools/publish-repos.sh

set -euo pipefail

OWNER="${GITHUB_OWNER:-apchow}"
TOKEN="${GITHUB_TOKEN:-}"
SITE="https://urstack-ai.vercel.app"
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [[ -z "$TOKEN" ]]; then
  echo "GITHUB_TOKEN is not set." >&2
  echo "Create a classic token with 'repo' scope, then:" >&2
  echo "  export GITHUB_TOKEN=ghp_xxx && ./oss-tools/publish-repos.sh" >&2
  exit 1
fi

api() {
  curl -fsS -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" "$@"
}

publish() {
  local name="$1" desc="$2" topics_csv="$3"
  local src="$ROOT/$name"
  [[ -d "$src" ]] || { echo "skip: $src missing"; return; }

  echo "==> $OWNER/$name"

  api -X POST "https://api.github.com/user/repos" \
    -d "{\"name\":\"$name\",\"description\":\"$desc\",\"homepage\":\"$SITE\",\"private\":false,\"has_issues\":true,\"has_wiki\":false}" \
    >/dev/null 2>&1 || echo "    (repo exists or create denied - continuing)"

  local work
  work="$(mktemp -d)"
  git -C "$work" init -q
  cp -r "$src/." "$work/"
  rm -rf "$work/.git"
  git -C "$work" add -A
  git -C "$work" -c user.email="apchow@users.noreply.github.com" \
                 -c user.name="Apoorv Chowdhary" \
                 commit -qm "Initial release - $name"
  git -C "$work" branch -M main
  git -C "$work" remote add origin "https://x-access-token:$TOKEN@github.com/$OWNER/$name.git"
  git -C "$work" push -q -u origin main --force
  rm -rf "$work"

  local names="[" t
  IFS=',' read -ra list <<< "$topics_csv"
  for t in "${list[@]}"; do names="$names\"$t\","; done
  names="${names%,}]"
  api -X PUT "https://api.github.com/repos/$OWNER/$name/topics" -d "{\"names\":$names}" >/dev/null 2>&1 || true

  echo "    https://github.com/$OWNER/$name"
}

publish "urstack-trace"     "Universal stack trace analyzer CLI - parse, diagnose and fix errors across Python, Node, Java, Go and Rust." "stacktrace,debugging,cli,nodejs,python,developer-tools"
publish "urstack-envscan"   "Scan repositories for leaked API keys, committed .env files, private keys and insecure SSH config. Zero dependencies." "security,secrets,env,scanner,cli,devsecops"
publish "urstack-costguard" "AI API cost monitor and circuit breaker - hard spend ceilings so one runaway agent loop cannot burn your balance." "llm,ai,cost,monitoring,circuit-breaker,cli"
publish "urstack-stackpick" "Hardware-aware AI stack recommender - match local models and runtimes to your CPU, RAM and VRAM." "local-llm,ollama,hardware,recommender,cli"
publish "urstack-snippets"  "200+ VS Code snippets for OpenAI, Anthropic, Gemini, OpenRouter and Ollama integration." "vscode-extension,snippets,llm,openai,anthropic,ollama"
publish "awesome-urstack"   "Curated index of AI agent workflows, local-AI tooling and diagnostic resources." "awesome-list,ai-agents,llm,workflows,local-ai"

echo
echo "Done. Enable Discussions per repo, then confirm the links on $SITE"
