# 企业级 Harness 开发平台 系统级产品设计 v2

> 版本：v2（吸收 v1 评审与目录结构反馈）
> 状态：设计稿，待评审
> 范围：**只服务本公司专属 Java 开发框架**（Spring/Maven，含本司 BIC/ESC/PDMS/IRDS 等内部组件适配）。不追求成为通用平台，不追求跨公司复用。
> 取代：本文取代 `docs/21`、`docs/22`、`docs/23` 与本目录早期 v1 设计稿。
> 关联：`docs/企业agent hub研究报告.md`（产品背景）、iavis-agent-harness（方法论来源与首个验证工程）

---

## 0. 摘要

> 用一个 Claude Code 插件 + 一个 fragment 资产中心 + 一套 OpenSpec 变更驱动循环，让本公司任何 Java 后端微服务都能"一键 harness 化、本地长业务知识、贡献回 hub、按变更自动注入与最小自测"。

整套系统由：

- **唯一资产抽象**：`Fragment`
- **唯一事件抽象**：`ChangeProposal`（不进 hub，存于工程本地，但 schema 与 fragment 平齐）
- **五个资产原语**：cell / contract / rule / action / skill
- **一个观测原语**：run（运行时产出，不是资产）
- **三个 scope**：company / stack / project
- **四个动词 + 一个日常入口**：sync / apply / verify / contribute + propose

构成。所有"插件能力 / skill 分发 / 项目沉淀 / 自动 harness / 持续 harness"都是这套基本结构的不同组合。

> v1 → v2 主要变更：拆开 Fragment 与 Event 两种 kind（解决"唯一资产"与 ChangeProposal 的内在矛盾）；目录结构由 `harness/`+`openspec/`+`.claude/` 收敛到 `agent/`+`.claude/`；Brownfield 升为一等 Phase；Propose loop 显式分内外层；Stack 模板由单体改为可组合；性能与覆盖率目标改为方向性；明确列出未解决的开放问题。

---

## 1. 范围与非目标

### 1.1 在范围内

- 本公司 Java/Spring/Maven 工程（WAR、Spring Boot Jar、Maven 库三类）
- 本公司内部组件适配：BIC、ESC、PDMS、IRDS、版本适配 Bean、MQ/Redis/DB 主从等
- Claude Code 作为首个 Agent 工具（其他 Agent 工具留 hook，不在 v2 实现）

### 1.2 不在范围内（明确不做）

- 跨公司通用平台
- 非 Java 栈（前端、Python、Go）—— 留接口，不投入
- 多 Agent 工具支持 —— 留 `.claude/` 同级 `.codex/` 等扩展位，不实现
- 复杂检索/RAG —— v2 用栈+tag 简单匹配
- 高级冲突合并 —— v2 用 last-write-wins + 显式锁

明确画出非目标的目的：**让 v2 的实现复杂度可控**。这些项不是永久放弃，是 v2 不做。

---

## 2. 用户与场景

| 用户 | 角色 | 主要行为 |
|---|---|---|
| **L1** | 单微服务开发者 | 日常用 propose loop 改业务，跑 verify |
| **L2** | 微服务负责人 / Tech Lead | 把本服务 harness contribute 回 hub，维护 contract 稳定性 |
| **L3** | 公司平台团队 | 维护 company / stack scope 的 fragment |

四类核心场景：

- **A. Greenfield**：新工程从零 harness 化
- **B. Brownfield**：已有工程接入 harness（**v2 一等场景，不再是附属**）
- **C. 日常变更**：OpenSpec change-proposal driven loop
- **D. 跨人接手**：拉取已有 project fragment 还原工作环境

---

## 3. 核心抽象

### 3.1 两种 kind

| kind | 含义 | 是否进 hub |
|---|---|---|
| **Fragment** | 资产，长期存在，可版本化、可被引用 | 是 |
| **ChangeProposal** | 事件，描述一次变更，闭环后归档 | 否（仅工程本地） |

