import type { SkillSummary } from '@/api/types'
import { useAuth } from '@/features/auth/use-auth'
import { useStar } from '@/features/social/use-star'
import { Card } from '@/shared/ui/card'
import { NamespaceBadge } from '@/shared/components/namespace-badge'
import { buildCatalogBadgeSummary, buildCatalogMetaSummary } from '@/shared/lib/catalog'
import { getHeadlineVersion } from '@/shared/lib/skill-lifecycle'
import { formatCompactCount } from '@/shared/lib/number-format'
import { Bookmark } from 'lucide-react'

interface SkillCardProps {
  skill: SkillSummary
  onClick?: () => void
  highlightStarred?: boolean
}

/**
 * Reusable card for displaying one skill in lists such as landing, namespace, search, and stars.
 */
export function SkillCard({ skill, onClick, highlightStarred = true }: SkillCardProps) {
  const { isAuthenticated } = useAuth()
  const { data: starStatus } = useStar(skill.id, highlightStarred && isAuthenticated)
  const showStarredHighlight = highlightStarred && isAuthenticated && starStatus?.starred
  const headlineVersion = getHeadlineVersion(skill)
  const isInteractive = typeof onClick === 'function'
  const badgeSummary = buildCatalogBadgeSummary(skill.catalogProfile)
  const metaSummary = buildCatalogMetaSummary(skill.catalogProfile)
  const scoreLabel =
    typeof skill.recommendationScore === 'number' ? `${Math.round(skill.recommendationScore * 100)} / 100` : undefined

  return (
    <Card
      className="enterprise-panel enterprise-stat-card enterprise-surface-stripe h-full cursor-pointer group relative overflow-hidden border-0 shadow-none transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isInteractive) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      role={isInteractive ? 'link' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              @{skill.namespace}/{skill.slug}
            </div>
            <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors" style={{ color: 'hsl(var(--foreground))' }}>
              {skill.displayName}
            </h3>
            {badgeSummary.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {badgeSummary.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    style={{ background: 'rgba(15,23,42,0.04)', borderColor: 'rgba(15,23,42,0.08)' }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <NamespaceBadge type="TEAM" name={`@${skill.namespace}`} />
            {scoreLabel ? (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                推荐 {scoreLabel}
              </span>
            ) : null}
          </div>
        </div>

        {skill.summary && (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {skill.summary}
          </p>
        )}

        {metaSummary.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {metaSummary.map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1">
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-slate-200/80 pt-4 text-xs text-muted-foreground">
          {headlineVersion && (
            <span className="rounded-full bg-secondary/60 px-2.5 py-1 font-mono">
              v{headlineVersion.version}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            {formatCompactCount(skill.downloadCount)}
          </span>
          <span
            className={`flex items-center gap-1 ${showStarredHighlight ? 'font-semibold text-primary' : ''}`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${showStarredHighlight ? 'fill-current' : ''}`} />
            {skill.starCount}
          </span>
          {typeof skill.relationCount === 'number' && skill.relationCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
              关联 {skill.relationCount}
            </span>
          )}
          {skill.ratingAvg !== undefined && skill.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {skill.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
