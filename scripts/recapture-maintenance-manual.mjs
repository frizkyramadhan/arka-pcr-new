/**
 * Perbaiki screenshot yang menunya masih terbuka, grid plan tanpa centang,
 * atau tertutup toast error SAP.
 */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'docs', 'user-manual', 'maintenance', 'images')
const base = 'http://localhost:3000'
const WASHING_TYPE = 'cmm2wteo70001zomjorinjoqj'
const ACTUAL_ID = 'cmuuzups101am85zxd0x3qx1b'

async function shot(page, name) {
  await page.mouse.move(80, 500)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outDir, name) })
  console.log('saved', name)
}

async function dismissToasts(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[class*="go"] , #_rht_toaster, [data-sonner-toaster]').forEach(node => {
      if (node.textContent?.includes('SAP') || node.id === '_rht_toaster') node.remove()
    })
    document.getElementById('_rht_toaster')?.remove()
  })
  await page.waitForTimeout(200)
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()

  await page.goto(`${base}/login/`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: /username/i }).fill('admin')
  await page.locator('#auth-login-password').fill('admin123')
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.waitForURL(/dashboard/, { timeout: 40000 })

  await page.getByText('Dashboard', { exact: true }).first().click()
  await page.getByText('Maintenance Control').waitFor({ timeout: 8000 })
  await page.screenshot({ path: path.join(outDir, '00-menu-dashboard.png') })
  console.log('saved 00-menu-dashboard.png')
  await page.keyboard.press('Escape')
  await page.mouse.move(80, 500)

  await page.goto(`${base}/maintenance-types/`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Washing').first().waitFor({ timeout: 20000 })
  await page.keyboard.press('Escape')
  await shot(page, '02-types-list.png')

  await page.goto(
    `${base}/maintenance-plans/edit/?projectId=022C&year=2026&month=10&maintenanceTypeId=${WASHING_TYPE}`,
    { waitUntil: 'domcontentloaded' }
  )
  await page.getByRole('heading', { name: /edit maintenance plan/i }).waitFor({ timeout: 20000 })
  await page.getByText(/dates selected/i).waitFor({ timeout: 30000 })
  const search = page.getByPlaceholder(/search unit/i)
  await search.fill('E 076')
  await page.waitForTimeout(800)
  await shot(page, '05-plan-schedule.png')

  await page.goto(`${base}/maintenance-actuals/edit/${ACTUAL_ID}/`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /edit maintenance actual/i }).waitFor({ timeout: 20000 })
  await page.waitForTimeout(2500)
  await dismissToasts(page)
  await shot(page, '08-actual-form.png')

  await page.getByText('Failures', { exact: true }).last().scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await dismissToasts(page)
  await shot(page, '09-actual-findings.png')

  await page.setViewportSize({ width: 1680, height: 900 })
  await page.goto(`${base}/maintenance-failures/`, { waitUntil: 'domcontentloaded' })
  await page.locator('.MuiDataGrid-row').first().waitFor({ timeout: 30000 })
  await page.keyboard.press('Escape')
  await shot(page, '10-failures-list.png')

  await browser.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
