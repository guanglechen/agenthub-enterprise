import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, Copy, KeyRound, TerminalSquare, UserRound } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCopyToClipboard } from '@/shared/lib/clipboard'
import {
  buildAgenthubCliInstallPackageCommand,
  buildAgenthubCliLoginCommand,
  buildAgenthubCliSkillInstallCommand,
  buildAgenthubCliWhoamiCommand,
  buildAgenthubCliWorkspaceInitCommand,
  getAppBaseUrl,
} from '@/shared/lib/agenthub-cli'

interface AgenthubOnboardingGuideProps {
  compact?: boolean
}

function CommandBlock({
  title,
  description,
  code,
}: {
  title: string
  description: string
  code: string
}) {
  const { t } = useTranslation()
  const [copied, copy] = useCopyToClipboard()

  return (
    <div className="rounded-2xl border border-border/60 bg-slate-950/95 p-4 text-slate-100">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs leading-5 text-slate-400">{description}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => copy(code)}
          title={copied ? t('copyButton.copied') : t('copyButton.copy')}
          aria-label={copied ? t('copyButton.copied') : t('copyButton.copy')}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <pre className="whitespace-pre-wrap break-all text-[13px] leading-6 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function AgenthubOnboardingGuide({ compact = false }: AgenthubOnboardingGuideProps) {
  const { t } = useTranslation()
  const baseUrl = useMemo(() => getAppBaseUrl(), [])

  const humanCommands = useMemo(() => ({
    installPackage: buildAgenthubCliInstallPackageCommand(baseUrl),
    login: buildAgenthubCliLoginCommand(baseUrl),
    verify: buildAgenthubCliWhoamiCommand(),
    installSkill: buildAgenthubCliSkillInstallCommand('global', 'java-microservice-baseline', baseUrl),
  }), [baseUrl])

  const agentCommands = useMemo(() => ({
    registryDoc: `${baseUrl}/registry/skill.md`,
    initWorkspace: buildAgenthubCliWorkspaceInitCommand(baseUrl),
    installPlan: 'agenthub-cli agent install-plan --assetType microservice --domain order --stage develop --topology crud-api --stack java21,spring-boot3,maven --json',
    applyPlan: 'agenthub-cli install --skill @global/java-microservice-baseline --base-url ' + baseUrl,
  }), [baseUrl])

  return (
    <section className="space-y-5 rounded-[28px] border border-border/60 bg-white/90 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <TerminalSquare className="h-3.5 w-3.5" />
            {t('onboarding.badge')}
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{t('onboarding.title')}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t('onboarding.subtitle')}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          <div className="font-semibold text-slate-700">{t('onboarding.tokenTitle')}</div>
          <div>{t('onboarding.tokenBody')}</div>
        </div>
      </div>

      <div className={`grid gap-5 ${compact ? 'xl:grid-cols-1' : 'xl:grid-cols-2'}`}>
        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{t('onboarding.human.title')}</h3>
              <p className="text-sm text-slate-500">{t('onboarding.human.subtitle')}</p>
            </div>
          </div>
          <CommandBlock
            title={t('onboarding.human.installTitle')}
            description={t('onboarding.human.installDescription')}
            code={humanCommands.installPackage}
          />
          <CommandBlock
            title={t('onboarding.human.loginTitle')}
            description={t('onboarding.human.loginDescription')}
            code={humanCommands.login}
          />
          <CommandBlock
            title={t('onboarding.human.verifyTitle')}
            description={t('onboarding.human.verifyDescription')}
            code={`${humanCommands.verify}\nagenthub-cli search --q spring-boot --assetType scaffold --json\n${humanCommands.installSkill}`}
          />
        </div>

        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{t('onboarding.agent.title')}</h3>
              <p className="text-sm text-slate-500">{t('onboarding.agent.subtitle')}</p>
            </div>
          </div>
          <CommandBlock
            title={t('onboarding.agent.docTitle')}
            description={t('onboarding.agent.docDescription')}
            code={`Read ${agentCommands.registryDoc}`}
          />
          <CommandBlock
            title={t('onboarding.agent.bootstrapTitle')}
            description={t('onboarding.agent.bootstrapDescription')}
            code={`${agentCommands.initWorkspace}\n${buildAgenthubCliWhoamiCommand()}`}
          />
          <CommandBlock
            title={t('onboarding.agent.planTitle')}
            description={t('onboarding.agent.planDescription')}
            code={`${agentCommands.installPlan}\n${agentCommands.applyPlan}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href="/dashboard/tokens"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <KeyRound className="h-4 w-4" />
          {t('onboarding.actions.openTokens')}
        </a>
        <a
          href="/registry/skill.md"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Bot className="h-4 w-4" />
          {t('onboarding.actions.openAgentDoc')}
        </a>
        <a
          href="/registry/claude-marketplace.json"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Bot className="h-4 w-4" />
          {t('onboarding.actions.openClaudeMarketplace')}
        </a>
      </div>
    </section>
  )
}
