# AgentHub Connector Plugin

This is the Claude Code connector plugin for `AgentHub Enterprise`.
It can be tested as a local path plugin and is also listed by the repository marketplace at `.claude-plugin/marketplace.json`.

## What it does

- Reads the platform onboarding profile from `GET /api/v1/agent/profile`
- Builds workspace-specific install plans from `POST /api/v1/agent/install-plan`
- Installs required skill bundles into `.claude/skills`
- Runs Harness browse, scan, init, verify, propose, and contribute workflows
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
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs harness-browse --stack java21,spring-boot3,maven
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs harness-scan --workspace .
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs harness-verify --workspace .
```

If the repository-local `bin/agenthub-cli` is not available, the plugin will fall back to the CLI tarball served by the connected AgentHub deployment:

```text
/downloads/agenthub-cli-0.1.3.tgz
```

If no deployment URL is configured, it finally falls back to:

```bash
npx -y @guanglechen/agenthub-cli ...
```

That keeps the plugin aligned with the npm package once the CLI is published or distributed through the platform tarball.

## Claude Code marketplace

Validate the repository marketplace:

```bash
agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json
agenthub-cli marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json
```

Test from Claude Code:

```text
/plugin marketplace add .
/plugin install agenthub-connector-plugin@agenthub-enterprise
```

For direct local-file testing, use [examples/local-marketplace.json](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/plugins/agenthub-connector-plugin/examples/local-marketplace.json:1).

## Included skills

- `connect-agenthub`
- `discover-agenthub-assets`
- `install-agenthub-assets`
- `use-agenthub-harness`
