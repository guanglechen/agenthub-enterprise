# AgentHub CLI

`agenthub-cli` is the CLI-first entrypoint for `AgentHub Enterprise`.

It only requires Node.js 20+. Python is not required for skill installation or unpacking, which makes it a better fit for Claude Code on Windows.

It supports:

- registry search, inspect, download, install, and publish
- catalog, label, and relation maintenance
- `agent profile` and `agent install-plan`
- local config bootstrap for `.claude/agenthub.json`

## Install

From a packaged tarball served by an AgentHub deployment:

```bash
npm install -g https://your-agenthub.example.com/downloads/agenthub-cli-0.1.1.tgz
```

## Login

```bash
agenthub-cli login --base-url https://your-agenthub.example.com --token sk_your_api_token_here
agenthub-cli whoami --json
```

## Common commands

```bash
agenthub-cli search --q spring-boot --assetType scaffold --json
agenthub-cli inspect --skill @global/java-microservice-baseline --json
agenthub-cli install --skill @global/java-microservice-baseline --base-url https://your-agenthub.example.com
agenthub-cli publish --namespace team-alpha --file ./bundle.zip --catalog-file ./catalog.json --yes
agenthub-cli agent profile --json
agenthub-cli agent install-plan --assetType microservice --domain order --stage develop --topology crud-api --stack java21,spring-boot3,maven --json
agenthub-cli config init-workspace --workspace . --base-url https://your-agenthub.example.com --token sk_your_api_token_here --namespace team-alpha --domain order
```
