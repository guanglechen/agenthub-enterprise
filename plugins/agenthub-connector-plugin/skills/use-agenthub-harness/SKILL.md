---
name: use-agenthub-harness
description: Use AgentHub Harness Packages from Claude Code to discover Java microservice assets, initialize a workspace, scan modules, verify conventions, and prepare dry-run contributions.
allowed-tools: Bash(node bin/agenthub-plugin.mjs profile *) Bash(node bin/agenthub-plugin.mjs detect-context *) Bash(node bin/agenthub-plugin.mjs install-plan *) Bash(node bin/agenthub-plugin.mjs harness-browse *) Bash(node bin/agenthub-plugin.mjs harness-scan *) Bash(node bin/agenthub-plugin.mjs harness-verify *) Bash(node bin/agenthub-plugin.mjs harness-init *) Bash(node bin/agenthub-plugin.mjs harness-propose *) Bash(node bin/agenthub-plugin.mjs harness-contribute *) Read Grep Glob Write
---

When this skill is invoked:

1. Run `node bin/agenthub-plugin.mjs profile --json` first.
2. Run `node bin/agenthub-plugin.mjs detect-context --json` to understand the workspace.
3. Run `node bin/agenthub-plugin.mjs install-plan --json` and prefer the platform plan over ad hoc search.
4. Use `node bin/agenthub-plugin.mjs harness-browse --json` to find Harness Packages for Java/Spring Boot workspaces.
5. For a new workspace, ask for confirmation before running `node bin/agenthub-plugin.mjs harness-init --skill @namespace/slug --yes --json`.
6. For an existing workspace, run `node bin/agenthub-plugin.mjs harness-scan --json` and `node bin/agenthub-plugin.mjs harness-verify --json`.
7. Use `node bin/agenthub-plugin.mjs harness-propose --json` to summarize next actions from failed or warning rules.
8. Use `node bin/agenthub-plugin.mjs harness-contribute --name <name> --dry-run --json` only when the user asks to prepare a reusable Harness Package.
9. Do not auto-apply for tokens. Use `AGENTHUB_TOKEN`, `AGENTHUB_BASE_URL`, or `.claude/agenthub.json` provided by the user or CI runtime.
10. Do not publish or modify registry metadata unless the user explicitly asks for publishing or maintenance.
