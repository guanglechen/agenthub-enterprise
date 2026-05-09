---
name: discover-agenthub-assets
description: Detect the current workspace context, ask AgentHub Enterprise for an install plan, and explain which skills are required versus optional.
allowed-tools: Bash(node bin/agenthub-plugin.mjs detect-context *) Bash(node bin/agenthub-plugin.mjs install-plan *) Read Grep Glob
---

When this skill is invoked:

1. Run `node bin/agenthub-plugin.mjs detect-context --json`.
2. Run `node bin/agenthub-plugin.mjs install-plan --json`.
3. Explain the workspace context that was detected.
4. Separate the platform response into:
   - required skills
   - recommended skills
   - next actions
5. Prefer the platform install plan over ad hoc search so the agent follows enterprise defaults.
