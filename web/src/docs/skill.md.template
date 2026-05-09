---
name: agenthub-enterprise-registry
description: Read this before using AgentHub Enterprise from a human workflow or an AI Agent. It explains what the platform is for, how to install the AgentHub CLI, how to obtain a token, how to initialize workspace config, and how to execute search, install, publish, and install-plan workflows.
---

# AgentHub Enterprise Registry Guide

This document is the machine-readable entrypoint for `AgentHub Enterprise`.

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

The platform is optimized for `agenthub-cli` and for Agent-driven workflows such as:

1. discover existing assets
2. initialize a workspace
3. generate an install plan
4. install required skills
5. publish or maintain a governed skill package

## Human Quick Start

Install the CLI package served by the platform:

```bash
npm install -g ${SKILLHUB_PUBLIC_BASE_URL}/downloads/agenthub-cli-0.1.0.tgz
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

### Step 5. Install required skills

```bash
agenthub-cli install --skill @global/java-microservice-baseline --base-url ${SKILLHUB_PUBLIC_BASE_URL}
agenthub-cli install --skill @global/quality-gate-baseline --base-url ${SKILLHUB_PUBLIC_BASE_URL}
```

### Step 6. Optional local connector plugin

If your environment already has the local Claude Code connector plugin, you can continue with the plugin after workspace bootstrap. The plugin internally reuses `agenthub-cli`.

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
```

## Compatibility Note

The platform still exposes a ClawHub-compatible API surface for compatibility. Prefer `agenthub-cli` for enterprise workflows. Only fall back to legacy `clawhub` commands when you are explicitly testing compatibility behavior.
