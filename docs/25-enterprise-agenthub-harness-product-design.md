# AgentHub Enterprise Harness 能力层产品设计

> 本文是 `docs/24-enterprise-harness-platform-design.md` 的评审后收敛版。
>
> 核心结论：AgentHub Enterprise 继续保持 **Skill 市场 / Skill Registry** 主线；Harness 是叠加在 Skill 之上的 Java 微服务工程知识能力层，不替代现有平台主模型，不把平台重构成 Fragment Registry。

## 1. 背景与目标

### 1.1 背景

AgentHub Enterprise 当前已经具备企业内部 Skill 分发平台的基础能力：

- `skill package` 是发布、搜索、下载、安装、版本管理的权威单元。
- `catalogProfile` 是企业目录画像，用于表达资产类型、业务域、阶段、拓扑、技术栈、责任团队和维护模式。
- `agenthub-cli` 是人和 Agent 共用的命令行入口。
- `agent/profile` 与 `agent/install-plan` 是 Agent 接入平台后的结构化理解入口。
- Claude Code 本地插件通过 CLI 连接平台，完成 profile、install-plan、安装 skill 等操作。

`docs/24-enterprise-harness-platform-design.md` 提出了更强的 Harness 平台形态：希望把 Java 微服务工程经验拆成可组合的工程片段、验证规则、模板和 Agent 操作流程。这个方向对企业内部 Java 微服务研发有价值，但如果直接把 `Fragment` 提升为 AgentHub 全局资产，会带来过大的模型重构、接口重构和迁移成本。

因此本版设计采用收敛策略：

- 保留 AgentHub 的 Skill 市场方向。
- Harness 作为一个面向 Java 微服务工程的能力层运行在 Skill 之上。
- Harness Package 是特殊类型的 skill package，而不是新的顶层发布单元。
- Fragment 只在 Harness Package 内部成立，用于描述可组合工程能力，不成为 AgentHub 全局唯一资产模型。

### 1.2 目标

一期目标是让企业内部的 Java 微服务工程知识能够快速沉淀、快速复用、可被 Agent 自动使用。

具体目标：

- 让开发者和 Agent 打开 AgentHub 后知道它是内部 Skill 市场，也是企业开发资产分发平台。
- 让 Claude Code / Codex 等 Agent 能通过 `agenthub-cli` 获取平台 profile、推荐安装计划和 Harness 能力清单。
- 让 Java 微服务脚手架、配置规范、代码生成片段、治理规则、测试规则、发布规则以 Harness Package 形式进入 Skill 市场。
- 让 Agent 能在本地工程中执行 `init / sync / apply / verify / propose / contribute` 闭环。
- 让团队在审核默认关闭的前提下快速积累 skill，不因为治理流程过重阻塞早期资产沉淀。

### 1.3 非目标

一期不做以下事情：

- 不用 Fragment 替代 AgentHub 全局 skill 模型。
- 不废弃 `docs/21-local-claude-plugin-connector.md`、`docs/22-enterprise-private-deployment-playbook.md`、`docs/23-agenthub-cli-and-agent-onboarding.md`。
- 不把 Claude Code 插件直接绑定成唯一入口，CLI 仍是稳定自动化层。
- 不在一期引入复杂 ACL、审批流、脱敏申诉和多级资产准入流程。
- 不做重 LLM 黑盒推荐引擎，优先规则、元数据、关系和使用信号。

## 2. 设计原则

### 2.1 Skill 市场主线不变

AgentHub 平台全局仍以 skill package 为中心：

- 上传的是 skill。
- 下载的是 skill。
- 安装的是 skill。
- 搜索结果主体是 skill。
- 版本、兼容性、标签、catalogProfile、关系和推荐都挂在 skill 上。

Harness 只扩展 skill 的内容结构和使用方式，不替换 skill。

### 2.2 Harness 是能力层，不是平台重构

Harness 的职责是把企业 Java 微服务研发经验结构化，包括：

- 工程目录和模块约定。
- 脚手架模板。
- 代码片段。
- 配置片段。
- 测试与验证规则。
- Agent 操作流程。
- 贡献和回流机制。

这些能力通过 Harness Package 进入 Skill 市场。平台侧只需要识别它是 `assetType=scaffold`、`assetType=quality` 或 `assetType=integration` 等特殊 skill，并读取其 `harness/` 目录元数据。

### 2.3 Fragment 只在 Harness 域内成立

Fragment 是 Harness Package 内部的工程组成单元，不是 AgentHub 全局资产。

Fragment 的典型形态包括：

- `cell`：可插入到 Java 微服务工程中的能力单元，例如 REST API、定时任务、事件消费者、Feign 客户端、数据库迁移模板。
- `rule`：可验证的工程规则，例如包结构、依赖版本、测试覆盖、配置项、日志规范。
- `template`：工程模板、模块模板或代码模板。
- `recipe`：Agent 执行步骤，例如如何初始化、如何应用、如何验证、如何回流。

平台全局只看到 Harness Package 这个 skill；Harness CLI 和插件在本地解包后理解其中的 Fragment。

### 2.4 Agent 入口必须稳定、可脚本化

Agent 接入不依赖人工浏览页面。平台必须提供稳定的机器入口：

