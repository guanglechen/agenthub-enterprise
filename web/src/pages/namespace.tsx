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
import { ASSET_TYPE_OPTIONS, STAGE_OPTIONS, getCatalogOptionLabel } from '@/shared/lib/catalog'
import { resolveAssetFamilyLabel } from '@/shared/lib/asset-taxonomy'

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
  const assetFamilyCounts = skillsData?.items.reduce<Record<string, number>>((acc, skill) => {
    const family = resolveAssetFamilyLabel(skill.catalogProfile)
    acc[family] = (acc[family] || 0) + 1
    return acc
  }, {}) ?? {}
  const domainCounts = skillsData?.items.reduce<Record<string, number>>((acc, skill) => {
    const domain = skill.catalogProfile?.domain || '未声明业务域'
    acc[domain] = (acc[domain] || 0) + 1
    return acc
  }, {}) ?? {}
  const stageCounts = skillsData?.items.reduce<Record<string, number>>((acc, skill) => {
    const stage = skill.catalogProfile?.stage || 'uncategorized'
    acc[stage] = (acc[stage] || 0) + 1
    return acc
  }, {}) ?? {}
  const missingCoreAssetTypes = ['scaffold', 'business', 'quality', 'integration']
    .filter((assetType) => !assetTypeCounts[assetType])
    .map((assetType) => getCatalogOptionLabel(ASSET_TYPE_OPTIONS, assetType) ?? assetType)
  const agentReadyCount = skillsData?.items.filter((skill) => skill.catalogProfile?.maintenanceMode === 'agent').length ?? 0

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

      <section className="enterprise-panel enterprise-surface-stripe p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Team capability map</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">团队能力地图</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              namespace 页不再只是 Skill 列表，而是按资产族、业务域和阶段展示团队可复用能力。
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            onClick={() => navigate({ to: '/dashboard/publish', search: { namespace } })}
          >
            贡献团队 Skill
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">可见 Skill</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{skillsData?.total ?? 0}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">资产族</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{Object.keys(assetFamilyCounts).length}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">业务域</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{Object.keys(domainCounts).length}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">Agent 维护</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{agentReadyCount}</div>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-950">按资产族</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(assetFamilyCounts).map(([family, count]) => (
                <span key={family} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{family} {count}</span>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-950">按业务域</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(domainCounts).slice(0, 8).map(([domain, count]) => (
                <span key={domain} className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">{domain} {count}</span>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-950">按阶段</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(stageCounts).map(([stage, count]) => (
                <span key={stage} className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  {stage === 'uncategorized' ? '未分类' : getCatalogOptionLabel(STAGE_OPTIONS, stage) ?? stage} {count}
                </span>
              ))}
            </div>
          </div>
        </div>
        {missingCoreAssetTypes.length > 0 ? (
          <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="font-semibold">团队资产缺口提示</div>
            <p className="mt-1">当前目录还缺少：{missingCoreAssetTypes.join('、')}。建议通过发布中心或 Agent 批量贡献，快速补齐团队能力。</p>
          </div>
        ) : null}
      </section>

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
