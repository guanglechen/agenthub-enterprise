---
name: agenthub-enterprise-registry
description: Read this before using AgentHub Enterprise from a human workflow or an AI Agent. It explains what the platform is for, how to install the AgentHub CLI, how to initialize workspace config without upfront tokens, and how to execute search, install, publish, and install-plan workflows.
---

# AgentHub Enterprise Registry Guide

This document is the machine-readable entrypoint for `AgentHub Enterprise`.

## Only Have The Base URL?

If you are an AI Agent and the user only gave you the platform address, do this first:

```bash
curl -fsS ${SKILLHUB_PUBLIC_BASE_URL}/llms.txt
curl -fsS ${SKILLHUB_PUBLIC_BASE_URL}/.well-known/agenthub.json
npm install -g ${SKILLHUB_PUBLIC_BASE_URL}/downloads/agenthub-cli-0.1.4.tgz
agenthub-cli agent profile --base-url ${SKILLHUB_PUBLIC_BASE_URL} --json
```

Do not ask the user for `AGENTHUB_TOKEN` upfront. First run platform profile, search, install-plan, install, and publish workflows directly; only request a token if the connected deployment returns `401/403` or the user explicitly needs private team assets.

Use it when you need to:

- understand what this platform is for
- connect a human CLI workflow to the platform
- connect an Agent workspace to the platform
- obtain the right install and publish commands
- understand when an optional token is required

## What This Platform Is

`AgentHub Enterprise` is a private development asset hub for enterprise AI engineering.

It is not only a generic skill marketplace. It is used to distribute and maintain:

- product capabilities
- project scaffolds
- business-domain assets
- microservice skills
- quality and governance baselines
- platform integration assets

## Asset Families

All content is still distributed as Skill packages, but humans and Agents should think in these asset families when searching:

- `Claude / Agent 插件`: query `plugin connector claude agent`, usually `assetType=integration`
- `Agent Skill`: query `agent skill`, usually `assetType=integration`
- `开发基础知识`: query `coding standard framework engineering`, usually `assetType=quality`
- `产品知识`: query `product solution`, usually `assetType=product`
- `业务知识`: query `business domain capability`, usually `assetType=business`
- `开发辅助工具`: query `scaffold generator tooling`, usually `assetType=scaffold`
- `Harness Package`: query `harness java microservice`, usually `assetType=microservice` and `stack=java21,spring-boot3,maven`
- `平台集成`: query `ci git deployment observability`, usually `assetType=integration`

Use `/api/v1/agent/install-plan` when the current workspace context is known; use `/api/web/skills` or `agenthub-cli search` when exploring the market.

The platform is optimized for `agenthub-cli` and for Agent-driven workflows such as:

1. discover existing assets
2. initialize a workspace
3. generate an install plan
4. install required skills
5. publish or maintain a governed skill package

## Human Quick Start

Install the CLI package served by the platform:

```bash
npm install -g ${SKILLHUB_PUBLIC_BASE_URL}/downloads/agenthub-cli-0.1.4.tgz
```

`agenthub-cli` only requires Node.js 20+. Python is not required for install or unpack workflows.

If this is a local deployment and `npm install` returns a proxy-related `503`,
retry with the loopback address and bypass npm proxy configuration:

```bash
NO_PROXY='*' no_proxy='*' npm_config_proxy='' npm_config_https_proxy='' npm_config_noproxy='*' \
  npm install -g http://127.0.0.1/downloads/agenthub-cli-0.1.4.tgz
```

Open-access deployments do not require a token for the default workflow.
Initialize and verify access:

```bash
agenthub-cli config init-workspace --workspace . --base-url ${SKILLHUB_PUBLIC_BASE_URL}
agenthub-cli whoami --json
```

Search and install:

```bash
agenthub-cli search --q spring-boot --assetType scaffold --json
agenthub-cli install --skill @global/java-microservice-baseline --base-url ${SKILLHUB_PUBLIC_BASE_URL}
```

Publish:

```bash
agenthub-cli publish --namespace team-alpha --file ./bundle.zip --catalog-file ./catalog.json --yes
```

### Human Harness Commands

Harness Packages are special skill packages for Java microservice engineering knowledge. They keep the normal AgentHub skill model and add a `harness/manifest.yaml`.

```bash
agenthub-cli harness browse --stack java21,spring-boot3,maven --json
agenthub-cli harness scan-modules --dir . --json
agenthub-cli harness init --package @platform/java-microservice-harness --dir . --yes
agenthub-cli harness verify --dir . --json
```

### Claude Code Plugin Marketplace

AgentHub remains the enterprise Skill market. Claude Code marketplace support is a compatibility export for plugins that Claude Code can install natively.

Marketplace discovery document:

```text
${SKILLHUB_PUBLIC_BASE_URL}/registry/claude-marketplace.json
```

Recommended Claude Code installation path:

```text
/plugin marketplace add <your-agenthub-git-repository-or-internal-git-url>
/plugin install agenthub-connector-plugin@agenthub-enterprise
```

Local repository validation:

```bash
agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json
agenthub-cli marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json
```