- `agent/profile`：告诉 Agent 平台是什么、支持哪些能力、当前推荐使用哪些入口。
- `agent/install-plan`：根据 Agent 类型、工程上下文和目标生成安装计划。
- `agenthub-cli`：承接搜索、下载、安装、发布、目录维护、关系维护、Harness 操作。
- Claude Code 插件：复用 CLI，减少插件与 HTTP API 的耦合。

### 2.5 快速积累优先

早期目标是先积累足够多的企业内部 skill 和 Harness Package。

默认策略：

- skill 审核默认关闭。
- CI 和 Agent 可以批量上传。
- 名称冲突直接失败，不自动覆盖。
- 用户或 Agent 改名后重新上传。
- 基础安全扫描只拦截明显凭证和危险包内容，不引入复杂审批链。

### 2.6 内部工程知识可以进入 Hub

AgentHub 是企业内网平台，允许收录内部工程知识，包括：

- 项目目录结构。
- 模块拆分经验。
- 内部技术栈组合。
- 微服务治理规范。
- 内部框架接入方式。
- 业务域建模经验。
- 测试、部署、观测实践。

但以下内容不得进入 Hub：

- token。
- 密码。
- 私钥。
- 完整 JDBC 密码。
- 真实凭证。
- 可直接访问生产系统的密钥材料。

复杂 ACL、审批、脱敏申诉、资产密级作为后续治理能力，不阻塞一期。

## 3. 产品模型

### 3.1 平台全局模型

AgentHub Enterprise 的全局模型保持如下层次：

```text
AgentHub
  └── Namespace / Team
      └── Skill Package
          ├── Version
          ├── catalogProfile
          ├── labels
          ├── relations
          ├── recommendations
          └── optional harness/
```

解释：

- `Namespace / Team` 表示团队空间。
- `Skill Package` 是唯一发布和安装单元。
- `Version` 表示 skill 的版本。
- `catalogProfile` 表示企业目录画像。
- `labels` 表示推荐、认证、专题、试点等编辑性标签。
- `relations` 表示 skill 与 skill 之间的依赖、推荐、组成、服务关联。
- `harness/` 是可选目录，只有 Harness Package 才需要。

### 3.2 Harness Package

Harness Package 是一个特殊 skill package。

它满足两个条件：

- `catalogProfile.assetType` 通常为 `scaffold`、`quality`、`integration`、`microservice` 或 `business`。
- 包内包含 `harness/manifest.yaml` 或 `harness/manifest.json`。

Harness Package 的能力范围：

- 初始化 Java 微服务工程。
- 给存量工程添加能力单元。
- 同步企业工程规范。
- 验证工程是否符合规范。
- 给 Agent 提供下一步修改建议。
- 从项目中提取可复用能力并贡献回 Hub。

### 3.3 catalogProfile 约定

Harness Package 继续使用现有 `catalogProfile` 表达企业目录画像。

建议字段：

```yaml
assetType: scaffold
domain: order
stage: bootstrap
topology: crud-api
stack:
  - java21
  - spring-boot3
  - maven
  - mysql
ownerTeam: platform-engineering
keywords:
  - java-microservice
  - harness
  - order-service
maintenanceMode: agent
```

字段含义：

- `assetType`：资产类型，仍使用 AgentHub 当前枚举。
- `domain`：业务域，例如 `order`、`payment`、`inventory`。
- `stage`：适用阶段，例如 `bootstrap`、`develop`、`test`、`release`。
- `topology`：技术拓扑，例如 `crud-api`、`bff`、`event-consumer`。
- `stack`：技术栈标签。
- `ownerTeam`：责任团队。
- `keywords`：搜索扩展词。
- `maintenanceMode`：维护模式，建议 Harness Package 使用 `agent` 或 `manual`。

### 3.4 relations 约定

Harness Package 继续使用现有 skill relation 模型。

推荐关系：

```yaml
relations:
  - type: dependsOn
    target: "@platform/java-spring-base"
    title: "Java Spring Boot 基础工程"
    note: "应用前需要先安装基础工程约束"
  - type: recommendedWith
    target: "@quality/java-test-harness"
    title: "Java 测试治理 Harness"
    note: "初始化后建议同步测试规则"
  - type: partOf
    target: "@platform/java-microservice-harness-suite"
    title: "Java 微服务 Harness 套件"
    note: "属于企业 Java 微服务标准能力集合"
```

关系用于：

- 搜索排序。
- 推荐解释。
- Agent install-plan。
- 本地 `harness apply` 前置依赖检查。

### 3.5 Skill 与 Harness Fragment 的关系

Skill 与 Harness Fragment 的关系如下：

```text
Skill Package: @platform/java-microservice-harness
  └── harness/
      ├── manifest.yaml
      ├── cells/
      │   ├── rest-crud-api/
      │   ├── event-consumer/
      │   └── scheduled-job/
      ├── rules/
      │   ├── package-layout.yaml
      │   ├── dependency-policy.yaml
      │   └── test-policy.yaml
      ├── templates/
      │   ├── service/
      │   └── module/
      └── recipes/
          ├── init.yaml
          ├── apply.yaml
          ├── verify.yaml
          └── contribute.yaml
```

这里的 `cells / rules / templates / recipes` 是 Harness 内部结构。AgentHub 不需要把它们拆成顶层表；CLI 可以在下载 skill 后本地读取并执行。

## 4. Harness Package 与元数据

### 4.1 包结构

推荐包结构：

