# 企业级 Harness 开发平台 系统级产品设计 v3

> 版本：v3（系统化术语介绍 + 深度场景 + FAQ）
> 状态：产品设计稿，待评审
> 范围：本公司专属 Java 后端微服务（Spring/Maven，含 BIC/ESC/PDMS/IRDS 等内部组件适配）
> 读者：产品、工程、平台团队
> 取代：本文取代 `docs/21`、`docs/22`、`docs/23` 与本目录早期 v1/v2 设计稿
> 关联：`docs/企业agent hub研究报告.md`（产品背景）、iavis-agent-harness（方法论来源 + 验证参照）
> 不含：本文不写实施阶段、周期与排期。如需实施路径，单独成文。

---

## 目录

```
第一部分 背景与问题
  1.1 公司里 Java 后端开发的现状
  1.2 已有的零散尝试与它们的局限
  1.3 真正的痛点
  1.4 我们要做的事

第二部分 核心概念（系统化定义）
  2.1 Harness 是什么
  2.2 AgentHub 是什么
  2.3 Fragment：唯一资产
  2.4 五个资产原语：Cell / Contract / Rule / Action / Skill
  2.5 一个观测原语：Run
  2.6 ChangeProposal：唯一事件
  2.7 Scope：fragment 的可见性
  2.8 四个动词：sync / apply / verify / contribute
  2.9 一个日常入口：propose
  2.10 概念关系图

第三部分 用户与角色
  3.1 三类用户画像
  3.2 各角色典型一天

第四部分 使用场景（深度 walkthrough）
  4.1 场景 A：小张新建 risk-alert-service（Greenfield）
  4.2 场景 B：小李接手 iavis（Brownfield，验证参照）
  4.3 场景 C：小王给 ped-event 加视频流字段（核心 loop）
  4.4 场景 D：小赵基于已有沉淀做 alert-relay 服务
  4.5 场景 E：小黄升级 java/spring-war 加 JDK 11 支持

第五部分 产品形态
  5.1 用户接触面
  5.2 工程目录约定
  5.3 命令一览

第六部分 系统设计
  6.1 架构总览
  6.2 平台接口
  6.3 关键流程
  6.4 Spec-Driven Change Loop 详解

第七部分 治理与边界
  7.1 红线
  7.2 已知开放问题

第八部分 FAQ

附录
  A. Fragment Manifest Schema
  B. Cell Schema
  C. ChangeProposal Schema
  D. 术语表
  E. 公司内部组件简表
```

---

# 第一部分 背景与问题

## 1.1 公司里 Java 后端开发的现状

公司大部分核心后端用 Java/Spring/Maven 写，系统普遍重：

- **重启动**：业务问题不止在代码，更多在 Bean 装配、配置加载、中间件连接、Runner、Scheduler 期。一个改动落到代码层好像没问题，启动起来才暴露。
- **重内部依赖**：每个微服务都接 BIC（基础设施服务）、ESC（事件服务中心）、PDMS（设备管理）、IRDS（资源数据服务）等公司内部平台。这些平台的 SDK 有自己的初始化协议、配置约定、版本兼容矩阵。
- **重历史**：很多服务跑了 3-5 年，模块边界与现有 Maven module 边界不一致，注释、文档、测试覆盖参差不齐。

这种工程下，开发者实际面对的痛分三层：

### L1（单微服务开发者）的痛

```
我接手 event-service 一周了。
今天产品要我给 ped-event 加一个字段。
我打开代码库：100+ 个 Java 文件分散在 8 个 Maven module。
我不知道：
  - 这个改动会触发哪个启动 Bean？
  - 公司有没有规定我不能这么写？
  - 之前有没有人改过类似的，踩过什么坑？
  - 改完之后我应该跑哪些测试才有信心 ship？
我只能问负责人，或者读代码读到天黑。
```

### L2（微服务负责人）的痛

```
我维护 event-service 三年了。
我脑子里有这个服务的全部知识：
  - 每个 Bean 的失败策略
  - 哪些配置不能改
  - 历史上踩过的坑
但这些只在我脑子里。
新人来一次问一次，每次回答 30 分钟。
我离职了，这些知识就消失了。
我也想沉淀文档，但写出来没人读、没人维护，几个月就过期。
```

### L3（公司平台团队）的痛

```
我们定了"业务模块禁止硬编码 amq://"这条规则。
我们写了文档，发了邮件，开了培训。
半年后扫一遍代码，还是有人在硬编码。
不是大家不愿意遵守，是这条规则没在他们的开发流程里出现过。
他们没看到的规则等于不存在。
```

## 1.2 已有的零散尝试与它们的局限

公司里其实已经做过一些尝试：

### 尝试 1：iavis-agent-harness

iavis 项目（视觉巡检平台）做过一套完整 harness：模块舱（`module.yaml`）、OpenSpec 业务契约、可执行的 verification 脚本（`harness/scripts/*`）、run records、framework 层静态规则。

**它解决了什么**：在 iavis 这一个工程里，Agent 可以稳定迭代——知道改哪个模块、加载哪些上下文、跑哪些验证、怎么分类失败。

**它的局限**：
- 只活在 iavis 一个工程里
- 没有渠道扩散到其他 Java 服务
- 知识不能跨工程复用
- 是 Windows + PowerShell 实现，跨平台需要重做

### 尝试 2：AgentHub 现有 Claude Code Plugin

`agenthub-connector-plugin` 做了一条最小闭环：profile / detect-context / install-plan / install-skill。

**它解决了什么**：把 AgentHub 上的 skill 按需装到本地工程的 `.claude/skills/`。

**它的局限**：
- "skill" 是它认识的唯一资产单位
- 命令分裂（5 个命令做 1 件事）
- 没有"拉一整套 harness"的能力
- 没有回贡通道
- 没有按变更注入上下文 + 自测的循环

### 共同的问题

这两个尝试**没打通**。iavis 的方法是对的但不流通；AgentHub 的渠道是对的但只装 skill；plugin 是对的但只是 thin client。

**碎片之间不连通是根本症状**，不是任何一个组件的缺陷。

## 1.3 真正的痛点

把 1.1 三类用户的痛和 1.2 已有尝试的局限合起来，看到三个根本痛点：

| 痛点 | 表现 | 根因 |
|---|---|---|
| **重 Java 工程的不可见性** | Agent 看到代码但看不到约束、契约、历史失败 | 工程事实没有可加载的形态 |
| **知识不传递** | 负责人脑子里的知识在新人面前失效 | 知识没有沉淀渠道 + 没有复用渠道 |
| **改动的盲区** | 改完才知道破坏了启动、违反了规则、漏了自测 | 改动与影响域没有自动关联 |

## 1.4 我们要做的事

> **用一个 Claude Code 插件 + 一个 fragment 资产中心 + 一套 OpenSpec 变更驱动循环，让本公司任何 Java 后端微服务都能"一键 harness 化、本地长业务知识、贡献回 hub、按变更自动注入与最小自测"。**

展开：

1. **Claude Code 插件**是开发者唯一的接触面。装上插件即拥有公司全部 harness 资产视图。
2. **Fragment 资产中心**就是 AgentHub。它接收、版本化、分发 harness 资产。
3. **OpenSpec 变更驱动循环**是日常工作机制。每次改动从一份变更提案开始，提案触发上下文注入 + 最小自测 + 沉淀回贡。
4. **一键 harness 化**指：新工程跑 `harness init` 拉一整套约束骨架；老工程渐进式 cell 化，不破坏现有代码。
5. **本地长业务知识 + 贡献回 hub**：业务知识由项目自己长出来，长稳了就贡献回 hub 让别人复用。
6. **按变更自动注入与最小自测**：改动以 spec 提案为入口，系统自动定位影响域、注入相关上下文、跑最小验证集。

后面所有内容都是这一段的展开。

---

# 第二部分 核心概念（系统化定义）

> 本部分把后面要用的所有词在被使用前定义清楚。读者读完这部分，后面任何术语都已有锚。

## 2.1 Harness 是什么

"Harness" 在英文里原指"线束、约束设备、套具"——把零散的电线/绳子捆成一束、给马套上挽具。引申到软件工程，指**把工程的事实、契约、规则、验证打包成可加载的知识结构**，让任何接触这个工程的人（或 Agent）能快速对齐。

在本系统里，"harness" 指：

> 工程根目录下的 `agent/` 目录里的全部内容。它把"这个服务由什么组成、必须做到什么、代码该怎么写、怎么自测、跑过什么"五件事打包成结构化数据。

Harness 不是文档。文档是给人读的散文；harness 是给人和 Agent 一起读的结构化资产。

## 2.2 AgentHub 是什么

AgentHub 是本公司已有的 Agent 资产中心，已有 CLI 与 Web 平台。

在本系统里，AgentHub 的角色是：

- **fragment 注册中心**（接收提交、版本化）
- **fragment 分发渠道**（按上下文检索、按依赖解析）
- **治理点**（脱敏门、ACL、审计）

AgentHub 是 hub，开发者通过 plugin 与 hub 交互。

## 2.3 Fragment：唯一资产

> **Fragment 是 AgentHub 上唯一一种资产类型。**所有"skill 包"、"stack 模板"、"项目沉淀"都是 fragment，只是内部组成不同。

一个 fragment = 一份 manifest + 它包含的若干原语。

