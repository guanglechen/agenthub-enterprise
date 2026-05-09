import { Suspense, useEffect, useState } from 'react'
import { Outlet, Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Building2, ChevronRight, KeyRound, LayoutDashboard, Search as SearchIcon, ShieldCheck, UploadCloud } from 'lucide-react'
import { useAuth } from '@/features/auth/use-auth'
import { LanguageSwitcher } from '@/shared/components/language-switcher'
import { UserMenu } from '@/shared/components/user-menu'
import { NotificationBell } from '@/features/notification/notification-bell'
import { cn } from '@/shared/lib/utils'
import { getAppHeaderClassName } from './layout-header-style'
import { getAppMainContentLayout, resolveAppMainContentPathname } from './layout-main-content'

const PUBLIC_PATH_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/reset-password',
  '/privacy',
  '/terms',
  '/cli-auth',
]

function isPublicShellPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/'
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}

function isEnterpriseShellPath(pathname: string) {
  return !isPublicShellPath(pathname)
}

function resolveBreadcrumb(pathname: string) {
  if (pathname === '/search') {
    return {
      eyebrow: '企业技能广场',
      title: '发现并安装企业能力',
      description: '按资产类型、业务域、阶段和技术栈组织内部 Agent 资产。',
    }
  }

  if (pathname === '/skills') {
    return {
      eyebrow: '公共目录',
      title: '浏览平台基线能力',
      description: '从企业公共能力池查看已发布的产品方案、脚手架和治理能力。',
    }
  }

  if (pathname === '/dashboard/publish') {
    return {
      eyebrow: '发布中心',
      title: '发布并维护 Skill 资产',
      description: '同步版本、目录画像、标签和关联关系，让 Agent 可直接消费。',
    }
  }

  if (pathname === '/dashboard/namespaces' || pathname.startsWith('/dashboard/namespaces/')) {
    return {
      eyebrow: '团队空间',
      title: '维护业务域与命名空间',
      description: '管理私有目录、成员协作和评审入口。',
    }
  }

  if (pathname === '/dashboard/tokens') {
    return {
      eyebrow: '访问凭证',
      title: '管理自动化调用令牌',
      description: '为 CLI、插件和 Agent 分发可追踪的访问凭证。',
    }
  }

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return {
      eyebrow: '企业工作台',
      title: '统一查看 Agent 资产工作区',
      description: '聚合团队空间、推荐基线、最近维护资产和操作入口。',
    }
  }

  if (pathname.startsWith('/space/')) {
    return {
      eyebrow: '能力详情',
      title: '查看资产画像与关联能力',
      description: '围绕版本、治理、关系和推荐能力管理企业 Skill。',
    }
  }

  return {
    eyebrow: 'AgentHub Enterprise',
    title: '企业 AI 开发资产中心',
    description: '为企业内部 Agent、CLI 和插件提供统一的能力目录与分发工作区。',
  }
}