```text
java-microservice-harness/
  ├── SKILL.md
  ├── catalog.yaml
  ├── README.md
  ├── harness/
  │   ├── manifest.yaml
  │   ├── cells/
  │   ├── rules/
  │   ├── templates/
  │   └── recipes/
  └── examples/
```

文件职责：

- `SKILL.md`：AgentHub 标准 skill 说明，供人和 Agent 阅读。
- `catalog.yaml`：企业目录画像，可映射到 `catalogProfile`。
- `README.md`：人类可读说明。
- `harness/manifest.yaml`：Harness 能力清单和执行入口。
- `harness/cells/`：可组合能力单元。
- `harness/rules/`：工程验证规则。
- `harness/templates/`：工程模板和代码模板。
- `harness/recipes/`：Agent 执行步骤。
- `examples/`：示例工程或示例片段。

### 4.2 manifest 结构

`harness/manifest.yaml` 建议结构：

```yaml
apiVersion: agenthub.iflytek.com/v1alpha1
kind: HarnessPackage
metadata:
  name: java-microservice-harness
  displayName: Java 微服务 Harness
  version: 0.1.0
  ownerTeam: platform-engineering
  minimumAgenthubCliVersion: 0.1.3
spec:
  target:
    language: java
    framework:
      - spring-boot3
    buildTool:
      - maven
    topology:
      - crud-api
      - event-consumer
      - scheduled-job
  commands:
    init:
      recipe: recipes/init.yaml
    sync:
      recipe: recipes/sync.yaml
    apply:
      recipe: recipes/apply.yaml
    verify:
      recipe: recipes/verify.yaml
    propose:
      recipe: recipes/propose.yaml
    contribute:
      recipe: recipes/contribute.yaml
  cells:
    - id: rest-crud-api
      title: REST CRUD API 能力单元
      path: cells/rest-crud-api
      appliesTo:
        topology:
          - crud-api
    - id: event-consumer
      title: 事件消费者能力单元
      path: cells/event-consumer
      appliesTo:
        topology:
          - event-consumer
  rules:
    - id: package-layout
      title: 包结构规则
      path: rules/package-layout.yaml
    - id: dependency-policy
      title: 依赖版本规则
      path: rules/dependency-policy.yaml
```

### 4.3 cell 元数据

每个 cell 应提供自己的元数据：

```yaml
id: rest-crud-api
title: REST CRUD API 能力单元
summary: 为 Spring Boot 微服务添加标准 Controller、Service、Repository、DTO、测试骨架
inputs:
  entityName:
    type: string
    required: true
  packageName:
    type: string
    required: true
outputs:
  files:
    - src/main/java/**/controller/*Controller.java
    - src/main/java/**/service/*Service.java
    - src/test/java/**/*Test.java
verification:
  - rule: package-layout
  - command: mvn test
```

### 4.4 敏感内容边界

允许进入 Harness Package 的内容：

- 内部框架接入说明。
- 内部 Maven 坐标。
- 内部工程目录规范。
- 内部微服务样例结构。
- 内部 CI/CD 标准步骤。
- 内部代码模板。
- 内部测试规范。

不允许进入 Harness Package 的内容：

- 明文 token。
- 明文密码。
- 私钥文件。
- 完整 JDBC 密码。
- 可直接访问环境的生产凭证。
- 真实用户隐私数据。

一期处理方式：

- CLI 发布前做基础 secret pattern 扫描。
- 服务端发布时做基础包内容扫描。
- 命中高危凭证时拒绝发布。
- 对内部工程知识不做过度脱敏。

## 5. 本地工程目录设计

### 5.1 目标工程结构

Agent 在本地 Java 微服务项目中使用 Harness 后，推荐生成 `.agenthub/` 管理目录：

```text
target-project/
  ├── .agenthub/
  │   ├── profile.json
  │   ├── install-plan.json
  │   ├── harness.lock.json
  │   ├── applied-cells.json
  │   └── verify-report.json
  ├── pom.xml
  ├── src/
  └── README.md
```

文件职责：

- `.agenthub/profile.json`：平台 profile 快照。
- `.agenthub/install-plan.json`：Agent 获取到的安装计划。
- `.agenthub/harness.lock.json`：已安装 Harness Package 和版本锁定。
- `.agenthub/applied-cells.json`：已应用 cell 清单。
- `.agenthub/verify-report.json`：最近一次验证报告。

### 5.2 harness.lock.json

示例：

```json
{
  "platform": "http://agenthub.internal",
  "generatedAt": "2026-05-11T10:00:00+08:00",
  "packages": [
    {
      "name": "@platform/java-microservice-harness",
      "version": "0.1.0",
      "digest": "sha256:example",
      "installedAt": "2026-05-11T10:00:00+08:00"
    }
  ]
}
```

### 5.3 applied-cells.json

示例：

```json
{
  "cells": [
    {
      "id": "rest-crud-api",
      "package": "@platform/java-microservice-harness",
      "version": "0.1.0",
      "inputs": {
        "entityName": "Order",
        "packageName": "com.company.order"
      },
      "appliedAt": "2026-05-11T10:30:00+08:00",
      "files": [
        "src/main/java/com/company/order/controller/OrderController.java",
        "src/main/java/com/company/order/service/OrderService.java"
      ]
    }
  ]
}
```

### 5.4 verify-report.json

示例：

