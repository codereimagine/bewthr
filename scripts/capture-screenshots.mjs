// One-shot screenshot capture for README docs.
// Run via: node scripts/capture-screenshots.mjs
// Expects `npm run dev` already running on http://localhost:5173/bewthr/.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs', 'screenshots')
mkdirSync(outDir, { recursive: true })

// Use the production build via `npm run preview` (port 4173). The dev
// server injects CSS via inline <style> tags, which the strict CSP
// (style-src 'self') in index.html blocks — so captures against dev
// render with zero CSS. The preview server serves dist/ with external
// CSS files, matching what users actually see.
const URL = 'http://localhost:4173/bewthr/'
const SEARCH_TERM = 'Hoboken'

const FORMS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
}

const VIEWS = ['weather', 'sky', 'places', 'settings']

async function shoot(form, view) {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: FORMS[form].width, height: FORMS[form].height },
    deviceScaleFactor: FORMS[form].deviceScaleFactor,
    colorScheme: 'dark',
    locale: 'en-US',
  })
  const page = await context.newPage()
  // Only surface real errors, ignore CSP inline-style noise in dev.
  page.on('pageerror', (e) => console.error('[pageerror]', e.message))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })

  // Wait for app shell mount (header always renders).
  await page.waitForSelector('button[title="Places"]', { timeout: 10000 })

  // Add a place via the Places UI so weather has data.
  await page.click('button[title="Places"]')
  await page.waitForSelector('input.places-view-input', { timeout: 5000 })
  await page.fill('input.places-view-input', SEARCH_TERM)
  await page.waitForSelector('.places-view-result', { timeout: 10000 })
  await page.click('.places-view-result >> nth=0')

  // Wait for the live hero to mount (the dialog auto-closes on add).
  await page.waitForSelector('.hero', { timeout: 15000 })
  // Wait until the temperature is rendered (numeric content present).
  await page.waitForFunction(
    () => /\d+°/.test(document.querySelector('.hero')?.textContent || ''),
    { timeout: 15000 },
  )
  // Let icon canvases, atmosphere, and CSS transitions settle.
  await page.waitForTimeout(2500)

  if (view === 'weather') {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
  } else if (view === 'sky') {
    // Expand the Sky Tonight card and scroll it to the top of the viewport.
    await page.click('.sky-toggle')
    await page.waitForSelector('.sky-card.expanded', { timeout: 5000 })
    await page.evaluate(() => {
      document.querySelector('.sky-card')?.scrollIntoView({ block: 'start' })
    })
    await page.waitForTimeout(800)
  } else if (view === 'places') {
    // Re-open Places, type a query so results are visible.
    await page.click('button[title="Places"]')
    await page.waitForSelector('input.places-view-input', { timeout: 5000 })
    await page.fill('input.places-view-input', 'Tokyo')
    await page.waitForSelector('.places-view-result', { timeout: 10000 })
    await page.waitForTimeout(500)
  } else if (view === 'settings') {
    await page.click('button[title="Settings"]')
    await page.waitForTimeout(700)
  }

  const file = join(outDir, `${view}-${form}.png`)
  // Viewport-only (never fullPage): the Modal renders in DOM even when
  // closed, and fullPage exposes its off-screen content at the bottom.
  await page.screenshot({ path: file })
  console.log(`wrote ${file}`)
  await browser.close()
}

for (const form of Object.keys(FORMS)) {
  for (const view of VIEWS) {
    try {
      await shoot(form, view)
    } catch (err) {
      console.error(`FAILED ${view}-${form}: ${err.message.split('\n')[0]}`)
    }
  }
}
