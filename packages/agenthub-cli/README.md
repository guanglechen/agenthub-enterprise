# AgentHub CLI

`agenthub-cli` is the CLI-first entrypoint for `AgentHub Enterprise`.

It only requires Node.js 20+. Python is not required for skill installation or unpacking, which makes it a better fit for Claude Code on Windows.

It supports:

- registry search, inspect, download, install, and publish
- catalog, label, and relation maintenance
- `agent profile` and `agent install-plan`
- Claude Code marketplace validation and export
- local config bootstrap for `.claude/agenthub.json`

## Install

From a packaged tarball served by an AgentHub deployment:

```bash
npm install -g https://your-agenthub.example.com/downloads/agenthub-cli-0.1.3.tgz
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

## Harness Commands

Harness Packages are normal AgentHub skill packages with an additional `harness/manifest.yaml`.

Use these commands for Java microservice workflows:

```bash
agenthub-cli harness browse --stack java21,spring-boot3,maven --json
agenthub-cli harness scan-modules --dir . --json
agenthub-cli harness init --package @platform/java-microservice-harness --dir . --yes
agenthub-cli harness verify --dir . --json
agenthub-cli harness propose --dir . --json
agenthub-cli harness contribute --dir . --name order-harness --dry-run
```

For local fixture validation without a running registry:

```bash
agenthub-cli harness init --package-dir examples/harness/java-microservice-harness --dir /tmp/order-service --yes
```

## Claude Code Marketplace Commands

AgentHub keeps the Skill market as the authoritative asset model and exports a Claude Code-compatible marketplace for installable plugins.

```bash
agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json
agenthub-cli marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json
agenthub-cli marketplace export --plugin-dir plugins/agenthub-connector-plugin --out .claude-plugin/marketplace.json --json
```