```json
{
  "status": "failed",
  "checkedAt": "2026-05-11T11:00:00+08:00",
  "summary": {
    "passed": 8,
    "failed": 2,
    "warning": 1
  },
  "findings": [
    {
      "rule": "dependency-policy",
      "severity": "error",
      "message": "spring-boot-starter-test 版本未跟随企业 BOM",
      "file": "pom.xml",
      "suggestion": "同步 @platform/java-spring-base 中的 dependencyManagement"
    }
  ]
}
```

## 6. 用户角色与核心场景

### 6.1 平台管理员

平台管理员关注：

- 平台是否能被内部快速部署。
- open-access 或 token 模式是否能满足当前阶段。
- skill 审核是否关闭。
- 是否有基础 secret 扫描。
- 首页和文档是否能指导人和 Agent 使用平台。

核心动作：

- 配置平台基础地址。
- 发布 CLI 包。
- 发布 Claude Code 插件本地安装说明。
- 维护推荐 Harness Package。
- 观察 skill 增长、下载量、复用热度。

### 6.2 平台工程团队

平台工程团队负责生产 Harness Package。

核心动作：

- 把 Java 微服务工程规范整理成 `harness/rules`。
- 把脚手架和模块模板整理成 `harness/templates`。
- 把常见能力整理成 `harness/cells`。
- 把 Agent 操作步骤整理成 `harness/recipes`。
- 通过 CI 批量发布 Harness Package。
- 通过 relations 建立推荐链路。

### 6.3 业务开发团队

业务开发团队使用 Harness Package 提升工程一致性。

核心动作：

- 搜索业务域相关 skill。
- 初始化新微服务。
- 给存量微服务添加能力单元。
- 本地验证工程规范。
- 把项目中沉淀出的可复用能力贡献回 Hub。

### 6.4 Agent

Agent 是一等用户。

Agent 连接平台后应能完成：

- 读取平台 profile，理解 AgentHub 是企业 Skill 市场和开发资产分发平台。
- 获取当前工程的 install-plan。
- 安装推荐 skill 和 Harness Package。
- 扫描本地工程上下文。
- 应用 cell。
- 执行 verify。
- 生成修复建议。
- 在用户授权后发布或更新 skill。
- 维护 catalog、labels、relations。

### 6.5 核心场景一：新项目初始化

流程：

1. 开发者或 Agent 在空目录执行 `agenthub-cli agent profile`。
2. Agent 根据 profile 识别平台能力。
3. Agent 执行 `agenthub-cli agent install-plan --context java-service --json`。
4. Agent 安装推荐 Harness Package。
5. Agent 执行 `agenthub-cli harness init --package @platform/java-microservice-harness --yes`。
6. CLI 生成工程骨架、`.agenthub/` 状态文件和初始验证报告。
7. Agent 执行 `agenthub-cli harness verify --json`。
8. 验证通过后进入开发。

验收标准：

- 工程可编译。
- 初始测试可运行。
- `.agenthub/harness.lock.json` 存在。
- `verify-report.json` 状态为 passed 或 warning-only。

### 6.6 核心场景二：存量项目治理

流程：

1. Agent 在存量 Java 微服务目录执行 `agenthub-cli harness scan-modules --json`。
2. CLI 识别模块、包结构、技术栈、拓扑和可能缺失能力。
3. Agent 执行 `agenthub-cli harness propose --json`。
4. 平台返回建议：同步 BOM、补测试模板、添加日志规范、接入事件消费者 cell。
5. 用户确认后 Agent 执行 `agenthub-cli harness apply --proposal <id> --yes`。
6. Agent 执行 `agenthub-cli harness verify --json`。

验收标准：

- 生成差异可审查。
- 验证报告解释清晰。
- 不自动提交代码。
- 失败项能指向具体文件、规则和建议。

### 6.7 核心场景三：能力贡献回 Hub

流程：

1. Agent 在项目中识别可复用模块。
2. 执行 `agenthub-cli harness contribute --dir . --name order-event-consumer --dry-run`。
3. CLI 生成候选 Harness Package。
4. Agent 执行 secret 扫描和 package 验证。
5. 用户确认后执行 `agenthub-cli publish`。
6. Agent 执行 `catalog set`、`labels add`、`relations sync`。
7. Agent 执行 `recommend --json` 验证推荐链路。

验收标准：

- 包能成功上传。
- catalogProfile 完整。
- relations 可查询。
- 推荐接口能返回解释理由。
- 名称冲突时发布失败，由 Agent 提示改名重传。

## 7. CLI 与 Claude Code 插件设计

### 7.1 CLI 总体原则

`agenthub-cli` 是一期唯一稳定自动化入口。

要求：

- 所有命令支持无交互执行。
- 支持 `--json` 输出。
- 支持 `--yes` 跳过确认。
- 支持非零 exit code 表达失败。
- stdout 输出机器可读结果。
- stderr 输出人类诊断信息。
- token 由用户传递或环境变量注入，不由 CLI 自动申请。

建议环境变量：

```bash
AGENTHUB_BASE_URL=http://agenthub.internal
AGENTHUB_TOKEN=xxxxx
```

### 7.2 现有命令保持不变

继续保留：

```bash
agenthub-cli login
agenthub-cli whoami
agenthub-cli search --json
agenthub-cli inspect --json
agenthub-cli download
agenthub-cli install
agenthub-cli publish
agenthub-cli catalog get --json
agenthub-cli catalog set --file catalog.yaml
agenthub-cli labels list --json
agenthub-cli labels add
agenthub-cli labels remove
agenthub-cli relations get --json
agenthub-cli relations sync --file relations.yaml
agenthub-cli recommend --json
agenthub-cli agent profile --json
agenthub-cli agent install-plan --json
```

