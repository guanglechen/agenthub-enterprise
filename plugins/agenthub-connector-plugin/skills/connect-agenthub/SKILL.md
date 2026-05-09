---
name: connect-agenthub
description: Connect to AgentHub Enterprise, read the platform onboarding profile, and summarize what the platform is for before doing any asset discovery or installation work.
allowed-tools: Bash(node bin/agenthub-plugin.mjs profile *) Read
---

When this skill is invoked:

1. Run `node bin/agenthub-plugin.mjs profile --json`.
2. Summarize the platform purpose, supported asset types, default bundles, and onboarding steps.
3. If the connector is not configured, tell the user to set `AGENTHUB_BASE_URL` and `AGENTHUB_TOKEN`, or create `.claude/agenthub.json`.
4. Do not start searching assets until the platform profile has been read successfully.
