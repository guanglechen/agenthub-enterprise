import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Boxes, Building2, FolderCog, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { useAuth } from '@/features/auth/use-auth'
import type { SkillSummary } from '@/api/types'
import { useMySkills } from '@/shared/hooks/use-user-queries'
import { useMyNamespaces } from '@/shared/hooks/use-namespace-queries'
import { useSearchSkills } from '@/shared/hooks/use-skill-queries'
import { canViewGovernanceCenter } from '@/shared/lib/governance-access'
import { buildCatalogBadgeSummary } from '@/shared/lib/catalog'
import { getHeadlineVersion } from '@/shared/lib/skill-lifecycle'
import { TokenList } from '@/features/token/token-list'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { APP_SHELL_PAGE_CLASS_NAME } from '@/app/page-shell-style'
import { AgenthubOnboardingGuide } from '@/shared/components/agenthub-onboarding-guide'
import { AgentDiscoveryPanel } from '@/shared/components/agent-discovery-panel'
import { ASSET_FAMILY_OPTIONS } from '@/shared/lib/asset-taxonomy'
import { limitPreviewItems } from './dashboard-preview'

const DASHBOARD_PREVIEW_LIMIT = 5

/**
 * Default dashboard landing page for authenticated users.
 *
 * It surfaces account context, quick links, and a lightweight preview of the user's latest skills
 * and tokens before they move into more specialized dashboard sub-pages.
 */