### 7.3 新增 harness 子命令

一期新增入口统一放在：

```bash
agenthub-cli harness ...
```

命令清单：

```bash
agenthub-cli harness browse --json
agenthub-cli harness init --package <skill> --yes
agenthub-cli harness sync --yes
agenthub-cli harness apply --cell <cell-id> --yes
agenthub-cli harness verify --json
agenthub-cli harness propose --json
agenthub-cli harness contribute --dir <path> --name <name> --yes
agenthub-cli harness scan-modules --json
agenthub-cli harness cell add --cell <cell-id> --inputs <file> --yes
```

### 7.4 harness browse

用途：浏览可用 Harness Package。

示例：

```bash
agenthub-cli harness browse \
  --domain order \
  --topology crud-api \
  --stack java21,spring-boot3 \
  --json
```

行为：

- 调用现有搜索接口。
- 默认筛选 `keywords=harness` 或 `harness=true`。
- 返回 skill 维度结果。
- 展示 assetType、domain、topology、stack、ownerTeam、relationCount。

### 7.5 harness init

用途：初始化新工程。

示例：

```bash
agenthub-cli harness init \
  --package @platform/java-microservice-harness \
  --dir . \
  --inputs init.yaml \
  --yes
```

行为：

- 下载 Harness Package。
- 读取 `harness/manifest.yaml`。
- 执行 `recipes/init.yaml`。
- 生成工程骨架。
- 写入 `.agenthub/harness.lock.json`。
- 执行初始 verify。

### 7.6 harness sync

用途：同步企业工程规范。

示例：

```bash
agenthub-cli harness sync --dir . --yes
```

行为：

- 根据 `.agenthub/harness.lock.json` 查找已安装 Harness Package。
- 同步规则、模板、BOM、配置片段。
- 不覆盖用户业务代码，除非 recipe 明确声明可覆盖且用户传入 `--yes`。

### 7.7 harness apply

用途：应用某个 recipe 或 proposal。

示例：

```bash
agenthub-cli harness apply --proposal proposal-001 --yes
```

行为：

- 读取 propose 输出。
- 应用文件变更。
- 记录变更摘要。
- 生成 verify 建议。

### 7.8 harness verify

用途：验证本地工程是否符合 Harness 规则。

示例：

```bash
agenthub-cli harness verify --dir . --json
```

输出：

```json
{
  "status": "passed",
  "rules": [
    {
      "id": "package-layout",
      "status": "passed"
    }
  ]
}
```

失败时要求：

- 指出规则 ID。
- 指出文件路径。
- 给出建议命令或建议修复方向。
- exit code 非零。

### 7.9 harness propose

用途：根据当前工程状态生成下一步建议。

示例：

```bash
agenthub-cli harness propose --dir . --json
```

建议来源：

- `catalogProfile`。
- Harness Package manifest。
- 本地工程扫描。
- relations 推荐。
- verify 失败项。

### 7.10 harness contribute

用途：从本地工程抽取候选 Harness Package。

示例：

```bash
agenthub-cli harness contribute \
  --dir . \
  --name order-event-consumer-harness \
  --namespace order-team \
  --dry-run
```

行为：

- 扫描项目结构。
- 识别可复用模板、配置、规则。
- 生成候选 skill package。
- 生成 `SKILL.md`、`catalog.yaml`、`harness/manifest.yaml`。
- 执行 secret 扫描。
- dry-run 时不发布。

### 7.11 harness scan-modules

用途：扫描存量多模块项目。

示例：

```bash
agenthub-cli harness scan-modules --dir . --json
```

识别内容：

- Maven/Gradle 模块。
- Spring Boot 应用入口。
- REST Controller。
- Feign Client。
- Repository。
- Event Listener。
- Batch Job。
- 配置文件。
- 测试覆盖情况。

### 7.12 harness cell add

用途：向工程添加某个能力单元。

示例：

```bash
agenthub-cli harness cell add \
  --cell rest-crud-api \
  --inputs order-cell.yaml \
  --yes
```

行为：

- 根据 cell 元数据校验输入。
- 生成或修改目标文件。
- 写入 `.agenthub/applied-cells.json`。
- 自动触发 verify。

### 7.13 Claude Code 插件设计

Claude Code 插件继续采用本地 path-plugin-first 方案，复用 `agenthub-cli`。

插件职责：

- 读取 `AGENTHUB_BASE_URL` 和 `AGENTHUB_TOKEN`。
- 或读取 `.claude/agenthub.json`。
- 调用 `agenthub-cli agent profile`。
- 调用 `agenthub-cli agent install-plan`。
- 调用 `agenthub-cli harness browse/init/sync/apply/verify/propose/contribute`。
- 把 CLI JSON 输出返回给 Claude Code。

插件不直接承担：

- token 自动申请。
- 审核审批。
- 复杂权限协商。
- 独立 HTTP SDK。

### 7.14 人和 Agent 的入口提示

平台页面和 `registry/skill.md` 需要明确区分人和 Agent 的用法。

人类开发者提示：

```bash
npm install -g agenthub-cli
agenthub-cli login --base-url http://agenthub.internal --token <token>
agenthub-cli search "java microservice" --json
agenthub-cli install @platform/java-microservice-harness
```

