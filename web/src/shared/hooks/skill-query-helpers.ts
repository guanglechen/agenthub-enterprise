import type { SearchParams } from '@/api/types'
import { WEB_API_PREFIX } from '@/api/client'
import { normalizeSearchQuery } from '@/shared/lib/search-query'

export function buildSkillSearchUrl(params: SearchParams) {
  const queryParams = new URLSearchParams()
  const normalizedQuery = normalizeSearchQuery(params.q ?? '')

  if (params.q !== undefined) {
    queryParams.append('q', normalizedQuery)
  }

  if (params.namespace) {
    const cleanNamespace = params.namespace.startsWith('@') ? params.namespace.slice(1) : params.namespace
    queryParams.append('namespace', cleanNamespace)
  }

  if (params.label) {
    queryParams.append('label', params.label)
  }

  if (params.assetType) {
    queryParams.append('assetType', params.assetType)
  }

  if (params.domain) {
    queryParams.append('domain', params.domain)
  }

  if (params.stage) {
    queryParams.append('stage', params.stage)
  }

  if (params.topology) {
    queryParams.append('topology', params.topology)
  }

  if (params.stack) {
    queryParams.append('stack', params.stack)
  }

  if (params.sort) {
    queryParams.append('sort', params.sort)
  }

  if (params.page !== undefined) {
    queryParams.append('page', String(params.page))
  }

  if (params.size !== undefined) {
    queryParams.append('size', String(params.size))
  }

  const queryString = queryParams.toString()
  return queryString ? `${WEB_API_PREFIX}/skills?${queryString}` : `${WEB_API_PREFIX}/skills`
}

export function shouldEnableNamespaceMemberCandidates(slug: string, search: string, enabled = true) {
  return enabled && !!slug && search.trim().length >= 2
}
