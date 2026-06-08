---
name: hikvision-java-backend-debug
description: "Use when debugging Hikvision-style Java backend services: find local Maven without downloading it, compile/package the service, start Spring Boot or Java backend processes, and collect actionable logs."
author: Platform Admin
x-agenthub-author: Platform Admin
x-agenthub-asset-type: quality
x-agenthub-domain: java-backend
x-agenthub-stage: develop
x-agenthub-topology: shared-lib
x-agenthub-stack:
  - java
  - maven
  - spring-boot
tags:
  - hikvision
  - java
  - maven
  - backend-debug
  - local-toolchain
---

# 海康 Java 后台服务调试

Use this skill when the user asks you to compile, package, start, or debug a Hikvision-style Java backend service.

This skill is intentionally conservative about toolchains:

- Do not install Maven automatically.
- Do not download a Maven distribution automatically.
- Use an existing local Maven binary only.
- If no local Maven can be found, ask the user for the Maven installation path.
- Do not change JDK, Maven settings, profiles, ports, registry, database, or middleware endpoints without explaining the impact.

## Workflow

### 1. Identify the Java service boundary

Run lightweight inspection first:

```bash
pwd
find . -maxdepth 4 -name pom.xml -print
find . -maxdepth 4 -name application.yml -o -name application.yaml -o -name application.properties -print
rg -n "spring-boot|packaging>|<module>|mainClass|spring.profiles.active|server.port" .
```

Determine:

- root Maven project
- runnable module
- packaging type
- Spring Boot main class if available
- active profile candidates
- config files and port
- required middleware hints such as database, Redis, Nacos, registry, MQ, or internal gateway

If multiple runnable modules exist, ask the user which module should be started.

### 2. Resolve local Maven without downloading it

Find Maven in this order:

```bash
command -v mvn
printf '%s\n' "$MAVEN_HOME" "$M2_HOME"
ls -d /usr/local/Cellar/maven/*/libexec 2>/dev/null
ls -d /opt/homebrew/Cellar/maven/*/libexec 2>/dev/null
ls -d /Applications/IntelliJ\\ IDEA.app/Contents/plugins/maven/lib/maven* 2>/dev/null
```

On Windows shells, also check common local paths:

```powershell
where mvn
echo $env:MAVEN_HOME
echo $env:M2_HOME
dir C:\apache-maven* -ErrorAction SilentlyContinue
dir D:\apache-maven* -ErrorAction SilentlyContinue
```

Rules:

- Prefer `mvn` from `PATH` when it works.
- Use `$MAVEN_HOME/bin/mvn` or `$M2_HOME/bin/mvn` if the environment points to an existing Maven.
- Do not use `mvnw` if it would download Maven. Only use a wrapper when the Maven distribution is already present locally and the user approves.
- If no Maven is found, stop and ask: `本机没有找到 Maven，请提供本地 Maven 安装目录或 mvn 可执行文件路径。`

Verify the selected Maven:

```bash
"$MAVEN_CMD" -version
```

### 3. Align JDK and Maven settings

Inspect, then decide:

```bash
java -version
"$MAVEN_CMD" -version
test -f ~/.m2/settings.xml && sed -n '1,220p' ~/.m2/settings.xml
```

Do not rewrite `~/.m2/settings.xml`. If the build needs an internal mirror, repository credential, or parent POM that is not available locally, ask the user for the correct company Maven settings or network environment.

### 4. Compile and package

Use the root `pom.xml` unless the service has a clear module boundary.

Fast compile:

```bash
"$MAVEN_CMD" -DskipTests compile
```

Package:

```bash
"$MAVEN_CMD" -DskipTests clean package
```

Module package:

```bash
"$MAVEN_CMD" -pl <module> -am -DskipTests clean package
```

If tests are relevant to the user request, run them explicitly instead of silently skipping:

```bash
"$MAVEN_CMD" test
```

When the build fails, report:

- failing module
- first meaningful Maven error
- missing dependency or plugin coordinate
- whether the failure is code, dependency, settings, JDK, or profile related
- exact command that failed

### 5. Start the backend service

Prefer the packaged jar when packaging succeeds:

```bash
java -jar target/*.jar --spring.profiles.active=<profile>
```

For module projects:

```bash
java -jar <module>/target/*.jar --spring.profiles.active=<profile>
```

Use `spring-boot:run` only when the project is designed for it:

```bash
"$MAVEN_CMD" -pl <module> spring-boot:run -Dspring-boot.run.profiles=<profile>
```

Before starting, confirm missing runtime facts with the user:

- active profile
- required port if there is a conflict
- database or registry endpoint
- whether the service should connect to local middleware, test environment, or mocked dependencies

### 6. Verify startup

Check process, port, logs, and health endpoint:

```bash
jps -lv
lsof -iTCP -sTCP:LISTEN -n -P | rg "java|<port>"
rg -n "Started .*Application|Tomcat started|Netty started|ERROR|Exception|Caused by" logs target . -g '*.log'
curl -fsS http://127.0.0.1:<port>/actuator/health
```

If there is no actuator endpoint, use the service's known health, Swagger, or business ping endpoint after asking the user.

### 7. Debug common failures

Use this triage order:

1. JDK version mismatch.
2. Maven missing or wrong Maven settings.
3. Parent POM, plugin, or dependency cannot be resolved.
4. Wrong module selected.
5. Wrong Spring profile.
6. Port already in use.
7. Database, Redis, Nacos, MQ, registry, or gateway unavailable.
8. Local configuration points to production or restricted network.
9. Startup succeeds but health/business endpoint fails.

Always give the user the next exact command or the next exact missing input.

## Output Contract

When finished, report:

- detected root/module
- Maven path used
- JDK version used
- build command and result
- package artifact path
- start command
- active profile and port
- health or smoke result
- unresolved external dependency, if any
