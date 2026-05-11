#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"
PASS=0
FAIL=0
BASE_HOST="$(printf '%s' "$BASE_URL" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
CURL_PROXY_BYPASS=()

if [[ "$BASE_HOST" == "localhost" || "$BASE_HOST" == "127.0.0.1" || "$BASE_HOST" == "::1" ]]; then
  CURL_PROXY_BYPASS=(--noproxy "*")
fi

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL=$((FAIL + 1))
}

assert_file() {
  local path="$1"
  [[ -s "$path" ]] && pass "file exists: $path" || fail "file missing or empty: $path"
}

contains_pattern() {
  local pattern="$1"
  local path="$2"
  if command -v rg >/dev/null 2>&1; then
    rg -q "$pattern" "$path"
    return
  fi
  grep -Fq "$pattern" "$path"
}

assert_contains() {
  local pattern="$1"
  local path="$2"
  if contains_pattern "$pattern" "$path"; then
    pass "pattern '$pattern' found in $path"
  else
    fail "pattern '$pattern' missing in $path"
  fi
}

curl_text() {
  curl "${CURL_PROXY_BYPASS[@]}" --max-time 20 -fsS "$1"
}

assert_url_contains() {
  local url="$1"
  local pattern="$2"
  local content
  if content="$(curl_text "$url")" && printf '%s' "$content" | grep -Fq "$pattern"; then
    pass "$url contains '$pattern'"
  else
    fail "$url missing '$pattern'"
  fi
}

assert_url_json_path() {
  local url="$1"
  local path="$2"
  local expected="$3"
  local content actual
  if ! content="$(curl_text "$url")"; then
    fail "$url is not reachable"
    return
  fi
  if ! actual="$(printf '%s' "$content" | node -e '
    const fs = require("fs");
    const input = fs.readFileSync(0, "utf8");
    const obj = JSON.parse(input);
    const path = process.argv[1].split(".");
    let cur = obj;
    for (const part of path) {
      cur = /^\d+$/.test(part) ? cur?.[Number(part)] : cur?.[part];
    }
    if (cur === undefined) process.exit(2);
    process.stdout.write(String(cur));
  ' "$path")"; then
    fail "$url JSON path '$path' is missing"
    return
  fi
  [[ "$actual" == "$expected" ]] && pass "$url JSON '$path' == '$expected'" || fail "$url JSON '$path' expected '$expected', got '$actual'"
}

echo "=== AgentHub Platform Experience Validation ==="
echo "Target: $BASE_URL"
echo

assert_file "docs/27-agenthub-platform-experience-todo-list.md"
assert_file "docs/28-agenthub-ai-interaction-review-brief.md"
assert_file "web/src/docs/llms.txt.template"
assert_file "web/src/shared/components/agent-discovery-panel.tsx"
assert_file "web/src/shared/components/brand-mark.tsx"
assert_file "web/src/shared/lib/asset-taxonomy.ts"

assert_contains "Only Have The Base URL" "web/src/docs/skill.md.template"
assert_contains "Asset Families" "web/src/docs/skill.md.template"
assert_contains "HIKVISION AgentHub" "web/src/docs/skill.md.template"
assert_contains "HIKVISION AgentHub" "web/src/shared/components/brand-mark.tsx"
assert_contains "claude-agent-plugin" "server/skillhub-app/src/main/java/com/iflytek/skillhub/compat/WellKnownController.java"
assert_contains "AI 交互评审 Brief" "docs/28-agenthub-ai-interaction-review-brief.md"
assert_contains "评审 Prompt" "docs/28-agenthub-ai-interaction-review-brief.md"

node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json', 'utf8'))" && pass "Claude marketplace JSON parses" || fail "Claude marketplace JSON parse failed"
node -e "JSON.parse(require('fs').readFileSync('web/src/docs/claude-marketplace.json', 'utf8'))" && pass "web Claude marketplace JSON parses" || fail "web Claude marketplace JSON parse failed"

assert_url_contains "$BASE_URL/llms.txt" "AgentHub Enterprise"
assert_url_contains "$BASE_URL/llms.txt" "HIKVISION AgentHub"
assert_url_contains "$BASE_URL/registry/skill.md" "Only Have The Base URL"
assert_url_contains "$BASE_URL/registry/skill.md" "Asset Families"
assert_url_contains "$BASE_URL/registry/skill.md" "HIKVISION AgentHub"
assert_url_json_path "$BASE_URL/.well-known/agenthub.json" "platformName" "agenthub-enterprise"
assert_url_json_path "$BASE_URL/.well-known/agenthub.json" "endpoints.llms" "/llms.txt"
assert_url_json_path "$BASE_URL/.well-known/agenthub.json" "assetFamilies.0" "claude-agent-plugin"
assert_url_json_path "$BASE_URL/registry/claude-marketplace.json" "plugins.0.name" "agenthub-connector-plugin"

echo
echo "Results: $PASS passed, $FAIL failed"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
