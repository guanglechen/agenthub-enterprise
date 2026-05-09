# 企业 Agent Hub 一期集成测试用例

本文档覆盖本轮“企业 AI 开发 Agent Hub / 开发资产中心”改造的集成测试范围，目标是验证：

- 企业目录画像 `catalogProfile` 的写入、读取、搜索、推荐与详情展示
- `relations` 关联能力的解析与推荐加权
- `agenthub-cli` 对搜索、发布、分类、标签、关系、推荐、下载等能力的无交互调用
- Docker 部署态下，前后端、数据库、Redis、MinIO、Scanner 与浏览器页面的真实联调

## 测试环境

- 部署方式：`docker-compose.yml + docker-compose.staging.yml`
- 后端：本地源码构建 Docker 镜像
- 前端：本地 `web/dist` 挂载到 Nginx
- 数据依赖：PostgreSQL、Redis、MinIO、Skill Scanner
- 浏览器：Playwright Chromium

## 用例矩阵

| 用例 ID | 场景 | 前置条件 | 核心步骤 | 预期结果 | 自动化覆盖 |
|---|---|---|---|---|---|
| AH-INT-001 | 服务启动健康检查 | Docker 环境已启动 | 访问 `/actuator/health`、`/nginx-health` | 后端与前端健康检查均成功 | `scripts/smoke-test.sh` |
| AH-INT-002 | 本地账号注册与会话建立 | 服务正常 | 注册普通用户，读取 `/api/v1/auth/me` | 注册成功，当前会话可读 | `scripts/smoke-test.sh` |
| AH-INT-003 | 团队命名空间创建 | 已登录普通用户 | 调用 `POST /api/v1/namespaces` | 返回新的 TEAM namespace | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-004 | 旧 Skill 包兼容发布 | 已有团队 namespace | 发布不带企业目录字段的 Skill 包 | 发布成功，不因缺少 `catalogProfile` 被拦截 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-005 | Skill 目录画像 overlay 写入 | 已发布 Skill | 调用 `PUT /api/v1/skills/{ns}/{slug}/catalog` | 画像写入成功，读取结果与请求一致 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-006 | `relations` 关联关系写入 | 已存在两个 Skill | 调用 `PUT /api/v1/skills/{ns}/{slug}/relations` | 关系保存成功，目标 Skill 能解析为 resolved 项 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-007 | 详情页返回企业画像 | 已写入目录画像 | 调用 `GET /api/v1/skills/{ns}/{slug}` | `catalogProfile`、`relatedSkills`、`recommendationReason` 返回正确 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-008 | 企业筛选搜索 | 已写入目录画像 | 以 `assetType/domain/stage/topology/stack` 调用搜索接口 | 命中目标 Skill，返回 `catalogProfile` 与 `relationCount` | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-009 | 基于 Skill 的推荐 | 已写入目录画像与关系 | 调用 `/recommendations` | 返回关联 Skill，理由包含 `same-domain` / `related-by-graph` 等 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-010 | 基于上下文的推荐 | 已有多条目录画像 | 调用 `/api/v1/recommendations/context` | 返回符合上下文的候选 Skill | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-011 | API Token 创建 | 普通用户已登录 | 调用 `POST /api/v1/tokens` | 返回可用 Bearer Token | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-012 | CLI 搜索 | 已获取 API Token | 执行 `agenthub-cli search --json` | 返回分页结果，包含目标 Skill | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-013 | CLI inspect / catalog get | 已获取 API Token | 执行 `inspect`、`catalog get` | 返回 Skill 详情及目录画像 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-014 | CLI publish + catalog-file | 已获取 API Token | 使用 `publish --catalog-file` 发布新的 Skill 包 | 发布成功，目录画像一并写入 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-015 | CLI catalog set | 已有 CLI 发布的 Skill | 执行 `catalog set --file` | 目录画像被更新 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-016 | CLI relations sync | 已有两个 Skill | 执行 `relations sync --file` | 关系同步成功，读取结果一致 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-017 | Label 定义与 CLI 打标 | bootstrap admin 可登录 | 管理员创建 label，CLI `labels add/list/remove` | 技能标签可添加、可查询、可移除 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-018 | CLI recommend | 已有目录画像和关系 | 执行 `recommend --skill` 与上下文推荐 | 返回推荐列表与理由 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-019 | CLI download | 已有已发布 Skill | 执行 `download --out` | 下载成功，产物文件非空 | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-020 | UI 搜索页展示企业筛选结果 | Docker web 正常 | 浏览器打开 `/search` 携带企业筛选参数 | 页面展示目标 Skill 卡片，卡片含目录徽标 | `web/e2e/enterprise-agenthub.spec.ts` |
| AH-INT-021 | UI 技能详情页展示资产画像 | 已有目录画像 Skill | 浏览器进入技能详情页 | “资产画像”“关联能力”“推荐能力”区块正确显示 | `web/e2e/enterprise-agenthub.spec.ts` |
| AH-INT-022 | 研发文案私有化回归 | Docker web 正常 | 访问首页、发布页、详情页 | 不再以开源社区 SkillHub 市场为主叙事 | `web/e2e/enterprise-agenthub.spec.ts` + 人工走查 |
| AH-INT-023 | Agent 平台画像读取 | 平台已启动 | 调用 `/api/v1/agent/profile` | Agent 能获得平台用途、默认 bundle 和 onboarding steps | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-024 | Agent 安装计划生成 | 已有企业目录画像 Skill | 调用 `agent install-plan` 或 `/api/v1/agent/install-plan` | 返回 required / recommended skills 与 next actions | `scripts/enterprise-agenthub-smoke-test.sh` |
| AH-INT-025 | 本地 Claude Code 插件连接与安装 | 已获取 API Token，插件目录可执行 | 本地插件读取 profile、拉取 install plan、安装 skill 到 `.claude/skills` | 插件能连平台并完成最小技能安装闭环 | `scripts/enterprise-agenthub-smoke-test.sh` |

## 建议执行顺序

1. 启动 Docker staging 环境
2. 运行基础 smoke：`scripts/smoke-test.sh`
3. 运行企业目录与 CLI smoke：`scripts/enterprise-agenthub-smoke-test.sh`
4. 运行部署态 Playwright：`pnpm exec playwright test -c playwright.deployed.config.ts`
5. 如任一步失败，保留容器与日志，定位后重跑

## 出口标准

- Docker 容器全部 `healthy`
- 基础 smoke 通过
- 企业目录 / CLI smoke 通过
- 部署态 Playwright 通过
- 不接受“仅单元测试通过”或“仅本地 dev server 通过”作为完成标准