Agent 提示：

```bash
export AGENTHUB_BASE_URL=http://agenthub.internal
export AGENTHUB_TOKEN=<provided-by-user>
agenthub-cli agent profile --json
agenthub-cli agent install-plan --context java-service --json
agenthub-cli harness browse --stack java21,spring-boot3 --json
```

原则：

- token 由用户、CI 或运行环境提供。
- Agent 不负责自动申请 token。
- Agent 必须先读取 profile，再执行 install-plan。

## 8. 平台接口设计

### 8.1 保持现有接口主线

继续使用现有 AgentHub API：

```text
POST /api/v1/skills/{namespace}/publish
POST /api/v1/publish
GET  /api/web/skills
GET  /api/v1/skills/{namespace}/{slug}
GET  /api/v1/skills/{namespace}/{slug}/catalog
PUT  /api/v1/skills/{namespace}/{slug}/catalog
GET  /api/v1/skills/{namespace}/{slug}/relations
PUT  /api/v1/skills/{namespace}/{slug}/relations
GET  /api/v1/skills/{namespace}/{slug}/recommendations
POST /api/v1/recommendations/context
GET  /api/v1/agent/profile
POST /api/v1/agent/install-plan
```

Harness 一期不要求平台新增独立 Fragment Registry API。

### 8.2 搜索扩展

`GET /api/web/skills` 和对外搜索接口继续支持：

- `assetType`
- `domain`
- `stage`
- `topology`
- `stack`
- `label`
- `sort`

Harness 搜索建议：

```text
GET /api/web/skills?assetType=scaffold&stack=java21,spring-boot3&keyword=harness
```

返回结果仍是 skill summary。

### 8.3 Harness Package 识别

平台识别 Harness Package 的方式：

- 包内存在 `harness/manifest.yaml` 或 `harness/manifest.json`。
- 或 `catalogProfile.keywords` 包含 `harness`。
- 或 `labels` 包含 `harness`。

推荐采用组合判断：

```text
isHarnessPackage =
  package contains harness/manifest.*
  OR label contains harness
  OR keywords contains harness
```

### 8.4 agent/profile 扩展

`agent/profile` 应告诉 Agent：

- 平台名称。
- 平台用途。
- 当前推荐 CLI。
- 是否支持 Harness。
- 推荐命令。
- token 获取方式说明。
- 文档入口。

示例响应片段：

```json
{
  "platform": {
    "name": "AgentHub Enterprise",
    "purpose": "Enterprise skill market and development asset hub"
  },
  "capabilities": {
    "skillMarket": true,
    "catalogProfile": true,
    "harness": true,
    "installPlan": true
  },
  "recommendedEntrypoints": [
    "agenthub-cli agent profile --json",
    "agenthub-cli agent install-plan --json",
    "agenthub-cli harness browse --json"
  ],
  "auth": {
    "tokenMode": "provided-by-user-or-ci",
    "note": "Agent should not auto-apply token. User or runtime must provide AGENTHUB_TOKEN."
  }
}
```

### 8.5 agent/install-plan 扩展

`agent/install-plan` 应根据上下文返回：

- 推荐安装的基础 skill。
- 推荐安装的 Harness Package。
- 推荐执行的 CLI 命令。
- 解释理由。

请求示例：

```json
{
  "agent": "claude-code",
  "context": {
    "language": "java",
    "framework": "spring-boot3",
    "topology": "crud-api",
    "buildTool": "maven",
    "domain": "order"
  }
}
```

响应示例：

```json
{
  "commands": [
    {
      "run": "agenthub-cli install @platform/java-spring-base",
      "reason": "same-stack"
    },
    {
      "run": "agenthub-cli install @platform/java-microservice-harness",
      "reason": "harness-bootstrap"
    },
    {
      "run": "agenthub-cli harness init --package @platform/java-microservice-harness --yes",
      "reason": "initialize-java-service"
    }
  ]
}
```

### 8.6 发布接口策略

Harness Package 发布不新增协议，继续使用：

```text
POST /api/v1/skills/{namespace}/publish
POST /api/v1/publish
```

发布前：

- CLI 打包 skill。
- CLI 校验 `SKILL.md`。
- CLI 校验 `catalog.yaml`。
- CLI 校验 `harness/manifest.yaml`。
- CLI 执行 secret 扫描。

发布后：

- Agent 执行 `catalog set`。
- Agent 执行 `labels add harness`。
- Agent 执行 `relations sync`。
- Agent 执行 `recommend --json` 验证推荐链路。

### 8.7 名称冲突策略

一期名称冲突直接失败。

规则：

- 不自动覆盖已有 skill。
- 不自动生成随机后缀。
- 返回明确错误码和已有 skill 信息。
- Agent 根据错误提示改名后重新上传。

原因：

- 避免误覆盖。
- 保持发布行为可预测。
- 快速积累阶段允许重复思路以不同名称沉淀。

## 9. 分阶段落地路线

### 9.1 Phase 0：文档与约定收敛

目标：

- 明确 Skill 市场主线。
- 明确 Harness 是能力层。
- 明确 Fragment 只在 Harness 域内成立。
- 明确 CLI 是一期入口。

交付：

- 本文档。
- `agent.md` 和 `AGENTS.md` 中保持执行约定一致。
- `docs/23-agenthub-cli-and-agent-onboarding.md` 增补 Harness 使用入口。

