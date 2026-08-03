#!/usr/bin/env node
/* Walks the storefront and reports grid containers that leave a visible hole:
   samples points inside each grid's box and counts those covered by no child.
   Images are forced eager and given time to settle first — measuring mid-reveal
   reports phantom gaps.
   Usage: node tools/find-gaps.mjs [width] */
import { chromium } from '/Users/moon/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'

const BASE = 'https://apps-development-4.myshopify.com'
const THEME = '159760416917' // the Shrujan theme; it is not the published one
const WIDTH = Number(process.argv[2] || 1890)
const PAGES = [
  ['home', '/'],
  ['story', '/pages/the-shrujan-story'],
  ['craft', '/pages/video'],
  ['lldc', '/pages/lldc'],
  ['visit', '/pages/visit-experience'],
  ['studio', '/pages/studio-collection'],
  ['heritage', '/pages/studio-heritage'],
  ['shop', '/pages/shop-shrujan'],
]

const b = await chromium.launch()
const c = await b.newContext({ viewport: { width: WIDTH, height: 1000 }, reducedMotion: 'reduce' })
const p = await c.newPage()
await p.goto(`${BASE}/password`, { waitUntil: 'domcontentloaded' })
await p.fill('input[name="password"]', '1')
await p.press('input[name="password"]', 'Enter')
await p.waitForTimeout(3000)

for (const [name, path] of PAGES) {
  await p.goto(`${BASE}${path}${path.includes('?') ? '&' : '?'}preview_theme_id=${THEME}`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'))
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 2500))
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 800))
  })
  const found = await p.evaluate(() => {
    const out = []
    document.querySelectorAll('*').forEach((g) => {
      const cs = getComputedStyle(g)
      if (!cs.display.includes('grid') || g.children.length < 3) return
      if (cs.visibility === 'hidden' || cs.opacity === '0') return
      const gb = g.getBoundingClientRect()
      if (gb.width < 300 || gb.height < 300) return
      /* galleries only: a text or form grid is not supposed to tile */
      const withImg = [...g.children].filter((el) => el.querySelector('img, svg, picture')).length
      if (withImg < g.children.length - 1 || withImg < 3) return
      const rects = [...g.children].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 4 && r.height > 4)
      if (rects.length < 3) return
      let empty = 0
      let total = 0
      const bands = {}
      for (let y = gb.top + 10; y < gb.bottom - 10; y += 12) {
        for (let x = gb.left + 10; x < gb.right - 10; x += 12) {
          total++
          if (!rects.some((q) => x >= q.left - 1 && x <= q.right + 1 && y >= q.top - 1 && y <= q.bottom + 1)) {
            empty++
            const k = Math.round((y - gb.top) / 60) * 60
            bands[k] = (bands[k] || 0) + 1
          }
        }
      }
      const pct = (100 * empty) / total
      if (pct > 2) {
        out.push({
          cls: (g.className || '').toString().slice(0, 40),
          kids: g.children.length,
          pct: +pct.toFixed(1),
          h: Math.round(gb.height),
          bands: Object.entries(bands).filter(([, n]) => n > 12).map(([y, n]) => `${y}px×${n}`).slice(0, 4),
        })
      }
    })
    return out
  })
  if (found.length) {
    console.log(`\n${name} (${path})`)
    found.forEach((f) => console.log(`   .${f.cls}  ${f.kids} children  ${f.pct}% empty  bands ${f.bands.join(' ')}`))
  } else {
    console.log(`${name}: no holes`)
  }
}
await b.close()
