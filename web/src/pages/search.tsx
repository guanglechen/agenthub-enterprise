import { startTransition, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Filter, Loader2, Search as SearchIcon, Sparkles } from 'lucide-react'
import type { SkillSummary } from '@/api/types'
import { useAuth } from '@/features/auth/use-auth'
import { SearchBar } from '@/features/search/search-bar'
import { SkillCard } from '@/features/skill/skill-card'
import { ASSET_TYPE_OPTIONS, STAGE_OPTIONS, TOPOLOGY_OPTIONS, getCatalogOptionLabel } from '@/shared/lib/catalog'
import { SkeletonList } from '@/shared/components/skeleton-loader'
import { EmptyState } from '@/shared/components/empty-state'
import { Pagination } from '@/shared/components/pagination'
import { useSearchSkills } from '@/shared/hooks/use-skill-queries'
import { useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { useMyStars } from '@/shared/hooks/use-user-queries'
import { normalizeSearchQuery } from '@/shared/lib/search-query'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, normalizeSelectValue } from '@/shared/ui/select'
import { APP_SHELL_PAGE_CLASS_NAME } from '@/app/page-shell-style'
import { MARKETPLACE_INTENT_OPTIONS } from '@/shared/lib/asset-taxonomy'

const PAGE_SIZE = 12
const EMPTY_SELECT_VALUE = '__all__'

function blurActiveElement() {
  if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
    return
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

function scrollToTopOnPageChange() {
  if (typeof window === 'undefined') {
    return () => {}
  }

  let secondFrame = 0
  const firstFrame = window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    secondFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
  })

  return () => {
    window.cancelAnimationFrame(firstFrame)
    if (secondFrame) {
      window.cancelAnimationFrame(secondFrame)
    }
  }
}

/**
 * Skill discovery page with synchronized URL state.
 *
 * Search text, sorting, pagination, and the starred-only filter are mirrored into router search
 * params so the page can be shared, restored, and revisited without losing state.
 */
function filterStarredSkills(skills: SkillSummary[], query: string): SkillSummary[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return skills
  }

  return skills.filter((skill) =>
    [skill.displayName, skill.summary, skill.namespace, skill.slug]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery))
  )
}

function sortStarredSkills(skills: SkillSummary[], sort: string): SkillSummary[] {
  const sorted = [...skills]
  if (sort === 'downloads') {
    return sorted.sort((left, right) => right.downloadCount - left.downloadCount)
  }
  if (sort === 'newest' || sort === 'relevance') {
    return sorted.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  }
  return sorted
}

