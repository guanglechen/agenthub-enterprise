# AgentHub CLI 与 Agent 接入说明

## 1. 目标

这份文档解决两个实际问题：

1. 研发工程师进入 Agent Hub 后，不知道应该安装哪个 CLI、怎么拿 Token、怎么开始搜索和安装技能。
2. Agent 进入 Agent Hub 后，不知道平台用途、接入顺序、workspace 初始化方式、install-plan 的调用方式。

本次实现的统一入口是：

- 页面侧的 `Dashboard` 与 `Token 管理` 页面
- Agent 可读文档 `/registry/skill.md`
- 本地 CLI `agenthub-cli`
- 本地 Claude Code connector plugin

## 2. CLI 分发方式

本仓库新增了可发布的 npm package 目录：

- [packages/agenthub-cli/package.json](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/packages/agenthub-cli/package.json:1)
- [packages/agenthub-cli/README.md](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/packages/agenthub-cli/README.md:1)

同时，发布站点静态资源目录会携带一个可直接安装的 npm tarball：

- `/downloads/agenthub-cli-0.1.1.tgz`

推荐安装命令：

```bash
npm install -g https://your-agenthub.example.com/downloads/agenthub-cli-0.1.1.tgz
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

### 3.2 登录与校验

```bash
agenthub-cli login --base-url https://your-agenthub.example.com --token sk_your_api_token_here
agenthub-cli whoami --json
```

### 3.3 搜索、安装、发布

```bash
agenthub-cli search --q spring-boot --assetType scaffold --json
agenthub-cli install --skill @global/java-microservice-baseline --base-url https://your-agenthub.example.com
agenthub-cli publish --namespace team-alpha --file ./bundle.zip --catalog-file ./catalog.json --yes
```

## 4. Agent 的接入流程

### 4.1 读取平台入口文档

Agent 首先读取：

- `/registry/skill.md`

这里会告诉 Agent：

- 平台是什么
- 推荐优先使用哪个 CLI
- Token 从哪里拿
- workspace 怎么初始化
- install-plan 怎么调用

### 4.2 初始化 workspace

```bash
agenthub-cli config init-workspace \
  --workspace . \
  --base-url https://your-agenthub.example.com \
  --token sk_your_api_token_here \
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

```bash
agenthub-cli install --skill @global/java-microservice-baseline --base-url https://your-agenthub.example.com
agenthub-cli install --skill @global/quality-gate-baseline --base-url https://your-agenthub.example.com
```

## 5. 本地 Claude Code 插件协同

本地 connector plugin 仍然保留，且现在可以在仓库本地找不到 `bin/agenthub-cli` 时，回退到：

```bash
npx -y @guanglechen/agenthub-cli ...
```

对应实现：

- [plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs:1)

这意味着后续如果 CLI 正式发布到 npm，插件不需要改协议，只需要继续复用 CLI。

## 6. 页面改造结果

本次页面侧增加了统一 onboarding 模块：

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

本次实现已经补齐“包结构、页面引导、Agent 文档、CLI 命令闭环”，但没有在本次会话里把 npm package 正式发布到公共 npm registry。

当前可用方式是：

1. 通过站点静态资源下载 `agenthub-cli-0.1.1.tgz`
2. `npm install -g <tarball-url>`

后续如果要正式发布 npm，可以直接基于 `packages/agenthub-cli` 执行发布流程。
