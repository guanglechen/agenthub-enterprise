export type AssetFamily = {
  id: string
  title: string
  description: string
  search: {
    q?: string
    assetType?: string
    stage?: string
    topology?: string
    stack?: string
    label?: string
    sort?: string
  }
}

export type MarketplaceIntent = {
  id: string
  title: string
  description: string
  search: AssetFamily['search']
}

export const ASSET_FAMILY_OPTIONS: AssetFamily[] = [
  {
    id: 'claude-agent-plugin',
    title: 'Claude / Agent 插件',
    description: '连接 AgentHub、调用 CLI、执行安装计划和自动化操作的本地插件。',
    search: { q: 'plugin connector claude agent', assetType: 'integration', sort: 'recommended' },
  },
  {
    id: 'agent-skill',
    title: 'Agent Skill',
    description: '可安装到 Claude/Codex 工作区的操作技能，面向 Agent 执行具体任务。',
    search: { q: 'agent skill', assetType: 'integration', stage: 'develop', sort: 'recommended' },
  },
  {
    id: 'engineering-knowledge',
    title: '开发基础知识',
    description: '编码规范、框架实践、工程约束、测试与发布基线。',
    search: { q: 'coding standard framework engineering', assetType: 'quality', stage: 'develop', sort: 'recommended' },
  },
  {
    id: 'product-knowledge',
    title: '产品知识',
    description: '产品方案、功能模块、用户场景和产品交付资产。',
    search: { q: 'product solution', assetType: 'product', stage: 'discover', sort: 'recommended' },
  },
  {
    id: 'business-knowledge',
    title: '业务知识',
    description: '行业术语、业务规则、领域流程和可复用业务能力。',
    search: { q: 'business domain capability', assetType: 'business', stage: 'discover', sort: 'recommended' },
  },
  {
    id: 'developer-tooling',
    title: '开发辅助工具',
    description: '脚手架、生成器、检查工具、批量维护和工程初始化资产。',
    search: { q: 'scaffold generator tooling', assetType: 'scaffold', stage: 'bootstrap', sort: 'recommended' },
  },
  {
    id: 'harness-package',
    title: 'Harness Package',
    description: 'Java 微服务工程知识包，提供模块扫描、初始化、验证和贡献流程。',
    search: { q: 'harness java microservice', assetType: 'microservice', stack: 'java21,spring-boot3,maven', sort: 'recommended' },
  },
  {
    id: 'platform-integration',
    title: '平台集成',
    description: 'CI/CD、Git、制品库、监控、部署平台和企业基础设施集成。',
    search: { q: 'ci git deployment observability', assetType: 'integration', stage: 'release', sort: 'recommended' },
  },
]

export const MARKETPLACE_INTENT_OPTIONS: MarketplaceIntent[] = [
  {
    id: 'bootstrap-java-service',
    title: '初始化 Java 微服务',
    description: '查找 Spring Boot、Maven、Harness 和工程初始化脚手架。',
    search: {
      q: '',
      assetType: 'microservice',
      stack: 'spring-boot3',
      sort: 'recommended',
    },
  },
  {
    id: 'install-claude-plugin',
    title: '安装 Claude / Agent 插件',
    description: '查找本地连接插件、CLI operator 和 AgentHub connector。',
    search: {
      q: 'claude agent plugin connector',
      assetType: 'integration',
      sort: 'recommended',
    },
  },
  {
    id: 'learn-business-domain',
    title: '补充业务 / 产品知识',
    description: '查找业务规则、产品方案、领域术语和交付说明。',
    search: {
      q: 'business product domain knowledge',
      assetType: 'business',
      stage: 'discover',
      sort: 'recommended',
    },
  },
  {
    id: 'quality-governance',
    title: '接入质量治理',
    description: '查找测试、发布、代码规范、验证和安全治理能力。',
    search: {
      q: 'quality test release governance verify',
      assetType: 'quality',
      stage: 'test',
      sort: 'recommended',
    },
  },
  {
    id: 'developer-tooling',
    title: '找开发辅助工具',
    description: '查找生成器、批处理、诊断工具和自动化维护 Skill。',
    search: {
      q: 'developer tooling generator automation',
      assetType: 'scaffold',
      stage: 'develop',
      sort: 'recommended',
    },
  },
]

export function resolveAssetFamilyLabel(profile?: {
  assetType?: string
  stack?: string[]
  keywords?: string[]
}) {
  if (!profile) {
    return '存量资产'
  }

  const keywords = [
    ...(profile.stack ?? []),
    ...(profile.keywords ?? []),
  ].join(' ').toLowerCase()

  if (keywords.includes('harness') || (profile.assetType === 'microservice' && keywords.includes('spring'))) {
    return 'Harness Package'
  }
  if (keywords.includes('plugin') || keywords.includes('claude')) {
    return 'Claude / Agent 插件'
  }

  switch (profile.assetType) {
    case 'product':
      return '产品知识'
    case 'business':
      return '业务知识'
    case 'scaffold':
      return '开发辅助工具'
    case 'quality':
      return '开发基础知识'
    case 'integration':
      return '平台集成'
    case 'microservice':
      return '微服务 Skill'
    default:
      return '存量资产'
  }
}
