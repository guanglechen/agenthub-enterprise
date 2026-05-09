# AgentHub Connector Plugin

This is a local Claude Code plugin that connects a workspace to `AgentHub Enterprise`.
It is intentionally local-first: build and validate the connector in this repository first, then publish it back to AgentHub later as a governed asset.

## What it does

- Reads the platform onboarding profile from `GET /api/v1/agent/profile`
- Builds workspace-specific install plans from `POST /api/v1/agent/install-plan`
- Installs required skill bundles into `.claude/skills`
- Reuses the repository `agenthub-cli` instead of re-implementing registry calls

## Configure

The plugin reads configuration in this order:

1. Environment variables `AGENTHUB_BASE_URL` and `AGENTHUB_TOKEN`
2. Workspace file `.claude/agenthub.json`

Recommended bootstrap:

```bash
agenthub-cli login --base-url https://your-agenthub.example.com --token sk_your_api_token_here
agenthub-cli config init-workspace --workspace . --base-url https://your-agenthub.example.com --token sk_your_api_token_here --namespace team-alpha --domain order
```

Example config is in [examples/agenthub.json](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/plugins/agenthub-connector-plugin/examples/agenthub.json:1).

## Local usage

From the repository root:

```bash
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs profile
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs detect-context
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs install-plan --context-file plugins/agenthub-connector-plugin/examples/workspace-context.json
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs apply-install-plan --context-file plugins/agenthub-connector-plugin/examples/workspace-context.json --mode required
```

If the repository-local `bin/agenthub-cli` is not available, the plugin will fall back to the CLI tarball served by the connected AgentHub deployment. If no deployment URL is configured, it finally falls back to:

```bash
npx -y @guanglechen/agenthub-cli ...
```

That keeps the plugin aligned with the npm package once the CLI is published or distributed through the platform tarball.

## Local marketplace stub

If you want to test marketplace-based loading before publishing the plugin to AgentHub, use [examples/local-marketplace.json](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/plugins/agenthub-connector-plugin/examples/local-marketplace.json:1) as the starting point for a local marketplace definition.

## Included skills

- `connect-agenthub`
- `discover-agenthub-assets`
- `install-agenthub-assets`
