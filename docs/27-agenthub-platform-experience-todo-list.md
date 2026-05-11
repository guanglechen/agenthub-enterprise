# AgentHub 平台入口与交互优化 Todo List

本文档用于跟踪本轮平台体验改造。任务优先级按用户确认顺序执行：`1 -> 3 -> 4 -> 2`。

## P0. 执行规则

- 不改变 AgentHub 的主模型：平台仍是 Skill 市场，`skill package` 仍是发布、安装、版本和下载的权威单元。
- 不把 Claude Code marketplace 变成平台主市场，只作为 Claude Code 插件兼容分发出口。
- 不恢复复杂审核流程，继续保持快速积累资产的策略。
- 所有新增入口必须支持人类用户和 AI Agent 同时理解。
- 所有任务完成后必须经过本地验证循环，直到验收脚本、前端检查、后端检查、容器部署和浏览器验证全部通过。

## P1. 主入口 Agent 可发现能力

目标：用户只把平台根地址发给 AI Agent 时，Agent 能快速判断平台用途、发现机器入口、安装 CLI/插件，并开始搜索、安装或发布 Skill。

### Todo

- [x] 增加 `/llms.txt`，作为通用 AI Agent 的文本入口索引。
- [x] 增加 `/.well-known/agenthub.json`，作为结构化平台发现入口。
- [x] 在 `/registry/skill.md` 顶部增加“只拿到平台地址时该怎么做”的 Agent 指令。
- [x] 在前端主入口页面显性展示 Agent 入口，包括 `/llms.txt`、`/registry/skill.md`、`/api/v1/agent/profile`、`/registry/claude-marketplace.json`。
- [x] 在 Agent profile 中补充 `/llms.txt` 和 `/.well-known/agenthub.json` 两个推荐入口。

### 验收标准

- 访问 `/llms.txt` 返回 200，内容包含平台用途、CLI 安装、Agent profile、install-plan、Claude marketplace、token 规则。
- 访问 `/.well-known/agenthub.json` 返回 200，JSON 中包含 `platformName`、`purpose`、`endpoints.registryDoc`、`endpoints.agentProfile`、`cli.install`、`agentInstructions`。
- 访问 `/registry/skill.md` 能看到“Only have the base URL?” 或等价的 Agent 指令。
- 首页或 Dashboard/Search 页面能直接看到“AI Agent 入口”并能复制/打开关键入口。
- `curl` 与浏览器均可验证上述入口。

## P2. 平台内容体系优化

目标：平台已有插件、Skill、开发基础知识、产品知识、业务知识、开发辅助工具等资产，页面需要按“资产族 + 使用场景”组织，而不是只靠单一技术标签。

### Todo

- [x] 新增前端资产族定义，覆盖插件、Agent Skill、开发基础知识、产品知识、业务知识、开发辅助工具、Harness Package、平台集成。
- [x] 在技能广场顶部增加“按资产族/场景发现”的快捷入口。
- [x] 在 Dashboard 增加资产族说明，帮助人和 Agent 判断该先看哪类资产。
- [x] 在 `/registry/skill.md` 增加资产族说明，让 Agent 知道如何按场景搜索。
- [x] 保持底层搜索参数兼容，资产族入口只组合现有 `assetType/stage/topology/stack/q/label`，不新增破坏性 API。

### 验收标准

- 技能广场页面展示至少 8 类资产族。
- 每个资产族都有明确说明和可点击搜索入口。
- Dashboard 页面能说明插件、Skill、知识、工具、Harness 的关系。
- `/registry/skill.md` 包含资产族搜索建议。
- 旧搜索筛选仍可使用，现有搜索测试不破坏。

## P3. 企业品牌与海康威视元素

目标：平台视觉不再只有通用 AgentHub/SkillHub 叙事，默认体现海康威视内部研发资产平台，同时保持私有化部署可配置。

### Todo

- [x] 增加品牌运行时配置：品牌名、组织名、Logo URL、标语、主色、辅助色。
- [x] 增加统一 BrandMark 组件，替换主要导航、侧边栏和页脚中的散落文本 Logo。
- [x] 默认品牌文案体现“海康威视内部研发资产平台 / HIKVISION AgentHub”。
- [x] 保留没有 Logo URL 时的文本 Logo 降级展示。
- [x] 在部署文档或 Registry Guide 中说明品牌可配置项。

### 验收标准

- 页面顶部、侧边栏或页脚至少两处出现海康威视/HIKVISION 企业元素。
- 未配置外部 Logo 时页面仍正常显示文本品牌。
- `runtime-config.js` 包含品牌配置字段，Docker entrypoint 能从环境变量注入。
- 前端 typecheck/build 通过。

## P4. AI 交互评审文档

目标：输出一份可交给 AI 设计/产品评审 Agent 的文档，让它基于当前平台页面、内容体系和 Agent 使用路径评审并提出优化建议。

### Todo

- [x] 新增 `docs/28-agenthub-ai-interaction-review-brief.md`。
- [x] 文档包含平台定位、当前页面信息架构、关键用户路径、AI Agent 路径、内容资产体系、品牌要求、评审维度和输出格式。
- [x] 明确评审顺序：先评入口可理解性，再评资产分类，再评页面交互，再评视觉品牌。
- [x] 给出可直接复制给 AI 评审 Agent 的 Prompt。
- [x] 列出需要截图或浏览器检查的页面清单。

### 验收标准

- 文档存在且包含“评审 Prompt”章节。
- 文档明确当前平台不是公开开源市场，而是企业内部 Skill/Agent 资产市场。
- 文档覆盖插件、Skill、知识类资产、工具类资产、Harness Package。
- 文档明确海康威视/HIKVISION 品牌要求。

## P5. 验证循环

目标：持续执行验证，直到所有任务通过。

### Todo

- [x] 新增 `scripts/agenthub-platform-experience-validation.sh`。
- [x] 脚本检查 P1/P2/P3/P4 的关键文件、关键文本和 JSON 可解析性。
- [x] 本地运行前端 `typecheck`、`test`、`build`。
- [x] 本地运行后端相关测试。
- [x] 构建并启动 Docker staging 服务。
- [x] 用 `curl` 和浏览器验证主入口、Agent 文档、marketplace、首页无 console error。

### 验收标准

- `bash scripts/agenthub-platform-experience-validation.sh http://localhost` 通过。
- `cd web && pnpm run typecheck` 通过。
- `cd web && pnpm test -- --run` 通过。
- `cd web && pnpm run build` 通过。
- `cd server && ./mvnw -pl skillhub-app -am test` 或等效 Docker Maven 测试通过。
- Docker staging `server`、`web` 健康。
- 浏览器打开 `http://localhost/`、`/llms.txt`、`/.well-known/agenthub.json`、`/registry/skill.md`、`/registry/claude-marketplace.json` 无关键错误。