```yaml
# fragment.yaml（举例：栈级模板）
apiVersion: agenthub.io/v1
kind: Fragment
metadata:
  id: java/spring-war
  version: 1.4.0
  scope: stack
  owner: platform-team
  description: Java Spring WAR 工程通用 harness 约束
  tags: [java, spring, war, maven]
spec:
  requires:
    fragments:
      - { id: java/base, version: ">=1.0.0" }
      - { id: company/core, version: ">=2.0.0" }
  provides:
    rules:    [...]
    actions:  [...]
    skills:   [...]
    cells:    []      # 栈模板不带具体 cell
    contracts: []
status:
  publishedAt: 2026-04-01T10:00:00Z
  redactedBy: gate-v3
```

**三种典型 fragment**：

| 典型 | 例子 | 内含 |
|---|---|---|
| 公司级 | `company/core` | 脱敏规则、敏感词扫描、合规底线 |
| 栈级 | `java/spring-war` | scripts、static-rules、verification matrix、模板 |
| 项目级 | `project/iavis/event-module` | 具体 cell、contract、failure_patterns |

## 2.4 五个资产原语

Fragment 内部由原语组成。**五个资产原语都可以进 hub**。

### 2.4.1 Cell（模块舱）

> 工程里一个组件的所有事实：代码路径、Bean、Consumer、依赖、引用的 contract、验证矩阵、fixture、历史 failure_patterns。

**iavis 真实例子**：`project/iavis/event-module` 里的 event cell 节选：

```yaml
apiVersion: agenthub.io/v1
kind: Cell
metadata:
  id: event
  owner: event-team
spec:
  code:
    paths:
      - iavis-event/src/main/java/**
    beans:
      - PedEventServiceImpl
      - MockPedEventController
    consumers:
      - CameraTempEventConsumer
      - CameraOrginTempEventConsumer
    runners: []
  dependencies:
    middleware: [mq, redis]
    internal:   [bic, esc]
  contracts:
    - id: event/ped-event-receive
    - id: event/mock-event-replay
    - id: event/temp-event-consumer
  verification:
    required_for:
      event/ped-event-receive: [static, compile, package, startup, api-replay]
      event/temp-event-consumer: [static, compile, package, startup, mq-replay]
  fixtures:
    - fixtures/ped-event-img-1.json
    - fixtures/ped-event-stream-1.json
  failure_patterns:
    - signature: a3f2b1
      classify: fixture-out-of-date
      occurred: 3
      resolved: true
      hint: 新增字段后必须同步 fixture
    - signature: 7c2e90
      classify: mq-address-hardcode
      occurred: 1
      resolved: true
      hint: 业务模块禁止硬编码 amq://，走 common 适配
```

### 2.4.2 Contract（OpenSpec 契约）

> 长期不变的能力契约。与代码解耦——代码可以改，契约不能轻易改。

**iavis 真实例子**：`event/ped-event-receive` 节选：

```yaml
apiVersion: openspec/v1
kind: Contract
metadata:
  id: event/ped-event-receive
  status: stable
spec:
  capability: 接收 PED（Person Event Detection）事件并落库
  inputs:
    - { name: type,        type: string,   required: true }
    - { name: timestamp,   type: int64,    required: true }
    - { name: deviceId,    type: string,   required: true }
    - { name: snapshotUrl, type: url,      required: true }
  outputs:
    - { name: eventId, type: string }
  invariants:
    - 同一 (deviceId, timestamp) 不能重复入库
    - snapshotUrl 必须可访问且符合公司 signed URL 协议
  failure_policy:
    - 上游 BIC 不可达：本地降级，事件先落 MQ 重试
    - 落库失败：写 alert 到 ESC，不阻断接收
```

### 2.4.3 Rule（静态约束）

> 不依赖运行的检查规则。三种 scope，覆盖范围不同。

**真实例子**：

```yaml
# company scope
- id: company/no-secret-in-source
  type: static
  body: |
    不允许在源码、context.md、cell.yaml 里出现：
    密码 / token / 完整 JDBC URL / signed image URL

# stack scope
- id: java/spring-war/no-hardcode-mq-url
  type: static
  body: |
    业务模块禁止新增 amq:// 或 rmq://。
    MQ 地址走 common 模块的 IsecureVersionAdaptConfig。

# project scope（iavis 专有）
- id: project/iavis/event/postconstruct-must-have-fail-policy
  type: static
  body: |
    iavis event 模块新增 @PostConstruct 必须在 cell.context.md
    里说明失败策略（阻断启动 vs 降级）。
```

### 2.4.4 Action（验证动作）

> 可执行的脚本，跑出来的结果是 Run。

**iavis 真实例子**：

```yaml
- id: action/static-scan
  kind: shell
  path: scripts/static-scan.sh
  inputs:  []
  outputs: [{ name: violations, type: list }]

- id: action/compile
  kind: shell
  path: scripts/compile.sh

- id: action/package
  kind: shell
  path: scripts/package.sh

- id: action/startup
  kind: shell
  path: scripts/start-war.sh
  outputs: [{ name: log_path, type: path }]

- id: action/api-replay
  kind: shell
  path: scripts/replay-api.sh
  inputs: [{ name: fixture, type: path }]
```

Action 同时是 Cell.verification.required_for 引用的对象。

### 2.4.5 Skill（可加载 prompt）

> 给 Agent 用的 prompt + 加载策略。

**例子**：

```yaml
- id: skill/harnessify-cell
  path: skills/harnessify-cell/SKILL.md
  triggers:
    - command: harness scan-modules
    - command: harness init --brownfield
  description: 扫描组件代码，生成 cell.module.yaml + contract 草稿

- id: skill/redact-secrets
  path: skills/redact-secrets/SKILL.md
  triggers:
    - command: harness contribute  # 强制门
  description: 检查 fragment 中是否含敏感信息，硬门拒绝

- id: skill/load-cell-context
  path: skills/load-cell-context/SKILL.md
  triggers:
    - hook: pre-edit
    - hook: session-start
  description: 按修改文件路径定位 cell，加载相关 context
```

## 2.5 一个观测原语：Run

> Run 是 Action 执行的产出，**不是资产**。它是观测。

为什么不是资产：
- Run 数量大，每次 verify 一份
- Run 内容含敏感堆栈（路径、内部主机、内部类名）
- Run 的"价值"在于**收敛后的 pattern**，单次 run 价值低

Run 的归宿：
- **本地存放**：默认 `agent/runs/`，`.gitignore` 默认列入
- **价值收敛到 Cell**：同 hash signature 出现 ≥ 3 次且被修复过的失败模式，作为 `failure_pattern` 写入 cell。这才是回贡 hub 的路径。

## 2.6 ChangeProposal：唯一事件

> ChangeProposal 不是 fragment，是**事件**。它描述一次将要发生的改动。

为什么单独：
- Fragment 是长期资产
- Proposal 是短期事件，闭环后归档
- 把它硬塞为 fragment 会让"hub 上只有 fragment"的简洁性破产

ChangeProposal 仅存于工程本地的 `agent/proposals/`，闭环后归档到 `agent/proposals/archive/`，**不进 hub**。

```yaml
apiVersion: agenthub.io/v1
kind: ChangeProposal
metadata:
  id: 2026-05-10-ped-event-stream-fields
  author: 小王
  createdAt: 2026-05-10T09:30:00Z
spec:
  contracts:
    - id: event/ped-event-receive
      operations:
        - op: modify
          target: input
          before: "{ type, timestamp, deviceId, snapshotUrl }"
          after:  "{ type, timestamp, deviceId, snapshotUrl, streamId?, bitrate? }"
  rationale: 视觉复核流程需要原始视频流信息用于人工核对
  affected_cells: [event]
  verification_plan: [static, compile, package, startup, api-replay]
status:
  phase: drafting | injecting | verifying | ready | merged | rejected
  runs: [run-ref-list]
```

## 2.7 Scope：fragment 的可见性

```
company  — 公司级，全员可见。承载脱敏规则、敏感词、合规底线
   ▲
stack    — 栈级，按技术栈可见。承载 java/spring-war、java/spring-boot 等
   ▲
project  — 项目级，按 ACL 可见。承载具体微服务的 cell、contract、failure_pattern
```

**重要**：scope 决定可见性，**不决定结构**。三种 scope 的 fragment manifest 完全相同，可以互相 require。`project/iavis/event-module` 可以 require `java/spring-war`，后者可以 require `java/base`。

**ACL 模型（v3 简版）**：
- `company` scope：全员可读，平台团队可写
- `stack` scope：全员可读，平台团队可写
- `project` scope：所属团队可读写，跨团队可申请只读

> 更复杂的审批流（PR review、两人审）作为开放问题，本设计不强行解决。

## 2.8 四个动词

```
harness sync       从 hub 拉取当前工程相关 fragment
harness apply      把已 sync 的 fragment 实化到工作区
harness verify     跑 Action，写 Run，分类失败
harness contribute 把本地新增/修改 fragment 回传 hub（脱敏 + ACL 强制门）
```

**sync**：
- 输入：当前工程的 detect-context 结果（栈、依赖、可见 scope）
- 输出：相关 fragment DAG（含依赖解析）拉到本地缓存
- 不动工作区文件

**apply**：
- 输入：已 sync 的 fragment
- 输出：把 fragment 内容**实化**到工作区
  - rules → `agent/rules/rules.yaml`
  - actions → `agent/scripts/`
  - skills → `.claude/skills/`
  - cells → `agent/cells/<name>/`
  - contracts → `agent/specs/`
- 写文件，可幂等

**verify**：
- 输入：要跑哪些 action（默认全集，或子集）
- 输出：Run record 写到 `agent/runs/`，分类失败原因
- 不动 fragment

