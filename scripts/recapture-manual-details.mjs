/**
 * Re-capture detail screens that need UI clicks (not bare hrefs).
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'docs', 'user-manual', 'images')
const base = process.env.BASE_URL || 'http://localhost:3000'

async function shot(page, name, fullPage = true) {
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(outDir, name), fullPage })
  console.log('saved', name)
}

async function goto(page, p) {
  await page.goto(`${base}${p}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
}

async function login(page, context) {
  await context.clearCookies()
  await goto(page, '/login')
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (_) {}
  })
  await goto(page, '/login')
  await page.waitForTimeout(1500)
  if (!page.url().includes('/login')) {
    console.log('still redirected to', page.url(), '— continuing with session')
    return
  }
  await page.getByRole('textbox', { name: /username/i }).fill('admin')
  await page.locator('#auth-login-password').fill('admin123')
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.waitForURL(/dashboard|units|forecasts/, { timeout: 30000 })
  await page.waitForTimeout(1000)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await login(page, context)

  // --- Unit detail: click first row (onRowClick) ---
  await goto(page, '/units')
  await page.locator('.MuiDataGrid-row').first().click({ force: true }).catch(async () => {
    await page.locator('button').filter({ has: page.locator('[data-testid], svg') }).first().click()
  })
  // Prefer eye icon in actions column
  const eyeOnUnits = page.locator('.MuiDataGrid-row').first().locator('button').first()
  if (await eyeOnUnits.count()) {
    await eyeOnUnits.click()
  }
  await page.waitForTimeout(2000)
  if (!/\/units\/[^/]+/.test(page.url()) || page.url().endsWith('/units/') || page.url().endsWith('/units')) {
    // Fetch first unit id via API using page cookies
    const ids = await page.evaluate(async () => {
      const res = await fetch('/api/fleet/units?page=1&pageSize=1')
      const json = await res.json()
      return json
    })
    console.log('units api sample', JSON.stringify(ids).slice(0, 300))
    const unitId =
      ids?.data?.[0]?.id ||
      ids?.rows?.[0]?.id ||
      ids?.units?.[0]?.id ||
      ids?.[0]?.id
    if (unitId) {
      await goto(page, `/units/${unitId}`)
    }
  }
  await shot(page, '05-unit-detail.png', true)
  const unitUrl = page.url()

  // --- Forecast detail via Actions → View Detail ---
  await goto(page, '/forecasts')
  const actionsBtn = page.getByRole('button', { name: /actions/i }).first()
  if (await actionsBtn.count()) {
    await actionsBtn.click()
    await page.getByText(/view detail/i).click()
    await page.waitForTimeout(2000)
  } else {
    const f = await page.evaluate(async () => {
      const res = await fetch('/api/forecasts?page=1&pageSize=1&status=OPEN')
      return res.json()
    })
    console.log('forecast api', JSON.stringify(f).slice(0, 300))
    const fid =
      f?.data?.[0]?.idForecast ||
      f?.rows?.[0]?.idForecast ||
      f?.forecasts?.[0]?.idForecast
    if (fid) await goto(page, `/forecasts/${fid}`)
  }
  await shot(page, '07-forecast-detail.png', true)
  const fMatch = page.url().match(/\/forecasts\/(\d+)/)
  if (fMatch) {
    await goto(page, `/forecasts/${fMatch[1]}/print`)
    await shot(page, '08-ba-pcr-print.png', true)
  }

  // --- Approval detail ---
  await goto(page, '/approvals')
  const reviewBtn = page.locator('.MuiDataGrid-row').first().locator('button').first()
  if (await reviewBtn.count()) {
    await reviewBtn.click()
    await page.waitForTimeout(2000)
  }
  if (!/\/approvals\/\d+/.test(page.url())) {
    const a = await page.evaluate(async () => {
      const res = await fetch('/api/approvals?page=1&pageSize=1')
      return res.json().catch(() => null)
    })
    console.log('approvals api', JSON.stringify(a).slice(0, 300))
    const aid = a?.data?.[0]?.idBaPcr || a?.rows?.[0]?.idBaPcr
    if (aid) await goto(page, `/approvals/${aid}`)
  }
  await shot(page, '10-approval-detail.png', true)

  // --- Replacement detail from unit Actual tab ---
  if (/\/units\/[^/]+/.test(unitUrl)) {
    const fleetId = unitUrl.match(/\/units\/([^/?#]+)/)?.[1]
    await goto(page, `/units/${fleetId}?tab=actual`)
    await page.getByRole('tab', { name: /actual/i }).click().catch(() => {})
    await page.waitForTimeout(1500)
    const eye = page.locator('.MuiDataGrid-row').first().locator('button').first()
    if (await eye.count()) {
      await eye.click()
      await page.waitForTimeout(2000)
    }
    if (!page.url().includes('/replacements/')) {
      // try API for a unit that has replacements — fall back to known path pattern
      const r = await page.evaluate(async fleetId => {
        const res = await fetch(`/api/fleet/units/${fleetId}/replacements?page=1&pageSize=1`)
        return res.json().catch(() => null)
      }, fleetId)
      console.log('repl api', JSON.stringify(r).slice(0, 300))
      const idMod = r?.data?.[0]?.idMod || r?.rows?.[0]?.idMod
      if (idMod) await goto(page, `/units/${fleetId}/replacements/${idMod}`)
    }
  }
  await shot(page, '11-replacement-detail.png', true)

  // --- Cannibal detail ---
  await goto(page, '/cannibals')
  const cEye = page.locator('.MuiDataGrid-row').first().locator('button').first()
  if (await cEye.count()) {
    await cEye.click()
    await page.waitForTimeout(2000)
  }
  if (!/\/cannibals\/\d+/.test(page.url())) {
    const c = await page.evaluate(async () => {
      const res = await fetch('/api/cannibals?page=1&pageSize=1')
      return res.json().catch(() => null)
    })
    console.log('cannibal api', JSON.stringify(c).slice(0, 300))
    const cid = c?.data?.[0]?.idBa || c?.rows?.[0]?.idBa || c?.data?.[0]?.id
    if (cid) await goto(page, `/cannibals/${cid}`)
  }
  await shot(page, '14-cannibal-detail.png', true)

  // --- Change password: click avatar (not shortcuts grid) ---
  await goto(page, '/dashboard')
  await page.locator('.MuiAvatar-root').first().click()
  await page.waitForTimeout(600)
  await page.getByText(/change password/i).click()
  await page.waitForTimeout(800)
  await shot(page, '22-change-password.png', false)

  await browser.close()
  console.log('Re-capture done')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
