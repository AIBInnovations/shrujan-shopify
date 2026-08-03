/* Admin API client for the dev store, reusing the shopify-claudify MCP's stored
   credentials (that server is a local stdio process; these are the same keys).

   Two auth modes:
     minted  — client_credentials (shpua_) against the direct Admin API
     theme   — the Theme Access token via the theme-kit proxy, which is the only
               one allowed to WRITE theme files
   Tokens are never printed. */
import { readFile, writeFile } from 'node:fs/promises'

const BASE = '/Users/moon/Documents/mcp shopify/shopify-mcp'
const CACHE = `${BASE}/.token-cache.json`
const VERSION = '2026-07'
const PROXY = 'https://theme-kit-access.shopifyapps.com/cli'

export const SHOP = 'apps-development-4.myshopify.com'
export const THEME_ID = 159760416917

export async function store(shop = SHOP) {
  const all = JSON.parse(await readFile(`${BASE}/stores.json`, 'utf8'))
  const s = all.find((x) => x.shop === shop)
  if (!s) throw new Error(`store ${shop} not in stores.json`)
  return s
}

export async function mintedToken(s) {
  let cache = {}
  try { cache = JSON.parse(await readFile(CACHE, 'utf8')) } catch {}
  const hit = cache[s.shop]
  if (hit && hit.expiresAt - Date.now() > 60_000) return hit.accessToken
  const res = await fetch(`https://${s.shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: s.clientId, client_secret: s.clientSecret, grant_type: 'client_credentials' }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`token mint failed ${res.status}: ${text.slice(0, 200)}`)
  const json = JSON.parse(text)
  cache[s.shop] = { accessToken: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 86399) * 1000 }
  await writeFile(CACHE, JSON.stringify(cache, null, 2))
  return cache[s.shop].accessToken
}

/** REST via the direct Admin API (read). */
export async function rest(s, method, path, body) {
  const token = await mintedToken(s)
  const res = await fetch(`https://${s.shop}/admin/api/${VERSION}${path}`, {
    method,
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, ok: res.ok, body: text ? JSON.parse(text) : null }
}

/** GraphQL via the direct Admin API. Check BOTH `errors` and `userErrors` —
 *  a bad argument surfaces at the top level and never reaches userErrors, which
 *  is how a mutation can report success while changing nothing. */
export async function gql(s, query, variables) {
  const token = await mintedToken(s)
  const res = await fetch(`https://${s.shop}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  return { status: res.status, ok: res.ok, ...json }
}

/** REST via the theme-kit proxy — the write path for theme files. */
export async function themeRest(s, method, path, body) {
  const res = await fetch(`${PROXY}/admin/api/${VERSION}${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': s.themeToken,
      'X-Shopify-Shop': s.shop,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = { raw: text.slice(0, 300) } }
  return { status: res.status, ok: res.ok, body: parsed }
}