验收：

- 文档不把 Fragment 写成平台全局唯一资产。
- 文档不废弃 `docs/21/22/23`。
- 文档明确 `agenthub-cli harness ...` 是一期入口。

### 9.2 Phase 1：Harness Package 规范与样例

目标：

- 建立 Harness Package 标准目录。
- 建立 Java 微服务样例 Harness Package。
- 支持 CLI 识别和浏览。

交付：

- `examples/harness/java-microservice-harness/` 样例包。
- `harness/manifest.yaml` schema。
- 基础 `cells/rules/templates/recipes` 示例。
- `agenthub-cli harness browse`。

验收：

- 样例包可被 `agenthub-cli publish` 上传。
- 搜索页能搜到样例包。
- `harness browse --json` 能返回样例包。

### 9.3 Phase 2：初始化与安装闭环

目标：

- Agent 能根据 install-plan 安装 Harness Package。
- 新 Java 微服务可通过 Harness 初始化。

交付：

- `agenthub-cli harness init`。
- `.agenthub/harness.lock.json`。
- `.agenthub/verify-report.json`。
- `agent/install-plan` 返回 Harness 推荐命令。
- Claude Code 插件支持调用 `harness init`。

验收：

- 空目录可生成 Java Spring Boot 微服务骨架。
- 生成工程可执行 `mvn test`。
- verify 报告可读。

### 9.4 Phase 3：存量工程治理

目标：

- Agent 能扫描存量 Java 微服务。
- Agent 能提出可执行治理建议。
- 用户确认后 Agent 能应用变更。

交付：

- `agenthub-cli harness scan-modules`。
- `agenthub-cli harness propose`。
- `agenthub-cli harness apply`。
- `agenthub-cli harness verify`。

验收：

- 能识别 Maven 多模块工程。
- 能识别 Spring Boot 应用和常见组件。
- verify 失败项能定位到文件和规则。
- apply 只做可审查的本地文件变更。

### 9.5 Phase 4：能力回流与快速积累

目标：

- Agent 能从项目抽取候选 Harness Package。
- CI 能批量上传。
- 平台能快速积累不同团队的 skill。

交付：

- `agenthub-cli harness contribute`。
- 发布前 secret 扫描。
- `catalog set / labels add / relations sync` 自动串联脚本。
- CI 示例。

验收：

- 从项目生成的候选包可 dry-run。
- 无高危凭证时可发布。
- 名称冲突时清晰失败。
- Agent 可改名重传。

### 9.6 Phase 5：推荐与质量增强

目标：

- 推荐结果更符合 Java 微服务工程上下文。
- verify 与 recommend 形成闭环。

交付：

- 推荐因子增强：同 domain、同 topology、shared stack、relations、下载量、最近维护。
- `harness propose` 结合推荐接口。
- 质量看板：常用 Harness Package、失败规则排行、回流数量。

验收：

- 同域、同拓扑、关联 skill 推荐可解释。
- Agent 能基于推荐安装缺失能力。
- 平台能显示复用热度。

## 10. 风险、边界与取舍

### 10.1 风险：Harness 过度平台化

如果把 Fragment 提升为平台全局资产，会导致：

- 需要新增顶层资产表。
- 需要迁移搜索和推荐主模型。
- 需要重写上传、下载、安装逻辑。
- 与现有 CLI、插件、docs/21/22/23 冲突。

取舍：

- 一期不做平台级 Fragment Registry。
- Fragment 保持在 Harness Package 内部。
- 平台仍以 skill package 为权威单元。

### 10.2 风险：内部知识和敏感凭证混淆

内部工程知识可以进入 Hub，但真实凭证不能进入 Hub。

取舍：

- 允许内部框架、目录、模块、业务域建模经验入库。
- 发布前只阻断明显凭证。
- 复杂密级治理后置。

### 10.3 风险：审核关闭导致资产质量参差

快速积累阶段可能出现重复、低质量或命名混乱。

取舍：

- 审核默认关闭。
- 通过 labels、downloads、relations、recommendationScore 和 ownerTeam 逐步形成质量信号。
- 后续再增加认证标签和治理流程。

### 10.4 风险：CLI 复杂度上升

Harness 命令会显著扩展 CLI 能力。

取舍：

- 所有 Harness 命令先走本地文件和现有 skill API。
- 不急于新增复杂服务端协议。
- 插件只包装 CLI，不复制 CLI 逻辑。

### 10.5 风险：Agent 自动修改工程带来不可控变更

Agent 执行 `apply` 或 `cell add` 可能修改大量文件。

取舍：

- 默认不自动提交 Git。
- apply 输出变更摘要。
- verify 输出结构化结果。
- 需要 `--yes` 才无交互执行。
- 建议 Agent 在修改前后展示 diff 摘要。

### 10.6 边界：一期不做的事情

一期不做：

- 平台级 Fragment API。
- 独立 Harness 数据库模型。
- 自动 token 申请。
- 复杂审批。
- 多租户密级隔离。
- 组织级 managed settings 强制安装。
- 自动修改 `.claude/settings.json`。

后续可做：

- Harness Package schema registry。
- 规则执行沙箱。
- 企业质量门禁。
- 资产认证流程。
- 动态插件 marketplace 导出更多插件型 Skill。
- MCP Server 暴露 CLI 能力。