export function DashboardPage() {
  const skillPreviewPageSize = DASHBOARD_PREVIEW_LIMIT
  const { t } = useTranslation()
  const { user } = useAuth()
  const governanceVisible = canViewGovernanceCenter(user?.platformRoles)
  const { data: skillPage, isLoading: isLoadingSkills } = useMySkills({ page: 0, size: skillPreviewPageSize })
  const { data: namespaces, isLoading: isLoadingNamespaces } = useMyNamespaces()
  const { data: scaffoldAssets, isLoading: isLoadingScaffolds } = useSearchSkills({
    assetType: 'scaffold',
    sort: 'recommended',
    size: 4,
  })
  const { data: qualityAssets, isLoading: isLoadingQuality } = useSearchSkills({
    assetType: 'quality',
    sort: 'recommended',
    size: 4,
  })
  const skillPreview = limitPreviewItems<SkillSummary>(skillPage?.items ?? [], DASHBOARD_PREVIEW_LIMIT)
  const teamSpaces = namespaces?.filter((namespace) => namespace.type === 'TEAM') ?? []
  const recommendedAssets = [...(scaffoldAssets?.items ?? []), ...(qualityAssets?.items ?? [])].slice(0, 4)
  const workspaceStats = [
    {
      label: '团队空间',
      value: isLoadingNamespaces ? '...' : String(teamSpaces.length),
      hint: '私有化团队目录',
      icon: Building2,
    },
    {
      label: '我的 Skill',
      value: isLoadingSkills ? '...' : String(skillPage?.total ?? skillPreview.items.length),
      hint: '可继续维护与发布',
      icon: Boxes,
    },
    {
      label: '推荐基线',
      value: isLoadingScaffolds || isLoadingQuality ? '...' : String(recommendedAssets.length),
      hint: '脚手架与质量治理',
      icon: ShieldCheck,
    },
    {
      label: '治理状态',
      value: governanceVisible ? 'ON' : 'STD',
      hint: governanceVisible ? '治理中心已启用' : '标准模式',
      icon: FolderCog,
    },
  ]

  return (
    <div className={APP_SHELL_PAGE_CLASS_NAME}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <section className="enterprise-panel enterprise-surface-stripe p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Enterprise Agent Workbench
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{t('dashboard.title')}</h1>
                <p className="max-w-2xl text-base leading-7" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {t('dashboard.subtitle')} 这里聚合团队空间、推荐基线、最近维护能力和凭证入口，方便你按企业交付流程组织 Agent 资产。
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                to="/dashboard/publish"
                className="rounded-2xl bg-brand-gradient px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(215,0,15,0.65)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-4">
                  发布新 Skill
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div className="mt-2 text-xs font-normal text-white/80">补齐目录画像、关系和标签</div>
              </Link>
              <Link
                to="/agent"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-4">
                  连接 Agent
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div className="mt-2 text-xs font-normal text-slate-500">CLI、插件与 install-plan</div>
              </Link>
              <Link
                to="/search"
                search={{ q: '', sort: 'recommended', page: 0, starredOnly: false }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-4">
                  浏览技能广场
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div className="mt-2 text-xs font-normal text-slate-500">按业务域、阶段和拓扑挑选能力</div>
              </Link>
            </div>
          </div>
        </section>

        <section className="enterprise-panel p-6">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-16 w-16 rounded-2xl border border-border/60 shadow-card"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-semibold text-white">
                {(user?.displayName ?? 'A').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <div className="text-xl font-semibold font-heading">{user?.displayName}</div>
              <div className="truncate text-sm text-muted-foreground">{user?.email}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{user?.oauthProvider ?? 'LOCAL'} 登录</div>
            </div>
          </div>
          {user?.platformRoles && user.platformRoles.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="text-sm font-medium font-heading">{t('dashboard.platformRoles')}</div>
              <div className="flex flex-wrap gap-2">
                {user.platformRoles.map((role: string) => (
                  <span key={role} className="role-pill">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link to="/dashboard/namespaces" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
              管理团队空间
            </Link>
            <Link to="/dashboard/tokens" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
              查看访问凭证
            </Link>
          </div>
        </section>
      </div>

      <AgentDiscoveryPanel />

      <section className="enterprise-panel p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Skill market taxonomy</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">平台资产族</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              所有内容仍以 Skill 包分发，但页面按插件、知识、工具、业务能力和 Harness 场景组织，方便人和 Agent 快速判断该安装什么。
            </p>
          </div>
          <Link
            to="/search"
            search={{ q: '', sort: 'recommended', page: 0, starredOnly: false }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            进入技能广场
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {ASSET_FAMILY_OPTIONS.map((family) => (
            <Link
              key={family.id}
              to="/search"
              search={{
                q: family.search.q ?? '',
                assetType: family.search.assetType,
                stage: family.search.stage,
                topology: family.search.topology,
                stack: family.search.stack,
                label: family.search.label,
                sort: family.search.sort ?? 'recommended',
                page: 0,
                starredOnly: false,
              }}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
            >
              <div className="text-sm font-semibold text-slate-950">{family.title}</div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{family.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workspaceStats.map((item) => (
          <div key={item.label} className="enterprise-panel enterprise-stat-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{item.label}</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                <div className="mt-2 text-sm text-slate-500">{item.hint}</div>
              </div>
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <AgenthubOnboardingGuide />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card className="enterprise-panel border-0 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    推荐能力基线
                  </CardTitle>
                  <CardDescription>根据企业目录和推荐排序，优先给你当前工作台补齐脚手架与质量治理能力。</CardDescription>
                </div>
                <Link to="/search" search={{ q: '', sort: 'recommended', page: 0, starredOnly: false }} className="text-sm font-semibold text-primary hover:underline">
                  查看全部
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingScaffolds || isLoadingQuality ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-28 animate-shimmer rounded-2xl" />
                  ))}
                </div>
              ) : recommendedAssets.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {recommendedAssets.map((skill) => (
                    <Link
                      key={skill.id}
                      to="/space/$namespace/$slug"
                      params={{ namespace: skill.namespace, slug: encodeURIComponent(skill.slug) }}
                      className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-950">{skill.displayName}</div>
                          <div className="mt-1 truncate text-xs text-slate-500">@{skill.namespace}</div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                          {skill.catalogProfile?.assetType ?? 'catalog'}
                        </span>
                      </div>
                      {skill.summary ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{skill.summary}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {buildCatalogBadgeSummary(skill.catalogProfile).slice(0, 3).map((badge) => (
                          <span key={badge} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">当前还没有可推荐的企业基线，请先在技能广场中补充脚手架或质量治理能力。</div>
              )}
            </CardContent>
          </Card>

          <Card className="enterprise-panel border-0 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>{t('mySkills.title')}</CardTitle>
                  <CardDescription>{t('dashboard.mySkillsPreviewDescription')}</CardDescription>
                </div>
                <Link to="/dashboard/skills" className="text-sm font-semibold text-primary hover:underline">
                  {t('dashboard.openMySkills')}
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {isLoadingSkills ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Array.from({ length: DASHBOARD_PREVIEW_LIMIT }).map((_, index) => (
                    <div key={index} className="h-24 animate-shimmer rounded-2xl" />
                  ))}
                </div>
              ) : skillPreview.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {skillPreview.items.map((skill) => (
                    <Link
                      key={skill.id}
                      to="/space/$namespace/$slug"
                      params={{ namespace: skill.namespace, slug: encodeURIComponent(skill.slug) }}
                      className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="truncate text-sm font-semibold text-slate-950">{skill.displayName}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">@{skill.namespace}</div>
                      {skill.summary ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{skill.summary}</p> : null}
                      {getHeadlineVersion(skill) ? (
                        <div className="mt-4 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                          v{getHeadlineVersion(skill)?.version}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t('dashboard.mySkillsPreviewEmpty')}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="enterprise-panel border-0 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>团队空间</CardTitle>
              </div>
              <CardDescription>面向业务域、产品线和交付团队组织私有 Skill 目录与评审流。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingNamespaces ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-shimmer rounded-2xl" />
                ))
              ) : teamSpaces.length > 0 ? (
                teamSpaces.slice(0, 4).map((namespace) => (
                  <Link
                    key={namespace.id}
                    to="/space/$namespace"
                    params={{ namespace: namespace.slug }}
                    className="block rounded-[22px] border border-slate-200 bg-white px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{namespace.displayName}</div>
                        <div className="mt-1 text-xs text-slate-500">@{namespace.slug}</div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                        {namespace.currentUserRole ?? 'MEMBER'}
                      </span>
                    </div>
                    {namespace.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{namespace.description}</p> : null}
                  </Link>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">当前没有可管理的团队空间，可先在命名空间管理中创建企业目录。</div>
              )}
              <Link to="/dashboard/namespaces" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                进入命名空间管理
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="enterprise-panel border-0 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>操作入口</CardTitle>
              </div>
              <CardDescription>把常用入口集中到工作台，减少在多个页面之间切换。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link to="/dashboard/stars" className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                {t('dashboard.viewStars')}
              </Link>
              <Link to="/dashboard/subscriptions" className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                {t('dashboard.viewSubscriptions')}
              </Link>
              <Link to="/dashboard/tokens" className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                {t('dashboard.openTokens')}
              </Link>
              {governanceVisible ? (
                <Link to="/dashboard/governance" className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  {t('dashboard.viewGovernance')}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <div className="enterprise-panel p-6">
            <TokenList />
          </div>
        </div>
      </div>
    </div>
  )
}
