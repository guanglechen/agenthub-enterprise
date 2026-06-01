/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BrandMark } from './brand-mark'

afterEach(() => {
  delete window.__SKILLHUB_RUNTIME_CONFIG__
  cleanup()
})

describe('BrandMark', () => {
  it('uses the default Hikvision logo with a short AgentHub label', () => {
    render(<BrandMark />)

    const logo = screen.getByRole('img', { name: '海康威视 logo' })
    expect(logo.getAttribute('src')).toBe('/brand/hikvision-logo.svg')
    expect(screen.getByText('AgentHub')).toBeTruthy()
    expect(screen.getByText('内部研发资产分发平台')).toBeTruthy()
    expect(document.body.textContent).not.toContain('海康威视 · 内部研发资产分发平台')
  })

  it('keeps deployment branding overrides available', () => {
    window.__SKILLHUB_RUNTIME_CONFIG__ = {
      brandName: 'TeamHub',
      brandOrgName: 'Internal Platform',
      brandLogoUrl: '/custom-logo.svg',
      brandTagline: 'Reusable delivery assets',
    }

    render(<BrandMark compact />)

    const logo = screen.getByRole('img', { name: 'Internal Platform logo' })
    expect(logo.getAttribute('src')).toBe('/custom-logo.svg')
    expect(screen.getByText('TeamHub')).toBeTruthy()
    expect(screen.getByText('Reusable delivery assets')).toBeTruthy()
  })
})