**contribute**：
- 输入：本地新增/修改的 cell / contract / failure_pattern
- 输出：打包成 fragment 增量，过 redact gate，过 ACL，提交到 hub
- 提交后 hub 上多一个版本

## 2.9 一个日常入口：propose

```
harness propose <title>    创建 ChangeProposal，自动注入相关上下文，自动跑内层 verify
```

`propose` 是 L1 日常入口。它**不是新动词**，是 sync + 注入 + verify-inner 的组合：

```
propose 内部步骤：
  1. 创建 agent/proposals/<ts>-<slug>.yaml 草稿
  2. 解析 proposal 涉及的 contract id
  3. 反向索引：contract → cells（启动期建立的索引）
  4. 注入：相关 cell.module.yaml + 关联 rule + 历史 failure_patterns
  5. 跑内层 verify（秒级）：
     - static rule 校验
     - spec 一致性检查
     - 影响域计算
  6. 即时反馈给开发者
```

**propose 不跑外层 verify**（compile + package + startup）。外层是显式 `harness verify --full`。这样 propose loop 体感才是秒级。

## 2.10 概念关系图

```
                      ┌─────────────────────────────┐
                      │       AgentHub (Hub)         │
                      │   fragment 注册 / 分发        │
                      └──────────┬──────────────────┘
                                 │ sync ↓ ↑ contribute
                                 │
              ┌──────────────────┴──────────────────┐
              │            Fragment                  │
              │  唯一资产；三 scope；可互相 require    │
              │                                      │
              │  ┌───────┐  ┌──────────┐            │
              │  │ Cell  │──│ Contract │            │
              │  │ 模块舱 │引用│ OpenSpec │            │
              │  └──┬────┘  └──────────┘            │
              │     │ verification.required_for      │
              │     ▼                                 │
              │  ┌────────┐  ┌───────┐  ┌────────┐  │
              │  │ Action │  │ Rule  │  │ Skill  │  │
              │  │ 脚本   │  │ 静态  │  │ prompt │  │
              │  └───┬────┘  └───────┘  └────────┘  │
              └──────┼───────────────────────────────┘
                     │ 执行
                     ▼
              ┌──────────────┐
              │ Run（观测）   │
              │ 不是资产      │
              │ 收敛后 →      │
              │ Cell.failure_ │
              │ patterns     │
              └──────────────┘

              ┌──────────────────────────────────────┐
              │  ChangeProposal（事件，本地）          │
              │  引用 Contract → 反查 Cell → 注入      │
              │  → 触发内层 verify                    │
              └──────────────────────────────────────┘
```

---

# 第三部分 用户与角色

## 3.1 三类用户画像

### 3.1.1 L1 — 单微服务开发者

**画像**：小王，event-service 团队成员，工作 2-5 年，Java/Spring 熟练但对内部平台 SDK 不熟。

**关心**：
- 今天的需求今天能不能 ship
- 改动会不会破坏启动
- 自测能不能给我信心

**不关心**：
- fragment 怎么发布到 hub
- 跨团队复用
- 平台层规则怎么定

**主要交互**：
- 90% 时间在 `harness propose` + `harness verify`
- 偶尔 `harness sync` 拉别人的更新
- 不直接 contribute（由 L2 决定）

### 3.1.2 L2 — 微服务负责人

**画像**：小李，event-service Tech Lead，工作 5-10 年，对本服务和公司平台都熟。

**关心**：
- 服务质量、稳定性
- 知识沉淀、新人接手成本
- 跨团队协作（被别人复用、复用别人）

**主要交互**：
- 决定何时 `harness contribute --scope project`
- 决定何时把 contract 从 draft 升级为 stable
- 评审团队成员的 ChangeProposal
- 选 brownfield 工程里哪些组件优先 cell 化

### 3.1.3 L3 — 公司平台团队

**画像**：小黄，平台架构师，工作 10+ 年，跨服务横向治理。

**关心**：
- 栈模板的覆盖度与质量
- 公司级规则的执行率
- 合规底线
- 技术升级（如 JDK 11 迁移）的全公司推进

**主要交互**：
- 维护 `company/*` 与 `java/*` scope 的 fragment
- 推送新版本，观察各项目升级情况
- 分析跨项目 failure_pattern 的共性，形成新 rule

## 3.2 各角色典型一天

### L1（小王）的一天

```
09:00 拉到 ticket：ped-event 加视频流字段
09:05 在 Claude Code 里 harness propose "..."
09:05 plugin 内层反馈：这个改动影响 cell.event，
      历史有 3 个相关 failure_pattern，注意 fixture 同步
09:30 写代码
10:00 harness verify --full（外层）
10:08 verify FAIL：fixture-out-of-date（plugin 早预警过）
10:10 修 fixture，再跑 verify
10:18 verify 全通过
10:30 PR + propose id 贴在描述
14:00 review 通过，merge
14:05 harness propose finalize
      → contract 升级 stable
      → fixture-out-of-date 这条 pattern 被加强
```

### L2（小李）的一天

```
10:00 团队站会：评审小王的 propose，确认 contract 升级路径合理
14:00 看到一个新人提的 propose 注入命中很少的历史 pattern，
      意识到 cell.event 的 failure_patterns 维护得不够，
      花 30 分钟补几条
16:00 决定本周末 harness contribute --scope project：
      把 event-module 的 v1.4.2 推到 hub
      → redact gate 通过
      → ACL 默认 event-team 可写、其他团队只读
17:00 收到隔壁组小赵的私信：
      "我能不能 sync 你们的 event-module 当参考？"
      回复 yes
```

### L3（小黄）的一天

```
10:00 review 全公司各项目本周的 contribute 增量
11:00 发现 5 个不同项目都出现 "新增字段未脱敏导致 redact 拒收" 的 pattern
      → 决定升级 java/spring-war 的 rule 增加自动提示
14:00 编辑 java/spring-war fragment，version 1.4.0 → 1.5.0
15:00 push 到 hub stack scope
17:00 各项目下次 sync 时自动收到新版本提示
```

---

# 第四部分 使用场景（深度 walkthrough）

## 4.1 场景 A：小张新建 risk-alert-service（Greenfield）

### 背景

小张是新成立的"风险告警平台"团队的开发，要从零搭建 `risk-alert-service`：
接收 iavis 推过来的告警，做风险等级评估，转发给 PDMS。

技术栈：Java 8 + Spring Boot 2.x + Maven + 内嵌 Tomcat（Jar 部署）。

她的目标：5 分钟内拉到完整 harness 骨架，开始写第一行业务代码。

### 步骤

**01 — 创建工程**

```bash
$ mvn archetype:generate -DartifactId=risk-alert-service ...
$ cd risk-alert-service
$ git init && git add . && git commit -m "init"
```

**02 — harness init**

```bash
$ harness init --stack java/spring-boot-2x

[init] Detecting context...
  ✓ Java 8
  ✓ Maven (pom.xml found)
  ✓ Spring Boot 2.7.x (parent in pom.xml)
  ✓ Jar packaging (no <packaging>war</packaging>)

[init] Resolving fragment DAG from hub...
  → java/spring-boot-2x@2.1.0
    → java/maven@1.3.0
      → java/base@1.0.0
        → company/core@2.0.0
  → company/core@2.0.0
  → skill/harnessify-cell@0.5.0
  → skill/load-cell-context@0.5.0
  → skill/redact-secrets@1.0.0
  → skill/spec-driven-change@0.5.0

[init] Total: 9 fragments, 1.2 MB
[init] Confirm? [Y/n] Y

[init] Syncing fragments...
[init] Applying to working tree...
  + AGENTS.md
  + agent/manifest.yaml
  + agent/cells/                  (空，由你之后填充)
  + agent/specs/                  (空)
  + agent/proposals/              (空)
  + agent/rules/rules.yaml        (来自 company/core + java/spring-boot-2x)
  + agent/scripts/                (来自 java/spring-boot-2x: static-scan, compile,
                                   package, startup, api-replay 等 7 个)
  + agent/runs/.gitkeep
  + .claude/skills/               (4 个 skill)
  + .claude/hooks/                (3 个 hook)
  + .claude/settings.json

[init] Done. Next steps:
  - 阅读 AGENTS.md
  - 在 agent/cells/ 下创建第一个 cell
  - 通过 harness propose 开始第一次变更
```

**03 — 看一眼 harness 骨架**

```
risk-alert-service/
├── AGENTS.md                       # 自动生成的 10 行入口文件
├── pom.xml
├── src/...
├── agent/
│   ├── manifest.yaml               # 引用了哪些 fragment + 版本
│   ├── cells/                      # 空
│   ├── specs/                      # 空
│   ├── proposals/                  # 空
│   ├── rules/
│   │   └── rules.yaml              # 17 条 rule（含 company + stack）
│   ├── scripts/                    # 7 个 .sh
│   └── runs/
└── .claude/
    ├── skills/
    ├── hooks/
    └── settings.json
```

**04 — 写第一个 cell**

小张要写一个 `alert-receiver` 组件接 iavis 推送。她创建：

```bash
$ mkdir -p src/main/java/com/risk/alert/receiver
# 写若干 Java 文件
$ harness scan-modules
```

`harness scan-modules` 会调用 `skill/harnessify-cell`：

```
[scan] Scanning Maven modules and Spring components...
  Found 1 component candidate:
    - alert-receiver (1 Controller, 0 Consumer, 1 Service)

[scan] Generate cell.yaml? [Y/n] Y

  + agent/cells/alert-receiver/module.yaml (草稿)
  + agent/cells/alert-receiver/context.md  (空)

请人工确认 module.yaml 内容并补充 contracts、verification、failure_patterns
```