export function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const searchParams = useSearch({ from: '/search' })
  const { isAuthenticated, isLoading: isAuthLoading, isFetching: isAuthFetching } = useAuth()

  const q = normalizeSearchQuery(searchParams.q || '')
  const selectedLabel = searchParams.label || ''
  const assetType = searchParams.assetType || ''
  const domain = searchParams.domain || ''
  const stage = searchParams.stage || ''
  const topology = searchParams.topology || ''
  const stack = searchParams.stack || ''
  const sort = searchParams.sort || 'newest'
  const page = searchParams.page ?? 0
  const starredOnly = searchParams.starredOnly ?? false
  const [queryInput, setQueryInput] = useState(q)
  const [domainInput, setDomainInput] = useState(domain)
  const [stackInput, setStackInput] = useState(stack)
  const previousPageRef = useRef(page)

  const buildSearchState = (overrides: Partial<{
    q: string
    label: string
    assetType: string
    domain: string
    stage: string
    topology: string
    stack: string
    sort: string
    page: number
    starredOnly: boolean
  }> = {}) => ({
    q: overrides.q ?? q,
    label: overrides.label ?? selectedLabel,
    assetType: overrides.assetType ?? (assetType || undefined),
    domain: overrides.domain ?? (domain || undefined),
    stage: overrides.stage ?? (stage || undefined),
    topology: overrides.topology ?? (topology || undefined),
    stack: overrides.stack ?? (stack || undefined),
    sort: overrides.sort ?? sort,
    page: overrides.page ?? page,
    starredOnly: overrides.starredOnly ?? starredOnly,
  })

  useEffect(() => {
    setQueryInput(q)
  }, [q])

  useEffect(() => {
    setDomainInput(domain)
  }, [domain])

  useEffect(() => {
    setStackInput(stack)
  }, [stack])

  useEffect(() => {
    if (previousPageRef.current !== page) {
      blurActiveElement()
      const cleanupScroll = scrollToTopOnPageChange()

      previousPageRef.current = page
      return () => {
        cleanupScroll()
      }
    }

    previousPageRef.current = page
  }, [page])

  const { data, isLoading, isFetching } = useSearchSkills({
    q,
    label: selectedLabel || undefined,
    assetType: assetType || undefined,
    domain: domain || undefined,
    stage: stage || undefined,
    topology: topology || undefined,
    stack: stack || undefined,
    sort,
    page,
    size: PAGE_SIZE,
    starredOnly,
  }, !isAuthLoading && !isAuthFetching)
  const { data: labels } = useVisibleLabels()
  const {
    data: starredSkills,
    isLoading: isLoadingStarred,
    isFetching: isFetchingStarred,
  } = useMyStars(starredOnly && isAuthenticated)
  useEffect(() => {
    // Debounce URL updates while the user is typing so query state stays shareable without
    // triggering a navigation on every keystroke.
    const normalizedQuery = normalizeSearchQuery(queryInput)
    if (normalizedQuery === q) {
      return
    }

    if (!normalizedQuery) {
      startTransition(() => {
        navigate({
          to: '/search',
          search: buildSearchState({ q: '', page: 0 }),
          replace: page === 0,
        })
      })
      return
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        navigate({
          to: '/search',
          search: buildSearchState({ q: normalizedQuery, page: 0 }),
          replace: true,
        })
      })
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [assetType, buildSearchState, domain, navigate, page, q, queryInput, selectedLabel, sort, stack, stage, starredOnly, topology])

  useEffect(() => {
    const normalizedDomain = domainInput.trim().toLowerCase()
    if (normalizedDomain === domain) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        navigate({
          to: '/search',
          search: buildSearchState({ domain: normalizedDomain, page: 0 }),
          replace: true,
        })
      })
    }, 250)
    return () => window.clearTimeout(timeoutId)
  }, [buildSearchState, domain, domainInput, navigate])

  useEffect(() => {
    const normalizedStack = stackInput.trim().toLowerCase()
    if (normalizedStack === stack) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        navigate({
          to: '/search',
          search: buildSearchState({ stack: normalizedStack, page: 0 }),
          replace: true,
        })
      })
    }, 250)
    return () => window.clearTimeout(timeoutId)
  }, [buildSearchState, navigate, stack, stackInput])

  const handleSearch = (query: string) => {
    const normalizedQuery = normalizeSearchQuery(query)
    setQueryInput(query)
    startTransition(() => {
      navigate({
        to: '/search',
        search: buildSearchState({ q: normalizedQuery, page: 0 }),
        replace: true,
      })
    })
  }

  const handleSortChange = (newSort: string) => {
    navigate({ to: '/search', search: buildSearchState({ sort: newSort, page: 0 }) })
  }

  const handlePageChange = (newPage: number) => {
    blurActiveElement()
    navigate({ to: '/search', search: buildSearchState({ page: newPage }) })
  }

  const handleLabelToggle = (label: string) => {
    const nextLabel = selectedLabel === label ? '' : label
    navigate({ to: '/search', search: buildSearchState({ label: nextLabel, page: 0 }) })
  }

  const handleFilterChange = (next: Partial<{
    assetType: string
    domain: string
    stage: string
    topology: string
    stack: string
  }>) => {
    navigate({
      to: '/search',
      search: buildSearchState({ ...next, page: 0 }),
    })
  }

  const handleIntentSelect = (intent: (typeof MARKETPLACE_INTENT_OPTIONS)[number]) => {
    setQueryInput(intent.search.q ?? '')
    setDomainInput('')
    setStackInput(intent.search.stack ?? '')
    navigate({
      to: '/search',
      search: buildSearchState({
        q: intent.search.q ?? '',
        label: intent.search.label ?? '',
        assetType: intent.search.assetType ?? '',
        stage: intent.search.stage ?? '',
        topology: intent.search.topology ?? '',
        stack: intent.search.stack ?? '',
        sort: intent.search.sort ?? 'recommended',
        page: 0,
        starredOnly: false,
      }),
    })
  }

  const handleStarredToggle = () => {
    if (!isAuthenticated) {
      navigate({
        to: '/login',
        search: {
          returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        },
      })
      return
    }

    navigate({ to: '/search', search: buildSearchState({ page: 0, starredOnly: !starredOnly }) })
  }

  const handleSkillClick = (namespace: string, slug: string) => {
    navigate({ to: `/space/${namespace}/${encodeURIComponent(slug)}` })
  }

  const filteredStarredSkills = starredOnly
    ? sortStarredSkills(filterStarredSkills(starredSkills ?? [], q), sort)
    : []
  const starredPageItems = starredOnly
    ? filteredStarredSkills.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : []
  const totalPages = starredOnly
    ? Math.ceil(filteredStarredSkills.length / PAGE_SIZE)
    : data
      ? Math.ceil(data.total / data.size)
      : 0
  const displayItems = starredOnly ? starredPageItems : (data?.items ?? [])
  const isPageLoading = starredOnly ? isLoadingStarred : isLoading
  const isUpdatingResults = starredOnly ? isFetchingStarred && !isLoadingStarred : isFetching && !isLoading
  const resultCount = starredOnly ? filteredStarredSkills.length : (data?.total ?? 0)
  const activeFilters = [
    assetType ? `资产类型 · ${getCatalogOptionLabel(ASSET_TYPE_OPTIONS, assetType) ?? assetType}` : null,
    stage ? `阶段 · ${getCatalogOptionLabel(STAGE_OPTIONS, stage) ?? stage}` : null,
    topology ? `拓扑 · ${getCatalogOptionLabel(TOPOLOGY_OPTIONS, topology) ?? topology}` : null,
    domain ? `业务域 · ${domain}` : null,
    stack ? `技术栈 · ${stack}` : null,
    selectedLabel ? `标签 · ${labels?.find((item) => item.slug === selectedLabel)?.displayName ?? selectedLabel}` : null,
    starredOnly ? '仅看收藏' : null,
  ].filter(Boolean) as string[]

  const handleResetFilters = () => {
    setDomainInput('')
    setStackInput('')
    setQueryInput('')
    navigate({
      to: '/search',
      search: {
        q: '',
        sort: 'recommended',
        page: 0,
        starredOnly: false,
      },
    })
  }

  return (
    <div className={APP_SHELL_PAGE_CLASS_NAME}>
      <section className="enterprise-panel enterprise-surface-stripe p-8">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
            <SearchIcon className="h-3.5 w-3.5" />
            Enterprise Marketplace
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-slate-950">技能广场</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              先搜索，再用左侧筛选收敛。场景按钮只负责快速填充搜索条件，避免在广场里重复堆叠多套发现入口。
            </p>
          </div>
          <SearchBar
            value={queryInput}
            isSearching={isUpdatingResults}
            onChange={setQueryInput}
            onSearch={handleSearch}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {MARKETPLACE_INTENT_OPTIONS.map((intent) => (
            <button
              key={intent.id}
              type="button"
              onClick={() => handleIntentSelect(intent)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
              title={intent.description}
            >
              {intent.title}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="enterprise-panel p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Filter className="h-4 w-4 text-primary" />
                条件筛选
              </div>
              <button type="button" onClick={handleResetFilters} className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900">
                重置
              </button>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">资产类型</span>
                <Select
                  value={normalizeSelectValue(assetType) ?? EMPTY_SELECT_VALUE}
                  onValueChange={(value) => handleFilterChange({ assetType: value === EMPTY_SELECT_VALUE ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>全部资产</SelectItem>
                    {ASSET_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">适用阶段</span>
                <Select
                  value={normalizeSelectValue(stage) ?? EMPTY_SELECT_VALUE}
                  onValueChange={(value) => handleFilterChange({ stage: value === EMPTY_SELECT_VALUE ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>全部阶段</SelectItem>
                    {STAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">技术拓扑</span>
                <Select
                  value={normalizeSelectValue(topology) ?? EMPTY_SELECT_VALUE}
                  onValueChange={(value) => handleFilterChange({ topology: value === EMPTY_SELECT_VALUE ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>全部拓扑</SelectItem>
                    {TOPOLOGY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">业务域</span>
                <Input
                  value={domainInput}
                  onChange={(event) => setDomainInput(event.target.value)}
                  placeholder="order / payment"
                />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">技术栈</span>
                <Input
                  value={stackInput}
                  onChange={(event) => setStackInput(event.target.value)}
                  placeholder="spring-boot3 / maven"
                />
              </div>
              <div className="space-y-3">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">快捷筛选</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={starredOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleStarredToggle}
                  >
                    {t('search.filterStarred')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="enterprise-panel p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-primary" />
              推荐标签
            </div>
            <div className="flex flex-wrap gap-2">
              {!starredOnly && labels?.map((label) => (
                <Button
                  key={label.slug}
                  variant={selectedLabel === label.slug ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLabelToggle(label.slug)}
                >
                  {label.displayName}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="enterprise-panel p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{t('search.sort.label')}</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={sort === 'relevance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('relevance')}
                  >
                    {t('search.sort.relevance')}
                  </Button>
                  <Button
                    variant={sort === 'downloads' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('downloads')}
                  >
                    {t('search.sort.downloads')}
                  </Button>
                  <Button
                    variant={sort === 'newest' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('newest')}
                  >
                    {t('search.sort.newest')}
                  </Button>
                  <Button
                    variant={sort === 'recommended' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('recommended')}
                  >
                    推荐
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {resultCount > 0 ? t('search.results', { count: resultCount }) : '当前筛选下暂无结果'}
              </div>
            </div>

            {activeFilters.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <span key={filter} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {filter}
                  </span>
                ))}
              </div>
            ) : null}

            {isUpdatingResults ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('search.loadingMore')}</span>
              </div>
            ) : null}
          </div>

          {isPageLoading ? (
            <SkeletonList count={PAGE_SIZE} />
          ) : displayItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {displayItems.map((skill, idx) => (
                  <div key={skill.id} className={cn('h-full animate-fade-up', `delay-${Math.min(idx % 6 + 1, 6)}`)}>
                    <SkillCard
                      skill={skill}
                      highlightStarred
                      onClick={() => handleSkillClick(skill.namespace, skill.slug)}
                    />
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          ) : (
            <EmptyState
              title={starredOnly ? t('search.noStarredResults') : t('search.noResults')}
              description={
                starredOnly
                  ? (q ? t('search.noStarredResultsFor', { q }) : t('search.noStarredSkills'))
                  : (q ? t('search.noResultsFor', { q }) : undefined)
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
