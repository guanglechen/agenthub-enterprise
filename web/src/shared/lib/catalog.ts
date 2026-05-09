import type { CatalogProfile } from '@/api/types'

export const ASSET_TYPE_OPTIONS = [
  { value: 'product', label: '产品方案' },
  { value: 'scaffold', label: '开发脚手架' },
  { value: 'business', label: '业务能力' },
  { value: 'microservice', label: '微服务 Skill' },
  { value: 'quality', label: '质量治理' },
  { value: 'integration', label: '平台集成' },
] as const

export const STAGE_OPTIONS = [
  { value: 'discover', label: '规划' },
  { value: 'bootstrap', label: '初始化' },
  { value: 'develop', label: '开发' },
  { value: 'test', label: '测试' },
  { value: 'release', label: '发布' },
  { value: 'operate', label: '运维' },
] as const

export const TOPOLOGY_OPTIONS = [
  { value: 'crud-api', label: 'CRUD API' },
  { value: 'bff', label: 'BFF' },
  { value: 'event-consumer', label: '事件消费者' },
  { value: 'batch', label: '批处理' },
  { value: 'shared-lib', label: '共享库' },
] as const

export const MAINTENANCE_MODE_OPTIONS = [
  { value: 'manual', label: '人工维护' },
  { value: 'agent', label: 'Agent 维护' },
] as const

export function getCatalogOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string | null,
) {
  if (!value) {
    return undefined
  }
  return options.find((option) => option.value === value)?.label ?? value
}

export function buildCatalogBadgeSummary(profile?: CatalogProfile) {
  if (!profile) {
    return []
  }
  return [
    getCatalogOptionLabel(ASSET_TYPE_OPTIONS, profile.assetType),
    profile.domain,
    getCatalogOptionLabel(TOPOLOGY_OPTIONS, profile.topology),
  ].filter(Boolean) as string[]
}

export function buildCatalogMetaSummary(profile?: CatalogProfile) {
  if (!profile) {
    return []
  }
  return [
    getCatalogOptionLabel(STAGE_OPTIONS, profile.stage),
    profile.stack?.slice(0, 2).join(' / '),
    profile.ownerTeam,
  ].filter(Boolean) as string[]
}

export function buildRecommendationReasonLabel(reason: string) {
  switch (reason) {
    case 'same-domain':
      return '同业务域'
    case 'same-topology':
      return '同拓扑'
    case 'shared-stack':
      return '共享技术栈'
    case 'related-by-graph':
      return '关联能力'
    case 'high-reuse':
      return '高复用'
    default:
      return reason
  }
}
