import { ArrowRight, Boxes, Gauge, GitBranch, Layers3, Map as MapIcon, Sparkles, Wrench } from 'lucide-react'
import type { SkillSummary } from '@/api/types'
import { STAGE_OPTIONS } from '@/shared/lib/catalog'
import { cn } from '@/shared/lib/utils'

export type CoverageFilter = Partial<{
  q: string
  assetType: string
  domain: string
  stage: string
  topology: string
  stack: string
  sort: string
}>

type DimensionDefinition = {
  id: string
  title: string
  description: string
  filter: CoverageFilter
  match: (skill: SkillSummary) => boolean
}

type CounterEntry = {
  value: string
  count: number
}

type DimensionRow = {
  id: string
  title: string
  description: string
  filter: CoverageFilter
  count: number
  maturityAverage: number
  stages: Record<string, number>
}

export type SkillCoverageModel = {
  totalSkills: number
  sampleSize: number
  profiledCount: number
  catalogCoverageRatio: number
  coveredDimensionCount: number
  coveredStageCount: number
  agentReadyCount: number
  relatedCount: number
  reusedCount: number
  dimensions: DimensionRow[]
  maturityCounts: Record<number, number>
  topDomains: CounterEntry[]
  topStacks: CounterEntry[]
  gapHints: Array<{ label: string; count: number }>
  truncated: boolean
}

const KNOWLEDGE_DIMENSIONS: DimensionDefinition[] = [
  {
    id: 'architecture',
    title: '架构类知识',
    description: '按资产类型 microservice 统计，点击后进入同口径结果列表。',
    filter: { assetType: 'microservice', sort: 'recommended' },
    match: (skill) => skill.catalogProfile?.assetType === 'microservice',
  },
  {
    id: 'development',
    title: '开发类知识',
    description: '按适用阶段 develop 统计，覆盖编码实现和工程开发态资产。',
    filter: { stage: 'develop', sort: 'recommended' },
    match: (skill) => skill.catalogProfile?.stage === 'develop',
  },
  {
    id: 'maintenance',
    title: '维护类知识',
    description: '按适用阶段 operate 统计，聚焦上线后的维护和持续演进。',
    filter: { stage: 'operate', sort: 'recommended' },
    match: (skill) => skill.catalogProfile?.stage === 'operate',
  },
  {
    id: 'delivery-flow',
    title: '开发流程类知识',
    description: '按资产类型 quality 统计，点击后只筛质量治理类 Skill。',
    filter: { assetType: 'quality', sort: 'recommended' },
    match: (skill) => skill.catalogProfile?.assetType === 'quality',
  },
  {
    id: 'business-product',
    title: '业务/产品知识',
    description: '按资产类型 business 统计，聚焦业务规则和领域流程资产。',
    filter: { assetType: 'business', sort: 'recommended' },
    match: (skill) => skill.catalogProfile?.assetType === 'business',
  },
]

function countCoreCatalogFields(skill: SkillSummary) {
  const profile = skill.catalogProfile
  if (!profile) {
    return 0
  }
  return [
    profile.assetType,
    profile.domain,
    profile.stage,
    profile.topology,
  ].filter(Boolean).length
}

export function resolveSkillMaturityLevel(skill: SkillSummary) {
  if (countCoreCatalogFields(skill) < 2) {
    return 0
  }

  const reused = skill.downloadCount > 0 || skill.starCount > 0 || (skill.ratingAvg ?? 0) > 0
  if (!reused) {
    return 1
  }

  if ((skill.relationCount ?? 0) <= 0) {
    return 2
  }

  if (skill.catalogProfile?.maintenanceMode === 'agent') {
    return 4
  }

  return 3
}

function toTopEntries(values: Array<string | undefined>, limit = 5): CounterEntry[] {
  const counts = new Map<string, number>()
  values.forEach((value) => {
    const normalized = value?.trim()
    if (!normalized) {
      return
    }
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  })

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, limit)
}

