/**
 * Screenshot fitur Maintenance (Type, Plan, Actual, Failure, Dashboard)
 * ke docs/user-manual/maintenance/images/.
 *
 * App harus sudah jalan. Login seed admin.
 *   node scripts/capture-maintenance-manual.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'docs', 'user-manual', 'maintenance', 'images')
const base = process.env.BASE_URL || 'http://localhost:3000'
const username = process.env.MANUAL_USER || 'admin'
const password = process.env.MANUAL_PASS || 'admin123'

const WASHING_TYPE = 'cmm2wteo70001zomjorinjoqj'
const ACTUAL_ID = 'cmuuzups101am85zxd0x3qx1b'

fs.mkdirSync(outDir, { recursive: true })

async function shot(page, name, fullPage = false) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(outDir, name), fullPage })
  console.log('saved', name, page.url())
}

async function goto(page, urlPath) {
  const url = `${base}${urlPath}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(800)
}

async function waitRows(page) {
  await page.locator('.MuiDataGrid-row').first().waitFor({ timeout: 30000 })
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await goto(page, '/login/')
  await page.getByRole('textbox', { name: /username/i }).fill(username)
  await page.locator('#auth-login-password').fill(password)
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.waitForURL(/dashboard/, { timeout: 40000 })

  await page.getByText('Maintenance', { exact: true }).first().click()
  await page.waitForTimeout(400)
  await shot(page, '01-menu-maintenance.png')
  await page.keyboard.press('Escape')

  await goto(page, '/maintenance-types/')
  await page.getByText('Washing').first().waitFor({ timeout: 20000 })
  await shot(page, '02-types-list.png')

  await page.getByRole('button', { name: /add maintenance type/i }).click()
  await page.getByRole('heading', { name: 'Add Maintenance Type' }).waitFor({ timeout: 10000 })
  await shot(page, '03-type-add.png')
  await page.keyboard.press('Escape')

  await goto(page, '/maintenance-plans/')
  await waitRows(page)
  await shot(page, '04-plans-list.png')

  await goto(
    page,
    `/maintenance-plans/edit/?projectId=022C&year=2026&month=10&maintenanceTypeId=${WASHING_TYPE}`
  )
  await page.getByRole('heading', { name: /edit maintenance plan/i }).waitFor({ timeout: 20000 })
  await page.locator('table, .MuiTable-root, input[type="checkbox"]').first().waitFor({ timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
  await shot(page, '05-plan-schedule.png')

  await goto(page, '/maintenance-actuals/list/')
  await waitRows(page)
  await shot(page, '06-actuals-list.png')

  await goto(page, `/maintenance-actuals/view/${ACTUAL_ID}/`)
  await page.getByText(/PM-/).first().waitFor({ timeout: 20000 })
  await shot(page, '07-actual-view.png', true)

  await goto(page, `/maintenance-actuals/edit/${ACTUAL_ID}/`)
  await page.getByRole('heading', { name: /edit maintenance actual/i }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(1200)
  await shot(page, '08-actual-form.png')

  const failuresHeading = page.getByText('Failures', { exact: true }).last()
  await failuresHeading.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await shot(page, '09-actual-findings.png')

  await goto(page, '/maintenance-failures/')
  await waitRows(page)
  await shot(page, '10-failures-list.png')

  await goto(page, '/dashboards/maintenance-control/?period=2026-10&view=YTD&site=022C')
  await page.getByText(/PM Compliance|Compliance/i).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
  await shot(page, '11-dashboard.png')

  await page.evaluate(() => window.scrollBy(0, 900))
  await page.waitForTimeout(600)
  await shot(page, '12-dashboard-charts.png')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const kpi = page.locator('.MuiCard-root').filter({ hasText: /Compliance/i }).first()
  if (await kpi.count()) {
    await kpi.click()
    await page.waitForTimeout(1200)
    const dialog = page.getByRole('dialog')
    if (await dialog.count()) {
      await shot(page, '13-dashboard-drilldown.png')
    }
  }

  await browser.close()
  console.log('Done', outDir)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
