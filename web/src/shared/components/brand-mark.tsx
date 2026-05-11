import { cn } from '@/shared/lib/utils'

type BrandMarkProps = {
  compact?: boolean
  inverse?: boolean
}

function getRuntimeBrand() {
  if (typeof window === 'undefined') {
    return {
      name: 'HIKVISION AgentHub',
      orgName: '海康威视',
      logoUrl: '',
      tagline: '内部研发资产分发平台',
      primaryColor: '#D7000F',
      accentColor: '#8F0E15',
    }
  }
  const config = window.__SKILLHUB_RUNTIME_CONFIG__ ?? {}
  return {
    name: config.brandName?.trim() || 'HIKVISION AgentHub',
    orgName: config.brandOrgName?.trim() || '海康威视',
    logoUrl: config.brandLogoUrl?.trim() || '',
    tagline: config.brandTagline?.trim() || '内部研发资产分发平台',
    primaryColor: config.brandPrimaryColor?.trim() || '#D7000F',
    accentColor: config.brandAccentColor?.trim() || '#8F0E15',
  }
}

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  const brand = getRuntimeBrand()
  const markStyle = {
    background: `linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.accentColor} 100%)`,
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      {brand.logoUrl ? (
        <img
          src={brand.logoUrl}
          alt={brand.name}
          className={cn('shrink-0 rounded-xl object-contain', compact ? 'h-8 w-8' : 'h-11 w-11')}
        />
      ) : (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm',
            compact ? 'h-8 w-8' : 'h-11 w-11'
          )}
          style={markStyle}
        >
          H
        </div>
      )}
      <div className="min-w-0">
        <div className={cn('truncate font-semibold', compact ? 'text-base' : 'text-lg', inverse ? 'text-white' : 'text-slate-950')}>
          {brand.name}
        </div>
        <div className={cn('truncate text-xs', inverse ? 'text-white/45' : 'text-slate-500')}>
          {brand.orgName} · {brand.tagline}
        </div>
      </div>
    </div>
  )
}