export function buildSkillCoverageModel(skills: SkillSummary[], totalSkills = skills.length): SkillCoverageModel {
  const sampleSize = skills.length
  const profiledCount = skills.filter((skill) => countCoreCatalogFields(skill) >= 2).length
  const maturityCounts = skills.reduce<Record<number, number>>((acc, skill) => {
    const level = resolveSkillMaturityLevel(skill)
    acc[level] = (acc[level] ?? 0) + 1
    return acc
  }, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 })

  const dimensions = KNOWLEDGE_DIMENSIONS.map((definition) => {
    const matchedSkills = skills.filter(definition.match)
    const stages = STAGE_OPTIONS.reduce<Record<string, number>>((acc, stage) => {
      acc[stage.value] = matchedSkills.filter((skill) => skill.catalogProfile?.stage === stage.value).length
      return acc
    }, {})
    const maturityTotal = matchedSkills.reduce((sum, skill) => sum + resolveSkillMaturityLevel(skill), 0)

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      filter: definition.filter,
      count: matchedSkills.length,
      maturityAverage: matchedSkills.length ? maturityTotal / matchedSkills.length : 0,
      stages,
    }
  })

  const coveredStages = new Set(skills.map((skill) => skill.catalogProfile?.stage).filter(Boolean))
  const topDomains = toTopEntries(skills.map((skill) => skill.catalogProfile?.domain))
  const topStacks = toTopEntries(skills.flatMap((skill) => skill.catalogProfile?.stack ?? []))
  const missingCatalogCount = skills.filter((skill) => countCoreCatalogFields(skill) < 2).length
  const missingStageCount = skills.filter((skill) => !skill.catalogProfile?.stage).length
  const missingDomainCount = skills.filter((skill) => !skill.catalogProfile?.domain).length
  const missingRelationCount = skills.filter((skill) => (skill.relationCount ?? 0) <= 0).length

  return {
    totalSkills,
    sampleSize,
    profiledCount,
    catalogCoverageRatio: sampleSize ? profiledCount / sampleSize : 0,
    coveredDimensionCount: dimensions.filter((dimension) => dimension.count > 0).length,
    coveredStageCount: coveredStages.size,
    agentReadyCount: skills.filter((skill) => skill.catalogProfile?.maintenanceMode === 'agent').length,
    relatedCount: skills.filter((skill) => (skill.relationCount ?? 0) > 0).length,
    reusedCount: skills.filter((skill) => skill.downloadCount > 0 || skill.starCount > 0 || (skill.ratingAvg ?? 0) > 0).length,
    dimensions,
    maturityCounts,
    topDomains,
    topStacks,
    gapHints: [
      { label: '未编目 / 存量资产', count: missingCatalogCount },
      { label: '缺少阶段画像', count: missingStageCount },
      { label: '缺少业务域', count: missingDomainCount },
      { label: '尚未建立关联', count: missingRelationCount },
    ].filter((item) => item.count > 0),
    truncated: totalSkills > sampleSize,
  }
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function getMaturityTone(level: number) {
  if (level >= 3.5) return 'bg-emerald-500'
  if (level >= 2.5) return 'bg-sky-500'
  if (level >= 1.5) return 'bg-amber-500'
  if (level > 0) return 'bg-slate-400'
  return 'bg-slate-200'
}

