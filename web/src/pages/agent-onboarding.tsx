import { Link } from '@tanstack/react-router'
import { Bot, Braces, CheckCircle2, KeyRound, PackageCheck, PlugZap, Search, TerminalSquare, type LucideIcon } from 'lucide-react'
import { AgentDiscoveryPanel } from '@/shared/components/agent-discovery-panel'
import { AgenthubOnboardingGuide } from '@/shared/components/agenthub-onboarding-guide'
import { CopyCommandBlock } from '@/shared/components/copy-command-block'
import { APP_SHELL_PAGE_CLASS_NAME } from '@/app/page-shell-style'
import {
  buildAgenthubCliInstallPackageCommand,
  buildAgenthubCliLoginCommand,
  buildAgenthubCliWorkspaceInitCommand,
  getAppBaseUrl,
} from '@/shared/lib/agenthub-cli'

const agentFlowSteps = [
  '读取 /llms.txt，确认这是企业内部 Skill 市场。',
  '读取 /.well-known/agenthub.json，获取 CLI、API、资产族和推荐入口。',
  '由用户或 CI 注入 AGENTHUB_TOKEN，不在平台内自动申请 token。',
  '执行 agent profile 和 install-plan，按项目上下文安装 Skill。',
  '使用 search / inspect / install / publish / catalog / relations 维护资产。',
] as const

const machineEntrypoints: Array<{
  path: string
  label: string
  icon: LucideIcon
}> = [
  { path: '/llms.txt', label: 'Agent 文本入口', icon: TerminalSquare },
  { path: '/.well-known/agenthub.json', label: '结构化发现', icon: Braces },
  { path: '/api/v1/agent/profile', label: '平台画像', icon: Bot },
  { path: '/registry/claude-marketplace.json', label: 'Claude 插件兼容视图', icon: PlugZap },
]

export function AgentOnboardingPage() {
  const baseUrl = getAppBaseUrl()
  const humanBootstrap = [
    buildAgenthubCliInstallPackageCommand(baseUrl),
    buildAgenthubCliLoginCommand(baseUrl),
    'agenthub-cli whoami --json',
    'agenthub-cli search --q spring-boot --assetType scaffold --json',
  ].join('\n')
  const agentBootstrap = [
    `curl -fsS ${baseUrl}/llms.txt`,
    `curl -fsS ${baseUrl}/.well-known/agenthub.json`,
    buildAgenthubCliInstallPackageCommand(baseUrl),
    buildAgenthubCliWorkspaceInitCommand(baseUrl),
    `agenthub-cli agent profile --base-url ${baseUrl} --json`,
    'agenthub-cli agent install-plan --assetType microservice --domain order --stage develop --topology crud-api --stack java21,spring-boot3,maven --json',
  ].join('\n')
  const publishAutomation = [
    'agenthub-cli search --q "order service scaffold" --json',
    'agenthub-cli publish --namespace team-alpha --file ./skill.zip --catalog-file ./catalog.json --yes --json',
    'agenthub-cli relations sync --skill @team-alpha/order-service --file ./relations.json --yes --json',
    'agenthub-cli recommend --skill @team-alpha/order-service --json',
  ].join('\n')

  return (
    <div className={APP_SHELL_PAGE_CLASS_NAME}>
      <section className="enterprise-panel enterprise-surface-stripe overflow-hidden p-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] xl:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
              <Bot className="h-3.5 w-3.5" />
              Agent Connect Center
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950">
                给 Claude / Codex 一个平台地址，也能完成 Skill 搜索、安装和维护
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                这里是企业内部 Skill 市场的机器入口。人类开发者使用 CLI 和本地插件接入，Agent 通过 llms.txt、well-known JSON、profile 和 install-plan 获取平台能力。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/llms.txt" className="rounded-full bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(215,0,15,0.65)]">
                打开 /llms.txt
              </a>
              <Link to="/search" search={{ q: '', sort: 'recommended', page: 0, starredOnly: false }} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                进入 Skill 市场
              </Link>
              <Link to="/dashboard/tokens" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                配置 Token
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-950">平台机器入口</div>
            <div className="mt-4 space-y-3">
              {machineEntrypoints.map(({ path, label, icon: Icon }) => (
                <a key={path} href={path} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors hover:bg-white">
                  <Icon className="h-4 w-4 text-rose-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-800">{label}</span>
                    <span className="block truncate text-xs text-slate-500">{path}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AgentDiscoveryPanel />

      <section className="grid gap-6 xl:grid-cols-2">
        <CopyCommandBlock title="人类开发者快速接入" description="安装 CLI，使用用户提供的 token 连接平台，然后搜索或安装 Skill。" code={humanBootstrap} />
        <CopyCommandBlock title="AI Agent 标准接入脚本" description="Agent 拿到平台地址后先读取机器入口，再生成 install-plan。" code={agentBootstrap} />
      </section>

      <section className="enterprise-panel p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Agent contract</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Agent 连接后的执行约定</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              平台不替 Agent 自动申请 token。token 由用户、CI 或运行环境提供；Agent 负责按结构化命令查重、安装、发布和维护目录画像。
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            当前策略：快速积累，审核默认关闭
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {agentFlowSteps.map((step, index) => (
            <div key={step} className="rounded-[22px] border border-slate-200 bg-white p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="enterprise-panel p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Agent 自维护 Skill 的标准闭环</h2>
              <p className="text-sm text-slate-500">先查重，再发布，再维护 catalog、label、relations，最后用 recommend 验证推荐链路。</p>
            </div>
          </div>
          <div className="mt-5">
            <CopyCommandBlock title="发布与维护自动化" code={publishAutomation} />
          </div>
        </div>

        <div className="enterprise-panel p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Token 使用边界</h2>
              <p className="text-sm text-slate-500">当前平台先关闭复杂认证体验，但 Agent 写操作仍需要用户显式提供 token。</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {['不要在 Skill 包中提交真实密码、私钥和完整 JDBC 凭证。', 'CI 可通过环境变量传入 AGENTHUB_TOKEN。', 'Claude Code 本地插件优先读取 AGENTHUB_BASE_URL 和 AGENTHUB_TOKEN。', '批量上传不走审核阻塞，重名由 Agent 或用户改名重传。'].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="enterprise-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">继续发现和安装 Skill</h2>
            <p className="mt-2 text-sm text-slate-600">如果当前项目还没有明确上下文，先进入 Skill 市场按场景筛选；如果已有工程上下文，直接让 Agent 生成 install-plan。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/search" search={{ q: '', sort: 'recommended', page: 0, starredOnly: false }} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              <Search className="h-4 w-4" />
              打开 Skill 市场
            </Link>
            <a href="/registry/skill.md" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Bot className="h-4 w-4" />
              查看 Agent 文档
            </a>
          </div>
        </div>
      </section>

      <AgenthubOnboardingGuide compact />
    </div>
  )
}
