# AgentHub Enterprise 全局说明

这份 `agent.md` 是当前仓库的全局入口文档，面向两类读者：

- 进入仓库后需要快速理解项目全貌的 AI Agent
- 需要判断“当前项目已经做到哪里、下一步该从哪里接手”的研发同学

它不替代详细设计文档，而是把当前项目的产品定位、模块结构、关键流程、Agent 接入面和当前实现边界集中总结在一处。

如果你是要直接执行任务的 Claude / Codex Agent，请优先再读仓库根目录的 `AGENTS.md`；那份文档更偏执行约定、验证路径和边界约束。

## 1. 项目现在是什么

`AgentHub Enterprise` 当前已经不是早期“通用开源 Skill Hub”的叙事，而是一个面向企业研发团队的 **AI 开发资产中心 / Agent Hub**。

它的核心目标是：

- 让团队把产品方案、开发脚手架、业务能力、微服务 Skill、质量治理能力、平台集成能力沉淀到统一平台
- 让人和 Agent 都能基于统一目录完成搜索、安装、上传、关联、推荐和自动化分发
- 保留 `skill package` 作为权威发布单元，同时在其上叠加企业研发语义

一句话概括：

> 这是一个面向企业研发场景的私有化 Skill Registry + Agent 资产目录 + 自动化接入平台。

## 2. 当前产品定位

当前项目的一期定位已经收敛为下面几个原则：

- `skill` 仍然是权威安装、发布、版本管理单元
- 企业侧通过 `catalogProfile` 这层目录画像表达业务语义，而不是新造一套完全脱离 skill 的资产模型
- 平台面向企业内部研发，不再以公共开源技能市场为主叙事
- Agent 的正式消费入口目前是 `CLI-first`
- Claude Code 插件先走 **本地 path plugin** 方式验证，再考虑回传平台做正式 marketplace 分发

当前平台主要围绕六类资产组织内容：

- `product`
- `scaffold`
- `business`
- `microservice`
- `quality`
- `integration`

## 3. 当前已经落地的核心能力

### 3.1 企业目录层

在 skill 之上，已经落地企业目录画像能力，核心字段包括：

- `assetType`
- `domain`
- `stage`
- `topology`
- `stack`
- `ownerTeam`
- `keywords`
- `maintenanceMode`
- `relations`

其中 `relations` 支持：

- `dependsOn`
- `recommendedWith`
- `partOf`
- `forService`

这部分能力已经贯通：

- 搜索筛选
- 详情页资产画像
- 关联能力展示
- 可解释推荐
- CLI 的 catalog / relations 操作

### 3.2 Agent 平台入口

平台现在已经提供 Agent onboarding 所需的两个核心接口：

- `GET /api/v1/agent/profile`
- `POST /api/v1/agent/install-plan`

它们分别负责：

- 告诉 Agent “这个平台是干什么的”
- 根据当前项目上下文，告诉 Agent “现在该装哪些 skill”

### 3.3 CLI

当前仓库已经有企业自用的 `agenthub-cli`，位置在：

- `packages/agenthub-cli`
- `bin/agenthub-cli`

当前 CLI 已支持的主要能力：

- `login`
- `whoami`
- `search`
- `inspect`
- `download`
- `install`
- `publish`
- `catalog get/set`
- `labels list/add/remove`
- `relations get/sync`
- `recommend`
- `agent profile`
- `agent install-plan`

当前平台同时提供可分发的 npm tarball：

- `web/public/downloads/agenthub-cli-0.1.1.tgz`

当前 CLI 已改为纯 Node 依赖，不再依赖 Python 解压，更适合 Claude Code 在 Windows + Node 环境下直接使用。

### 3.4 本地 Claude Code 插件 MVP

当前仓库已经实现了一版本地 Claude Code connector plugin，位置在：

- `plugins/agenthub-connector-plugin`

这版插件已经能跑通最小闭环：

1. 读取平台 profile
2. 识别本地 workspace 上下文
3. 请求 install plan
4. 安装 required skills 到 `.claude/skills`