> v1 的"唯一资产"在附录 C 自我打破。v2 诚实承认有两种 kind，但只有 fragment 进 hub。这样既保留"hub 上只有一种东西"的简洁，也不强行把变更事件硬塞成资产。

### 3.2 Fragment 内部的五原语 + 一观测原语

| 原语 | 类别 | 含义 |
|---|---|---|
| **Cell** | 资产 | 模块舱：组件代码路径、Bean、Consumer、依赖、验证矩阵、fixture |
| **Contract** | 资产 | 长期能力契约（OpenSpec），与代码解耦 |
| **Rule** | 资产 | 静态约束，三 scope |
| **Action** | 资产 | 可执行验证动作（脚本） |
| **Skill** | 资产 | 可加载的 prompt + 加载策略 |
| **Run** | 观测 | Action 执行的分类化结果（运行时产出，不进 hub） |

**Run 不是资产**——它是观测。失败模式从 run 中**收敛**为 cell 的 `failure_patterns`，那个 patterns 字段才作为 cell 的一部分进 hub。

### 3.3 三 scope

```
company  — 公司级，全员可见。承载脱敏规则、敏感词、合规底线
   ▲
stack    — 栈级，按技术栈可见。承载 java/spring-war、java/spring-boot 等
   ▲
project  — 项目级，按 ACL 可见。承载具体微服务的 cell、contract、failure_pattern
```

### 3.4 Stack 模板可组合（v1 单体修正）

v1 假设一个 `java-spring-war/core` 通吃。现实里 Spring 工程组合多样，所以 v2 把 stack 拆成可组合的小 fragment：

```
java/base              # JDK、Maven、基础工具
java/maven             # Maven 配置、profile、私服
java/spring-boot-2x    # Boot 2.x 启动机制
java/spring-war        # 传统 WAR 部署
java/jdk8 | java/jdk11 # JVM 参数与反射策略
company/internal-libs  # BIC/ESC/PDMS/IRDS 适配
```

`harness init` 时 detect 后返回**组合**而不是单一模板。这才是 fragment DAG 真正发挥作用的地方。

### 3.5 四动词 + 一入口

```
harness sync       从 hub 拉取相关 fragment（含依赖解析）
harness apply      把已 sync 的 fragment 实化到工作区
harness verify     跑 Action，写 Run，分类失败
harness contribute 把本地新增/修改 fragment 回传（脱敏 + ACL 强制门）

harness propose    创建 ChangeProposal，自动注入相关上下文，自动跑内层 verify
```

`propose` 是 L1 日常入口，内部组合 sync + 注入 + verify-inner。

---

## 4. 工程目录约定（v2 核心改动）

### 4.1 顶层只有 3 个 Agent 相关条目

```
<repo>/
├── AGENTS.md                       # 人入口，10 行内
├── agent/                          # 工具无关的全部知识资产
└── .claude/                        # Claude Code 工具适配（实化产物）
```

切分轴线：**知识（工具无关） vs 工具适配（厂商专属） vs 人入口**。三者职责互不重叠。

### 4.2 agent/ 内部布局

```
agent/
├── manifest.yaml          # 引用了哪些 fragment + 版本
├── cells/                 # 模块舱（"这个服务由什么组成"）
│   └── <name>/
│       ├── module.yaml
│       ├── context.md
│       └── fixtures/
├── specs/                 # OpenSpec 稳定契约（"必须做到什么"）
├── proposals/             # 变更提案（"正在改什么"，事件流）
├── rules/                 # 静态约束（"代码怎么写"）
│   └── rules.yaml
├── scripts/               # 验证动作（"怎么自测"）
└── runs/                  # 运行记录（"发生过什么"，默认 .gitignore）
```

7 个子目录每个回答一个独立问题，正交不重叠：

| 目录 | 回答 | 对应原语 |
|---|---|---|
| manifest.yaml | 我引用了 hub 上哪些 fragment？ | meta |
| cells/ | 我由什么组件组成？ | Cell |
| specs/ | 我必须做到什么？ | Contract |
| proposals/ | 我正在改什么？ | ChangeProposal |
| rules/ | 我的代码怎么写？ | Rule |
| scripts/ | 我怎么自测？ | Action |
| runs/ | 我跑过什么？ | Run（观测） |

