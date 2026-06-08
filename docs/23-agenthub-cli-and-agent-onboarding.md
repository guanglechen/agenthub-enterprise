# AgentHub CLI 与 Agent 接入说明

## 1. 目标

这份文档解决两个实际问题：

1. 研发工程师进入 Agent Hub 后，不知道应该安装哪个 CLI、怎么拿 Token、怎么开始搜索和安装技能。
2. Agent 进入 Agent Hub 后，不知道平台用途、接入顺序、workspace 初始化方式、install-plan 的调用方式。

当前统一入口是：

- 页面侧的 `Dashboard` 与 `Token 管理` 页面
- Agent 可读文档 `/registry/skill.md`
- Claude Code marketplace 文档 `/registry/claude-marketplace.json`
- 本地 CLI `agenthub-cli`
- Claude Code connector plugin

## 2. CLI 分发方式

本仓库新增了可发布的 npm package 目录：

- [packages/agenthub-cli/package.json](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/packages/agenthub-cli/package.json:1)
- [packages/agenthub-cli/README.md](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/packages/agenthub-cli/README.md:1)

同时，发布站点静态资源目录会携带一个可直接安装的 npm tarball：

- `/downloads/agenthub-cli-0.1.4.tgz`

推荐安装命令：

```bash
npm install -g https://your-agenthub.example.com/downloads/agenthub-cli-0.1.4.tgz
```

这样做的目的，是先解决“企业内网环境不方便走公共 npm registry / GHCR”的现实问题，让平台本身就能分发 CLI 包。

当前 CLI 只依赖 Node.js 20+，不依赖 Python。对 Claude Code 在 Windows 环境下的安装更友好。

## 3. 人的接入流程

### 3.1 获取 Token

入口页面：

- `/dashboard/tokens`

用途：

- 创建 CLI 登录使用的 Token
- 创建 Agent 自动化使用的 Token
- 管理已有 Token 的过期时间和删除

### 3.2 初始化与校验

```bash
agenthub-cli config init-workspace --workspace . --base-url https://your-agenthub.example.com --namespace team-alpha --domain order
agenthub-cli whoami --json
```

open-access 部署可直接执行写操作；严格认证部署返回 401/403 后，再通过 `agenthub-cli login --base-url <url> --token <token>` 写入凭证。

### 3.3 搜索、安装、发布

```bash
agenthub-cli search --q spring-boot --assetType scaffold --json
agenthub-cli install --skill @global/java-microservice-baseline --base-url https://your-agenthub.example.com --scope user
agenthub-cli publish --namespace team-alpha --file ./bundle.zip --catalog-file ./catalog.json --author-name "张三" --yes
```

## 4. Agent 的接入流程

### 4.1 读取平台入口文档

Agent 首先读取：

- `/registry/skill.md`

这里会告诉 Agent：

- 平台是什么
- 推荐优先使用哪个 CLI
- open-access 写操作与严格认证部署的 token 边界
- 作者归因如何从 SKILL.md、CLI 参数、git 或 CI actor 获取
- Agent 贡献 Skill 前如何补齐 catalogProfile、标签、贡献者显示名
- workspace 怎么初始化
- install-plan 怎么调用

### 4.2 初始化 workspace

```bash
agenthub-cli config init-workspace \
  --workspace . \
  --base-url https://your-agenthub.example.com \
  --namespace team-alpha \
  --domain order \
  --assetType microservice \
  --stage develop \
  --topology crud-api \
  --stack java21,spring-boot3,maven
```

输出文件：

- `.claude/agenthub.json`

### 4.3 获取 install plan

```bash
agenthub-cli agent install-plan \
  --assetType microservice \
  --domain order \
  --stage develop \
  --topology crud-api \
  --stack java21,spring-boot3,maven \
  --namespace team-alpha \
  --json
```

### 4.4 安装 skill

`install-plan` 的每个 skill 会返回 `installScope` 和 `targetDir`：

- `installScope=user`：通用质量、产品、集成、发布、运维类能力，默认安装到 `~/.agent/skills`
- `installScope=workspace`：项目脚手架、业务上下文类能力，默认安装到 `./.agent/skills`

Agent 必须优先按平台返回的 `targetDir` 安装，不要因为当前在工程目录执行就把所有通用能力都塞进工程。

```bash
agenthub-cli install --skill @global/java-microservice-baseline --target ./.agent/skills --base-url https://your-agenthub.example.com
agenthub-cli install --skill @global/quality-gate-baseline --target ~/.agent/skills --base-url https://your-agenthub.example.com
```

### 4.5 使用 Harness Package