function isActiveNavItem(pathname: string, to: string) {
  if (to === '/dashboard') {
    return pathname === '/dashboard'
  }
  if (to === '/search') {
    return pathname === '/search' || pathname.startsWith('/space/')
  }
  if (to === '/skills') {
    return pathname === '/skills'
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * Application shell shared by all routed pages.
 *
 * It owns the global header, footer, language switcher, auth-aware navigation, and suspense
 * fallback used while lazy route modules are loading.
 */
export function Layout() {
  const { t } = useTranslation()
  const { pathname, resolvedPathname } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      resolvedPathname: s.resolvedLocation?.pathname,
    }),
  })
  const { user, isLoading } = useAuth()
  const [isHeaderElevated, setIsHeaderElevated] = useState(false)
  const contentLayoutPathname = resolveAppMainContentPathname(pathname, resolvedPathname)
  const mainContentLayout = getAppMainContentLayout(contentLayoutPathname)
  const enterpriseShell = isEnterpriseShellPath(pathname)
  const breadcrumb = resolveBreadcrumb(pathname)

  useEffect(() => {
    const updateHeaderElevation = () => {
      setIsHeaderElevated(window.scrollY > 0)
    }

    updateHeaderElevation()
    window.addEventListener('scroll', updateHeaderElevation, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateHeaderElevation)
    }
  }, [])

  const navItems: Array<{
    label: string
    to: string
    exact?: boolean
    auth?: boolean
  }> = [
    { label: t('nav.search'), to: '/search' },
    { label: t('nav.dashboard'), to: '/dashboard', auth: true },
    { label: t('nav.publish'), to: '/dashboard/publish', auth: true },
    { label: t('nav.mySkills'), to: '/dashboard/skills', auth: true },
  ]

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to
    // Keep matching strict so parent dashboard paths do not highlight unrelated child links.
    return pathname === to
  }

  const enterpriseNavItems: Array<{
    label: string
    description: string
    to: string
    auth?: boolean
    icon: typeof LayoutDashboard
  }> = [
    {
      label: '工作台',
      description: '总览与推荐基线',
      to: '/dashboard',
      auth: true,
      icon: LayoutDashboard,
    },
    {
      label: '技能广场',
      description: '按目录发现能力',
      to: '/search',
      icon: SearchIcon,
    },
    {
      label: '发布中心',
      description: '维护目录画像',
      to: '/dashboard/publish',
      auth: true,
      icon: UploadCloud,
    },
    {
      label: '团队空间',
      description: '命名空间与评审',
      to: '/dashboard/namespaces',
      auth: true,
      icon: Building2,
    },
    {
      label: '访问凭证',
      description: 'CLI 与插件令牌',
      to: '/dashboard/tokens',
      auth: true,
      icon: KeyRound,
    },
  ]

  if (enterpriseShell) {
    return (
      <div className="enterprise-shell-bg min-h-screen text-slate-950">
        <div className="flex min-h-screen">
          <aside className="enterprise-sidebar-surface hidden w-[292px] shrink-0 flex-col border-r border-white/10 lg:flex">
            <div className="border-b border-white/10 px-7 py-7">
              <Link to="/" className="block">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white">
                    A
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">AgentHub Enterprise</div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">Private Skill Workspace</div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex-1 px-5 py-6">
              <div className="mb-3 px-3 text-[11px] uppercase tracking-[0.24em] text-white/35">Navigation</div>
              <nav className="space-y-2">
                {enterpriseNavItems.map((item) => {
                  if (item.auth && !user) return null
                  const active = isActiveNavItem(pathname, item.to)
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="enterprise-sidebar-item"
                      data-active={active}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                        <div className="truncate text-xs text-white/45">{item.description}</div>
                      </div>
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-rose-300" />
                  Agent 接入提示
                </div>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  先通过本地插件或 CLI 连接平台，再根据 install-plan 拉取基础 skill 到 `.claude/skills`。
                </p>
                <Link
                  to="/dashboard/tokens"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
                >
                  查看凭证与 CLI
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </aside>

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 backdrop-blur">
              <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:px-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{breadcrumb.eyebrow}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{breadcrumb.title}</h1>
                      <span className="hidden rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 md:inline-flex">
                        Private Deployment
                      </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{breadcrumb.description}</p>
                  </div>

                  <div className="flex items-center gap-3 self-start text-[15px] text-slate-600">
                    <LanguageSwitcher />
                    {user && <NotificationBell />}
                    {isLoading ? null : user ? (
                      <UserMenu user={user} />
                    ) : (
                      <Link
                        to="/login"
                        search={{ returnTo: '' }}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
                      >
                        {t('nav.login')}
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:hidden">
                  {enterpriseNavItems.map((item) => {
                    if (item.auth && !user) return null
                    const active = isActiveNavItem(pathname, item.to)
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>

                <div className="hidden items-center gap-3 xl:flex">
                  <Link
                    to="/search"
                    search={{ q: '', sort: 'recommended', page: 0, starredOnly: false }}
                    className="flex min-w-[380px] items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.35)] transition-colors hover:bg-slate-50"
                  >
                    <SearchIcon className="h-4 w-4" />
                    搜索技能、脚手架、业务能力或治理组件
                  </Link>
                  {user ? (
                    <Link
                      to="/dashboard/publish"
                      className="rounded-full bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(215,0,15,0.65)] transition-transform hover:-translate-y-0.5"
                    >
                      发布 Skill
                    </Link>
                  ) : null}
                </div>
              </div>
            </header>

            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
              <Suspense
                fallback={
                  <div className="space-y-4 animate-fade-up">
                    <div className="h-10 w-48 animate-shimmer rounded-lg" />
                    <div className="h-5 w-72 animate-shimmer rounded-md" />
                    <div className="h-64 animate-shimmer rounded-xl" />
                  </div>
                }
              >
                <div className={mainContentLayout.contentClassName}>
                  <Outlet />
                </div>
              </Suspense>
            </main>

            <footer className="border-t border-slate-200/80 bg-white/72 px-5 py-4 text-xs text-slate-500 backdrop-blur sm:px-6 lg:px-10">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <span>AgentHub Enterprise · 企业 AI 开发资产中心</span>
                <div className="flex items-center gap-2">
                  <span>Skill / Plugin / CLI / Agent</span>
                  <span className="text-slate-300">|</span>
                  <Link to="/privacy" className="transition-colors hover:text-slate-900">
                    {t('footer.privacy')}
                  </Link>
                  <span className="text-slate-300">|</span>
                  <Link to="/terms" className="transition-colors hover:text-slate-900">
                    {t('footer.terms')}
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-clip" style={{ background: 'var(--bg-page, hsl(var(--background)))' }}>
      {/* Decorative gradient orb */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[500px] rounded-full opacity-90 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at 70% 20%, rgba(184,94,255,0.25) 0%, rgba(106,109,255,0.15) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Header */}
      <header className={getAppHeaderClassName(isHeaderElevated)} style={{ borderColor: 'hsl(var(--border))' }}>
        <Link to="/" className="text-xl font-semibold tracking-tight text-brand-gradient">
          AgentHub
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[15px] font-normal" style={{ color: 'hsl(var(--text-secondary))' }}>
          {navItems.map((item) => {
            if (item.auth && !user) return null
            const active = isActive(item.to, item.exact)

            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? 'px-4 py-1.5 rounded-full bg-brand-gradient text-white shadow-sm'
                    : 'hover:opacity-80 transition-opacity duration-150'
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-6 text-[15px] font-normal" style={{ color: 'hsl(var(--text-secondary))' }}>
          <LanguageSwitcher />
          {user && <NotificationBell />}
          {isLoading ? null : user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              to="/login"
              search={{ returnTo: '' }}
              className="hover:opacity-80 transition-opacity"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className={mainContentLayout.mainClassName}>
        <Suspense
          fallback={
            <div className="space-y-4 animate-fade-up">
              <div className="h-10 w-48 animate-shimmer rounded-lg" />
              <div className="h-5 w-72 animate-shimmer rounded-md" />
              <div className="h-64 animate-shimmer rounded-xl" />
            </div>
          }
        >
          <div className={mainContentLayout.contentClassName}>
            <Outlet />
          </div>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t rounded-t-2xl mt-auto" style={{ background: '#F1F5F9', borderColor: 'hsl(var(--border))' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 md:gap-12">
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm bg-brand-gradient">
                  A
                </div>
                <span className="text-lg font-bold text-brand-gradient">AgentHub</span>
              </div>
              <p className="text-sm max-w-xs" style={{ color: 'hsl(var(--text-secondary))' }}>
                {t('layout.footerDescription')}
              </p>
            </div>
            <div className="flex flex-wrap gap-12 md:gap-16">
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                  {t('nav.home')}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/" className="hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--text-secondary))' }}>
                      {t('nav.home')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/search"
                      search={{ q: '', sort: 'relevance', page: 0, starredOnly: false }}
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: 'hsl(var(--text-secondary))' }}
                    >
                      {t('nav.search')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--text-secondary))' }}>
                      {t('nav.dashboard')}
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                  {t('footer.resources')}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--text-secondary))' }}>
                      {t('footer.docs')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--text-secondary))' }}>
                      {t('footer.api')}
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--text-secondary))' }}>
                      {t('footer.community')}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div
            className="mt-10 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
          >
            <span>{t('footer.copyright')}</span>
            <div className="flex items-center gap-2">
              <Link to="/privacy" className="hover:opacity-80 transition-opacity">
                {t('footer.privacy')}
              </Link>
              <span>|</span>
              <Link to="/terms" className="hover:opacity-80 transition-opacity">
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