`agent/cells/alert-receiver/module.yaml` 草稿：

```yaml
apiVersion: agenthub.io/v1
kind: Cell
metadata:
  id: alert-receiver
  owner: risk-alert-team
spec:
  code:
    paths:
      - src/main/java/com/risk/alert/receiver/**
    beans:
      - AlertReceiverService
    consumers: []
    runners: []
  dependencies:
    middleware: []                # 待填
    internal:   []                # 待填
  contracts: []                   # 待写：先写 contract draft
  verification:
    required_for: {}              # 待填
  fixtures: []
  failure_patterns: []
```

**05 — 写第一份 contract draft**

```bash
$ harness propose "定义 alert-receiver 接收 iavis 告警的契约"
```

plugin 创建 `agent/proposals/2026-05-10-alert-receiver-contract.yaml`，由于 contract 不存在，这是创建型 proposal。小张填写：

```yaml
spec:
  contracts:
    - id: alert/receive-from-iavis
      operations:
        - op: add
          target: capability
          after: |
            接收 iavis 推送的 patrol 告警事件并入告警库
        - op: add
          target: input
          after: |
            { eventId, deviceId, level: 1|2|3, timestamp, message }
```

verify 内层通过后，contract 进 `agent/specs/draft/alert/receive-from-iavis.yaml`。

**06 — 第一次 verify**

```bash
$ harness verify --full
[verify] static-scan ... PASS
[verify] compile ... PASS
[verify] package ... PASS
[verify] startup ... PASS
[verify] api-replay ... SKIP (no fixtures yet)

写入 agent/runs/2026-05-10-15-30-verify.json
```

**07 — 闭环**

小张已经具备完整 harness：rule 在跑、cell 已注册、contract draft 已写、scripts 全跑通。她可以专心写业务代码，所有约束已就位。

### 这个场景验证了什么

- Greenfield 5 分钟从零到 ready 的体验
- fragment DAG 自动解析依赖
- harness init 是非破坏性的（只新增文件）
- skill 在合适时机触发（scan-modules 触发 harnessify-cell）

---

## 4.2 场景 B：小李接手 iavis（Brownfield，验证参照）

### 背景

iavis 是公司视觉巡检平台，500+ Java 类，20+ Maven module，跑了 4 年。
原 Tech Lead 离职，小李接手，第一件事是给 iavis 接入 harness 系统，让团队和 Agent 都能稳定工作。

挑战：
- 工程已经存在，**不能破坏**任何现有代码
- 一次 cell 化全部模块不现实
- 团队 5 个人，每天还在并行改业务

小李的目标：**渐进式 cell 化**，本周先把核心 5 个模块 cell 化，其它模块按需补。

### 步骤

**01 — Brownfield init**

```bash
$ cd iavis-source
$ harness init --stack java/spring-war --brownfield

[init] Detecting context...
  ✓ Java 8
  ✓ Maven multi-module (20 modules detected)
  ✓ Spring (non-Boot, traditional)
  ✓ WAR packaging (iavis-start/pom.xml)
  ✓ Internal SDK refs: bic, esc, pdms, irds

[init] Brownfield mode: 不会修改任何现有源代码
[init] 即将新增的目录：
  + AGENTS.md
  + agent/
  + .claude/
  既有的 src/、pom.xml、target/ 等不会被触碰

[init] Resolving fragment DAG from hub...
  → java/spring-war@1.4.0
  → company/core@2.0.0
  → company/internal-libs@1.2.0   (BIC/ESC/PDMS/IRDS 适配规则)
  → ...

[init] Confirm? [Y/n] Y
```

**02 — scan-modules 出 cell 候选清单**

```bash
$ harness scan-modules

[scan] 扫描 20 个 Maven module 与 Spring 组件...
[scan] 候选 cell 清单（不会自动创建，仅供参考）：

  优先级 高（含 Controller / Consumer / 业务核心）：
    1. event       (3 Controller, 5 Consumer, 12 Service)
    2. patrol      (2 Controller, 4 Consumer, 8 Service)
    3. sync        (0 Controller, 6 Consumer, 4 Service)
    4. dpsm-push   (1 Controller, 2 Consumer, 3 Service)
    5. common      (0 Controller, 0 Consumer, 8 Config Bean)

  优先级 中（含业务但量小）：
    6. api         (4 Controller boundary, no business)
    7. start       (启动模块, 含 datasource init)

  优先级 低（工具类、纯 DTO）：
    8. dto, util, ...

[scan] 建议先 cell 化优先级高的 5 个。运行 harness cell add <id>。
```

**03 — 第一个 cell 化：event**

```bash
$ harness cell add event

[cell add] 扫描 event module 代码...
[cell add] 自动识别：
  - paths: iavis-event/src/main/java/**
  - beans: PedEventServiceImpl, MockPedEventController, ...
  - consumers: CameraTempEventConsumer, CameraOrginTempEventConsumer
  - 依赖检测: mq, redis (从 application.yml)
  - internal SDK: bic, esc (从 imports)

[cell add] 生成草稿: agent/cells/event/module.yaml
[cell add] 生成空 context.md
[cell add] 已识别该 module 引用了 1 个待补充的契约：
            event 模块向外提供 ped-event-receive 接口
            建议新建 contract: event/ped-event-receive

请你确认或修改 module.yaml，并填写 contract。
```

`agent/cells/event/module.yaml` 自动生成的草稿（小李会进一步补充 verification 和 failure_patterns）：

```yaml
apiVersion: agenthub.io/v1
kind: Cell
metadata:
  id: event
  owner: event-team
spec:
  code:
    paths:
      - iavis-event/src/main/java/**
    beans:
      - PedEventServiceImpl
      - MockPedEventController
      - PedEventBatchAggregator
    consumers:
      - CameraTempEventConsumer
      - CameraOrginTempEventConsumer
  dependencies:
    middleware: [mq, redis]
    internal:   [bic, esc]
  contracts: []                    # 由小李补充
  verification:
    required_for: {}               # 由小李补充
```

**04 — 小李补全**

小李加上：

```yaml
  contracts:
    - id: event/ped-event-receive       # 新建
    - id: event/mock-event-replay       # 新建
    - id: event/temp-event-consumer     # 新建
  verification:
    required_for:
      event/ped-event-receive: [static, compile, package, startup, api-replay]
      event/mock-event-replay:  [static, compile, package, startup, api-replay]
      event/temp-event-consumer: [static, compile, package, startup, mq-replay]
  failure_patterns:
    - signature: legacy-mq-hardcode
      classify: mq-address-hardcode
      occurred: 2
      resolved: true
      hint: 老代码硬编码 amq:// 已修，新代码必须走 common/IsecureVersionAdaptConfig
    - signature: legacy-postconstruct
      classify: postconstruct-blocking-startup
      occurred: 3
      resolved: false
      hint: 部分 @PostConstruct 在主库不可达时阻断启动，待重构
```

同时写三份 contract 草稿到 `agent/specs/draft/event/`。

**05 — 第一次 verify（看是否能跑通现有代码）**

```bash
$ harness verify --full

[verify] static-scan ... 
  WARN: 3 处 amq:// 硬编码（在 event 模块外）
  WARN: 2 处 root00000000 硬编码（不在 event 模块）
[verify] compile ... PASS
[verify] package ... PASS（生成 iavis.war）
[verify] startup ... 
  FAIL: 主数据源 7092 端口不可达
  分类: env-issue (not code)
[verify] api-replay event ...
  SKIP (服务未启动)

写入 agent/runs/2026-05-10-16-00-verify.json
```

**06 — 团队后续接手只 cell 化 event 一个模块也能开始用**

`harness propose` 在 event 模块的改动上立即可用。其他模块还没 cell 化，但**不阻塞**——团队可以下周继续 cell 化 patrol，再下周 sync，等等。

**07 — 一周后**

5 个核心 cell 化完成，小李触发：

```bash
$ harness contribute --scope project --target project/iavis/event-module

[contribute] 打包 cell.event + 3 个 contract + failure_patterns
[contribute] redact gate ... PASS
[contribute] ACL: project-private to event-team
[contribute] 推送到 hub: project/iavis/event-module v0.1.0

[contribute] 你可以用类似命令推其它已 cell 化的模块。
```

### 这个场景验证了什么

- iavis 这种重型工程的接入路径
- 非破坏性（不动源代码）
- 渐进式（不要求一次全 cell 化）
- 现有失败模式（如 startup 因主库不可达失败）能被正确分类，不被误归为代码 bug
- 一周内首批沉淀已可贡献回 hub

iavis 正是这套设计的**第一个验证参照**——它代表了公司里最复杂的 Java 工程形态。

---

## 4.3 场景 C：小王给 ped-event 加视频流字段（核心 loop）★

### 背景

小王是 event-service 团队成员（即 iavis 的 event 模块开发者，cell.event 已存在）。
今天接到产品需求：

> ped-event-receive 接口需要支持视频流附加字段（streamId、bitrate）。
> 视觉复核流程需要这些信息用于人工核对。

她的目标：用 propose loop 完整跑一遍，确保改动不破坏既有契约、不漏自测、知识沉淀给下一个人。

### 步骤

**01 — propose 创建**

```bash
$ harness propose "为 ped-event-receive 增加视频流附加字段"

[propose] 创建草稿: agent/proposals/2026-05-10-ped-event-stream-fields.yaml
```

小王打开文件填写：

