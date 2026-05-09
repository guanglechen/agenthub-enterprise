import { describe, expect, it } from 'vitest'
import {
  CENTERED_DASHBOARD_CONTENT_CLASS_NAME,
  CENTERED_MAIN_CLASS_NAME,
  CENTERED_SEARCH_CONTENT_CLASS_NAME,
  getAppMainContentLayout,
  resolveAppMainContentPathname,
} from './layout-main-content'

describe('getAppMainContentLayout', () => {
  it('keeps the landing page full width without the app-shell padding wrapper', () => {
    expect(getAppMainContentLayout('/')).toEqual({
      mainClassName: 'flex-1 relative z-10',
      contentClassName: '',
    })
  })

  it('centers the search page content with roomier responsive gutters', () => {
    const layout = getAppMainContentLayout('/search')

    expect(layout).toEqual({
      mainClassName: CENTERED_MAIN_CLASS_NAME,
      contentClassName: CENTERED_SEARCH_CONTENT_CLASS_NAME,
    })
    expect(layout.contentClassName).toContain('max-w-[1360px]')
  })

  it('centers all dashboard sub-pages within a slightly narrower content frame', () => {
    const layout = getAppMainContentLayout('/dashboard/skills')

    expect(layout).toEqual({
      mainClassName: CENTERED_MAIN_CLASS_NAME,
      contentClassName: CENTERED_DASHBOARD_CONTENT_CLASS_NAME,
    })
    expect(layout.contentClassName).toContain('max-w-[1360px]')
  })

  it('centers skill detail routes inside the enterprise detail frame', () => {
    expect(getAppMainContentLayout('/space/acme/demo')).toEqual({
      mainClassName: CENTERED_MAIN_CLASS_NAME,
      contentClassName: 'mx-auto w-full max-w-[1360px]',
    })
  })
})

describe('resolveAppMainContentPathname', () => {
  it('sticks with the last resolved route while the next page is still pending', () => {
    expect(resolveAppMainContentPathname('/dashboard', '/search')).toBe('/search')
  })

  it('falls back to the live location when no resolved route is available yet', () => {
    expect(resolveAppMainContentPathname('/search')).toBe('/search')
  })
})
