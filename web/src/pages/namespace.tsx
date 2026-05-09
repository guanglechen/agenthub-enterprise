import { useState, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { NamespaceHeader } from '@/features/namespace/namespace-header'
import { SkillCard } from '@/features/skill/skill-card'
import { SkeletonList } from '@/shared/components/skeleton-loader'
import { EmptyState } from '@/shared/components/empty-state'
import { Pagination } from '@/shared/components/pagination'
import { useSearchSkills } from '@/shared/hooks/use-skill-queries'
import { useNamespaceDetail } from '@/shared/hooks/use-namespace-queries'
import { ASSET_TYPE_OPTIONS, getCatalogOptionLabel } from '@/shared/lib/catalog'

const PAGE_SIZE = 20

/**
 * Public namespace page showing namespace metadata and the skills currently discoverable inside it.
 */
export function NamespacePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { namespace } = useParams({ from: '/space/$namespace' })
  const [page, setPage] = useState(0)

  // Reset page when namespace changes
  useEffect(() => {
    setPage(0)
  }, [namespace])

  const { data: namespaceData, isLoading: isLoadingNamespace } = useNamespaceDetail(namespace)
  const { data: skillsData, isLoading: isLoadingSkills } = useSearchSkills({
    namespace,
    page,
    size: PAGE_SIZE,
  })

  const totalPages = skillsData ? Math.max(Math.ceil(skillsData.total / skillsData.size), 1) : 1
  const assetTypeCounts = skillsData?.items.reduce<Record<string, number>>((acc, skill) => {
    const assetType = skill.catalogProfile?.assetType || 'uncategorized'
    acc[assetType] = (acc[assetType] || 0) + 1
    return acc
  }, {}) ?? {}

  const handleSkillClick = (slug: string) => {
    navigate({ to: `/space/${namespace}/${encodeURIComponent(slug)}` })
  }

  if (isLoadingNamespace) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="h-12 w-48 animate-shimmer rounded-lg" />
        <div className="h-6 w-96 animate-shimmer rounded-md" />
      </div>
    )
  }

  if (!namespaceData) {
    return <EmptyState title={t('namespace.notFound')} />
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <NamespaceHeader namespace={namespaceData} />

      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold font-heading">团队能力目录</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(assetTypeCounts).map(([assetType, count]) => (
              <span
                key={assetType}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                {assetType === 'uncategorized'
                  ? `存量资产 ${count}`
                  : `${getCatalogOptionLabel(ASSET_TYPE_OPTIONS, assetType) ?? assetType} ${count}`}
              </span>
            ))}
          </div>
        </div>
        {isLoadingSkills ? (
          <SkeletonList count={6} />
        ) : skillsData && skillsData.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {skillsData.items.map((skill, idx) => (
                <div key={skill.id} className={`animate-fade-up delay-${Math.min(idx + 1, 6)}`}>
                  <SkillCard
                    skill={skill}
                    onClick={() => handleSkillClick(skill.slug)}
                  />
                </div>
              ))}
            </div>

            {skillsData.total > PAGE_SIZE ? (
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            ) : null}
          </>
        ) : (
          <EmptyState
            title={t('namespace.emptyTitle')}
            description={t('namespace.emptyDescription')}
          />
        )}
      </div>
    </div>
  )
}