```yaml
apiVersion: agenthub.io/v1
kind: ChangeProposal
metadata:
  id: 2026-05-10-ped-event-stream-fields
  author: 小王
  createdAt: 2026-05-10T09:30:00Z
spec:
  contracts:
    - id: event/ped-event-receive
      operations:
        - op: modify
          target: input
          before: |
            { type, timestamp, deviceId, snapshotUrl }
          after: |
            { type, timestamp, deviceId, snapshotUrl,
              streamId?, bitrate? }
  rationale: |
    产品需求：视觉复核流程需要拿到原始视频流信息，
    用于后续的视频取证与人工核对。
    streamId、bitrate 为可选字段，旧客户端不受影响。
```

**02 — 内层分析（秒级）**

```
[propose] 解析 proposal contract: event/ped-event-receive
[propose] 反向索引查询...
[propose] 命中 cell: event
[propose] 加载 cell.event.module.yaml
[propose] 加载关联 rule:
            - java/spring-war/no-hardcode-mq-url
            - project/iavis/event/postconstruct-must-have-fail-policy
            - company/no-secret-in-source
[propose] 加载历史 failure_patterns（3 条 from cell.event）

[propose] 注入摘要：
  ▸ cell.event 涉及：
    - 5 个 Bean (PedEventServiceImpl, ...)
    - 2 个 Consumer (CameraTempEventConsumer, ...)
    - 1 个 Controller (MockPedEventController)
  ▸ 修改 ped-event-receive 必须 trigger 验证矩阵:
    static + compile + package + startup + api-replay
  ▸ 历史 failure_pattern（值得注意）:
    1. fixture-out-of-date (3 次, 已修复)
       → 新增字段后必须同步 fixture/ped-event-*.json
    2. mq-address-hardcode (1 次, 已修复)
       → 业务模块禁止硬编码 amq://，走 common 适配
    3. snapshotUrl-required-missing (3 次, 已修复)
       → 必填字段缺失会被 api-replay 抓出来

[propose] 内层 static + spec 一致性检查...
[propose] PASS: schema diff 兼容（仅新增可选字段）
[propose] PASS: 命名约定符合 stack/java-spring-war
[propose] WARN: 新字段 streamId 与 cell.event.dependencies 中
            已有的 streaming-service 平台同名，注意端到端拼接

总用时 4.2s
proposal status: drafting → injecting (done)
```

**03 — 写代码**

小王在已注入的上下文下改代码。她在 `PedEventDTO.java` 加上：

```java
private String streamId;     // optional
private Integer bitrate;     // optional, kbps
```

她在 `PedEventServiceImpl` 里把这两个字段透传到下游。

**04 — 外层 verify（分钟级）**

```bash
$ harness verify --full

[verify] static-scan ... PASS (3.1s)
[verify] compile ... PASS (98s)
[verify] package ... PASS (45s)
[verify] startup ... PASS (3min 12s)
[verify] api-replay event ...
    fixture: agent/cells/event/fixtures/ped-event-img-1.json ... PASS
    fixture: agent/cells/event/fixtures/ped-event-stream-1.json ...
      FAIL: 期望字段 streamId 缺失（fixture 未更新）
[verify] 失败分类: fixture-out-of-date

  ⓘ 这个 pattern 已在 cell.event.failure_patterns 记录（出现过 3 次）
  ⓘ plugin 早在 propose 时就预警了

写入 agent/runs/2026-05-10-09-58-verify.json
```

**05 — 修 fixture**

小王打开 `agent/cells/event/fixtures/ped-event-stream-1.json`：

```json
{
  "type": "ped",
  "timestamp": 1715300000,
  "deviceId": "cam-007",
  "snapshotUrl": "https://example/...",
  "streamId": "stream-2026-001",
  "bitrate": 2048
}
```

**06 — 再跑 verify**

```bash
$ harness verify --full
... 全 PASS

写入 agent/runs/2026-05-10-10-12-verify.json
```

**07 — proposal 状态更新**

```yaml
status:
  phase: ready
  runs:
    - 2026-05-10-09-58-verify
    - 2026-05-10-10-12-verify
```

**08 — Code Review + finalize**

小王在 PR 描述里贴上 proposal id：`see proposal 2026-05-10-ped-event-stream-fields`。

Reviewer（小李）点开 proposal，看到：
- 结构化的 spec diff
- 自动反查的 affected_cells
- 验证记录与失败原因

review 通过后 merge。小王跑：

```bash
$ harness propose finalize 2026-05-10-ped-event-stream-fields

[finalize] 升级 contract event/ped-event-receive (draft → stable)
[finalize] 更新 cell.event.failure_patterns:
  - fixture-out-of-date: occurred 3 → 4
[finalize] 归档 proposal 到 agent/proposals/archive/
```

**09 — 团队下次 contribute 时**

小李本周末批量 contribute：

```bash
$ harness contribute --scope project

[contribute] 打包 project/iavis/event-module 增量...
  ▸ contract event/ped-event-receive: stable@v1.4.2（含 streamId/bitrate）
  ▸ cell.event.failure_patterns 更新
[contribute] redact gate ... PASS
[contribute] 推送到 hub: project/iavis/event-module v1.4.2
```

**10 — 隔壁组小赵几天后改 event 模块时**

```bash
$ harness sync

[sync] 拉取 project/iavis/event-module v1.4.2 增量
[sync] 应用到本地 agent/cells/event/...
```

小赵 propose 时，`fixture-out-of-date` 这条 pattern 自动出现在注入上下文里——她**直接避开了同样的坑**。

### 闭环时间线

| 阶段 | 时长 |
|---|---|
| propose 到内层反馈 | 4.2 秒 |
| 改代码 + 跑外层 verify（首次失败） | ~7 分钟 |
| 修 fixture + 再跑 verify（成功） | ~5 分钟 |
| Code review + finalize | ~10 分钟 |
| contribute（L2 周末批量） | ~30 秒 |
| 下一个人受益 | 自动，下次 sync 时 |

### 这个场景验证了什么

- propose loop 完整跑通
- 内层秒级反馈（注入 + static check）与外层分钟级 verify 分层清晰
- 历史 failure_pattern 自动注入到改动者面前——预警 vs 事后总结的本质区别
- 知识沉淀闭环：本次踩坑 → cell.failure_patterns +1 → 下次有人改自动看到

---

## 4.4 场景 D：小赵基于已有沉淀做 alert-relay 服务

### 背景

小赵在告警平台团队。新需求：做一个 `alert-relay` 服务，接收 iavis patrol 模块的告警，做格式转换后转发到 PDMS。

她意识到 iavis patrol 模块的结构跟自己要做的高度类似（都是接 MQ → 处理 → 转发），想看看能不能复用一些经验。

### 步骤

**01 — 在 Claude Code 里检索**

她在 Claude Code 对话里直接问：

> 公司有没有 patrol 类型的 service 沉淀？我做一个 alert-relay 类似的。

plugin 调 `harness browse` 检索：

```
[browse] 检索 fragment in scope: project, stack
[browse] 匹配查询: patrol, alert relay, mq forward

结果（按相关性）：
  1. project/iavis/patrol-module v1.2.0
     description: iavis 巡检模块，含 patrol 数据接收/告警/视觉复核反馈
     contracts: patrol-result-consume, portal-alert-notify, ...
     ACL: cross-team readable
     
  2. project/iavis/event-module v1.4.2
     description: PED 事件接收与中转
     ACL: cross-team readable

  3. java/spring-war v1.4.0 (stack)
     description: Java Spring WAR 工程通用约束
```

**02 — sync 已有沉淀**

```bash
$ cd alert-relay-service-empty
$ harness init --stack java/spring-boot-2x
$ harness sync project/iavis/patrol-module --as-reference

[sync] 以 reference 模式拉取（不会污染自己工程的 cell）
[sync] 写入到 agent/references/iavis-patrol-module/
```

`--as-reference` 是 v3 的新选项：拉到的内容只用于参考，**不会**变成本工程的 cell。这避免误把别人的业务逻辑当成自己的。

**03 — 阅读参考**

小赵打开 `agent/references/iavis-patrol-module/cells/patrol/module.yaml`：

```yaml
spec:
  consumers:
    - PatrolResultConsumer       # 接 MQ
    - PortalAlertConsumer
  dependencies:
    middleware: [mq]
    internal:   [bic]
  failure_patterns:
    - classify: mq-message-flood
      hint: 高峰期 patrol-result 队列堆积，需要批处理
    - classify: portal-notify-timeout
      hint: 门户接口偶发超时，需要 retry + 死信
```

她意识到：
- 自己的 alert-relay 也会面对 MQ flood，需要批处理设计
- portal 类下游的超时是常见模式，需要 retry

**04 — 在自己工程里写自己的 cell**

```bash
$ harness cell add alert-relay-receiver

# 自己填 module.yaml，借鉴 reference 的结构但不抄业务
```

她**手动**把"批处理设计"和"retry + 死信"写进自己的 cell.failure_patterns（作为预警，事先沉淀）。

**05 — 写 contract、跑 verify**

按场景 A 类似的流程做。区别：她**已经知道**自己要预防什么。

**06 — 几个月后 alert-relay 稳定**

她也 contribute 自己的 fragment。下一个做类似服务的人在 browse 时会同时看到 iavis/patrol 和 alert-relay 两个参照。

### 这个场景验证了什么

- 跨团队复用的真实路径——不是直接抄，而是借鉴模式 + 失败教训
- `--as-reference` 模式让"借鉴"和"实化"两件事被分开
- 知识网络效应：一个工程沉淀，N 个工程受益

---

## 4.5 场景 E：小黄升级 java/spring-war 加 JDK 11 支持

### 背景

