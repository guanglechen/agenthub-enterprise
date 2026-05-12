# AgentHub 五轮交互迭代落地验收

本文记录本次前端交互优化的五轮迭代范围、落地页面和验收标准。目标不是把 AgentHub 改成通用后台，而是继续保持企业内部 Skill 市场方向，让人和 Agent 都能完成搜索、安装、发布、建档和推荐验证。

## 1. Iteration 1：Agent 接入闭环

落地内容：

- 新增 `/agent` Agent 接入中心。
- 侧边导航新增 `Agent 接入`。
- 工作台主 CTA 新增 `连接 Agent`。
- 页面明确区分人类开发者命令和 AI Agent 命令。
- 展示 `/llms.txt`、`/.well-known/agenthub.json`、`/api/v1/agent/profile`、`/registry/claude-marketplace.json`。
- 明确 token 由用户、CI 或运行环境提供，不由平台自动申请。

验收标准：

- Agent 只拿到平台 URL 时，可以通过 `/agent` 或 `/llms.txt` 找到接入流程。
- 人类用户可以复制 CLI 安装、登录、搜索命令。
- Agent 可以复制 profile、install-plan、publish、relations、recommend 命令。

## 2. Iteration 2：Skill 市场场景化

落地内容：

- 搜索页新增 `先选场景，再找 Skill` 区块。
- 场景包括初始化 Java 微服务、安装 Claude / Agent 插件、补充业务/产品知识、接入质量治理、找开发辅助工具。
- 搜索页保留资产族入口，并继续使用现有 `assetType/domain/stage/topology/stack/label` 参数。
- Skill 卡片新增资产族、Agent Ready、推荐理由、复制 inspect 和复制安装命令。

验收标准：

- 用户可以从场景入口进入组合搜索。
- Skill 卡片能直接告诉用户它属于哪类资产、为什么推荐、如何给 Agent 安装。
- 存量 Skill 仍可展示为 `存量资产`，不破坏旧数据。

## 3. Iteration 3：Skill 详情决策化

落地内容：

- 详情页新增 `安装决策与验证方式` 区块。
- 展示适合什么、不适合什么、安装后验证。
- 提供 Agent 可执行命令：`inspect`、`install`、`recommend`。
- Harness Package 自动展示 `harness browse/apply/verify` 命令。
- 保留既有 README、文件、版本、安装、关联能力、推荐能力和维护信息。

验收标准：

- 用户不打开外部 README 也能判断是否适合安装。
- Agent 可以复制命令完成检查、安装和推荐验证。
- Harness Package 有独立命令入口，不与普通 Skill 混淆。

## 4. Iteration 4：发布建档向导

落地内容：

- 发布页收敛为聚焦任务页：手工发布只露出命名空间、可见性、ZIP 包 3 个必填项。
- 提供 `手工发布` 与 `Agent / CI 批量发布` 两种入口。
- catalog 表单新增资产族选择，并默认折叠为可选补充信息。
- 支持导入 `catalog.json / catalog.yaml`。
- 关系维护下沉到高级折叠区，避免发布首屏信息过载。
- Agent / CI 模式直接展示 `agenthub-cli` 查重、发布、关系同步、推荐验证命令。
- 页面明确重名处理策略：不进入审核阻塞，修改 slug 或 version 后重传。
- 发布成功后停留在页面展示结果、详情页入口、市场验证入口和 CLI 验证命令。

验收标准：

- 用户能先完成最小上传，再按需补目录画像与关系。
- CI / Agent 批量上传仍走 publish + catalog-file 的无交互路径。
- 发布成功后可以立即验证详情页和推荐链路。

## 5. Iteration 5：团队目录、推荐、品牌收口

落地内容：

- namespace 页面升级为团队能力目录。
- 增加团队能力地图，展示可见 Skill、资产族数量、业务域数量、Agent 维护数量。
- 增加按资产族、业务域、阶段的分布。
- 增加团队资产缺口提示，用于引导继续发布 Skill。
- 保持 HIKVISION AgentHub 的企业研发资产平台视觉语言。

验收标准：

- 团队负责人进入 namespace 可以看到能力分布，而不是单纯列表。
- 页面能够提示团队缺少哪些核心资产类型。
- 推荐和关系信息能从搜索卡片、详情页和团队页形成一致认知。

## 6. 回归关注点

- `skill package` 仍是发布、安装、版本管理权威单元。
- `catalogProfile` 继续作为企业目录画像，不替代 Skill。
- 审核默认关闭策略不被 UI 重新强化为阻塞流程。
- Agent 接入保持 CLI-first，不把 Claude 插件直接绑死 HTTP。
- `docs/agenthub.zip` 是用户本地视觉材料，不属于本次提交范围。