### 4.3 .claude/ 是实化产物，不是源文件

```
.claude/
├── skills/                # 由 harness apply 从 fragment 实化进来
├── hooks/                 # 同上
└── settings.json          # 由 harness apply 写入
```

**关键观念**：
- `.claude/` 内容**不应被手工编辑作为知识来源**
- 维护者编辑或贡献 fragment，`.claude/` 由 `harness apply` 自动生成
- 加新 Agent 工具 = 加 `.codex/`、`.cursor/` 等同级目录，**不动 agent/**

### 4.4 AGENTS.md 是人入口，不是知识容器

10 行内，只说三件事：
1. 这是什么服务（一句话）
2. agent/ 里有什么（导航）
3. 改东西从哪开始（一般是 `harness propose`）

iavis 现有 AGENTS.md 含工程事实——v2 里这些事实迁移进 `agent/cells/<x>/module.yaml`，AGENTS.md 瘦身回入口。

---

## 5. 五阶段生命周期

### Phase 0 — Discovery（plugin 即 hub）

- 装 plugin → `harness browse` 或对话检索 fragment
- 不预装，按需 sync
- v2 检索：栈 + tag 简单匹配；不做 RAG / 向量检索

### Phase 1A — Greenfield Bootstrap

```bash
$ harness init --stack java-spring-war
```

1. detect 栈
2. 拉取组合后的 stack fragment + company/core + 必要 skill
3. apply 写入 `agent/` 与 `.claude/`
4. **完整约束就绪**，cells/specs 为空

### Phase 1B — Brownfield Onboard（v2 升为一等 Phase）

针对已有 200K 行 Spring 工程：

```bash
$ harness init --stack java-spring-war --brownfield
```

1. detect 栈
2. 拉 stack + company fragment（同 Greenfield）
3. **不覆盖任何源代码**，只新增 `agent/`、`AGENTS.md`、`.claude/`
4. 跑 `harness scan-modules` —— 扫描 Maven module 与 Spring 组件，**生成 cell 候选清单**（不自动定 cell）
5. 由 L2 逐步选定优先 cell（不要求一次全 harness 化）
6. 第 N 个 cell 化时，可以只填 `module.yaml` 的最小字段（路径、几个 Bean），其它字段后续补

**关键承诺**：
- 非破坏性（不改源代码）
- 渐进式（按需 cell 化，不要求一次性）
- 与现有 Maven module 边界对齐为默认（特殊情况另说）

### Phase 2 — 项目自迭代

- L1/L2/Agent 在 harness 约束下填充 cells、写 contracts、跑 verify
- 这阶段所有 fragment 都是 **draft / 本地状态**，不上传

### Phase 3 — Contribute

```bash
$ harness contribute --scope project
```

- L2 触发，redact gate + ACL 强制
- 推到 hub，绑版本

### Phase 4 — Spec-Driven Change Loop（日常）★

下一节单独展开。

### Phase 5 — 跨人接手

```
session start (hook):
  harness sync       拉 fragment 增量
  load-cell-context  按修改文件定位 cell

on edit:
  静态 rule 即时校验

session end (hook):
  harness verify <minimal-set>
  若新失败模式 → harness contribute（仅当 cell/contract/pattern 真有变化）
```

---

## 6. Spec-Driven Change Loop（核心日常机制）

### 6.1 设计要点

> **每次改动从一份 ChangeProposal 开始，proposal 是触发器，driving 后续的上下文注入和分层自测。**

### 6.2 内外双层 verify（v1 的"自动跑 verify"修正）

v1 把 propose 描述成"自动注入 + 自动跑最小自测 → 通过则升级"，听起来秒级。但真实 Spring verify 链：

- static (~30s) + compile (~2 分钟) + package (~1 分钟) + startup (~3-5 分钟)
- = **每轮 5-10 分钟起步**

v2 显式分两层：

| 层 | 时长 | 内容 | 触发 |
|---|---|---|---|
| **内层（秒级）** | 几秒 | 静态 rule 校验、spec 一致性、contract↔cell 反查、影响域计算 | propose 创建即自动 |
| **外层（分钟级）** | 几分钟到 10 分钟 | compile + package + startup + api-replay 子集 | 显式 `harness verify --full` 或 PR pre-merge hook |

**propose loop 的"自动"指内层。外层是异步或显式触发，体感不会卡。**

### 6.3 触发流程

```
开发者：harness propose "为 ped-event-receive 增加视频流附加字段"
                       │
                       ▼
plugin 创建 agent/proposals/<ts>-<slug>.yaml
                       │
                       ▼
内层（秒级）：
  1. 解析 proposal 涉及的 contract id
  2. contract → cell 反查（启动期建立的索引）
  3. 注入：相关 cell.module.yaml + 关联 rule + 历史 failure_patterns
  4. 跑 static + spec 一致性 → 即时反馈
                       │
                       ▼
            Agent 在已注入上下文下改代码
                       │
                       ▼
外层（分钟级，显式触发）：
  按 cell.verification.required_for 推导最小验证集，跑 verify
                       │
              ┌────────┴────────┐
              ▼                 ▼
         verify 通过        verify 失败
              │                 │
              ▼                 ▼
   proposal ready          分类、写 run record
   contract draft→stable   回到 Agent 修
              │
              ▼
   若产生新 failure_pattern → 候选回传
```

### 6.4 五个关键设计

| 设计 | 说明 |
|---|---|
| ChangeProposal 是一等公民 | 带结构的 spec diff：`+` 新行为、`-` 废弃、`±` 修改，引用具体 contract id |
| contract↔cell 双向索引 | cell 声明引用哪些 contract；plugin session 启动时构建反向索引（v2 内存 + 文件缓存，不持久化到 hub） |
| 注入基于 proposal 不是基于文件 | 比"改文件就加载该 cell"精准一个数量级 |
| 自测范围基于 proposal | 取多 contract 涉及 cell 的 `verification.required_for` 并集（v2 用并集，不做更复杂最小化） |
| proposal 落地才升级 contract | 外层 verify 通过 + 人工确认 → contract 从 draft 进 stable |

### 6.5 v2 简化

- "最小验证集"v2 用**并集**算法，不追求理论最小，避免过度设计
- contract↔cell 索引只在 session 内存 + 本地缓存文件，不向 hub 同步
- Discovery 用栈 + tag，不做语义检索

---

## 7. 系统架构

### 7.1 四个组件

```
开发者侧（Claude Code IDE）
├── Claude Code Plugin (agenthub-harness-plugin)
│   ├── 命令：sync / apply / verify / contribute / propose / browse / init
│   ├── skills：harnessify-cell / load-cell-context / spec-driven-change /
│   │           redact-secrets / scan-modules
│   └── hooks：session-start / session-end / pre-edit
└── AgentHub CLI（已存在，复用）

平台侧（AgentHub Server）
├── Fragment Registry
│   ├── GET  /api/v1/fragments?context=<json>&scope=<scope>
│   ├── POST /api/v1/fragments
│   └── 版本 / ACL / 简单检索（栈+tag）/ 依赖解析
├── Redact Gate（脱敏强制门）
└── Audit Log

工程目录（本地物化）
└── AGENTS.md + agent/ + .claude/
```

### 7.2 平台接口（极简）

```
GET  /api/v1/fragments?context=<json>&scope=<scope>     # 检索（含依赖解析）
POST /api/v1/fragments                                  # 提交（强制过 redact gate）
GET  /api/v1/fragments/<id>/versions
GET  /api/v1/fragments/<id>?version=<v>
```

原 `profile / install-plan` 等接口全部退化为 `GET /fragments` 的检索特例。

---

## 8. 治理与边界

### 8.1 红线（v2 已锁定）

| 边界 | 含义 |
|---|---|
| Fragment 是 hub 上唯一资产类型 | ChangeProposal 不上 hub |
| Scope 决定可见性，不决定结构 | company/stack/project 结构相同，可互相 require |
| redact-secrets 是硬门 | 不通过的 fragment 直接拒收 |
| Contract 必须人工确认才升级 | 自动生成只进 `agent/proposals/`，确认后才进 `agent/specs/` |
| Run 默认本地，pattern 收敛后才回传 | pattern 收敛标准在 v2 实现时给出 |
| Plugin 不藏业务知识 | plugin 只懂 fragment / 原语 / 动词 |
| 第一次 harness 化必须显式触发 | 后续 sync / load-cell-context 可自动 |
| 敏感配置不入 context / contract / run | 密码 / token / 完整 JDBC URL / signed URL |
| `agent/` 工具无关 | 不出现 Claude / Codex / Cursor 字样 |
| `.claude/` 不写源知识 | 只放 skill / hook / settings |
| AGENTS.md 不超过半屏 | 长了说明该进 cells 或 specs |

### 8.2 已知开放问题（v2 不强行解决）

> 评审中识别但 v2 不投入设计的问题。明确列出，不假装已解决。

| # | 问题 | v2 临时策略 | 后续何时定 |
|---|---|---|---|
| O-1 | hub 发布的审批流（谁能 publish 到 company/stack） | v2 仅 redact gate + ACL，**审批靠人协议**（Tech Lead 评审 PR 后才 push） | 投入第二批用户后定 |
| O-2 | 同 cell 并发 contribute 冲突 | v2 last-write-wins + version 戳警告 | 出现真实冲突 ≥ 3 次后再设计 |
| O-3 | redact gate 误报申诉 | v2 提供 `--override` 标志 + 必填 reason，写入审计日志 | 第一次出现真实误报后定 |
| O-4 | 激励设计（为什么 L2 会贡献） | v2 不在产品内解决，**作为组织协议**：纳入团队 OKR / PR 模板必引用 proposal | 由组织而非 plugin 解决 |
| O-5 | Discovery 检索质量 | v2 用栈 + tag 匹配，不做 RAG | fragment 数量超过 ~200 时再做语义检索 |
| O-6 | failure_pattern 收敛标准 | v2 简单规则：同 hash signature ≥ 3 次且至少修复过一次 | 实施时观察真实数据再调 |
| O-7 | Claude Code hook 实际表面 | v2 假设 session-start/end + pre-edit 可用，**W1 立即对照实际 API 校验** | W1 校验后调整 |
| O-8 | iavis 的 PowerShell scripts 跨平台化 | v2 不强求，**iavis 作为 W3 验证时保留 Windows 路径**；后续再做 cross-platform | W3 后定优先级 |
| O-9 | monorepo 场景 | v2 默认 `agent/` 在 service 子目录；monorepo 根的协议留空 | 出现第一个 monorepo 用户后定 |
| O-10 | fragment schema 演进兼容 | v2 fragment manifest 显式 apiVersion；plugin 启动校验；不兼容时报错而非自动迁移 | 第一次 break change 时定迁移协议 |

**指导思想**：先把核心 loop 跑通，让产品在真实场景里产生数据，再用数据驱动这些开放问题的解决，而不是预先设计完美。

### 8.3 v2 度量（去掉虚高数字，改方向性）

| 维度 | 方向性指标 |
|---|---|
| Bootstrap | Greenfield 与 Brownfield 各跑通端到端，时间能可重复 |
| 接手速度 | 拿到一个已 contribute 的 project fragment，能在新 worktree 还原并改一次代码 |
| Loop 实用性 | 内层 propose 反馈 ≤ 30s；外层 verify 用户接受度（主观访谈） |
| Hub 健康度 | fragment 数、每周新增、被引用次数（Top N） |
| Contribute 闭环 | 提交一次通过率（redact + ACL + schema），失败原因分类统计 |

明确放弃 v1 的 "<30 分钟"、"<5% token"、">95% 自测覆盖率" 等无验证路径的目标。

---

## 9. 与现有资产的关系

| 现有 | 处置 |
|---|---|
| `agenthub-connector-plugin` | **重写**为 4 动词 + propose |
| `docs/21、22、23` | **合并**进本文档，原文标注 superseded |
| iavis 现有 harness | **打包**成首批 project fragment：`project/iavis/{event,patrol,sync,...}`，作为 W3 验证标的 |
| 现有 AgentHub 平台接口（profile/install-plan） | **退化**为 `GET /fragments` 的检索特例 |
| 现有 3 个 skill（connect / discover / install） | **重做**为 fragment 形态发布的 skill |
| iavis `harness/` + `openspec/` 双目录 | **合并**为 `agent/` 单目录（W3 迁移） |

---

## 10. 演进路径（5 周）

| 周 | 产出 | 验证目标 |
|---|---|---|
| **W1** | fragment + ChangeProposal schema；AgentHub fragment CRUD + scope/ACL + redact gate；Claude Code hook 表面对照 | 接口可手动 POST/GET 一份 minimal fragment |
| **W2** | plugin 4 动词重写；`harness init`（含 `--brownfield`）；空 Java 工程跑通 | 新建 Java 工程 init→sync→apply 产出完整 `agent/` 骨架 |
| **W3** | iavis 打包为 project fragment 推 hub；另一 worktree 还原；contribute 闭环 | 跨 worktree 还原 iavis 完整 harness，verify 全通过 |
| **W4** ★ | `harness propose` + contract↔cell 反向索引 + 内外层 verify 分层 | iavis 上做一次真实 spec 变更，注入精确，内层 ≤30s，外层最小子集运行通过 |
| **W5** | session hook 接入；W1 hook 实际能力的最终调整；端到端 demo | 完整 Phase 4 loop 自动化，无需手动触发 |

---

## 11. 一句话定义这套系统

> **plugin 让本公司每个 Java 后端开发者打开 Claude Code 就站在公司 harness hub 前；新工程一键拉栈组合开始长自己的 cells；老工程渐进式 cell 化，不破坏现有代码；长稳了回贡 hub；之后每次改动以 ChangeProposal 开始，自动定位影响 cell、注入上下文、内层秒级反馈、外层分钟级最小自测、通过则升级契约——这是日常 loop。**

---

## 附录 A — Fragment Manifest Schema 草案

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
      - { id: string, version: semver-range }
  provides:
    rules:     [...]
    actions:   [...]
    skills:    [...]
    cells:     [...]
    contracts: [...]
status:
  publishedAt: timestamp
  redactedBy:  string
  signature:   string
```

## 附录 B — Cell（module.yaml）Schema 草案

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
    internal:   [bic | esc | pdms | ...]
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

## 附录 C — ChangeProposal Schema 草案

```yaml
apiVersion: agenthub.io/v1
kind: ChangeProposal                 # 注意：与 Fragment 平级，不是 Fragment
metadata:
  id:        ts-slug
  author:    string
  createdAt: timestamp
spec:
  contracts:
    - id: <contract-id>
      operations:
        - op:     add | remove | modify
          target: behavior | input | output | invariant
          before: string
          after:  string
  rationale:         string
  affected_cells:    []              # 自动反查填充
  verification_plan: []              # 自动从 cell.verification.required_for 推导（取并集）
status:
  phase: drafting | injecting | verifying | ready | merged | rejected
  runs:  [run-ref]                   # 引用本地 run record，不进 hub
```

ChangeProposal 仅存于 `agent/proposals/`，闭环后归档到 `agent/proposals/archive/`。

---

> **下一步交付**：
> 1. 与 Tech Lead 评审本设计 → 锚定边界与开放问题
> 2. W1 启动：fragment schema 实现 + AgentHub 平台改造 + Claude Code hook 实际表面校验
> 3. 同步重写 plugin 为 4 动词 + propose
