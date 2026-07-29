#!/usr/bin/env node
/* Renders the Liquid theme into static HTML previews in ../preview/.
   The theme's Liquid vocabulary is deliberately tiny (asset_url, render,
   content_for_layout/header), so a faithful static render needs no Liquid
   engine — every substitution below is exact. Run: node build-preview.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '..', 'preview')
const ASSET_PREFIX = '../shopify-theme/assets/'

/* template file → preview page name */
const PAGES = {
  'index.liquid': 'index.html',
  'page.shop-shrujan.liquid': 'shop-shrujan.html',
  'page.studio-collection.liquid': 'studio-collection.html',
  'page.studio-heritage.liquid': 'studio-heritage.html',
  'page.studio-avinya.liquid': 'studio-avinya.html',
  'page.studio-gifting.liquid': 'studio-gifting.html',
  'page.video.liquid': 'video.html',
  'page.the-shrujan-story.liquid': 'the-shrujan-story.html',
  'page.lldc.liquid': 'lldc.html',
  'page.visit-experience.liquid': 'visit-experience.html',
  'product.liquid': 'product.html',
}

const read = (p) => readFileSync(join(ROOT, p), 'utf8')

function renderSnippets(src, depth = 0) {
  if (depth > 4) throw new Error('render nesting too deep')
  return src.replace(/{%-?\s*render\s+'([^']+)'\s*-?%}/g, (_, name) =>
    renderSnippets(read(join('snippets', `${name}.liquid`)), depth + 1),
  )
}

function renderLiquid(src) {
  return (
    src
      // the asset-base probe in the layout: {{ 'x' | asset_url | split: 'x' | first }}
      .replace(/{{\s*'[^']+'\s*\|\s*asset_url\s*\|\s*split:\s*'[^']+'\s*\|\s*first\s*}}/g, ASSET_PREFIX)
      .replace(/{{\s*'([^']+)'\s*\|\s*asset_url\s*}}/g, (_, f) => ASSET_PREFIX + encodeURI(f))
      .replace(/{{\s*content_for_header\s*}}/g, '')
      .replace(/{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/g, '')
      .replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '')
  )
}

/* Maps the theme's real Shopify URLs onto the local preview files at click
   time, so every snippet keeps its production hrefs (including ones built by
   client-side JS). Injected into the preview pages only — not the theme. */
const SHIM = `<script>
(function () {
  function mapHref(raw) {
    if (!raw || raw[0] !== '/') return null
    var m = raw.match(/^\\/([^?#]*)((?:\\?[^#]*)?)((?:#.*)?)$/)
    if (!m) return null
    var path = m[1].replace(/\\/+$/, '')
    var query = m[2] || ''
    var hash = m[3] || ''
    if (path === '') return 'index.html' + query + hash
    var pages = path.match(/^pages\\/([^\\/]+)$/)
    if (pages) return pages[1] + '.html' + query + hash
    var product = path.match(/^products\\/([^\\/]+)$/)
    if (product) return 'product.html?slug=' + product[1] + hash
    return 'index.html' /* React's catch-all route rendered the storefront */
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a')
    if (!link) return
    var mapped = mapHref(link.getAttribute('href'))
    if (!mapped) return
    e.preventDefault()
    e.stopPropagation()
    window.location.href = mapped
  }, true)
})()
</script>`

const layout = renderSnippets(read(join('layout', 'theme.liquid')))
mkdirSync(OUT, { recursive: true })

for (const [tpl, out] of Object.entries(PAGES)) {
  const body = renderSnippets(read(join('templates', tpl)))
  let html = layout.replace(/{{\s*content_for_layout\s*}}/g, () => body)
  html = renderLiquid(html)
  html = html.replace('</head>', `${SHIM}\n  </head>`)
  const leftover = html.match(/{[{%][^}]{0,80}/g)
  if (leftover) throw new Error(`Unrendered Liquid in ${tpl}: ${leftover.slice(0, 5).join(' | ')}`)
  writeFileSync(join(OUT, out), html)
  console.log(`${out}  ←  ${tpl} (${(html.length / 1024).toFixed(0)} kB)`)
}
console.log('Preview written to', OUT)
