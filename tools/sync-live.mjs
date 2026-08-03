#!/usr/bin/env node
/* Compares every code file in this theme against the live theme, and with
   --fix pushes whatever differs. The GitHub integration is eventually
   consistent and occasionally silently rejects a file, so this is the check
   that actually proves the store is running what the repo says.

   Two things it deliberately gets right:
     · JSON is compared semantically — Shopify re-serializes it and adds an
       empty `settings: {}` to every section entry, so a byte comparison would
       report every template as permanently drifted.
     · config/settings_data.json is the merchant's own file. It is never read
       from the repo and never deleted, or --fix would wipe their settings.

   Usage: node tools/sync-live.mjs [--fix] */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { store, rest, themeRest, THEME_ID } from './shopify-api.mjs'

const THEME = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIX = process.argv.includes('--fix')
const MERCHANT_OWNED = new Set(['config/settings_data.json'])

const strip = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\//, '').trim()
const md5 = (s) => createHash('md5').update(strip(s)).digest('hex')

const canon = (v) => {
  if (Array.isArray(v)) return v.map(canon)
  if (v && typeof v === 'object') {
    const out = {}
    for (const k of Object.keys(v).sort()) {
      if (k === 'settings' && v[k] && typeof v[k] === 'object' && !Object.keys(v[k]).length) continue
      out[k] = canon(v[k])
    }
    return out
  }
  return v
}
const same = (key, a, b) => {
  if (!key.endsWith('.json')) return md5(a) === md5(b)
  try { return JSON.stringify(canon(JSON.parse(strip(a)))) === JSON.stringify(canon(JSON.parse(strip(b)))) }
  catch { return md5(a) === md5(b) }
}

const CODE = /\.(liquid|json|js|css)$/
const walk = (dir) => {
  const out = []
  for (const f of readdirSync(join(THEME, dir))) {
    const rel = `${dir}/${f}`
    if (statSync(join(THEME, rel)).isDirectory()) out.push(...walk(rel))
    else out.push(rel)
  }
  return out
}

const local = ['layout', 'templates', 'sections', 'snippets', 'config', 'locales']
  .flatMap(walk)
  .filter((k) => CODE.test(k) && !MERCHANT_OWNED.has(k))
local.push(...readdirSync(join(THEME, 'assets')).filter((f) => /^shrujan-.*\.(css|js)$/.test(f)).map((f) => `assets/${f}`))

const s = await store()
const liveKeys = new Set(((await rest(s, 'GET', `/themes/${THEME_ID}/assets.json`)).body?.assets || []).map((a) => a.key))

const missing = []
const differing = []
for (const key of local) {
  const mine = readFileSync(join(THEME, key), 'utf8')
  if (!liveKeys.has(key)) { missing.push(key); continue }
  const r = await rest(s, 'GET', `/themes/${THEME_ID}/assets.json?asset[key]=${encodeURIComponent(key)}`)
  const live = r.body?.asset?.value
  if (live == null || !same(key, live, mine)) differing.push(key)
}
const localSet = new Set(local)
const stale = [...liveKeys].filter((k) => CODE.test(k) && !localSet.has(k) && !k.startsWith('assets/') && !MERCHANT_OWNED.has(k))

console.log(`local code files: ${local.length}`)
console.log(`missing on live : ${missing.length}${missing.length ? ' → ' + missing.join(', ') : ''}`)
console.log(`out of sync     : ${differing.length}${differing.length ? ' → ' + differing.join(', ') : ''}`)
console.log(`stale on live   : ${stale.length}${stale.length ? ' → ' + stale.join(', ') : ''}`)

if (FIX) {
  for (const key of [...missing, ...differing]) {
    const r = await themeRest(s, 'PUT', `/themes/${THEME_ID}/assets.json`, { asset: { key, value: readFileSync(join(THEME, key), 'utf8') } })
    console.log(`  ${r.ok ? 'pushed' : 'FAILED'} ${key}${r.ok ? '' : ' — ' + JSON.stringify(r.body).slice(0, 200)}`)
  }
  for (const key of stale) {
    const r = await themeRest(s, 'DELETE', `/themes/${THEME_ID}/assets.json?asset[key]=${encodeURIComponent(key)}`)
    console.log(`  ${r.ok ? 'removed stale' : 'could not remove'} ${key}`)
  }
}
