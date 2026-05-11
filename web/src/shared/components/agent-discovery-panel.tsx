import { useMemo } from 'react'
import { Bot, Braces, Copy, FileText, PlugZap, TerminalSquare } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCopyToClipboard } from '@/shared/lib/clipboard'
import { getAppBaseUrl } from '@/shared/lib/agenthub-cli'

type AgentDiscoveryPanelProps = {
  compact?: boolean
}

const agentDiscoveryLinks = [
  {
    label: 'AI 入口文档',
    path: '/llms.txt',
    description: '只拿到平台地址时，Agent 先读这个文件。',
    icon: FileText,
  },
  {
    label: '结构化发现',
    path: '/.well-known/agenthub.json',
    description: '返回平台用途、CLI、API 与资产族。',
    icon: Braces,
  },
  {
    label: 'Agent Profile',
    path: '/api/v1/agent/profile',
    description: '平台画像、默认工作流和推荐入口。',
    icon: Bot,
  },
  {
    label: 'Claude 插件市场',
    path: '/registry/claude-marketplace.json',
    description: 'Claude Code 连接插件发现入口。',
    icon: PlugZap,
  },
] as const

export function AgentDiscoveryPanel({ compact = false }: AgentDiscoveryPanelProps) {
  const baseUrl = useMemo(() => getAppBaseUrl(), [])
  const [copied, copy] = useCopyToClipboard()
  const agentBootstrap = [
    `curl -fsS ${baseUrl}/llms.txt`,
    `curl -fsS ${baseUrl}/.well-known/agenthub.json`,
    `npm install -g ${baseUrl}/downloads/agenthub-cli-0.1.3.tgz`,
    `agenthub-cli agent profile --base-url ${baseUrl} --json`,
  ].join('\n')

  return (
    <section className={`enterprise-panel enterprise-surface-stripe ${compact ? 'p-5' : 'p-6'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
            <TerminalSquare className="h-3.5 w-3.5" />
            AI Agent 入口
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              只给 Agent 一个平台地址，也能知道怎么接入
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Agent 先读文本入口和 well-known JSON，再安装 CLI、读取平台画像、生成 install-plan。写操作所需 token 由用户或 CI 提供。
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => copy(agentBootstrap)}
        >
          <Copy className="mr-2 h-4 w-4" />
          {copied ? '已复制' : '复制 Agent 接入命令'}
        </Button>
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
        {agentDiscoveryLinks.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.path}
              href={item.path}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-rose-50 p-2.5 text-rose-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{item.label}</div>
                  <div className="truncate text-xs text-slate-500">{item.path}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </a>
          )
        })}
      </div>
    </section>
  )
}
