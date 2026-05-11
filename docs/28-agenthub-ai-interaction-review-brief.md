# AgentHub AI 交互评审 Brief

本文档用于交给 AI 产品/交互/视觉评审 Agent，对当前 AgentHub Enterprise 平台进行系统化评审并输出优化建议。

## 1. 平台定位

AgentHub Enterprise 是企业内部 Skill / Agent 资产市场，不是公开开源社区市场。

当前平台主线：

- `skill package` 是发布、安装、下载、版本管理的权威单元。
- `catalogProfile` 是企业目录画像，用于业务域、阶段、拓扑、技术栈和维护模式展示。
- `agenthub-cli` 是人和 AI Agent 的主要自动化入口。
- `/registry/skill.md`、`/llms.txt`、`/.well-known/agenthub.json`、`/api/v1/agent/profile` 是 Agent onboarding 入口。
- `/registry/claude-marketplace.json` 是 Claude Code 插件市场兼容入口，不替代 AgentHub Skill 市场。

## 2. 当前页面信息架构

需要评审的页面：

- `/`：根据登录状态进入 Dashboard 或技能广场。
- `/search`：技能广场，按资产类型、阶段、拓扑、业务域、技术栈、标签筛选。
- `/dashboard`：企业工作台，包含 Agent 入口、资产族、推荐基线、团队空间和操作入口。
- `/dashboard/tokens`：Token 与 CLI onboarding。
- `/dashboard/publish`：发布 Skill，维护目录画像、标签和关系。
- `/space/{namespace}`：团队能力目录。
- `/space/{namespace}/{slug}`：Skill 详情、资产画像、关联能力、推荐能力。
- `/registry/skill.md`：机器可读平台说明。
- `/llms.txt`：AI Agent 根入口。
- `/.well-known/agenthub.json`：结构化平台发现入口。

## 3. 用户路径

### 人类用户路径

1. 打开平台。
2. 理解这是海康威视内部研发资产分发平台。
3. 进入技能广场，按资产族或筛选条件查找资产。
4. 打开详情页，确认资产画像、适用阶段、技术栈、关系和推荐。
5. 复制安装命令或通过 CLI 安装。
6. 需要维护资产时进入发布中心。

### AI Agent 路径

1. 用户只提供平台 base URL。
2. Agent 读取 `/llms.txt`。
3. Agent 读取 `/.well-known/agenthub.json`。
4. Agent 安装 `agenthub-cli`。
5. Agent 调用 `agenthub-cli agent profile --json`。
6. Agent 根据当前工程上下文调用 `agenthub-cli agent install-plan --json`。
7. Agent 安装推荐 Skill，必要时维护 catalog、labels、relations。
8. 如需写操作，Agent 向用户请求 `AGENTHUB_TOKEN`，不自动申请 token。

## 4. 资产内容体系

评审时不要只看 `assetType`，需要同时看“资产族 + 使用场景”。

资产族：

- `Claude / Agent 插件`：连接 AgentHub、调用 CLI、执行安装计划。
- `Agent Skill`：安装到 Claude/Codex 工作区的具体操作能力。
- `开发基础知识`：编码规范、框架实践、工程约束、测试和发布基线。
- `产品知识`：产品方案、功能模块、用户场景和产品交付资产。
- `业务知识`：行业术语、业务规则、领域流程和业务能力。
- `开发辅助工具`：脚手架、生成器、检查工具、批量维护工具。
- `Harness Package`：Java 微服务工程知识包。
- `平台集成`：CI/CD、Git、制品库、监控、部署平台和企业基础设施集成。

评审重点：

- 页面是否让用户快速知道“我该找哪类资产”。
- 页面是否让 Agent 快速知道“我该安装哪些 Skill”。
- 卡片是否同时表达标题、资产族、业务域、阶段、技术栈、维护团队、复用信号。
- 推荐区是否围绕场景，而不是只展示热门/最新。

## 5. 品牌与视觉要求

默认品牌方向：

- 品牌：`HIKVISION AgentHub`
- 组织：`海康威视`
- 平台定位：`海康威视内部研发资产分发平台`
- 视觉基调：企业研发、可信、资产治理、Agent 自动化。

评审重点：

- 是否能一眼看出这是企业内部平台。
- 是否能看出海康威视归属。
- 是否避免“开源社区市场”或“通用插件仓库”的误解。
- 是否在不提供官方 Logo 文件时仍能有稳定品牌露出。

## 6. 评审维度

请按以下顺序评审：

1. Agent 可理解性：只给 base URL，Agent 是否知道从哪里开始。
2. 信息架构：插件、Skill、知识、工具、Harness 是否组织清楚。
3. 核心任务流：搜索、安装、发布、维护、推荐是否顺畅。
4. 页面层级：标题、摘要、筛选、卡片、推荐区是否有优先级。
5. 品牌表达：海康威视内部平台感是否明显。
6. 视觉一致性：导航、卡片、徽标、颜色和空状态是否统一。
7. 可落地性：建议是否能在当前 React/Spring/Docker 架构上分阶段实现。

## 7. 评审 Prompt

```text
你是企业研发平台的产品交互评审 Agent。请基于以下上下文评审 AgentHub Enterprise：

平台定位：
- AgentHub Enterprise 是海康威视内部 Skill / Agent 资产市场。
- Skill package 是发布、安装、下载、版本管理的权威单元。
- catalogProfile 是企业目录画像。
- agenthub-cli 是主要机器接口。
- Claude Code marketplace 只是插件兼容出口，不替代 Skill 市场。

请评审这些页面：
- /
- /search
- /dashboard
- /dashboard/tokens
- /dashboard/publish
- /space/{namespace}
- /space/{namespace}/{slug}
- /registry/skill.md
- /llms.txt
- /.well-known/agenthub.json

请按以下顺序输出：
1. 当前最影响 Agent 理解和接入的问题。
2. 当前最影响人类用户查找资产的问题。
3. 插件、Skill、开发知识、产品知识、业务知识、工具、Harness、平台集成的分类优化建议。
4. 页面导航与信息架构优化建议。
5. Skill 卡片和详情页信息层级优化建议。
6. 海康威视品牌和企业内部平台感优化建议。
7. 可分阶段落地计划，按 P0/P1/P2 标注。

输出要求：
- 每条建议必须说明目标、改动点、受影响页面、验收标准。
- 不要建议替换 Skill 市场主模型。
- 不要建议先上复杂审批/权限体系。
- 不要泛泛而谈，要给具体页面和组件层面的建议。
```

## 8. 截图清单

建议交给评审 Agent 的截图：

- Dashboard 首屏。
- Dashboard 的 AI Agent 入口区。
- Dashboard 的资产族区。
- 技能广场首屏。
- 技能广场筛选区和资产族区。
- Skill 卡片列表。
- Skill 详情页资产画像。
- Token/CLI onboarding 区。
- `/registry/skill.md` 文本入口。
- `/llms.txt` 文本入口。

## 9. 期望输出物

评审 Agent 应输出：

- 页面问题清单。
- 资产体系优化建议。
- 页面 IA 草图。
- 卡片字段优先级。
- 详情页字段优先级。
- Agent onboarding 交互优化建议。
- 海康威视品牌露出建议。
- 可落地的迭代计划和验收标准。
