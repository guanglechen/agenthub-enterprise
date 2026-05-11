# AGENTS.md

This file is the execution contract for Claude/Codex style agents working in this repository.

Use [agent.md](./agent.md) for product and architecture background.
Use this file for task execution rules, code entrypoints, and validation paths.

## 1. What This Repo Is

`AgentHub Enterprise` is an enterprise AI development asset hub.

Current project shape:

- authoritative release unit: `skill package`
- enterprise discovery layer: `catalogProfile`
- primary automation entrypoint: `agenthub-cli`
- local Claude Code integration: `plugins/agenthub-connector-plugin`
- Claude Code marketplace compatibility: `.claude-plugin/marketplace.json` and `/registry/claude-marketplace.json`

This repo is already beyond concept stage. It has working backend, frontend, CLI, local plugin, Docker deployment, and smoke coverage.

## 2. Read Order

If you are new to this repo, read in this order:

1. `agent.md`
2. `README_zh.md`
3. `docs/00-product-direction.md`
4. `docs/01-system-architecture.md`

Then choose the task-specific entrypoint:

- Agent onboarding / CLI / plugin:
  - `docs/21-local-claude-plugin-connector.md`
  - `docs/22-enterprise-private-deployment-playbook.md`
  - `docs/23-agenthub-cli-and-agent-onboarding.md`
  - `docs/26-claude-code-marketplace-compat-design.md`
- Backend publish / search / governance:
  - `server/skillhub-app`
  - `server/skillhub-domain`
- Frontend interaction:
  - `web/src/pages`
  - `web/src/features`

## 3. Current Ground Truth

Do not assume the older open-source SkillHub behavior is still the target.

Current repo behavior and direction:

- enterprise-facing product narrative, not public marketplace-first
- `skill` remains the core publish/install/version unit
- `agent/profile` and `agent/install-plan` are the current Agent onboarding APIs
- `agenthub-cli` is the preferred machine interface
- Claude plugin is distributed as a local/Git marketplace-compatible plugin, while AgentHub Skill market remains authoritative
- skill review is currently disabled by default
- open-access mode exists and is actively used in local/staging-style flows

Important current defaults:

- skill review switch:
  - `skillhub.publish.review-required=false`
- open-access runtime switch:
  - `skillhub.auth.open-access.enabled`

## 4. Repo Map

## Backend

- `server/skillhub-app`
  - boot app
  - controllers
  - app services
  - configuration
- `server/skillhub-domain`
  - core domain logic
  - publish flow
  - catalog profile
  - relations
  - recommendation logic
- `server/skillhub-auth`
  - auth
  - open-access mode
  - route security policy
- `server/skillhub-search`
  - search SPI and PostgreSQL full-text implementation
- `server/skillhub-storage`
  - object storage abstraction

Main backend entrypoint:

- `server/skillhub-app/src/main/java/com/iflytek/skillhub/SkillhubApplication.java`

## Frontend

- `web/src/app`
- `web/src/pages`
- `web/src/features`
- `web/src/shared`

## CLI

- package source:
  - `packages/agenthub-cli`
- repo wrapper:
  - `bin/agenthub-cli`
- web-distributed tarball:
  - `web/public/downloads/agenthub-cli-0.1.3.tgz`

## Local Claude Plugin

- `.claude-plugin/marketplace.json`
- `plugins/agenthub-connector-plugin/.claude-plugin/plugin.json`
- `plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs`
- `plugins/agenthub-connector-plugin/skills/*/SKILL.md`

## 5. Preferred Interfaces

When automating platform usage, prefer these interfaces in order:

1. `agenthub-cli`
2. local plugin wrapper
3. direct HTTP API only when needed

Preferred Agent flow:

1. read platform onboarding doc
2. call `agenthub-cli agent profile`
3. detect workspace context
4. call `agenthub-cli agent install-plan`
5. install required skills
6. use `search / inspect / install / publish / catalog / relations` as needed

## 6. Current CLI / Plugin Scope

Current CLI already supports:

- `login`
- `whoami`
- `search`
- `inspect`
- `download`
- `install`
- `publish`
- `catalog get/set`
- `labels list/add/remove`
- `relations get/sync`
- `recommend`
- `agent profile`
- `agent install-plan`
- `marketplace validate`
- `marketplace export`

