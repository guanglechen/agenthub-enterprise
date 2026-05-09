# 本地 Claude Code 插件接入 AgentHub

本文档说明本轮新增的本地 Claude Code 插件最小闭环：

1. 连接 AgentHub 平台
2. 读取平台用途和默认工作流
3. 基于当前仓库上下文生成 install plan
4. 把平台推荐的 skill 安装到工作区 `.claude/skills`

## 目录位置

本地插件目录：

`plugins/agenthub-connector-plugin`

核心文件：

- `plugins/agenthub-connector-plugin/.claude-plugin/plugin.json`
- `plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs`
- `plugins/agenthub-connector-plugin/skills/*/SKILL.md`

## 平台接口

插件依赖两个平台侧 onboarding 接口：

- `GET /api/v1/agent/profile`
- `POST /api/v1/agent/install-plan`

其中：

- `agent/profile` 用于让 Agent 知道平台是做什么的、支持哪些资产类型、默认 bundle 和推荐工作流是什么
- `agent/install-plan` 用于根据项目上下文输出 required / recommended 技能清单

## 配置方式

插件按以下优先级读取配置：

1. 环境变量 `AGENTHUB_BASE_URL`、`AGENTHUB_TOKEN`
2. 工作区 `.claude/agenthub.json`

示例配置见：

- [plugins/agenthub-connector-plugin/examples/agenthub.json](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/plugins/agenthub-connector-plugin/examples/agenthub.json:1)

## 本地命令

```bash
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs profile
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs detect-context
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs install-plan --context-file plugins/agenthub-connector-plugin/examples/workspace-context.json
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs install-skill --skill @team-space/payment-service
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs apply-install-plan --context-file plugins/agenthub-connector-plugin/examples/workspace-context.json --mode required
```

## 当前边界

当前版本是“本地插件 MVP”，只解决：

- 平台连接
- 平台画像读取
- 安装计划生成
- Skill 下载并解包安装

还没有解决：

- marketplace 正式发布
- `.claude/settings.json` 自动注入
- managed settings / `extraKnownMarketplaces`
- plugin 依赖编排
- Draft 自动回传平台

这些属于下一阶段消费侧建设内容。

## 内网部署后的推荐接入方式

如果 AgentHub 已经部署到公司内网，建议每个业务工程都单独放一份 `.claude/agenthub.json`。

示例：

```json
{
  "baseUrl": "https://agenthub.company.local",
  "token": "sk_xxx",
  "namespace": "team-java",
  "domain": "payment",
  "assetType": "microservice",
  "stage": "develop",
  "topology": "bff",
  "stack": ["java21", "spring-boot3", "maven"]
}
```

建议 Agent 接入顺序固定为：

1. `profile`
2. `detect-context`
3. `install-plan`
4. `apply-install-plan --mode required`

这样 Agent 连上平台后，不是直接去盲搜 skill，而是先理解平台用途，再按安装计划执行。

如需完整的内网部署与 Agent 拉仓流程，见：

- [docs/22-enterprise-private-deployment-playbook.md](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/docs/22-enterprise-private-deployment-playbook.md:1)