当前插件不是正式 marketplace 发布版，而是 **本地 path plugin MVP**。

### 3.5 私有化部署与内网接入

当前已经补齐了内网私有化部署说明、源码构建说明、Agent 接入说明，关键文档在：

- `docs/22-enterprise-private-deployment-playbook.md`
- `docs/21-local-claude-plugin-connector.md`
- `docs/23-agenthub-cli-and-agent-onboarding.md`

## 4. 当前仓库结构

项目是模块化单体，不是微服务拆分。

### 4.1 后端

后端位于 `server/`：

- `skillhub-app`
  - Spring Boot 启动、Controller 聚合、应用层装配
- `skillhub-domain`
  - 核心领域模型、发布流程、命名空间、目录画像、推荐等业务逻辑
- `skillhub-auth`
  - 认证、授权、会话、open-access 模式
- `skillhub-search`
  - 搜索 SPI 和 PostgreSQL 全文搜索实现
- `skillhub-storage`
  - LocalFile / S3 / MinIO 存储抽象
- `skillhub-infra`
  - JPA、基础设施、通用工具

主启动入口：

- `server/skillhub-app/src/main/java/com/iflytek/skillhub/SkillhubApplication.java`

### 4.2 前端

前端位于 `web/`，技术栈是：

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS

当前前端已经完成企业 Agent Hub 的工作台、技能广场、详情页、发布页、onboarding 区块和企业化筛选交互。

### 4.3 插件与 CLI

- `packages/agenthub-cli`
  - npm package 形态的 CLI
- `plugins/agenthub-connector-plugin`
  - 本地 Claude Code connector plugin
- `web/public/downloads/`
  - Web 分发用的 CLI tarball

### 4.4 文档

建议优先阅读这些文档：

- `README_zh.md`
- `docs/00-product-direction.md`
- `docs/01-system-architecture.md`
- `docs/07-skill-protocol.md`
- `docs/21-local-claude-plugin-connector.md`
- `docs/22-enterprise-private-deployment-playbook.md`
- `docs/23-agenthub-cli-and-agent-onboarding.md`
- `docs/企业agent hub研究报告.md`

## 5. 当前核心业务设计

### 5.1 权威发布单元

当前系统仍以 `skill package` 为权威发布单元。

也就是说：

- 上传的是 skill 包
- 版本管理的是 skill 版本
- 下载和安装的也是 skill 包
- 企业目录画像是“叠加层”，不是替代层

### 5.2 名称和坐标

当前 skill 统一使用 namespace 坐标：

- `@namespace/skill-slug`

兼容层里保留 canonical slug 映射，用于对接旧客户端或兼容接口。

### 5.3 搜索与推荐

搜索不再只是标题和下载量，而是面向企业开发资产的组合检索：

- 标题
- 资产类型
- 业务域
- 研发阶段
- 技术拓扑
- 技术栈
- 标签
- 关键词
- 关联关系

推荐当前采用“规则 + 关系 + 使用信号”的方式，而不是纯 LLM 黑盒推荐。

### 5.4 发布与审核

当前设计已经调整为：

- 默认关闭 skill 审核
- 普通用户和 CI 可直接批量发布
- 如果名称冲突，直接改名重传

对应配置：

- `skillhub.publish.review-required=false`

这意味着当前平台优先满足“快速沉淀大量 skill”，而不是“强审核治理”。

如果后面需要恢复审核，只需重新打开这个开关。

### 5.5 认证模式

当前代码同时支持两种模式：

1. 标准认证模式
   - OAuth / API Token / 平台用户体系
2. open-access 模式
   - 临时把平台作为“默认全部可见的分发平台”
   - 请求自动投射为平台默认账号

当前这对内网 PoC 很有用，但不代表长期生产治理模型已经完成。

## 6. Agent 接入面

当前项目给 Agent 的正式接入面，按优先级排序如下。

### 6.1 registry 文档入口