## 11. 测试与验收标准

### 11.1 文档验收

验收项：

- 文件存在：`docs/25-enterprise-agenthub-harness-product-design.md`。
- 文档明确保留 Skill 市场方向。
- 文档明确 `skill package` 是权威发布、搜索、下载、安装、版本管理单元。
- 文档明确 `catalogProfile` 继续作为企业目录画像。
- 文档明确 `agenthub-cli` 是统一 CLI。
- 文档明确 `agent/profile` 和 `agent/install-plan` 是 Agent 结构化入口。
- 文档没有把 Fragment 写成 AgentHub 全局唯一资产。
- 文档没有废弃 `docs/21/22/23`。
- 文档明确 `agenthub-cli harness ...` 是一期入口。

### 11.2 CLI 验收

未来实现 CLI 后，需要覆盖：

```bash
agenthub-cli harness browse --json
agenthub-cli harness init --package @platform/java-microservice-harness --yes
agenthub-cli harness sync --yes
agenthub-cli harness apply --cell rest-crud-api --yes
agenthub-cli harness verify --json
agenthub-cli harness propose --json
agenthub-cli harness contribute --dir . --name sample-harness --dry-run
agenthub-cli harness scan-modules --json
agenthub-cli harness cell add --cell rest-crud-api --inputs cell.yaml --yes
```

验收标准：

- 所有命令支持 `--json` 或机器可读输出。
- 所有修改类命令支持 `--yes`。
- 失败时 exit code 非零。
- stdout/stderr 约定稳定。
- token 通过 `AGENTHUB_TOKEN` 或配置文件传入。

### 11.3 Agent 端到端验收

Agent 新项目初始化链路：

```bash
agenthub-cli agent profile --json
agenthub-cli agent install-plan --context java-service --json
agenthub-cli harness browse --stack java21,spring-boot3 --json
agenthub-cli harness init --package @platform/java-microservice-harness --yes
agenthub-cli harness verify --json
```

验收标准：

- Agent 能理解平台用途。
- Agent 能获得推荐安装计划。
- Agent 能安装 Harness Package。
- Agent 能初始化工程。
- Agent 能验证工程。

Agent 存量工程治理链路：

```bash
agenthub-cli harness scan-modules --dir . --json
agenthub-cli harness propose --dir . --json
agenthub-cli harness apply --proposal proposal-001 --yes
agenthub-cli harness verify --dir . --json
```

验收标准：

- 扫描结果能识别项目结构。
- propose 结果可解释。
- apply 变更可审查。
- verify 失败项可定位。

Agent 能力回流链路：

```bash
agenthub-cli harness contribute --dir . --name order-harness --dry-run
agenthub-cli publish --namespace order-team --file order-harness.tgz --yes
agenthub-cli catalog set @order-team/order-harness --file catalog.yaml
agenthub-cli labels add @order-team/order-harness harness
agenthub-cli relations sync @order-team/order-harness --file relations.yaml
agenthub-cli recommend @order-team/order-harness --json
```

验收标准：

- dry-run 能生成候选包。
- secret 扫描能拦截高危凭证。
- 发布成功后可搜索。
- catalog、labels、relations 可查询。
- 推荐结果有解释理由。

### 11.4 服务端验收

服务端需要保持：

- 老 skill 包无 `harness/` 目录仍可上传、搜索、下载、安装。
- Harness Package 作为普通 skill 可上传、搜索、下载、安装。
- `catalogProfile` 可被搜索索引使用。
- label 和 relations 可被 Agent 自动维护。
- skill 审核默认关闭时，CI 可批量上传。
- 名称冲突返回明确错误。

### 11.5 UI 验收

页面需要体现：

- AgentHub 是企业内部 Skill 市场。
- Harness 是 Java 微服务工程能力层。
- Skill 卡片能展示是否为 Harness Package。
- 详情页能展示 Harness 入口命令。
- onboarding 页面能区分人类使用命令和 Agent 使用命令。

建议页面提示：

```text
人类开发者：安装 agenthub-cli，搜索并安装企业 skill。
AI Agent：先读取 agent/profile，再根据 install-plan 安装 skill 和 Harness Package。
```

### 11.6 部署验收

部署后需要验证：

- CLI tarball 可下载。
- `registry/skill.md` 可访问。
- `agent/profile` 可访问。
- `agent/install-plan` 可返回 Harness 推荐。
- 搜索页能筛选 Harness Package。
- open-access 模式下无需登录即可浏览和下载。
- token 模式下 CI 可通过 `AGENTHUB_TOKEN` 批量上传。

### 11.7 回归验收

不得破坏：

- 现有 skill 上传。
- 现有 skill 下载。
- 现有 skill 搜索。
- 现有 catalogProfile。
- 现有 labels。
- 现有 relations。
- 现有 recommend。
- 现有 Claude Code 插件 profile / install-plan / install-skill。

### 11.8 成功标准

一期成功标准：

- 至少沉淀 3 类 Java 微服务 Harness Package：
  - 基础工程脚手架。
  - 质量治理规则。
  - 常用业务能力 cell。
- Claude Code 能通过本地插件连接平台并读取 install-plan。
- Agent 能在本地工程执行 `harness init` 或 `harness verify`。
- CI 能批量发布 skill。
- 平台搜索和推荐能发现 Harness Package。
- 团队能在不引入重审批的情况下快速积累内部开发资产。
