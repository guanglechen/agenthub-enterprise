# 企业内网私有化部署与 Agent 接入 Playbook

本文档面向后续“从仓库拉源码，由 Agent 辅助在公司内网部署 AgentHub Enterprise”的场景。

目标不是再解释本地开发，而是把下面三件事串成一条可执行链路：

1. 从外部源码仓库同步到公司内网代码仓
2. 在内网完成构建、镜像分发与运行时部署
3. 让 Claude Code / Agent 连接内网平台，并根据平台画像自动安装 skill

## 1. 推荐部署模式

对企业内网，建议优先采用“源码镜像 + 内网构建 + 内网镜像仓 + 内网运行时”模式，而不是直接依赖公网 GHCR。

推荐链路如下：

```text
GitHub / 外部源码仓
        │
        ▼
公司内网 Git 镜像仓
        │
        ├── Agent 拉取源码
        ├── Maven / pnpm 通过内网代理构建
        └── Docker 构建 server / web / scanner 镜像
        │
        ▼
公司内网镜像仓（Harbor / Nexus / ACR 企业版）
        │
        ▼
Docker Compose 或 Kubernetes 运行时
        │
        ▼
AgentHub Enterprise
        │
        ├── Browser 用户访问
        ├── agenthub-cli 调用
        └── Claude Code 本地插件接入
```

原因：

- 内网环境通常不能直接访问 `ghcr.io`
- Maven、pnpm、Docker base image 都需要代理或镜像源
- 后续你要让 Agent 在公司内网复用这套平台，源码和镜像都必须可控

## 2. 交付物分层

私有化交付建议分成四层：

### 2.1 代码层

- 内网 Git 镜像仓中的本仓库源码
- 平台初始化文档
- 部署脚本与 `.env` 模板

### 2.2 构建层

- JDK 21
- Node.js 20+
- pnpm 10.x
- Docker / Docker Compose 或 Kubernetes
- Maven 私服代理（Nexus / Artifactory）
- npm 私服代理（Verdaccio / Nexus npm proxy）

### 2.3 运行层

- `server`
- `web`
- `skill-scanner`
- PostgreSQL
- Redis
- 对象存储：MinIO 或企业对象存储

### 2.4 消费层

- `agenthub-cli`
- 本地 Claude Code 插件 `plugins/agenthub-connector-plugin`
- 工作区 `.claude/agenthub.json`
- 工作区 `.claude/skills`

## 3. 内网部署前置清单

在真正让 Agent 拉仓部署前，先准备下面这些基础设施：

### 3.1 代码与制品镜像源

- 内网 Git 镜像仓
- Docker 镜像仓
- Maven 代理仓
- npm 代理仓

如果没有这些代理，Agent 即使能拉到源码，也会卡在依赖下载。

### 3.2 域名与证书

- 内网访问域名，例如 `https://agenthub.company.local`
- 对应 TLS 证书
- 反向代理或 Ingress

`SKILLHUB_PUBLIC_BASE_URL` 必须设置为最终访问地址，否则：

- 浏览器页面里的安装指引会指向错误地址
- `agenthub-cli` 显示的注册中心地址不正确
- 设备码登录、OAuth/OIDC 回调会异常

### 3.3 运行时依赖

- PostgreSQL 16
- Redis 7
- MinIO 或 S3 兼容对象存储
- 可选：企业 OIDC / SSO

### 3.4 安全基线

- 禁止使用默认 `BOOTSTRAP_ADMIN_PASSWORD`
- 生产环境不启用 `local` profile
- 明确对象存储凭据、数据库凭据的 Secret 管理方式
- 若使用 OIDC，提前规划 registration id，避免后续 provider_code 漂移

## 4. 两种落地路径

### 4.1 路径 A：内网源码构建后以 Docker Compose 交付

适合第一阶段 PoC 或单环境私有化试点。

#### 步骤 1：Agent 拉取内网镜像仓代码

```bash
git clone <内网 Git 仓库地址> agenthub-enterprise
cd agenthub-enterprise
```

#### 步骤 2：配置内网依赖代理

需要提前保证：

- Maven `settings.xml` 指向内网代理
- npm / pnpm registry 指向内网代理
- Docker 可拉取基础镜像

#### 步骤 3：构建发布镜像

如果公司内网不直接使用 GHCR，建议在内网构建并推送自己的镜像名：

```bash
docker build -t registry.company.local/agenthub/server:0.1.0 -f server/Dockerfile server
docker build -t registry.company.local/agenthub/web:0.1.0 -f web/Dockerfile web
docker build -t registry.company.local/agenthub/scanner:0.1.0 scanner
docker push registry.company.local/agenthub/server:0.1.0
docker push registry.company.local/agenthub/web:0.1.0
docker push registry.company.local/agenthub/scanner:0.1.0
```

#### 步骤 4：准备运行时环境变量

建议从 `.env.release.example` 派生企业内网版本，例如 `.env.intranet.release`。

关键变量至少包括：

- `SKILLHUB_SERVER_IMAGE`
- `SKILLHUB_WEB_IMAGE`
- `SKILLHUB_SCANNER_IMAGE`
- `SKILLHUB_PUBLIC_BASE_URL`
- `POSTGRES_*`
- `REDIS_*`
- `SKILLHUB_STORAGE_PROVIDER`
- `SKILLHUB_STORAGE_S3_*`
- `BOOTSTRAP_ADMIN_*`

#### 步骤 5：部署

```bash
cp .env.release.example .env.intranet.release
make validate-release-config
docker compose --env-file .env.intranet.release -f compose.release.yml up -d
```