小黄是平台团队。公司决定从 JDK 8 迁到 JDK 11。她需要：
1. 增加 `java/jdk11` fragment
2. 让 `java/spring-war` 能根据 JDK 版本切换不同的启动参数与反射策略
3. 通知各项目可选升级

### 步骤

**01 — 创建新 fragment**

她在自己的工作区拉一份模板：

```bash
$ harness new-fragment --kind stack --id java/jdk11

[new-fragment] 创建 fragment 工作目录: ~/fragments/java-jdk11/
```

填写 fragment.yaml：

```yaml
apiVersion: agenthub.io/v1
kind: Fragment
metadata:
  id: java/jdk11
  version: 1.0.0
  scope: stack
  owner: platform-team
  description: JDK 11 启动参数、反射策略、模块系统约束
spec:
  requires:
    fragments:
      - { id: java/base, version: ">=1.0.0" }
  provides:
    rules:
      - id: java/jdk11/illegal-access-deny
        body: |
          JDK 11 不允许 --illegal-access=permit。
          反射穿透必须显式 --add-opens。
      - id: java/jdk11/jvm-args
        body: |
          推荐 JVM 参数：
            -XX:+UseG1GC
            -XX:MaxRAMPercentage=75.0
    actions:
      - id: action/jdk11-startup
        path: scripts/start-jdk11.sh
```

**02 — 改造 java/spring-war 让它能引用 jdk11**

```yaml
# java/spring-war v1.5.0
spec:
  requires:
    fragments:
      - { id: java/maven, version: ">=1.0.0" }
      - { id: java/jdk8, version: ">=1.0.0", optional: true }
      - { id: java/jdk11, version: ">=1.0.0", optional: true }
```

`optional` 表示项目按 detect-context 命中其中一个。

**03 — 推送到 hub**

```bash
$ harness contribute --fragment java/jdk11
$ harness contribute --fragment java/spring-war  # v1.4.0 → v1.5.0

[contribute] redact gate ... PASS
[contribute] ACL: stack scope, all teams readable
[contribute] 推送 hub: java/jdk11 v1.0.0
[contribute] 推送 hub: java/spring-war v1.5.0
```

**04 — 通知**

平台团队在 AgentHub Web 后台标记 v1.5.0 为 "推荐升级版本"。各项目下次 sync 时收到提示：

```
[sync] java/spring-war: 1.4.0 → 1.5.0 可用
       变更：增加 java/jdk11 可选依赖
       建议：迁 JDK 11 时 sync
```

**05 — 一个项目（小李 iavis）尝试升级**

```bash
$ harness sync --upgrade java/spring-war
[sync] 拉取 java/spring-war@1.5.0
[sync] 拉取 java/jdk11@1.0.0
[sync] apply 后 verify 即时校验
[verify] static-scan ... 
  WARN: 23 处反射穿透需要 --add-opens（JDK 11 限制）
  详见 agent/runs/...

请人工评估是否升级。
```

小李评估后决定先停在 JDK 8（项目还没准备好）。下次再 sync 时不强制升级。

### 这个场景验证了什么

- 平台团队推动横向升级的可行路径
- fragment 版本化让升级**可控**而非强制
- optional 依赖让一个 stack fragment 同时服务多个 JDK 版本
- detect-context 自动选用合适的子 fragment

---

# 第五部分 产品形态

## 5.1 用户接触面

| 接触面 | 形态 | 说明 |
|---|---|---|
| **入口** | 在 Claude Code 安装 plugin | 一次性安装，对每个工程生效 |
| **命令** | `harness {init, sync, apply, verify, contribute, propose, browse, scan-modules, cell add, ...}` | 全部以 `harness` 为前缀 |
| **对话** | 在 Claude Code 里直接询问 | "有没有适合 X 的 fragment / 别人写过这个吗" |
| **工程目录** | `agent/` + `.claude/` + `AGENTS.md` | 见 5.2 |
| **平台 Web** | AgentHub Web 上的 fragment marketplace | 浏览、看版本历史、看依赖图 |

## 5.2 工程目录约定

工程根下**只有 3 个 Agent 相关条目**：

```
<repo>/
├── AGENTS.md                       # 人入口，10 行内
├── agent/                          # 工具无关的全部知识资产
└── .claude/                        # Claude Code 工具适配（实化产物）
```

切分轴线：**知识（工具无关） vs 工具适配（厂商专属） vs 人入口**。三者职责互不重叠。

### 5.2.1 agent/ 内部布局

```
agent/
├── manifest.yaml          # 引用了哪些 fragment + 版本
├── cells/                 # 模块舱
│   └── <name>/
│       ├── module.yaml
│       ├── context.md
│       └── fixtures/
├── specs/                 # OpenSpec 稳定契约
│   ├── stable/
│   └── draft/
├── proposals/             # 变更提案（事件流）
│   └── archive/           # 闭环后归档
├── rules/                 # 静态约束
│   └── rules.yaml
├── scripts/               # 验证动作
├── runs/                  # 运行记录（默认 .gitignore）
└── references/            # `--as-reference` 拉来的别人沉淀（不污染本工程）
```

7 个子目录每个回答一个独立问题：

| 目录 | 回答 |
|---|---|
| manifest.yaml | 我引用了 hub 上哪些 fragment？ |
| cells/ | 我由什么组件组成？ |
| specs/ | 我必须做到什么？ |
| proposals/ | 我正在改什么？ |
| rules/ | 我的代码怎么写？ |
| scripts/ | 我怎么自测？ |
| runs/ | 我跑过什么？ |
| references/ | 我借鉴了别人什么？ |

### 5.2.2 .claude/ 是实化产物

```
.claude/
├── skills/                # 由 harness apply 从 fragment 实化
├── hooks/                 # 同上
└── settings.json          # 同上
```

