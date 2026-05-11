# Java Microservice Harness

This directory is a reference Harness Package.

It is intentionally packaged as a normal AgentHub skill:

- `SKILL.md` is the standard AgentHub skill entrypoint.
- `catalog.yaml` maps this package to enterprise catalog metadata.
- `harness/manifest.yaml` describes templates, rules, and recipes for the CLI.

Local smoke example:

```bash
tmpdir="$(mktemp -d)"
node web/scripts/agenthub-cli.mjs harness init \
  --package-dir examples/harness/java-microservice-harness \
  --dir "$tmpdir" \
  --yes
node web/scripts/agenthub-cli.mjs harness verify --dir "$tmpdir" --json
```
