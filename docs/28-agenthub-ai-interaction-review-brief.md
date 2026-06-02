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
8. 如需写操作，Agent 先按 open-access 直接提交；只有服务端返回 401/403 时才向用户或 CI 请求 `AGENTHUB_TOKEN`。
9. CI 发布前，Agent/CLI 必须解析作者：优先 SKILL.md，其次 CLI 参数、git config、CI actor。

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

## 10. 地图展示与搜索体验问题

当前能力覆盖地图一直展示在技能广场顶部，即使用户已经开始搜索、筛选、翻页或点击某个分类，地图仍然占据主要视口。

这会带来两个问题：

1. 用户搜索后真正关心的是下面的 Skill 卡片，但地图仍然挡在前面，结果区域被压到下方，体验很割裂。
2. 地图上的统计数字和下面卡片列表不是同一个统计口径，用户点击地图后，会感觉“联动了，但结果不对”。

能力覆盖地图应该是“广场首页总览”，不是“搜索结果页内容”。

## 11. 当前联动不准确的原因

能力地图里每一行的统计逻辑，比点击后实际使用的筛选条件更宽。

例如：

| 地图维度 | 当前统计命中逻辑 | 点击后实际筛选 |
|---|---|---|
| 架构类知识 | `microservice`、`product`、有 `topology`、关键词命中 | 只筛 `assetType=microservice` |
| 开发类知识 | `scaffold`、`microservice`、`business`、`bootstrap/develop` | 只筛 `stage=develop` |
| 开发流程类知识 | `quality`、`integration`、`test/release`、CI/CD 关键词 | 只筛 `assetType=quality` |
| 业务/产品知识 | `business`、`product`、任何 `domain` | 只筛 `assetType=business` |

所以地图上显示的数量，和点击后下面卡片列表的数量天然对不上。

这不是用户理解问题，而是当前代码里的“统计规则”和“跳转筛选规则”不一致。

## 12. 推荐交互调整

### 12.1 地图只在初始进入广场时展示

能力覆盖地图只在默认状态展示：

```ts
const isDefaultMarketplaceView =
  !q &&
  !label &&
  !assetType &&
  !domain &&
  !stage &&
  !topology &&
  !stack &&
  !starredOnly &&
  page === 0 &&
  sort === 'recommended';
```

只有满足这个状态时才展示：

```tsx
{isDefaultMarketplaceView ? (
  <CapabilityCoveragePanel />
) : null}
```

一旦用户做了以下任意操作，就隐藏地图：

- 输入搜索词；
- 点击推荐标签；
- 点击能力地图；
- 选择资产类型；
- 选择阶段；
- 输入业务域；
- 输入技术栈；
- 翻页；
- 切换排序；
- 仅看收藏。

### 12.2 地图点击后进入结果模式

地图仍然可以作为首页的“发现入口”。

用户点击地图后，应发生三件事：

1. URL 更新对应筛选条件；
2. 地图自动隐藏；
3. 页面滚动到 Skill 卡片结果区。

例如点击“开发类知识”后：

```text
/search?stage=develop&sort=recommended&page=0
```

页面上方只保留筛选条件提示：

```text
阶段 · 开发
```

不要继续展示地图。

### 12.3 修正地图统计和点击筛选口径

当前最核心的问题是：地图统计规则和点击筛选规则不是同一套。

建议二选一：

方案 A：把地图统计改成简单筛选口径。

| 地图维度 | 统计和点击都使用 |
|---|---|
| 架构类知识 | `assetType=microservice` |
| 开发类知识 | `stage=develop` |
| 维护类知识 | `stage=operate` |
| 开发流程类知识 | `assetType=quality` |
| 业务/产品知识 | `assetType=business` |

方案 B：新增后端 `coverageDimension` 查询。

```http
/api/web/skills?coverageDimension=architecture
```

后端用和覆盖地图完全一致的规则查列表。这样地图统计多少，点击后列表就应该是多少。

长期更推荐方案 B，因为它能保留复杂能力判断逻辑。

## 13. 调整后的页面状态

### 13.1 初始状态

展示：

- 搜索框；
- 场景快捷按钮；
- 能力覆盖地图；
- 默认推荐 Skill 卡片。

### 13.2 搜索 / 筛选状态

隐藏：

- 能力覆盖地图。

展示：

- 搜索框；
- 当前筛选条件；
- 排序；
- Skill 卡片列表；
- 分页。

### 13.3 点击地图后的状态

行为：

- 应用地图对应筛选；
- 隐藏地图；
- 展示卡片结果；
- 显示筛选条件；
- 结果数量和地图入口统计保持一致。

## 14. 新增验收标准

修复完成后需要满足：

- 初始进入 `/search?q=&sort=recommended&page=0&starredOnly=false` 时，显示能力覆盖地图。
- 输入搜索词后，能力覆盖地图立即隐藏。
- 点击标签、资产类型、阶段、业务域、技术栈后，能力覆盖地图隐藏。
- 点击能力地图后，页面进入结果列表模式，地图隐藏。
- 地图上的统计数字和点击后的列表结果数量不能再明显不一致。
- 如果地图统计是全局总览，页面必须明确它只用于初始总览，不在搜索结果状态继续展示。
- 推荐标签、能力地图、结果卡片应逐步统一到同一套筛选口径。

## 15. 结论更新

企业技能广场现在的问题不是单纯“统计没出来”，而是统计入口、搜索结果和标签筛选混在了同一个页面状态里。

正确方向是：

- 初始状态看地图；
- 搜索状态看结果；
- 地图点击进入结果；
- 地图统计和结果筛选使用同一套规则。

这样用户不会被地图挡住搜索结果，也不会再出现“上面有联动，下面数据却对不上”的感受。
