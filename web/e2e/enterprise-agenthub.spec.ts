import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { E2eTestDataBuilder } from './helpers/test-data-builder'
import { setEnglishLocale } from './helpers/auth-fixtures'

interface Envelope<T> {
  code: number
  msg: string
  data: T
}

async function parseEnvelope<T>(response: Awaited<ReturnType<APIRequestContext['fetch']>>): Promise<T> {
  const text = await response.text()
  const parsed = JSON.parse(text) as Envelope<T>
  expect(response.ok(), text).toBeTruthy()
  expect(parsed.code, text).toBe(0)
  return parsed.data
}

async function loginAsBootstrapAdmin(page: Page) {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin'
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin@staging2026'
  await page.context().request.get('/api/v1/auth/providers')
  await parseEnvelope(
    await page.context().request.post('/api/v1/auth/local/login', {
      data: { username, password },
    }),
  )
}

async function putCatalog(page: Page, namespace: string, slug: string, body: Record<string, unknown>) {
  return parseEnvelope(
    await page.context().request.put(`/api/v1/skills/${encodeURIComponent(namespace)}/${encodeURIComponent(slug)}/catalog`, {
      data: body,
    }),
  )
}

async function putRelations(page: Page, namespace: string, slug: string, relations: Array<Record<string, unknown>>) {
  return parseEnvelope(
    await page.context().request.put(`/api/v1/skills/${encodeURIComponent(namespace)}/${encodeURIComponent(slug)}/relations`, {
      data: { relations },
    }),
  )
}

async function waitForSearchHit(page: Page, slug: string, query: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await parseEnvelope<{ items: Array<{ slug: string }> }>(
      await page.context().request.get(`/api/web/skills?${query}`),
    )
    if (result.items.some((item) => item.slug === slug)) {
      return
    }
    await page.waitForTimeout(500 * (attempt + 1))
  }
  throw new Error(`Timed out waiting for search hit: ${slug}`)
}

function exactSectionTitle(page: Page, title: string) {
  return page.locator('div').filter({ hasText: new RegExp(`^${title}$`) }).first()
}

test.describe('Enterprise AgentHub Catalog (Deployed UI)', () => {
  test.beforeEach(async ({ page }) => {
    await setEnglishLocale(page)
    await loginAsBootstrapAdmin(page)
  })

  test('renders enterprise catalog search results and skill detail blocks', async ({ page }, testInfo) => {
    const builder = new E2eTestDataBuilder(page, testInfo)
    await builder.init()

    try {
      const namespace = await builder.ensureWritableNamespace()
      const targetName = `Payment Dependency ${Date.now().toString(36)}`
      const sourceName = `Payment Service ${Date.now().toString(36)}`

      const targetSkill = await builder.publishSkill(namespace.slug, {
        name: targetName,
        description: 'Dependency skill for enterprise recommendation rendering',
      })
      const sourceSkill = await builder.publishSkill(namespace.slug, {
        name: sourceName,
        description: 'Microservice skill with enterprise catalog metadata',
      })

      await putCatalog(page, namespace.slug, targetSkill.slug, {
        assetType: 'integration',
        domain: 'payment',
        stage: 'develop',
        topology: 'bff',
        stack: ['spring-boot3', 'maven'],
        ownerTeam: 'payments-platform',
        keywords: ['gateway'],
        maintenanceMode: 'agent',
        relations: [],
      })

      await putCatalog(page, namespace.slug, sourceSkill.slug, {
        assetType: 'microservice',
        domain: 'payment',
        stage: 'develop',
        topology: 'bff',
        stack: ['spring-boot3', 'maven'],
        ownerTeam: 'payments-domain',
        keywords: ['checkout', 'gateway'],
        maintenanceMode: 'agent',
        relations: [],
      })

      await putRelations(page, namespace.slug, sourceSkill.slug, [
        {
          type: 'recommendedWith',
          target: `@${namespace.slug}/${targetSkill.slug}`,
          title: targetName,
          note: 'shared payment context',
        },
      ])

      const query = new URLSearchParams({
        q: sourceName,
        namespace: namespace.slug,
        assetType: 'microservice',
        domain: 'payment',
        stage: 'develop',
        topology: 'bff',
        stack: 'spring-boot3',
        sort: 'recommended',
        page: '0',
        size: '100',
        starredOnly: 'false',
      }).toString()
      await waitForSearchHit(page, sourceSkill.slug, query)

      await page.goto(`/search?${query}`)
      const resultCard = page.getByRole('link', { name: new RegExp(sourceName) }).first()
      await expect(resultCard).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('combobox').filter({ hasText: '微服务 Skill' })).toBeVisible()
      await expect(resultCard.getByText('payment', { exact: true })).toBeVisible()

      await resultCard.click()

      await expect(exactSectionTitle(page, '资产画像')).toBeVisible({ timeout: 20_000 })
      await expect(exactSectionTitle(page, '关联能力')).toBeVisible()
      await expect(exactSectionTitle(page, '推荐能力')).toBeVisible()
      await expect(page.getByText('payments-domain')).toBeVisible()
      await expect(page.getByRole('button', { name: targetName })).toBeVisible()
      await expect(page.getByText('spring-boot3')).toBeVisible()
      await expect(page.getByText('maven')).toBeVisible()
    } finally {
      await builder.cleanup()
    }
  })
})
