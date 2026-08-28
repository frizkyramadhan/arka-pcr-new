/**
 * Capture screenshots for ARKA PCR User Manual into docs/user-manual/images/.
 *
 * Usage (app must already be running):
 *   node scripts/capture-user-manual-screenshots.mjs
 *
 * Env:
 *   BASE_URL      default http://localhost:3000
 *   MANUAL_USER   default admin
 *   MANUAL_PASS   default admin123 (seed)
 *   UNIT_ID       default 877 (ADT 021 — has replacements)
 *   ID_MOD        default 4413
 *   CANNIBAL_ID   default 2522
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'docs', 'user-manual', 'images')
const base = process.env.BASE_URL || 'http://localhost:3000'
const username = process.env.MANUAL_USER || 'admin'
const password = process.env.MANUAL_PASS || 'admin123'
const unitId = process.env.UNIT_ID || '877'
const idMod = process.env.ID_MOD || '4413'
const cannibalId = process.env.CANNIBAL_ID || '2522'

fs.mkdirSync(outDir, { recursive: true })

async function shot(page, name, fullPage = true) {
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(outDir, name), fullPage })
  console.log('saved', name)
}

async function goto(page, urlPath) {
  const url = urlPath.startsWith('http') ? urlPath : `${base}${urlPath}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(900)
}

async function waitGrid(page) {
  await page.locator('.MuiDataGrid-root').first().waitFor({ timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(500)
}

async function waitDashboard(page) {
  await page.locator('.apexcharts-canvas, .MuiCard-root').first().waitFor({ timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1200)
}

async function login(page, context) {
  await context.clearCookies()
  await goto(page, '/login/')
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (_) {}
  })
  await goto(page, '/login/')

  if (!page.url().includes('/login')) {
    console.log('already authenticated at', page.url())
    return
  }

  await shot(page, '01-login.png', false)

  await page.getByRole('textbox', { name: /username/i }).fill(username)
  await page.locator('#auth-login-password').fill(password)
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.waitForURL(/dashboard|units|forecasts/, { timeout: 40000 })
  await page.waitForTimeout(1000)
}

async function main() {
  const launchOptions = { headless: true }
  if (process.env.CHROME_PATH) {
    launchOptions.executablePath = process.env.CHROME_PATH
  } else {
    launchOptions.channel = 'chrome'
  }
  const browser = await chromium.launch(launchOptions)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

  await login(page, context)

  await goto(page, '/dashboard/')
  await waitDashboard(page)
  await shot(page, '02-dashboard.png', true)
  await shot(page, '03-navigation.png', false)

  await goto(page, '/dashboard/cannibal/')
  await waitDashboard(page)
  await shot(page, '23-dashboard-cannibal.png', true)

  await goto(page, '/approvals/')
  await waitGrid(page)
  await shot(page, '09-approvals-list.png', true)
  await shot(page, '10-approval-detail.png', true)

  await goto(page, '/cannibals-approvals/')
  await waitGrid(page)
  await shot(page, '15-cannibal-approvals.png', true)

  await goto(page, '/units/')
  await waitGrid(page)
  await shot(page, '04-units-list.png', true)

  await goto(page, `/units/${unitId}/`)
  await waitGrid(page)
  await shot(page, '05-unit-detail.png', true)

  await goto(page, `/units/${unitId}/?tab=actual`)
  await waitGrid(page)
  await shot(page, '33-unit-actual.png', true)

  await goto(page, `/units/${unitId}/replacements/${idMod}/`)
  await waitGrid(page)
  await shot(page, '11-replacement-detail.png', true)

  await goto(page, `/units/${unitId}/?tab=inspection`)
  await waitGrid(page)
  await shot(page, '34-unit-inspection.png', true)

  await goto(page, `/units/${unitId}/?tab=sos`)
  await waitGrid(page)
  await shot(page, '35-unit-sos.png', true)

  await goto(page, `/units/${unitId}/?tab=condition`)
  await waitGrid(page)
  await shot(page, '36-unit-condition.png', true)

  await goto(page, '/forecasts/')
  await waitGrid(page)
  await shot(page, '06-forecasts-list.png', true)
  await shot(page, '07-forecast-detail.png', true)
  await shot(page, '08-ba-pcr-print.png', true)

  await goto(page, '/models/')
  await waitGrid(page)
  await shot(page, '24-models.png', true)

  await goto(page, '/components/')
  await waitGrid(page)
  await shot(page, '25-components.png', true)

  await goto(page, '/hour-meters/')
  await waitGrid(page)
  await shot(page, '12-hour-meters.png', true)

  await goto(page, '/cannibals/')
  await waitGrid(page)
  await shot(page, '13-cannibals-list.png', true)

  await goto(page, '/cannibals/create/')
  await page.locator('form, .MuiCard-root').first().waitFor({ timeout: 15000 }).catch(() => {})
  await shot(page, '26-cannibal-create.png', true)

  await goto(page, `/cannibals/${cannibalId}/`)
  await page.locator('.MuiCard-root, .MuiStepper-root').first().waitFor({ timeout: 20000 }).catch(() => {})
  await shot(page, '14-cannibal-detail.png', true)

  await goto(page, `/cannibals/${cannibalId}/print/`)
  await page.waitForTimeout(1000)
  await shot(page, '27-cannibal-print.png', true)

  await goto(page, '/reports/forecasts/')
  await waitGrid(page)
  await shot(page, '16-report-forecasts.png', true)

  await goto(page, '/reports/forecasts/period/')
  await waitGrid(page)
  await shot(page, '38-report-forecast-period.png', true)

  await goto(page, '/reports/forecasts/price/')
  await waitGrid(page)
  await shot(page, '39-report-forecast-price.png', true)

  await goto(page, '/reports/pcr/')
  await waitGrid(page)
  await shot(page, '17-report-pcr.png', true)

  await goto(page, '/reports/sos/')
  await waitGrid(page)
  await shot(page, '18-report-sos.png', true)

  await goto(page, '/reports/cannibals/')
  await waitGrid(page)
  await shot(page, '19-report-cannibals.png', true)

  await goto(page, '/reports/inspections/')
  await waitGrid(page)
  await shot(page, '20-report-inspections.png', true)

  await goto(page, '/reports/conditions/')
  await waitGrid(page)
  await shot(page, '28-report-conditions.png', true)

  await goto(page, '/users/')
  await waitGrid(page)
  await shot(page, '21-users.png', true)

  await goto(page, '/roles/')
  await page.locator('.MuiCard-root').first().waitFor({ timeout: 15000 }).catch(() => {})
  await shot(page, '29-roles.png', true)

  await goto(page, '/permissions/')
  await waitGrid(page)
  await shot(page, '30-permissions.png', true)

  await goto(page, '/admin/email-notifications/')
  await page.locator('.MuiCard-root').first().waitFor({ timeout: 15000 }).catch(() => {})
  await shot(page, '31-email-notifications.png', true)

  await goto(page, '/admin/activity-logs/')
  await waitGrid(page)
  await shot(page, '32-activity-logs.png', true)

  await goto(page, '/dashboard/')
  await page.locator('.MuiAvatar-root').first().click()
  await page.waitForTimeout(500)
  await shot(page, '37-user-menu.png', false)
  await page.getByText(/change password/i).click()
  await page.waitForTimeout(700)
  await shot(page, '22-change-password.png', false)

  await browser.close()
  console.log('Done. Screenshots in', outDir)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
