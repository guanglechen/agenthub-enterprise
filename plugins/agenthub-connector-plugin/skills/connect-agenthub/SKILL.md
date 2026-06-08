---
name: connect-agenthub
description: Connect to AgentHub Enterprise, read the platform onboarding profile, and summarize what the platform is for before doing any asset discovery or installation work.
allowed-tools: Bash(node bin/agenthub-plugin.mjs profile *) Read
---

When this skill is invoked:

1. Run `node bin/agenthub-plugin.mjs profile --json`.
2. Summarize the platform purpose, supported asset types, default bundles, onboarding steps, and Skill contribution policy.
3. If the connector is not configured, tell the user to set `AGENTHUB_BASE_URL` or create `.claude/agenthub.json`; only request `AGENTHUB_TOKEN` after the deployment rejects a write operation with 401/403.
4. Do not start searching assets until the platform profile has been read successfully.
5. If the user asks to publish or share a Skill, follow the profile's contribution policy: infer catalog profile, infer labels, resolve contributor attribution, and ask the user for a contributor display name when none can be resolved.
