import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { normalizeSearchQuery } from '@/shared/lib/search-query'
import { PackageOpen, Terminal, Shield, Users, GitBranch, Search as SearchIcon, Settings, Workflow, Boxes } from 'lucide-react'
import { LandingQuickStartSection } from '@/shared/components/landing-quick-start'
import { SkillCard } from '@/features/skill/skill-card'
import { SkeletonList } from '@/shared/components/skeleton-loader'
import { useSearchSkills } from '@/shared/hooks/use-skill-queries'
import { useInView } from '@/shared/hooks/use-in-view'
import { Button } from '@/shared/ui/button'
import { ASSET_TYPE_OPTIONS } from '@/shared/lib/catalog'

/**
 * Marketing-style landing page for unauthenticated and first-time visitors.
 *
 * The page mixes static positioning content with live skill queries so popular and latest skills
 * stay aligned with the current registry state.
 */
export function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: scaffoldAssets, isLoading: isLoadingScaffolds } = useSearchSkills({
    assetType: 'scaffold',
    sort: 'recommended',
    size: 3,
  })

  const { data: microserviceAssets, isLoading: isLoadingMicroservices } = useSearchSkills({
    assetType: 'microservice',
    sort: 'downloads',
    size: 3,
  })

  const { data: qualityAssets, isLoading: isLoadingQuality } = useSearchSkills({
    assetType: 'quality',
    sort: 'newest',
    size: 3,
  })

  const handleSkillClick = (namespace: string, slug: string) => {
    navigate({ to: `/space/${namespace}/${encodeURIComponent(slug)}` })
  }

  const heroView = useInView()
  const statsView = useInView()
  const featuresView = useInView()
  const quickStartView = useInView()
  const catalogView = useInView()
  const liveSectionsView = useInView()

  const handleSearch = (query: string) => {
    const normalized = normalizeSearchQuery(query)
    navigate({
      to: '/search',
      search: { q: normalized, sort: 'relevance', page: 0, starredOnly: false },
    })
  }

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-white" strokeWidth={2} />,
      title: t('landing.features.secure.title'),
      description: t('landing.features.secure.description'),
    },
    {
      icon: <Users className="w-6 h-6 text-white" strokeWidth={2} />,
      title: t('landing.features.community.title'),
      description: t('landing.features.community.description'),
    },
    {
      icon: <PackageOpen className="w-6 h-6 text-white" strokeWidth={2} />,
      title: t('landing.features.integration.title'),
      description: t('landing.features.integration.description'),
    },
    {
      icon: <GitBranch className="w-6 h-6 text-white" strokeWidth={2} />,
      title: t('landing.features.versionControl.title', { defaultValue: 'Version control' }),
      description: t('landing.features.versionControl.description', { defaultValue: 'Managed release flows keep skill packages traceable and easier to review.' }),
    },
    {
      icon: <Terminal className="w-6 h-6 text-white" strokeWidth={2} />,
      title: t('landing.features.cli.title', { defaultValue: 'CLI tooling' }),
      description: t('landing.features.cli.description', { defaultValue: 'Command-line workflows support publishing, installing, and operating skills quickly.' }),
    },
    {
      icon: <Settings className="w-6 h-6 text-white" strokeWidth={2} />,
      title: t('landing.features.governance.title', { defaultValue: 'Governance' }),
      description: t('landing.features.governance.description', { defaultValue: 'Built-in review and permission flows help teams enforce skill quality.' }),
    },
  ]

  const stats = [
    { value: '6', label: '一级资产目录' },
    { value: 'CLI', label: 'Agent 入口' },
    { value: '24/7', label: '团队复用能力' },
  ]

  return (
    <>
      {/* Hero Section */}
      <main ref={heroView.ref} className={`relative z-10 flex flex-col items-center pt-16 pb-20 px-4 md:pt-24 scroll-fade-up${heroView.inView ? ' in-view' : ''}`}>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-brand-gradient mb-4">
          AgentHub
        </h1>
        <h2
          className="text-xl md:text-2xl font-semibold tracking-tight text-center mb-3"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {t('landing.hero.title')}
        </h2>
        <p
          className="text-base md:text-lg text-center max-w-2xl mb-10 leading-relaxed"
          style={{ color: 'hsl(var(--text-secondary))' }}
        >
          {t('landing.hero.subtitle')}
        </p>

        {/* Search box */}
        <div className="w-full max-w-2xl mb-8">
          <div
            className="flex items-center bg-white rounded-xl border shadow-sm px-5 py-3.5"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <SearchIcon className="w-5 h-5 flex-shrink-0 mr-3" style={{ color: 'hsl(var(--text-placeholder))' }} strokeWidth={1.5} />
            <input
              type="text"
              placeholder={t('landing.hero.searchPlaceholder')}
              className="hero-input flex-1 bg-transparent outline-none text-base"
              style={{ color: 'hsl(var(--foreground))' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch((e.target as HTMLInputElement).value)
                }
              }}
            />
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-14">
          <Link
            to="/search"
            search={{ q: '', sort: 'relevance', page: 0, starredOnly: false }}
            className="px-8 py-3.5 rounded-xl text-base font-medium text-white bg-brand-gradient shadow-sm hover:opacity-95 transition-opacity"
          >
            {t('landing.hero.exploreSkills')}
          </Link>
          <Link
            to="/dashboard/publish"
            className="px-8 py-3.5 rounded-xl text-base font-medium border transition-colors"
            style={{
              background: 'hsl(var(--secondary))',
              borderColor: 'hsl(var(--muted-foreground))',
              color: 'hsl(var(--muted-foreground))',
            }}
          >
            {t('landing.hero.publishSkill', { defaultValue: '开始构建' })}
          </Link>
        </div>

        {/* Stats */}
        <div ref={statsView.ref} className={`flex flex-row justify-center gap-16 md:gap-24 scroll-fade-up${statsView.inView ? ' in-view' : ''}`} style={{ transitionDelay: '0.15s' }}>
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-bold tracking-tight text-brand-gradient mb-1">
                {stat.value}
              </span>
              <span className="text-sm font-normal" style={{ color: 'hsl(var(--foreground))' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Features Section */}
      <section ref={featuresView.ref} className={`relative z-10 w-full py-20 md:py-24 px-6 scroll-fade-up${featuresView.inView ? ' in-view' : ''}`} style={{ background: 'var(--bg-page, hsl(var(--background)))' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: 'hsl(var(--foreground))' }}>
              {t('landing.whySkillHub.title', { defaultValue: '为什么选择 SkillHub' })}
            </h2>
            <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'hsl(var(--text-secondary))' }}>
              {t('landing.whySkillHub.subtitle', { defaultValue: '专为企业打造的私有化 Agent 技能管理平台' })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-8 border shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: 'hsl(var(--border-card))' }}
              >
                <div className="feature-icon w-12 h-12 rounded-2xl flex items-center justify-center mb-6 mx-auto bg-brand-gradient">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-center mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-center leading-relaxed" style={{ color: 'hsl(var(--text-secondary))' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <div ref={quickStartView.ref} className={`scroll-fade-up${quickStartView.inView ? ' in-view' : ''}`}>
        <LandingQuickStartSection />
      </div>

      <section ref={catalogView.ref} className={`relative z-10 w-full py-16 px-6 scroll-fade-up${catalogView.inView ? ' in-view' : ''}`} style={{ background: 'var(--bg-page, hsl(var(--background)))' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">企业开发资产目录</h2>
            <p className="text-muted-foreground">围绕产品方案、脚手架、业务域、微服务和质量治理组织企业内部能力。</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ASSET_TYPE_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-[24px] border p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg delay-${Math.min(index + 1, 6)}`}
                style={{
                  borderColor: 'rgba(15,23,42,0.08)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)',
                }}
                onClick={() => navigate({
                  to: '/search',
                  search: { q: '', assetType: option.value, sort: 'recommended', page: 0, starredOnly: false },
                })}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    {index % 3 === 0 ? <Boxes className="h-5 w-5" /> : index % 3 === 1 ? <Workflow className="h-5 w-5" /> : <PackageOpen className="h-5 w-5" />}
                  </div>
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Catalog</span>
                </div>
                <div className="text-xl font-semibold text-foreground">{option.label}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {option.value === 'product' && '沉淀产品方案、交付清单和实施边界。'}
                  {option.value === 'scaffold' && '统一工程初始化、模板注入和基础骨架。'}
                  {option.value === 'business' && '沉淀业务域规则、上下文和作业流。'}
                  {option.value === 'microservice' && '封装微服务研发、接口、契约和调试技能。'}
                  {option.value === 'quality' && '连接测试、门禁、扫描和质量策略。'}
                  {option.value === 'integration' && '对接流水线、平台工具和基础设施能力。'}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section ref={liveSectionsView.ref} className={`relative z-10 w-full py-20 md:py-24 px-6 scroll-fade-up${liveSectionsView.inView ? ' in-view' : ''}`} style={{ background: 'var(--bg-page, hsl(var(--background)))' }}>
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                研发闭环中的重点资产
              </h2>
              <p style={{ color: 'hsl(var(--text-secondary))' }}>按研发链路快速定位脚手架、微服务能力和质量治理资产。</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate({ to: '/search', search: { q: '', sort: 'recommended', page: 0, starredOnly: false } })}
            >
              查看全部
            </Button>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">开发脚手架</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/search', search: { q: '', assetType: 'scaffold', sort: 'recommended', page: 0, starredOnly: false } })}>
                  更多
                </Button>
              </div>
              {isLoadingScaffolds ? <SkeletonList count={3} /> : scaffoldAssets?.items.map((skill) => (
                <SkillCard key={skill.id} skill={skill} onClick={() => handleSkillClick(skill.namespace, skill.slug)} />
              ))}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">微服务 Skill</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/search', search: { q: '', assetType: 'microservice', sort: 'downloads', page: 0, starredOnly: false } })}>
                  更多
                </Button>
              </div>
              {isLoadingMicroservices ? <SkeletonList count={3} /> : microserviceAssets?.items.map((skill) => (
                <SkillCard key={skill.id} skill={skill} onClick={() => handleSkillClick(skill.namespace, skill.slug)} />
              ))}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">质量治理</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/search', search: { q: '', assetType: 'quality', sort: 'newest', page: 0, starredOnly: false } })}>
                  更多
                </Button>
              </div>
              {isLoadingQuality ? <SkeletonList count={3} /> : qualityAssets?.items.map((skill) => (
                <SkillCard key={skill.id} skill={skill} onClick={() => handleSkillClick(skill.namespace, skill.slug)} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
