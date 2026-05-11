---
name: agenthub-enterprise-registry
description: Read this before using AgentHub Enterprise from a human workflow or an AI Agent. It explains what the platform is for, how to install the AgentHub CLI, how to obtain a token, how to initialize workspace config, and how to execute search, install, publish, and install-plan workflows.
---

# AgentHub Enterprise Registry Guide

This document is the machine-readable entrypoint for `AgentHub Enterprise`.

## Only Have The Base URL?

If you are an AI Agent and the user only gave you the platform address, do this first:

```bash
curl -fsS ${SKILLHUB_PUBLIC_BASE_URL}/llms.txt
curl -fsS ${SKILLHUB_PUBLIC_BASE_URL}/.well-known/agenthub.json
npm install -g ${SKILLHUB_PUBLIC_BASE_URL}/downloads/agenthub-cli-0.1.3.tgz
agenthub-cli agent profile --base-url ${SKILLHUB_PUBLIC_BASE_URL} --json
```

Then ask the user for `AGENTHUB_TOKEN` only when you need to publish, update catalog metadata, maintain labels/relations, or access private team assets.

Use it when you need to:

- understand what this platform is for
- connect a human CLI workflow to the platform
- connect an Agent workspace to the platform
- obtain the right install and publish commands
- understand when a token is required

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
npm install -g ${SKILLHUB_PUBLIC_BASE_URL}/downloads/agenthub-cli-0.1.3.tgz
```

`agenthub-cli` only requires Node.js 20+. Python is not required for install or unpack workflows.

If this is a local deployment and `npm install` returns a proxy-related `503`,
retry with the loopback address and bypass npm proxy configuration:

```bash
NO_PROXY='*' no_proxy='*' npm_config_proxy='' npm_config_https_proxy='' npm_config_noproxy='*' \
  npm install -g http://127.0.0.1/downloads/agenthub-cli-0.1.3.tgz
```

Create a token from:

```text
${SKILLHUB_PUBLIC_BASE_URL}/dashboard/tokens
```

Login and verify access:

```bash
agenthub-cli login --base-url ${SKILLHUB_PUBLIC_BASE_URL} --token sk_your_api_token_here
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

### Step 2. Obtain a token when write or governed access is needed

Token management page:

```text
${SKILLHUB_PUBLIC_BASE_URL}/dashboard/tokens
```

Guidance:

- public read-only search and download may work without a token in open-access deployments
- team-private assets, publishing, catalog maintenance, labels, and relations should use a token

### Step 3. Initialize workspace configuration

Write `.claude/agenthub.json`:

```bash
agenthub-cli config init-workspace \
  --workspace . \
  --base-url ${SKILLHUB_PUBLIC_BASE_URL} \
  --token sk_your_api_token_here \
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

```bash
agenthub-cli install --skill @global/java-microservice-baseline --base-url ${SKILLHUB_PUBLIC_BASE_URL}
agenthub-cli install --skill @global/quality-gate-baseline --base-url ${SKILLHUB_PUBLIC_BASE_URL}
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

Use a token when any of the following is true:

- you need to publish a skill
- you need to update catalog metadata
- you need to maintain labels or relations
- you need access to team-private or governed assets
- you need reliable identity for automated pipelines

Validate the token with:

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
