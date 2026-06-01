import { describe, expect, it } from 'vitest'
import type { SkillSummary } from '@/api/types'
import { buildSkillCoverageModel, resolveSkillMaturityLevel } from './capability-coverage-panel'

function createSkill(overrides: Partial<SkillSummary> = {}): SkillSummary {
  return {
    id: overrides.id ?? 1,
    slug: overrides.slug ?? 'demo-skill',
    displayName: overrides.displayName ?? 'Demo Skill',
    summary: overrides.summary ?? 'demo summary',
    downloadCount: overrides.downloadCount ?? 0,
    starCount: overrides.starCount ?? 0,
    ratingAvg: overrides.ratingAvg,
    ratingCount: overrides.ratingCount ?? 0,
    namespace: overrides.namespace ?? 'global',
    updatedAt: overrides.updatedAt ?? '2026-06-01T00:00:00Z',
    canSubmitPromotion: overrides.canSubmitPromotion ?? false,
    relationCount: overrides.relationCount ?? 0,
    catalogProfile: overrides.catalogProfile,
  }
}

function catalog(overrides: Partial<NonNullable<SkillSummary['catalogProfile']>>): NonNullable<SkillSummary['catalogProfile']> {
  return {
    stack: [],
    keywords: [],
    relations: [],
    ...overrides,
  }
}

describe('capability coverage model', () => {
  it('classifies skill maturity from unprofiled stock asset to Agent Ready', () => {
    expect(resolveSkillMaturityLevel(createSkill())).toBe(0)
    expect(resolveSkillMaturityLevel(createSkill({
      catalogProfile: catalog({ assetType: 'business', domain: 'order', stage: 'develop' }),
    }))).toBe(1)
    expect(resolveSkillMaturityLevel(createSkill({
      downloadCount: 3,
      catalogProfile: catalog({ assetType: 'business', domain: 'order', stage: 'develop' }),
    }))).toBe(2)
    expect(resolveSkillMaturityLevel(createSkill({
      downloadCount: 3,
      relationCount: 1,
      catalogProfile: catalog({ assetType: 'business', domain: 'order', stage: 'develop' }),
    }))).toBe(3)
    expect(resolveSkillMaturityLevel(createSkill({
      downloadCount: 3,
      relationCount: 1,
      catalogProfile: catalog({ assetType: 'business', domain: 'order', stage: 'operate', maintenanceMode: 'agent' }),
    }))).toBe(4)
  })

  it('aggregates dimensions, stage coverage, reuse signals, and metadata gaps', () => {
    const model = buildSkillCoverageModel([
      createSkill({
        id: 1,
        displayName: 'microservice architecture skill',
        downloadCount: 9,
        relationCount: 2,
        catalogProfile: catalog({
          assetType: 'microservice',
          domain: 'payment',
          stage: 'develop',
          topology: 'bff',
          stack: ['spring-boot3', 'maven'],
          maintenanceMode: 'agent',
        }),
      }),
      createSkill({
        id: 2,
        displayName: 'delivery ci governance',
        starCount: 1,
        catalogProfile: catalog({
          assetType: 'quality',
          domain: 'order',
          stage: 'test',
          stack: ['maven'],
          keywords: ['ci'],
        }),
      }),
      createSkill({
        id: 3,
        displayName: 'business operation',
        catalogProfile: catalog({
          assetType: 'business',
          domain: 'order',
          stage: 'release',
          topology: 'batch',
        }),
      }),
      createSkill({ id: 4, displayName: 'legacy skill' }),
    ], 8)

    expect(model.totalSkills).toBe(8)
    expect(model.sampleSize).toBe(4)
    expect(model.truncated).toBe(true)
    expect(model.profiledCount).toBe(3)
    expect(model.catalogCoverageRatio).toBe(0.75)
    expect(model.coveredDimensionCount).toBe(5)
    expect(model.coveredStageCount).toBe(3)
    expect(model.agentReadyCount).toBe(1)
    expect(model.relatedCount).toBe(1)
    expect(model.reusedCount).toBe(2)
    expect(model.maturityCounts).toMatchObject({ 0: 1, 1: 1, 2: 1, 4: 1 })

    const architecture = model.dimensions.find((dimension) => dimension.id === 'architecture')
    expect(architecture?.count).toBe(2)
    expect(architecture?.stages.develop).toBe(1)

    const deliveryFlow = model.dimensions.find((dimension) => dimension.id === 'delivery-flow')
    expect(deliveryFlow?.count).toBe(2)
    expect(deliveryFlow?.stages.test).toBe(1)
    expect(deliveryFlow?.stages.release).toBe(1)

    expect(model.topDomains).toEqual([
      { value: 'order', count: 2 },
      { value: 'payment', count: 1 },
    ])
    expect(model.topStacks).toEqual([
      { value: 'maven', count: 2 },
      { value: 'spring-boot3', count: 1 },
    ])
    expect(model.gapHints).toContainEqual({ label: '未编目 / 存量资产', count: 1 })
    expect(model.gapHints).toContainEqual({ label: '尚未建立关联', count: 3 })
  })
})