Harness Package 是带 `harness/manifest.yaml` 的特殊 skill package，不改变 AgentHub 的 Skill 市场主模型。

新 Java 微服务初始化：

```bash
agenthub-cli harness browse --stack java21,spring-boot3,maven --json
agenthub-cli harness init --package @platform/java-microservice-harness --dir . --yes
agenthub-cli harness verify --dir . --json
```

存量 Java 微服务治理：

```bash
agenthub-cli harness scan-modules --dir . --json
agenthub-cli harness propose --dir . --json
agenthub-cli harness verify --dir . --json
```

能力回流 dry-run：

```bash
agenthub-cli harness contribute --dir . --name order-service-harness --dry-run
```

### 4.6 Agent 贡献 Skill 的发布前置要求

Agent 不是只上传一个 zip。只要它代表用户向市场贡献 Skill，就必须把后续检索和复用需要的数据一并补齐：

1. 读取 `SKILL.md`、`references/`、脚本和工程上下文，先理解能力边界。
2. 推断目录画像：`assetType`、`domain`、`stage`、`topology`、`stack`、`keywords`。
3. 推断标签：围绕技术栈、生命周期、业务域、能力类型生成短标签。
4. 解析贡献者显示名：优先 SKILL.md，其次 CLI 参数、环境变量、git config、CI actor。
5. 如果贡献者缺失，必须问用户：`这个 Skill 在平台上显示的贡献者姓名是什么？`
6. 发布时带 `--catalog-file` 和 `--author-name`，发布后用 `labels add`、`relations sync` 补齐市场发现数据。

推荐命令：

```bash
agenthub-cli publish --namespace team-alpha --file ./bundle.zip --catalog-file ./catalog.json --author-name "张三" --yes
agenthub-cli labels add --skill @team-alpha/<skill-slug> --label java
agenthub-cli labels add --skill @team-alpha/<skill-slug> --label backend-debug
agenthub-cli relations sync --skill @team-alpha/<skill-slug> --file ./relations.json
```

## 5. Claude Code 插件市场协同

AgentHub 继续保持 Skill 市场为主，同时提供 Claude Code marketplace 兼容出口：

- 仓库根目录：`.claude-plugin/marketplace.json`
- 部署后发现入口：`/registry/claude-marketplace.json`
- 官方插件：`agenthub-connector-plugin`

本地验证：

```bash
agenthub-cli marketplace validate --file .claude-plugin/marketplace.json --json
agenthub-cli marketplace validate --plugin-dir plugins/agenthub-connector-plugin --json
```

Claude Code 内安装：

```text
/plugin marketplace add .
/plugin install agenthub-connector-plugin@agenthub-enterprise
```

内网 Git 仓库分发：

```text
/plugin marketplace add https://git.company.local/platform/agenthub-enterprise.git
/plugin install agenthub-connector-plugin@agenthub-enterprise
```

connector plugin 可以在仓库本地找不到 `bin/agenthub-cli` 时，回退到：

```bash
npx -y @guanglechen/agenthub-cli ...
```

对应实现：

- [plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs:1)

插件也包装了 Harness 命令：

```bash
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs harness-browse --stack java21,spring-boot3,maven
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs harness-scan --workspace .
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs harness-verify --workspace .
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs harness-init --skill @platform/java-microservice-harness --workspace . --yes
```

这意味着后续如果 CLI 正式发布到 npm，插件不需要改协议，只需要继续复用 CLI。

## 6. 页面改造结果

页面侧提供统一 onboarding 模块：

- [web/src/shared/components/agenthub-onboarding-guide.tsx](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/web/src/shared/components/agenthub-onboarding-guide.tsx:1)

挂载位置：

- [web/src/pages/dashboard.tsx](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/web/src/pages/dashboard.tsx:1)
- [web/src/pages/dashboard/tokens.tsx](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/web/src/pages/dashboard/tokens.tsx:1)

页面会直接区分：

- 如果你是研发工程师
- 如果你是 Agent

并显示：

- CLI 包安装命令
- Token 登录命令
- whoami 校验命令
- workspace 初始化命令
- install-plan 调用命令

## 7. 当前约束

当前已经补齐“包结构、页面引导、Agent 文档、CLI 命令闭环、Claude Code marketplace 兼容出口”，但没有把 npm package 正式发布到公共 npm registry。

当前可用方式是：

1. 通过站点静态资源下载 `agenthub-cli-0.1.4.tgz`
2. `npm install -g <tarball-url>`

后续如果要正式发布 npm，可以直接基于 `packages/agenthub-cli` 执行发布流程。