当前平台会提供一份给 Agent 阅读的 registry 说明：

- `web/src/docs/skill.md`

它主要解决：

- 平台是干什么的
- CLI 怎么安装
- Token 怎么传入
- workspace 怎么初始化
- install-plan 怎么调用

### 6.2 CLI

这是当前最重要的 Agent 接入口。

Agent 应该优先使用：

- `agenthub-cli agent profile`
- `agenthub-cli agent install-plan`
- `agenthub-cli search`
- `agenthub-cli install`
- `agenthub-cli publish`

当前的设计原则是：

- Token 由用户显式传给 Agent
- CLI 不负责自动申请 token
- Agent 拿到 token 后，自己完成查 skill、装 skill、传 skill、维护 metadata

### 6.3 本地插件

本地插件主要是把 “profile / detect-context / install-plan / apply-install-plan” 串成一个更贴近 Claude Code 使用习惯的入口。

当前插件内部复用了 CLI，不自己重复实现平台调用逻辑。

## 7. 建议 Agent 如何理解这个仓库

如果一个新的 Agent 进入这个仓库，建议按下面顺序理解：

1. 先读 `README_zh.md`
2. 再读 `docs/00-product-direction.md`
3. 再读 `docs/01-system-architecture.md`
4. 如果任务和 Agent 接入有关，再读：
   - `docs/21-local-claude-plugin-connector.md`
   - `docs/22-enterprise-private-deployment-playbook.md`
   - `docs/23-agenthub-cli-and-agent-onboarding.md`
5. 如果任务和产品路线有关，再读：
   - `docs/企业agent hub研究报告.md`

如果任务是改代码：

- 后端优先看 `server/skillhub-app` 和 `server/skillhub-domain`
- 前端优先看 `web/src/pages`、`web/src/features`
- CLI 看 `packages/agenthub-cli`
- 插件看 `plugins/agenthub-connector-plugin`

## 8. 当前已验证的闭环

当前项目已经至少跑通过下面这些闭环：

- 平台 Docker 部署
- 企业目录画像和筛选搜索
- Skill 上传、catalog 更新、relations 更新
- 推荐接口与可解释推荐
- `agent/profile`
- `agent/install-plan`
- `agenthub-cli` 下载与安装
- 本地 Claude Code 插件读取 profile
- 本地 Claude Code 插件生成 install plan
- 本地 Claude Code 插件安装 skill 到 `.claude/skills`

也就是说，当前项目已经不是概念设计，而是具备了可运行的一期闭环。

## 9. 当前还没有做完的部分

下面这些属于下一阶段：

- 正式 marketplace / plugin source 分发
- `.claude/settings.json` 自动注入
- managed settings / `extraKnownMarketplaces`
- plugin 依赖编排
- repo 自动抽取 Skill Draft 并回传平台
- 更完整的质量门禁闭环
- 更强的企业治理字段与审批流

所以当前最准确的判断是：

> 项目已经完成了“企业 Agent Hub 一期 PoC 和最小可用闭环”，但还没有达到完整企业 Agent 平台的最终形态。

## 10. 当前最重要的几个文件

如果只保留最小阅读集合，优先看这几个：

- `README_zh.md`
- `docs/00-product-direction.md`
- `docs/01-system-architecture.md`
- `docs/21-local-claude-plugin-connector.md`
- `docs/22-enterprise-private-deployment-playbook.md`
- `packages/agenthub-cli/bin/agenthub-cli.mjs`
- `plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs`
- `server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/portal/AgentPlatformController.java`
- `server/skillhub-app/src/main/java/com/iflytek/skillhub/service/AgentPlatformAppService.java`
- `server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/skill/service/SkillPublishService.java`

## 11. 一句话结论

当前 `AgentHub Enterprise` 的本质是：

> 一个以 skill 为权威发布单元、以企业开发资产目录为发现层、以 CLI 和本地 Claude Code 插件为 Agent 接入面的企业私有化 Agent Hub。
