---
name: install-agenthub-assets
description: Install the required or recommended AgentHub skills into the current workspace under .claude/skills.
allowed-tools: Bash(node bin/agenthub-plugin.mjs apply-install-plan *) Bash(node bin/agenthub-plugin.mjs install-skill *) Read Write
---

When this skill is invoked:

1. If the user did not narrow the scope, install the required skills first.
2. Run `node bin/agenthub-plugin.mjs apply-install-plan --mode required --json`.
3. If the user explicitly asks for optional assets too, rerun with `--mode all`.
4. Confirm which coordinates were installed and where they were unpacked.
5. After installation, recommend running the relevant self-test or quality-gate skills before code generation or PR submission.