**关键观念**：
- `.claude/` 内容**不应被手工编辑**作为知识来源
- 维护者编辑或贡献 fragment，`.claude/` 由 `harness apply` 自动生成
- 增加新 Agent 工具 = 增加 `.codex/`、`.cursor/` 等同级目录，**不动 agent/**

### 5.2.3 AGENTS.md 是人入口

10 行内，只说三件事：
1. 这是什么服务
2. agent/ 里有什么（导航）
3. 改东西从哪开始（一般 `harness propose`）

不放业务知识、不放规则、不放上下文——这些进 `agent/`。

## 5.3 命令一览

| 命令 | 谁用 | 时机 | 输入 | 产出 |
|---|---|---|---|---|
| `harness browse [query]` | 全员 | 探索 hub | 检索词 | fragment 列表 |
| `harness init --stack <s>` | L2 | Greenfield 新工程 | 栈名 | `agent/`、`.claude/` 骨架 |
| `harness init --stack <s> --brownfield` | L2 | Brownfield 接入老工程 | 栈名 | 同上，非破坏性 |
| `harness scan-modules` | L2 | brownfield 后 | - | cell 候选清单 |
| `harness cell add <id>` | L2 | 单个 cell 化 | cell id | `agent/cells/<id>/` 草稿 |
| `harness sync [--upgrade] [--as-reference] [<id>]` | 全员 | 拉 fragment | fragment id | 本地缓存更新 |
| `harness apply` | 全员 | 实化 | - | `agent/` 与 `.claude/` 内文件 |
| `harness propose <title>` | L1 | 日常变更入口 | 标题 | proposal yaml + 内层反馈 |
| `harness propose finalize <id>` | L1 | proposal 闭环 | proposal id | contract 升级 + pattern 更新 |
| `harness verify [--full]` | 全员 | 显式验证 | 默认全集或子集 | run record |
| `harness contribute --scope <s>` | L2 | 沉淀回 hub | scope | hub 上多一个版本 |
| `harness new-fragment --kind <k>` | L3 | 创建栈/公司 fragment | kind | 工作目录骨架 |

---

# 第六部分 系统设计

## 6.1 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│  开发者侧（Claude Code IDE）                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Claude Code Plugin (agenthub-harness-plugin)           │ │
│  │                                                          │ │
│  │  命令层：sync / apply / verify / contribute /            │ │
│  │           propose / browse / init / scan-modules        │ │
│  │                                                          │ │
│  │  Skill 层：harnessify-cell / load-cell-context /         │ │
│  │           spec-driven-change / redact-secrets /          │ │
│  │           scan-modules                                   │ │
│  │                                                          │ │
│  │  Hook 层：session-start / session-end / pre-edit         │ │
│  └────────────────────────────────────────────────────────┘ │
│         │                                                    │
│         ▼ 调用                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AgentHub CLI（已存在，复用）                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────┼────────────────────────────────────────────────────┘
          │ HTTP / gRPC
          ▼
┌──────────────────────────────────────────────────────────────┐
│  AgentHub Server                                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Fragment Registry                                      │ │
│  │  - GET  /fragments?context=<json>&scope=<scope>         │ │
│  │  - POST /fragments                                      │ │
│  │  - GET  /fragments/<id>/versions                        │ │
│  │  - 版本 / ACL / 简单检索（栈+tag） / 依赖解析            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Redact Gate（脱敏强制门）                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Audit Log                                              │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

工程目录（本地物化）
└── AGENTS.md + agent/ + .claude/
```

## 6.2 平台接口（极简）

```
GET  /api/v1/fragments?context=<json>&scope=<scope>     # 检索（含依赖解析）
POST /api/v1/fragments                                  # 提交（强制过 redact gate）
GET  /api/v1/fragments/<id>/versions                    # 版本列表
GET  /api/v1/fragments/<id>?version=<v>                 # 取具体版本
```

**只有这 4 个接口。**所有"拿 profile"、"装 skill"、"获取 install plan" 等都退化为 `GET /fragments` 的检索特例。

## 6.3 关键流程

### 6.3.1 sync 流

```
工程根
  └─ detect-context（识别栈、依赖、可见 scope）
       ↓
  GET /api/v1/fragments?context=...
       ↓
  hub 返回相关 fragment DAG（含依赖解析）
       ↓
  本地缓存（~/.agenthub/cache/fragments/）
       ↓
  更新 agent/manifest.yaml（记录引用）
```

不动工作区其他文件。

### 6.3.2 apply 流

```
agent/manifest.yaml
  └─ 列出引用的 fragment + 版本
       ↓
  从本地缓存读取每个 fragment
       ↓
  按 fragment.provides 实化:
    rules    → agent/rules/rules.yaml
    actions  → agent/scripts/
    skills   → .claude/skills/
    cells    → agent/cells/<name>/
    contracts→ agent/specs/
       ↓
  幂等（重复 apply 不会重复写）
```

### 6.3.3 verify 流

```
harness verify [scope]
  └─ 选定要跑的 actions（默认全集，或按 cell.verification 子集）
       ↓
  逐个执行 action 脚本
       ↓
  收集输出，分类失败原因
       ↓
  写 agent/runs/<ts>-verify.json
       ↓
  若 failure_signature 与 cell.failure_patterns 命中，
    增加 occurred 计数；否则提示是新 pattern
```

### 6.3.4 contribute 流

```
harness contribute --scope project
  └─ 收集本地新增/修改的 cell / contract / pattern
       ↓
  打包成 fragment 增量（自动生成 manifest）
       ↓
  ◎ redact gate：扫描敏感词、密码、token、JDBC URL 等
       ├─ 通过：继续
       └─ 拒绝：输出违规位置，退出
       ↓
  ◎ ACL 检查：用户是否有权 push 到目标 scope
       ↓
  POST /fragments
       ↓
  hub 入库新版本，写 audit log
```

### 6.3.5 propose 流

```
harness propose <title>
  └─ 创建 agent/proposals/<ts>-<slug>.yaml 草稿
       ↓
  解析 proposal.spec.contracts[*].id
       ↓
  反向索引查询: contract → cells（启动期建立的内存索引）
       ↓
  注入：
    - cell.module.yaml（每个命中的 cell）
    - 关联 rule（按 cell 引用的 rule + scope 内继承的 rule）
    - cell.failure_patterns（命中过 ≥ 1 次的）
       ↓
  内层 verify（秒级）:
    - static rule 校验
    - spec 一致性（diff 是否兼容）
    - 命名约定
       ↓
  反馈给开发者
```

## 6.4 Spec-Driven Change Loop 详解

### 6.4.1 内外双层 verify

| 层 | 时长 | 内容 | 触发 |
|---|---|---|---|
| **内层（秒级）** | 1-10 秒 | 静态 rule、spec 一致性、contract↔cell 反查、影响域计算 | propose 创建即自动 |
| **外层（分钟级）** | 5-15 分钟 | compile + package + startup + api-replay 子集 | 显式 `harness verify --full` |

**propose loop 的"自动"指内层**。外层是异步或显式触发，体感不会卡。

### 6.4.2 contract↔cell 反向索引

每次 plugin session 启动时构建：

```
For each fragment in agent/manifest.yaml:
  For each cell in fragment.provides.cells:
    For each contract_id in cell.spec.contracts:
      index[contract_id].append(cell)
```

索引存在内存 + 本地缓存文件。fragment sync 时 invalidate。

> v3 不向 hub 同步索引——索引是本地结构，每个工程自己维护。

### 6.4.3 注入策略

注入精度的关键：**基于 proposal 涉及的 contract，不基于改动文件路径**。

```
proposal.contracts = [event/ped-event-receive]
  ↓ 反向索引
affected_cells = [event]
  ↓
注入内容:
  - agent/cells/event/module.yaml （含 dependencies、verification matrix）
  - agent/rules/* 中作用于 cell.event 的 rule
  - cell.event.failure_patterns
  - 不注入: cell.patrol、cell.sync、cell.dpsm-push（无关）
```

vs 基于文件路径：改 `PedEventDTO.java` 仅触发"加载 event cell"，但忽略了"这个改动同时影响 mock-event-replay"等可能在其他 cell 引用的 contract。

### 6.4.4 验证子集化

```
proposal 涉及 contract: [event/ped-event-receive]
  ↓
查 cell.event.verification.required_for[event/ped-event-receive]
  = [static, compile, package, startup, api-replay]
  ↓
若 proposal 涉及多个 contract，取**并集**（v3 不做更复杂最小化）
  ↓
跑这些 action，写 run record
```

---

# 第七部分 治理与边界

## 7.1 红线（不让步）

| # | 边界 | 含义 |
|---|---|---|
| 1 | Fragment 是 hub 上唯一资产类型 | ChangeProposal 等事件不上 hub |
| 2 | Scope 决定可见性，不决定结构 | 三 scope 的 fragment 结构相同 |
| 3 | redact-secrets 是硬门 | 不通过的 fragment 直接拒收 |
| 4 | Contract 必须人工确认才升级 | 自动生成只进 draft，人工确认才进 stable |
| 5 | Run 默认本地，pattern 收敛后才回传 | 单次 run 不进 hub |
| 6 | Plugin 不藏业务知识 | 业务知识全在 fragment |
| 7 | 第一次 harness 化必须显式触发 | 后续 sync / load-cell-context 可自动 |
| 8 | 敏感配置不入 context / contract / run | 密码 / token / 完整 JDBC URL / signed URL |
| 9 | `agent/` 工具无关 | 不出现 Claude / Codex / Cursor 字样 |
| 10 | `.claude/` 不写源知识 | 只放 skill / hook / settings |
| 11 | AGENTS.md 不超过半屏 | 长了说明该进 cells 或 specs |
| 12 | brownfield 必须非破坏性 | 不修改任何现有源代码 |

## 7.2 已知开放问题（v3 不强行解决）

| # | 问题 | v3 临时策略 | 何时再定 |
|---|---|---|---|
| O-1 | hub 发布的审批流 | redact gate + ACL，审批靠人协议 | 二批用户进入后 |
| O-2 | 同 cell 并发 contribute 冲突 | last-write-wins + 版本戳警告 | 出现真实冲突 ≥ 3 次后 |
| O-3 | redact gate 误报申诉 | `--override` 标志 + 必填 reason + 审计日志 | 第一次真实误报后 |
| O-4 | 激励设计 | 不在产品内解决，作为组织协议 | 由组织而非 plugin 解决 |
| O-5 | Discovery 检索质量 | 栈 + tag 匹配，不做 RAG | fragment 数 > 200 后 |
| O-6 | failure_pattern 收敛标准 | 同 hash ≥ 3 次且修复过 | 实施时按真实数据调 |
| O-7 | Claude Code hook 实际表面 | 假设 session-start/end + pre-edit 可用 | 实施时校验 |
| O-8 | iavis 的 PowerShell 跨平台化 | 保留 Windows 路径，cross-platform 后续 | 实施后定优先级 |
| O-9 | monorepo 场景 | 默认 `agent/` 在 service 子目录 | 出现第一个用户后 |
| O-10 | fragment schema 演进 | apiVersion 显式版本化，不兼容报错 | 第一次 break change 时 |

**指导思想**：先把核心 loop 跑通，让产品在真实场景里产生数据，再用数据驱动这些开放问题的解决，而不是预先设计完美。

---

# 第八部分 FAQ

### Q1：为什么不直接复用 OpenAPI 描述契约？

OpenAPI 描述的是 HTTP 接口形态，无法表达：
- 失败策略（"BIC 不可达时本地降级"）
- 业务不变量（"同 (deviceId, timestamp) 不能重复入库"）
- 非 HTTP 接口（MQ Consumer、Scheduler、@PostConstruct）

OpenSpec 是覆盖这些的契约形态。OpenAPI 可以作为一种 contract 的子集表达，但不能取代它。

### Q2：为什么不用 Maven plugin 实现？

Maven plugin 绑定到 Maven 生命周期，但本系统的 propose loop 与 Maven build 脱钩——
propose 是开发者意图入口，不是构建阶段。同时本系统要支持 Brownfield 不破坏现有 build 配置，
独立的 CLI 比 Maven plugin 更合适。

### Q3：为什么不直接复用 Spring 自己的测试框架？

Spring 测试框架（@SpringBootTest 等）解决"代码层正确性"，但本系统关心的是
**工程层约束 + 跨场景一致性**：硬编码检测、契约一致性、失败模式收敛、知识沉淀。
两者互补，不互替。本系统的 verify 链路里，compile/package/startup 已经间接调用了 Spring 体系。

### Q4：为什么是 Claude Code 而不是别的 Agent 工具？

公司当前默认 Agent 工具是 Claude Code，团队已经熟悉。`agent/` 目录工具无关，
将来增加 `.codex/`、`.cursor/` 等只需新增工具适配，不动 agent/ 一字。
本设计**不绑定单一工具**，但 v3 实施先做 Claude Code。

### Q5：fragment 和 docker image 有什么不同？

| 维度 | fragment | docker image |
|---|---|---|
| 内容 | 知识资产（规则、契约、cell、脚本、prompt） | 二进制 + 文件系统 |
| 用途 | 让 Agent 与人对齐 | 部署运行 |
| 粒度 | 一个组件知识 | 一个服务运行环境 |
| 演进速度 | 快（每天可变） | 慢（按发布） |

它们解决不同问题，不替代。

### Q6：这跟 OpenSpec 有什么不同？

OpenSpec 是 contract 的格式约定，是本系统的**一个组成原语**。
本系统比 OpenSpec 大：还有 Cell（模块舱）、Rule（规则）、Action（验证）、Skill（prompt）、
ChangeProposal（事件）、Run（观测），加上 hub + plugin + 三 scope + 四动词。
OpenSpec 在本系统里被当作 Contract 原语的实现格式。

### Q7：为什么需要新的 hub？AgentHub 不够吗？

AgentHub 已存在且复用。"新 hub" 不是新的物理系统，是 AgentHub 上的 fragment 概念扩展——
现有 AgentHub 把 skill 当成资产，本系统把它扩展为统一的 fragment 模型。
平台侧改造工作量集中在 fragment registry + redact gate + ACL，不是从零搭服务。

### Q8：为什么是 propose 而不是 commit message？

Commit message 是事后描述，propose 是事前意图。两者作用不同：
- Propose 在改动开始前**触发上下文注入 + 内层 verify**——是"计划+预警"
- Commit message 在改动结束后描述发生了什么——是"记录"

Propose 的价值在于让上下文在动手前就到位，避免凭记忆改代码。

### Q9：redact gate 误报会卡死开发吗？

会有少量误报。v3 的临时策略：
- 提供 `harness contribute --override --reason "..."` 强制提交
- 强制 reason 字段，写入审计日志
- 平台团队定期 review override 记录，调整 redact 规则

这是开放问题 O-3，待实际数据后定细则。

### Q10：学习成本会不会太高？

L1 开发者只需要知道 1 个命令：`harness propose`。其他命令都是 L2/L3 的事。
L1 的日常工作流：
1. `harness propose <title>`
2. 看反馈、改代码
3. `harness verify --full`
4. PR + review

跟现有 git + IDE 流程基本叠加，不替换。

学习曲线集中在概念层（理解 cell / contract / fragment），通过场景 walkthrough（第四部分）和团队培训分摊。

### Q11：万一 hub 离线怎么办？

- 已 sync 过的 fragment 都在本地缓存（`~/.agenthub/cache/`）
- `harness apply / verify / propose` 不依赖在线
- 仅 `harness sync / contribute` 需要 hub 在线
- 离线期间可以正常开发，连接恢复后再 sync 增量、contribute 沉淀

### Q12：会不会过度设计，导致小工程不愿意接入？

L2 的判断权很大：
- 小工程可以只做 Greenfield init（5 分钟）就停下，不做任何 cell 化
- 中等工程可以 cell 化 2-3 个核心组件就够用
- 重型工程（如 iavis）才完整 cell 化

cell 数量是连续刻度，不是 0 或 1。

### Q13：iavis 的 Windows + PowerShell 怎么办？

短期：iavis 作为 v3 验证标的时，保留其 Windows 路径，scripts 仍是 .ps1。
中期：抽 cross-platform 模板（`java/spring-war` fragment 提供 .sh，iavis 在自己的 project fragment 覆写为 .ps1）。
长期：fragment 支持 `kind: shell` / `kind: powershell` 多种 action 类型，按本地 OS 选择。

这是开放问题 O-8。

---

# 附录

## 附录 A — Fragment Manifest Schema

```yaml
apiVersion: agenthub.io/v1
kind: Fragment
metadata:
  id:          string                # 唯一 id，形如 java/spring-war
  version:     semver                # stack/company 用 semver；project 用 commit-hash 风格
  scope:       company | stack | project
  owner:       string
  description: string
  tags:        [string]
spec:
  requires:
    fragments:
      - { id: string, version: semver-range, optional: bool }
  provides:
    rules:
      - id:    string
        scope: company | stack | project
        type:  static | runtime
        body:  string
    actions:
      - id:      string
        kind:    shell | powershell | node
        path:    string
        inputs:  [{ name, type }]
        outputs: [{ name, type }]
    skills:
      - id:       string
        path:     string                # SKILL.md 路径
        triggers: [string]              # 何时加载
    cells:
      - id:   string
        path: string                    # module.yaml 路径
    contracts:
      - id:     string
        path:   string
        status: draft | stable
status:
  publishedAt: timestamp
  redactedBy:  string
  signature:   string
```

## 附录 B — Cell Schema

```yaml
apiVersion: agenthub.io/v1
kind: Cell
metadata:
  id:    string
  owner: string
spec:
  code:
    paths:     [glob]
    beans:     [string]
    consumers: [string]
    runners:   [string]
  dependencies:
    middleware: [mq | redis | db | ...]
    internal:   [bic | esc | pdms | irds | ...]
  contracts:
    - id: string
  verification:
    required_for:
      <contract-id>: [action-id]
  fixtures: [path]
  failure_patterns:
    - signature: hash
      classify:  string
      occurred:  int
      resolved:  bool
      hint:      string
```

## 附录 C — ChangeProposal Schema

```yaml
apiVersion: agenthub.io/v1
kind: ChangeProposal              # 注意：与 Fragment 平级，不是 Fragment
metadata:
  id:        ts-slug
  author:    string
  createdAt: timestamp
spec:
  contracts:
    - id: <contract-id>
      operations:
        - op:     add | remove | modify
          target: capability | input | output | invariant | failure_policy
          before: string
          after:  string
  rationale: string
  affected_cells:    []           # 自动反查填充
  verification_plan: []           # 自动从 cell.verification.required_for 推导（取并集）
status:
  phase: drafting | injecting | verifying | ready | merged | rejected
  runs:  [run-ref]                # 引用本地 run record，不进 hub
```

ChangeProposal 仅存于 `agent/proposals/`，闭环后归档到 `agent/proposals/archive/`。

## 附录 D — 术语表

| 术语 | 简释 | 章节 |
|---|---|---|
| **Action** | 可执行的验证脚本 | §2.4.4 |
| **AgentHub** | 公司级 Agent 资产中心 | §2.2 |
| **AGENTS.md** | 工程根的人入口文件，10 行内 | §5.2.3 |
| **api-replay** | 一种 action，回放 fixture 调用 API | §2.4.4 |
| **BIC** | 公司基础设施服务（详见附录 E） | 附录 E |
| **brownfield** | 已存在工程接入 harness 的场景 | §4.2 |
| **Cell** | 模块舱，工程组件的全部事实 | §2.4.1 |
| **ChangeProposal** | 变更提案，本地事件，不进 hub | §2.6 |
| **company scope** | fragment 公司级可见性 | §2.7 |
| **Contract** | 长期能力契约（OpenSpec 格式） | §2.4.2 |
| **contribute** | 把本地 fragment 推回 hub 的动词 | §2.8 |
| **detect-context** | 识别工程栈与依赖的过程 | §6.3.1 |
| **draft / stable** | contract 的两种状态 | §2.4.2 |
| **ESC** | 公司事件服务中心（详见附录 E） | 附录 E |
| **failure_patterns** | cell 内沉淀的失败模式列表 | §2.4.1 |
| **fixture** | API/MQ 回放用的样本数据 | §4.3 |
| **Fragment** | hub 上唯一资产类型 | §2.3 |
| **greenfield** | 新建工程从零 harness 化的场景 | §4.1 |
| **harness** | 工程根 `agent/` 目录的全部内容 | §2.1 |
| **iavis** | 公司视觉巡检平台，本设计验证参照 | §1.2, §4.2 |
| **IRDS** | 公司资源数据服务（详见附录 E） | 附录 E |
| **L1/L2/L3** | 三类用户角色 | §3.1 |
| **module.yaml** | cell 的核心定义文件 | §2.4.1 |
| **OpenSpec** | 契约的 schema 格式 | §2.4.2 |
| **PDMS** | 公司设备管理服务（详见附录 E） | 附录 E |
| **propose** | 日常变更入口动词 | §2.9 |
| **project scope** | fragment 项目级可见性 | §2.7 |
| **redact gate** | contribute 必经的脱敏强制门 | §6.3.4 |
| **reference 模式** | sync 别人 fragment 仅作参考的模式 | §4.4 |
| **Rule** | 静态约束 | §2.4.3 |
| **Run** | Action 执行结果，观测产物 | §2.5 |
| **scope** | fragment 的可见性维度 | §2.7 |
| **Skill** | 可加载 prompt + 触发策略 | §2.4.5 |
| **stack scope** | fragment 栈级可见性 | §2.7 |
| **sync / apply / verify** | 三个动词，见各章节 | §2.8 |
| **verification matrix** | cell 内 contract→action 的映射 | §2.4.1 |

## 附录 E — 公司内部组件简表

| 组件 | 全称/角色 | 在 harness 里的处理 |
|---|---|---|
| **BIC** | 基础设施服务（Basic Infrastructure Center），提供配置中心、注册、鉴权 | 由 `company/internal-libs` fragment 提供初始化模板和失败策略 rule |
| **ESC** | 事件服务中心（Event Service Center），统一事件总线 | 同上，含 MQ 地址适配规则 |
| **PDMS** | 设备管理服务（Platform Device Management Service） | 同上，含设备 ID 命名规范 |
| **IRDS** | 资源数据服务（Internal Resource Data Service） | 同上 |
| **iavis** | 视觉巡检平台（Intelligent AI Visual Inspection Service），公司内典型重 Java 业务工程 | 作为本设计验证参照与场景 B/C 真实例子 |

---

> **下一步**：本文档作为产品设计稿，等待评审。如需推进实施路径，请新开 `docs/25-enterprise-harness-implementation-plan.md` 单独规划。