function getStageCellClass(count: number, rowTotal: number) {
  if (count <= 0) {
    return 'border-slate-200 bg-slate-50 text-slate-300'
  }
  const ratio = rowTotal ? count / rowTotal : 0
  if (ratio >= 0.45) {
    return 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
  }
  if (ratio >= 0.2) {
    return 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
}

type CapabilityCoveragePanelProps = {
  skills: SkillSummary[]
  total?: number
  isLoading?: boolean
  onApplyFilter: (filter: CoverageFilter) => void
}

export function CapabilityCoveragePanel({ skills, total, isLoading = false, onApplyFilter }: CapabilityCoveragePanelProps) {
  const model = buildSkillCoverageModel(skills, total ?? skills.length)
  const maxMaturityCount = Math.max(...Object.values(model.maturityCounts), 1)

  return (
    <section className="enterprise-panel overflow-hidden">
      <div className="border-b border-slate-200/80 bg-white px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <MapIcon className="h-3.5 w-3.5" />
              Capability Coverage Map
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">能力覆盖地图</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              仅在技能广场默认总览状态展示。进入搜索、筛选或翻页后，页面切换为卡片结果列表；地图数字和点击筛选使用同一套口径。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
            <MetricTile icon={Boxes} label="Skill 总量" value={String(model.totalSkills)} subValue={model.truncated ? `样本 ${model.sampleSize}` : '可见资产'} />
            <MetricTile icon={Layers3} label="目录画像覆盖" value={formatPercent(model.catalogCoverageRatio)} subValue={`${model.profiledCount}/${model.sampleSize || 0}`} />
            <MetricTile icon={Sparkles} label="知识维度覆盖" value={`${model.coveredDimensionCount}/5`} subValue={`${model.coveredStageCount}/${STAGE_OPTIONS.length} 阶段`} />
            <MetricTile icon={Gauge} label="Agent Ready" value={String(model.agentReadyCount)} subValue={`${model.relatedCount} 个有关联`} />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 p-5">
          {isLoading && model.sampleSize === 0 ? (
            <div className="space-y-3">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto pb-1">
                <div className="grid min-w-[680px] grid-cols-[minmax(160px,1fr)_repeat(6,minmax(44px,68px))] gap-2">
                  <div className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">知识维度</div>
                  {STAGE_OPTIONS.map((stage) => (
                    <div key={stage.value} className="text-center text-xs font-semibold text-slate-500">
                      {stage.label}
                    </div>
                  ))}

                  {model.dimensions.map((dimension) => (
                    <CoverageRow
                      key={dimension.id}
                      row={dimension}
                      onApplyFilter={onApplyFilter}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                {Object.entries({
                  0: 'L0 未编目',
                  1: 'L1 已分类',
                  2: 'L2 可复用',
                  3: 'L3 可编排',
                  4: 'L4 Agent Ready',
                }).map(([level, label]) => {
                  const count = model.maturityCounts[Number(level)] ?? 0
                  return (
                    <div key={level} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                        <span>{label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full', getMaturityTone(Number(level)))}
                          style={{ width: `${Math.max(7, (count / maxMaturityCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="border-t border-slate-200 bg-slate-50/70 p-5 xl:border-l xl:border-t-0">
          <div className="space-y-5">
            <InsightBlock
              title="Top 业务域"
              entries={model.topDomains}
              emptyText="暂无业务域画像"
              onClick={(entry) => onApplyFilter({ domain: entry.value, sort: 'recommended' })}
            />
            <InsightBlock
              title="Top 技术栈"
              entries={model.topStacks}
              emptyText="暂无技术栈画像"
              onClick={(entry) => onApplyFilter({ stack: entry.value, sort: 'recommended' })}
            />
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Wrench className="h-4 w-4 text-rose-600" />
                主要缺口
              </div>
              <div className="mt-3 space-y-2">
                {model.gapHints.length > 0 ? model.gapHints.map((gap) => (
                  <div key={gap.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600">{gap.label}</span>
                    <span className="font-semibold text-slate-950">{gap.count}</span>
                  </div>
                )) : (
                  <p className="text-sm leading-6 text-slate-500">核心目录画像已覆盖当前样本。</p>
                )}
              </div>
              <a
                href="/dashboard/publish"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-700 transition-colors hover:text-rose-900"
              >
                去发布中心补齐目录画像
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            {model.truncated ? (
              <p className="text-xs leading-5 text-slate-500">
                当前按前 {model.sampleSize} 个可见 Skill 统计。后续资产量继续增长时，可升级为后端 coverage-summary 接口。
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  )
}

function CoverageRow({ row, onApplyFilter }: { row: DimensionRow; onApplyFilter: (filter: CoverageFilter) => void }) {
  const maxStageCount = Math.max(...Object.values(row.stages), 0)
  return (
    <>
      <button
        type="button"
        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-rose-200 hover:bg-rose-50"
        onClick={() => onApplyFilter(row.filter)}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-950">{row.title}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{row.count}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{row.description}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={cn('h-full rounded-full', getMaturityTone(row.maturityAverage))} style={{ width: `${Math.min(100, Math.max(8, row.maturityAverage * 25))}%` }} />
        </div>
      </button>
      {STAGE_OPTIONS.map((stage) => {
        const count = row.stages[stage.value] ?? 0
        return (
          <button
            key={`${row.id}-${stage.value}`}
            type="button"
            disabled={count === 0}
            onClick={() => onApplyFilter({ ...row.filter, stage: stage.value, sort: 'recommended' })}
            className={cn(
              'flex min-h-[76px] items-center justify-center rounded-xl border px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
              getStageCellClass(count, maxStageCount)
            )}
            title={`${row.title} / ${stage.label}: ${count}`}
          >
            {count}
          </button>
        )
      })}
    </>
  )
}

function MetricTile({ icon: Icon, label, value, subValue }: { icon: typeof Boxes; label: string; value: string; subValue: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className="h-4 w-4 text-rose-600" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 truncate text-xs text-slate-500">{subValue}</div>
    </div>
  )
}

function InsightBlock({
  title,
  entries,
  emptyText,
  onClick,
}: {
  title: string
  entries: CounterEntry[]
  emptyText: string
  onClick: (entry: CounterEntry) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <GitBranch className="h-4 w-4 text-rose-600" />
        {title}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.length > 0 ? entries.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => onClick(entry)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            {entry.value}
            <span className="text-slate-400">{entry.count}</span>
          </button>
        )) : (
          <span className="text-sm text-slate-500">{emptyText}</span>
        )}
      </div>
    </div>
  )
}