#### 步骤 6：验收

```bash
docker compose --env-file .env.intranet.release -f compose.release.yml ps
curl -i http://127.0.0.1:8080/actuator/health
BOOTSTRAP_ADMIN_USERNAME=admin BOOTSTRAP_ADMIN_PASSWORD='<你的密码>' bash scripts/smoke-test.sh http://localhost:8080
BOOTSTRAP_ADMIN_USERNAME=admin BOOTSTRAP_ADMIN_PASSWORD='<你的密码>' bash scripts/enterprise-agenthub-smoke-test.sh http://localhost:8080
```

### 4.2 路径 B：内网 Kubernetes 交付

适合正式环境。

建议原则：

- 数据库和 Redis 优先复用企业现有托管能力
- `server`、`web`、`skill-scanner` 部署到独立命名空间
- Secret 由企业 Secret 系统统一托管

参考入口：

- [deploy/k8s/README.md](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/deploy/k8s/README.md:1)
- [docs/09-deployment.md](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/docs/09-deployment.md:1)

正式环境更推荐 `overlays/external`，不要在生产集群里直接把 PostgreSQL / Redis 跟应用一起临时起起来。

## 5. Agent 辅助拉仓与部署建议

后续如果要让 Agent 直接参与“拉仓 -> 构建 -> 部署 -> 验证”，建议把它的职责收敛为固定步骤：

1. 拉取内网 Git 仓库
2. 校验 `.env.intranet.release`
3. 构建镜像并推送内网镜像仓
4. 执行 Compose 或 K8s 部署
5. 运行 smoke test
6. 输出当前可访问地址与管理员入口

建议给 Agent 单独准备下面几个输入文件：

- `.env.intranet.release`
- `deploy/runtime-mirror-images.txt`
- 企业 DNS / 域名说明
- 企业对象存储配置说明
- 企业 OIDC 参数模板

Agent 不应该现场猜测这些值。

## 6. Claude Code / Agent 消费侧接入

平台部署完成后，Agent 连接平台建议按下面的消费闭环：

### 6.1 准备工作区配置

在要接入的平台工程或业务工程中写入 `.claude/agenthub.json`。

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

### 6.2 验证平台画像

```bash
./bin/agenthub-cli agent profile --json
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs profile
```

这一步是为了确保 Agent 一连上平台，就能知道：

- 平台是干什么的
- 默认 bundle 是什么
- 推荐工作流是什么

### 6.3 生成安装计划

```bash
./bin/agenthub-cli agent install-plan --context-file workspace-context.json --json
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs install-plan --workspace .
```

### 6.4 安装 required skills

```bash
node plugins/agenthub-connector-plugin/bin/agenthub-plugin.mjs apply-install-plan --workspace . --mode required
```

安装后，技能会落到工作区：

```text
.claude/skills/
```

## 7. 本地插件先本地交付，再回传平台

当前本地 Claude Code 插件的推荐交付顺序如下：

1. 先把 `plugins/agenthub-connector-plugin` 作为本地 path plugin 使用
2. 在 1 到 2 个 Java 微服务项目里跑通
3. 验证 `profile -> install-plan -> install-skill` 闭环
4. 再把该插件整理成平台中的正式资产

当前插件入口与说明：

- [docs/21-local-claude-plugin-connector.md](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/docs/21-local-claude-plugin-connector.md:1)
- [plugins/agenthub-connector-plugin/.claude-plugin/plugin.json](/Users/chenguangyue/Documents/code/github/iflytek/agenthub-enterprise/plugins/agenthub-connector-plugin/.claude-plugin/plugin.json:1)

## 8. 企业内网环境建议新增的交付物

为了后面持续交付更稳，建议补下面这些文件：

- `.env.intranet.release.example`
- `compose.release.intranet.override.yml`
- `settings.xml.example`（Maven 私服模板）
- `.npmrc.example`（npm 私服模板）
- `deploy/k8s/overlays/intranet/`
- `docs/23-enterprise-agent-operations-runbook.md`

其中：

- `.env.intranet.release.example` 解决内网镜像名、对象存储、OIDC、域名模板问题
- `compose.release.intranet.override.yml` 解决内网镜像仓、代理、挂载等差异
- `deploy/k8s/overlays/intranet/` 解决正式环境参数收敛问题

## 9. 上线验收清单

至少确认下面这些项目：

### 平台运行

- `server / web / scanner / postgres / redis` 均 healthy
- 浏览器可正常访问平台首页、搜索页、详情页
- `agenthub-cli` 可正常调用 `search / inspect / agent profile / agent install-plan`

### 数据与对象存储

- Skill 上传成功
- MinIO / S3 可读写
- 下载包可正常回传

### Agent 接入

- 本地插件能读取 `agent/profile`
- 本地插件能生成 install plan
- 本地插件能把 skill 安装到 `.claude/skills`

### 安全基线

- 默认管理员密码已变更
- 生产未启用 `local` profile
- OIDC / OAuth 回调与域名一致
- Redis / PostgreSQL 未直接暴露公网

## 10. 推荐实施顺序

1. 先完成内网 Git 镜像仓和镜像仓准备
2. 再跑 Compose 私有化部署 PoC
3. 再接入本地 Claude Code 插件
4. 最后收敛到 K8s / 正式环境

不要一开始就把源码镜像、正式 K8s、OIDC、插件发布、质量门禁一起做完。先跑通：

`源码拉取 -> 平台启动 -> agent/profile -> install-plan -> skill 安装`

这条主链更重要。