Current local plugin already supports:

- `profile`
- `detect-context`
- `install-plan`
- `install-skill`
- `apply-install-plan`
- `harness-browse`
- `harness-scan`
- `harness-init`
- `harness-verify`
- `harness-propose`
- `harness-contribute`

Current plugin behavior:

- reads `AGENTHUB_BASE_URL` and `AGENTHUB_TOKEN`, or `.claude/agenthub.json`
- reuses `agenthub-cli`
- falls back to the tarball hosted by the connected deployment

## 7. Current Non-Goals

Do not accidentally redesign toward these unless the user explicitly asks:

- replacing `skill` with a new top-level asset model
- reintroducing heavy approval workflows by default
- public marketplace-first wording
- treating Claude Code marketplace as the primary AgentHub asset model
- assuming the repo is microservice-based

Not done yet:

- managed settings / `extraKnownMarketplaces`
- automatic `.claude/settings.json` injection
- plugin dependency orchestration
- draft extraction and auto-publish from repo structure
- full enterprise quality-gate platform loop

## 8. Editing Rules Specific to This Repo

- preserve `skill` as the release/install/version authority
- preserve backward compatibility for older skill packages without enterprise metadata where possible
- prefer additive enterprise overlays over breaking protocol changes
- if changing CLI docs, keep the tarball version and hosted download path consistent
- if changing plugin behavior, keep CLI and plugin aligned
- if changing publish flow, verify both user-facing behavior and CI/bulk publish expectations

User-specific local artifact rule:

- do not commit `docs/agenthub.zip` unless the user explicitly asks

## 9. Validation Matrix

Choose validation based on the area you changed.

## Frontend / docs / CLI distribution changes

Run:

```bash
cd web && pnpm run typecheck
cd web && pnpm run build
cd web && pnpm test -- --run
```

If the change affects the hosted tarball, onboarding doc, or web delivery:

```bash
docker build -t skillhub-web:staging web
docker compose -p skillhub-staging -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate web
```

Then verify:

- `http://localhost/downloads/agenthub-cli-0.1.3.tgz`
- `http://localhost/registry/skill.md`
- `http://localhost/registry/claude-marketplace.json`

## Backend changes

Preferred lightweight validation:

```bash
cd server && ./mvnw -pl skillhub-app -am test
```

If local Maven is unavailable, Docker-based build is accepted:

```bash
docker build -t skillhub-server:staging server
```

For targeted behavior changes, add or update focused tests in:

- `server/skillhub-domain/src/test/...`
- `server/skillhub-app/src/test/...`

## Deployment validation

After backend or integrated changes:

```bash
docker compose -p skillhub-staging -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate server web
BOOTSTRAP_ADMIN_USERNAME=admin BOOTSTRAP_ADMIN_PASSWORD='Admin@staging2026' bash scripts/smoke-test.sh http://localhost:8080
BOOTSTRAP_ADMIN_USERNAME=admin BOOTSTRAP_ADMIN_PASSWORD='Admin@staging2026' bash scripts/enterprise-agenthub-smoke-test.sh http://localhost:8080
```

These smoke scripts are the current high-value end-to-end check.

## Plugin / Agent onboarding changes

You should validate at least these behaviors:

- `agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json`
- `agenthub-cli marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json`
- `agenthub-cli agent profile`
- `agenthub-cli agent install-plan`
- `node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs profile`
- `node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs install-plan`
- `node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs install-skill ...`

## 10. Known Gotchas

- do not run `./mvnw -pl skillhub-app clean test` in isolation without `-am`
- CLI, plugin, onboarding docs, and tarball version must move together
- open-access mode changes auth expectations in smoke scripts and browser flows
- a Docker build succeeding is not enough for agent-facing work; smoke the CLI/plugin path too
- if the user asks for deployment readiness, validate on deployed containers, not only local source builds

## 11. If You Need to Explain the Repo Briefly

Use this summary:

> AgentHub Enterprise is a private enterprise Skill/Agent asset hub. It keeps `skill package` as the authoritative release unit, layers enterprise catalog metadata and recommendation on top, and exposes `agenthub-cli` plus a Claude Code marketplace-compatible connector plugin as the main Agent integration path.