## Agent Quick Start

If you are an Agent, treat this document as the required onboarding spec.

### Step 1. Read platform profile

```bash
agenthub-cli agent profile --base-url ${SKILLHUB_PUBLIC_BASE_URL} --json
```

This tells you:

- what the platform is for
- which bundles are recommended by default
- which asset types and domains are expected

### Step 2. Start without a token and detect the auth boundary

Open-access deployments can search, install, and publish directly. Do not ask
the user for a token before trying `agent profile`, `agent install-plan`, or
`publish`.

If a command returns `401/403`, then ask the user for an API token from:

```text
${SKILLHUB_PUBLIC_BASE_URL}/dashboard/tokens
```

Guidance:

- public search, install/download, install-plan, and publish should be attempted without a token first
- team-private assets or strict-auth deployments can still use a token after the platform proves one is needed

### Step 3. Initialize workspace configuration

Write `.claude/agenthub.json`:

```bash
agenthub-cli config init-workspace \
  --workspace . \
  --base-url ${SKILLHUB_PUBLIC_BASE_URL} \
  --namespace team-alpha \
  --domain order \
  --assetType microservice \
  --stage develop \
  --topology crud-api \
  --stack java21,spring-boot3,maven
```

### Step 4. Ask the platform for an install plan

```bash
agenthub-cli agent install-plan \
  --assetType microservice \
  --domain order \
  --stage develop \
  --topology crud-api \
  --stack java21,spring-boot3,maven \
  --namespace team-alpha \
  --json
```

### Step 5. Install required skills and Harness Packages

Each item in `requiredSkills` and `recommendedSkills` can include:

- `installScope`: `user` for reusable platform capabilities, `workspace` for project-specific capabilities
- `targetDir`: the directory where the Agent should install that skill

Follow the `targetDir` returned by the platform. Do not install every skill into
the current repository just because the Agent is running there. Shared quality,
product, integration, release, or operation skills normally belong in
`~/.agent/skills`; project scaffolds and business-context skills normally belong
in `./.agent/skills`.

```bash
agenthub-cli install --skill @global/java-microservice-baseline --target ./.agent/skills --base-url ${SKILLHUB_PUBLIC_BASE_URL}
agenthub-cli install --skill @global/quality-gate-baseline --target ~/.agent/skills --base-url ${SKILLHUB_PUBLIC_BASE_URL}
```

If the install plan indicates a Java/Spring Boot workspace, continue with Harness:

```bash
agenthub-cli harness browse --stack java21,spring-boot3,maven --json
agenthub-cli harness init --package @platform/java-microservice-harness --yes
agenthub-cli harness verify --json
```

For an existing Java service:

```bash
agenthub-cli harness scan-modules --dir . --json
agenthub-cli harness propose --dir . --json
agenthub-cli harness verify --dir . --json
```

### Step 6. Optional local connector plugin

If your environment already has the Claude Code connector plugin installed from the enterprise marketplace, you can continue with the plugin after workspace bootstrap. The plugin internally reuses `agenthub-cli`.

## Token Rules

Do not use a token as the default path. Use a token only when any of the
following is true:

- the platform returns `401/403` for the operation
- you need access to team-private or governed assets
- the user explicitly provided a token for a strict-auth deployment
- an enterprise policy requires token-bound identity for automated pipelines

Validate an optional token with:

```bash
agenthub-cli whoami --json
```

## Branding

Default deployment branding is `HIKVISION AgentHub / 海康威视内部研发资产分发平台`.

Private deployments can override the visible brand without rebuilding the frontend:

```bash
SKILLHUB_WEB_BRAND_NAME="HIKVISION AgentHub"
SKILLHUB_WEB_BRAND_ORG_NAME="海康威视"
SKILLHUB_WEB_BRAND_TAGLINE="内部研发资产分发平台"
SKILLHUB_WEB_BRAND_LOGO_URL="https://internal.example.com/logo.svg"
```

## Coordinate Rules

Canonical platform coordinate:

```text
@namespace/skill-slug
```

Examples:

- `@global/java-microservice-baseline`
- `@team-alpha/order-bff-scaffold`

`latest` always means the latest published version, never draft or pending review.

## Common Commands

```bash
agenthub-cli search --q payment --domain payment --json
agenthub-cli inspect --skill @global/quality-gate-baseline --json
agenthub-cli download --skill @global/quality-gate-baseline --out quality-gate.zip
agenthub-cli catalog get --skill @team-alpha/order-bff-scaffold --json
agenthub-cli relations get --skill @team-alpha/order-bff-scaffold --json
agenthub-cli recommend --assetType scaffold --domain order --stack spring-boot3,maven --json
agenthub-cli harness browse --stack java21,spring-boot3,maven --json
agenthub-cli harness contribute --dir . --name order-service-harness --dry-run
agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json
```

## Compatibility Note

The platform still exposes a ClawHub-compatible API surface for compatibility. Prefer `agenthub-cli` for enterprise workflows. Only fall back to legacy `clawhub` commands when you are explicitly testing compatibility behavior.
