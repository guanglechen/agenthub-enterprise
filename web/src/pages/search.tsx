import { startTransition, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import type { SkillSummary } from '@/api/types'
import { useAuth } from '@/features/auth/use-auth'
import { SearchBar } from '@/features/search/search-bar'
import { SkillCard } from '@/features/skill/skill-card'
import { ASSET_TYPE_OPTIONS, STAGE_OPTIONS, TOPOLOGY_OPTIONS } from '@/shared/lib/catalog'
import { SkeletonList } from '@/shared/components/skeleton-loader'
import { EmptyState } from '@/shared/components/empty-state'
import { Pagination } from '@/shared/components/pagination'
import { useSearchSkills } from '@/shared/hooks/use-skill-queries'
import { useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { useMyStars } from '@/shared/hooks/use-user-queries'
import { normalizeSearchQuery } from '@/shared/lib/search-query'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, normalizeSelectValue } from '@/shared/ui/select'
import { APP_SHELL_PAGE_CLASS_NAME } from '@/app/page-shell-style'

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
  const { isAuthenticated } = useAuth()

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
  })
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

  return (
    <div className={APP_SHELL_PAGE_CLASS_NAME}>
      {/* Search Bar */}
      <div className="max-w-3xl mx-auto">
        <SearchBar
          value={queryInput}
          isSearching={isUpdatingResults}
          onChange={setQueryInput}
          onSearch={handleSearch}
        />
      </div>

      {/* Sort And Filters */}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{t('search.sort.label')}</span>
            <div className="flex gap-2">
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

          {resultCount > 0 && (
            <div className="text-sm text-muted-foreground">
              {t('search.results', { count: resultCount })}
            </div>
          )}
        </div>

        {isUpdatingResults ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('search.loadingMore')}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border/60 bg-white/80 p-4 md:grid-cols-5">
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">资产类型</span>
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
            <span className="text-xs font-medium text-muted-foreground">适用阶段</span>
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
            <span className="text-xs font-medium text-muted-foreground">技术拓扑</span>
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
            <span className="text-xs font-medium text-muted-foreground">业务域</span>
            <Input
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              placeholder="order / payment"
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">技术栈</span>
            <Input
              value={stackInput}
              onChange={(event) => setStackInput(event.target.value)}
              placeholder="spring-boot3"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">{t('search.filters.label')}</span>
          <Button
            variant={starredOnly ? 'default' : 'outline'}
            size="sm"
            onClick={handleStarredToggle}
          >
            {t('search.filterStarred')}
          </Button>
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

      {/* Results */}
      {isPageLoading ? (
        <SkeletonList count={PAGE_SIZE} />
      ) : displayItems.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayItems.map((skill, idx) => (
              <div key={skill.id} className={`h-full animate-fade-up delay-${Math.min(idx % 6 + 1, 6)}`}>
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
  )
}
