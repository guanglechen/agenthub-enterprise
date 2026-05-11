# Claude Code Marketplace 兼容分发设计

## 1. 目标

本设计解决一个边界问题：AgentHub Enterprise 仍然是企业 Skill 市场，但 Claude Code 自身有原生 plugin marketplace 机制。为了让 Claude Code 可以用原生方式发现和安装 AgentHub 连接插件，平台新增一个兼容分发出口，而不是重构 AgentHub 的 Skill 模型。

## 2. 设计结论

- AgentHub 的权威资产仍然是 `skill package`。
- `catalogProfile`、`relations`、`labels`、`recommendations`、`agenthub-cli` 继续承担企业资产治理和复用。
- Claude Code marketplace 只作为消费侧兼容出口，用于分发可被 Claude Code 原生安装的 plugin。
- 不是所有 Skill 都需要变成 Claude plugin；只有包含 `.claude-plugin/plugin.json` 的插件型资产才进入 Claude marketplace。
- 当前一期只发布官方 `agenthub-connector-plugin`，让 Claude Code 先具备连接平台、读取 profile、获取 install-plan、安装 Skill、运行 Harness 的能力。

## 3. 协议映射

| AgentHub 概念 | Claude Code 概念 | 一期处理方式 |
| --- | --- | --- |
| `skill package` | plugin source 中的能力内容 | 不强制一一映射 |
| `catalogProfile` | marketplace metadata / tags 的企业扩展来源 | 只导出 Claude 能识别的子集 |
| `agenthub-connector-plugin` | Claude Code plugin | 作为首个官方插件发布 |
| AgentHub Registry | Claude marketplace catalog | 新增兼容视图 |
| `agenthub-cli` | 插件内部调用的机器接口 | 保持为主自动化入口 |

## 4. 当前落地文件

- 根目录 marketplace：
  - `.claude-plugin/marketplace.json`
- 插件 manifest：
  - `plugins/agenthub-connector-plugin/.claude-plugin/plugin.json`
- Web 分发视图：
  - `web/src/docs/claude-marketplace.json.template`
  - 部署后路径：`/registry/claude-marketplace.json`
- CLI 校验与导出：
  - `agenthub-cli marketplace validate`
  - `agenthub-cli marketplace export`

## 5. 推荐接入方式

### 5.1 本地验证

在仓库根目录执行：

```bash
agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json
agenthub-cli marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json
```

Claude Code 内测试：

```text
/plugin marketplace add .
/plugin install agenthub-connector-plugin@agenthub-enterprise
```

### 5.2 内网 Git 仓库分发

公司内网部署时，推荐让 Claude Code 添加 Git 仓库型 marketplace：

```text
/plugin marketplace add https://git.company.local/platform/agenthub-enterprise.git
/plugin install agenthub-connector-plugin@agenthub-enterprise
```

原因是 Claude Code 官方 marketplace 支持仓库内的 `.claude-plugin/marketplace.json` 与相对 plugin source。当前仓库 marketplace 使用：

```json
{
  "source": "./plugins/agenthub-connector-plugin"
}
```

这要求插件目录与 marketplace 文件在同一个 Git 仓库内。

### 5.3 Web 发现入口

部署后的 Web 入口：

```text
https://agenthub.company.local/registry/claude-marketplace.json
```

这个入口用于 Agent 和工程师发现当前官方插件、版本、分类、标签和说明。若要稳定安装插件，仍建议使用 Git 仓库型 marketplace，而不是只依赖 HTTP JSON。

## 6. AgentHub CLI 命令

校验 marketplace：

```bash
agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json
```

校验插件目录：

```bash
agenthub-cli marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json
```

重新导出 marketplace：

```bash
agenthub-cli marketplace export \
  --plugin-dir plugins/agenthub-connector-plugin \
  --out .claude-plugin/marketplace.json \
  --json
```

## 7. 规则约束

- `marketplace.name` 必须是 kebab-case。
- plugin `name` 必须是 kebab-case。
- plugin 必须包含 `.claude-plugin/plugin.json`。
- plugin 目录必须自包含，不能依赖仓库外相对路径。
- plugin 内的 `skills` 目录下每个 Skill 必须包含 `SKILL.md`。
- plugin component path 必须是相对路径，并以 `./` 开头。
- AgentHub 内部企业治理字段不要硬塞进 Claude `plugin.json`；只导出客户端需要识别的最小字段。

## 8. 后续扩展

一期只发布官方 connector plugin。后续如果要把更多 Skill 变成 Claude Code 可安装插件，需要增加：

- Skill 包上传时识别 `.claude-plugin/plugin.json`。
- Skill 详情页显示“可 Claude Code 安装”。
- 管理端支持选择 `distributionTargets=["agenthub-cli","claude-code-plugin"]`。
- marketplace 导出从静态官方插件扩展为动态查询插件型 Skill。
- CI 中增加 `claude plugin validate` 或等价校验。

## 9. 验收标准

- 根目录 `.claude-plugin/marketplace.json` 可通过 `agenthub-cli marketplace validate`。
- `plugins/agenthub-connector-plugin` 可通过 plugin-dir 校验。
- 部署后 `/registry/claude-marketplace.json` 可访问，并返回 `agenthub-connector-plugin`。
- Agent profile 返回 `claudeCodeMarketplace=true` 能力标记。
- `/registry/skill.md` 明确区分 AgentHub Skill 市场和 Claude Code marketplace 兼容出口。
