# Java Microservice Harness

This skill is a Harness Package for enterprise Java microservice projects.

It keeps AgentHub's normal skill package model and adds a `harness/` directory that can be used by `agenthub-cli harness ...` commands.

Use it for:

- initializing a Spring Boot microservice
- scanning existing Java service modules
- verifying basic engineering conventions
- generating a candidate Harness Package from a project

Recommended Agent flow:

```bash
agenthub-cli agent profile --json
agenthub-cli agent install-plan --language java --framework spring-boot3 --stack java21,spring-boot3,maven --json
agenthub-cli harness init --package @platform/java-microservice-harness --yes
agenthub-cli harness verify --json
```
