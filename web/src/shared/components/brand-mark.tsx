import { cn } from '@/shared/lib/utils'

type BrandMarkProps = {
  compact?: boolean
  inverse?: boolean
}

function getRuntimeBrand() {
  if (typeof window === 'undefined') {
    return {
      name: 'AgentHub',
      orgName: '海康威视',
      logoUrl: '/brand/hikvision-logo.svg',
      tagline: '内部研发资产分发平台',
      primaryColor: '#D7000F',
      accentColor: '#8F0E15',
    }
  }
  const config = window.__SKILLHUB_RUNTIME_CONFIG__ ?? {}
  return {
    name: config.brandName?.trim() || 'AgentHub',
    orgName: config.brandOrgName?.trim() || '海康威视',
    logoUrl: config.brandLogoUrl?.trim() || '/brand/hikvision-logo.svg',
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
  const hasLogo = Boolean(brand.logoUrl)
  const stacked = hasLogo && !compact
  const logoAlt = `${brand.orgName || brand.name} logo`

  return (
    <div className={cn('min-w-0', stacked ? 'flex flex-col items-start gap-2.5' : 'flex items-center gap-3')}>
      {hasLogo ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center',
            inverse ? 'rounded-md bg-white px-3 py-2 shadow-sm ring-1 ring-white/15' : '',
            compact ? 'max-w-[118px]' : 'max-w-[176px]'
          )}
        >
          <img
            src={brand.logoUrl}
            alt={logoAlt}
            className={cn('block h-auto object-contain', compact ? 'w-[118px] max-w-[118px]' : 'w-[176px] max-w-[176px]')}
          />
        </span>
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
      <div className={cn('min-w-0', stacked ? 'w-full' : '')}>
        <div className={cn('truncate font-semibold', compact ? 'text-sm' : 'text-lg', inverse ? 'text-white' : 'text-slate-950')}>
          {brand.name}
        </div>
        <div className={cn('truncate text-xs', inverse ? 'text-white/45' : 'text-slate-500')}>
          {brand.tagline || brand.orgName}
        </div>
      </div>
    </div>
  )
}
