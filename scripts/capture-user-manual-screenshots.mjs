/**
 * Capture screenshots for ARKA PCR User Manual into docs/user-manual/images/.
 * Usage: npx playwright test is not used — run: node scripts/capture-user-manual-screenshots.mjs
 * Requires app at BASE_URL (default http://localhost:3000) and admin credentials.
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

fs.mkdirSync(outDir, { recursive: true })

async function shot(page, name, fullPage = true) {
  const file = path.join(outDir, name)
  await page.waitForTimeout(800)
  await page.screenshot({ path: file, fullPage })
  console.log('saved', name)
}

async function softGoto(page, urlPath) {
  const res = await page.goto(`${base}${urlPath}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1200)
  return res
}

async function firstHref(page, selector) {
  const href = await page.locator(selector).first().getAttribute('href').catch(() => null)
  return href
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

  // --- Login page (clear cookies first) ---
  await context.clearCookies()
  await softGoto(page, '/login')
  // If redirected to dashboard, force logout via API if possible, else just capture after navigating
  if (!page.url().includes('/login')) {
    await softGoto(page, '/api/auth/signout')
    await softGoto(page, '/login')
  }
  await page.waitForSelector('input[name="username"], input#username, input[name="email"]', { timeout: 20000 }).catch(() => {})
  await shot(page, '01-login.png', false)

  // Fill login — Vuexy uses react-hook-form; default values may already be admin/admin123
  const userInput = page.locator('input').filter({ hasNot: page.locator('[type="hidden"]') }).first()
  // Prefer labeled fields
  const usernameField = page.getByLabel(/username/i).or(page.locator('input[name="username"]')).first()
  const passwordField = page.getByLabel(/password/i).or(page.locator('input[name="password"]')).first()
  if (await usernameField.count()) {
    await usernameField.fill(username)
    await passwordField.fill(password)
  } else {
    const inputs = page.locator('form input[type="text"], form input:not([type]), form input[type="password"]')
    await inputs.nth(0).fill(username)
    await page.locator('form input[type="password"]').fill(password)
  }
  await page.getByRole('button', { name: /login|sign in/i }).click()
  await page.waitForURL(/dashboard|units|approvals/, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)

  await softGoto(page, '/dashboard')
  await shot(page, '02-dashboard.png', true)
  await shot(page, '03-navigation.png', false)

  await softGoto(page, '/units')
  await shot(page, '04-units-list.png', true)

  // Detail links: /units/<id> (not the list path /units/)
  const unitDetailHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href]')].find(el =>
      /\/units\/[^/?#]+\/?$/.test(el.getAttribute('href') || '') &&
      !/\/units\/?$/.test(el.getAttribute('href') || '')
    )
    return a ? a.getAttribute('href') : null
  })
  if (unitDetailHref) {
    await softGoto(page, unitDetailHref.replace(base, ''))
  }
  await shot(page, '05-unit-detail.png', true)

  await softGoto(page, '/forecasts')
  await shot(page, '06-forecasts-list.png', true)

  const forecastHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href]')].find(el => {
      const h = el.getAttribute('href') || ''
      return /\/forecasts\/\d+\/?$/.test(h)
    })
    return a ? a.getAttribute('href') : null
  })
  if (forecastHref) {
    const pathOnly = forecastHref.startsWith('http') ? new URL(forecastHref).pathname : forecastHref
    await softGoto(page, pathOnly)
    await shot(page, '07-forecast-detail.png', true)
    const idMatch = pathOnly.match(/\/forecasts\/(\d+)/)
    if (idMatch) {
      await softGoto(page, `/forecasts/${idMatch[1]}/print`)
      await shot(page, '08-ba-pcr-print.png', true)
    } else {
      await shot(page, '08-ba-pcr-print.png', true)
    }
  } else {
    await shot(page, '07-forecast-detail.png', true)
    await shot(page, '08-ba-pcr-print.png', true)
  }

  await softGoto(page, '/approvals')
  await shot(page, '09-approvals-list.png', true)

  const approvalHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href]')].find(el =>
      /\/approvals\/\d+/.test(el.getAttribute('href') || '')
    )
    return a ? a.getAttribute('href') : null
  })
  if (approvalHref) {
    const pathOnly = approvalHref.startsWith('http') ? new URL(approvalHref).pathname : approvalHref
    await softGoto(page, pathOnly)
  }
  await shot(page, '10-approval-detail.png', true)

  // Replacement detail via unit hub Actual tab
  if (unitDetailHref) {
    const uPath = unitDetailHref.startsWith('http') ? new URL(unitDetailHref).pathname : unitDetailHref
    await softGoto(page, uPath)
    const actualTab = page.getByRole('tab', { name: /actual|pcr actual|replacement/i }).first()
    if (await actualTab.count()) {
      await actualTab.click()
      await page.waitForTimeout(1000)
    }
    const replHref = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a[href]')].find(el =>
        /\/replacements\//.test(el.getAttribute('href') || '')
      )
      return a ? a.getAttribute('href') : null
    })
    if (replHref) {
      const rPath = replHref.startsWith('http') ? new URL(replHref).pathname : replHref
      await softGoto(page, rPath)
    }
  }
  await shot(page, '11-replacement-detail.png', true)

  await softGoto(page, '/hour-meters')
  await shot(page, '12-hour-meters.png', true)

  await softGoto(page, '/cannibals')
  await shot(page, '13-cannibals-list.png', true)

  const cannibalHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href]')].find(el =>
      /\/cannibals\/\d+/.test(el.getAttribute('href') || '')
    )
    return a ? a.getAttribute('href') : null
  })
  if (cannibalHref) {
    const pathOnly = cannibalHref.startsWith('http') ? new URL(cannibalHref).pathname : cannibalHref
    await softGoto(page, pathOnly)
  }
  await shot(page, '14-cannibal-detail.png', true)

  await softGoto(page, '/cannibals-approvals')
  await shot(page, '15-cannibal-approvals.png', true)

  await softGoto(page, '/reports/forecasts')
  await shot(page, '16-report-forecasts.png', true)

  await softGoto(page, '/reports/pcr')
  await shot(page, '17-report-pcr.png', true)

  await softGoto(page, '/reports/sos')
  await shot(page, '18-report-sos.png', true)

  await softGoto(page, '/reports/cannibals')
  await shot(page, '19-report-cannibals.png', true)

  await softGoto(page, '/reports/inspections')
  await shot(page, '20-report-inspections.png', true)

  await softGoto(page, '/users')
  await shot(page, '21-users.png', true)

  // Change password dialog from header
  await softGoto(page, '/dashboard')
  // Click user avatar / menu
  const userBtn = page.locator('button').filter({ has: page.locator('.MuiAvatar-root') }).first()
  if (await userBtn.count()) {
    await userBtn.click()
  } else {
    await page.locator('header button').last().click().catch(() => {})
  }
  await page.waitForTimeout(500)
  const changePwd = page.getByText(/change password/i).first()
  if (await changePwd.count()) {
    await changePwd.click()
    await page.waitForTimeout(800)
    await shot(page, '22-change-password.png', false)
  } else {
    await shot(page, '22-change-password.png', false)
  }

  await browser.close()
  console.log('Done. Screenshots in', outDir)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
