# Shrujan — Shopify theme

A 1:1 port of the React/Vite site in `../website` to a Shopify theme. Markup,
copy, CSS (`assets/shrujan-global.css`, `assets/shrujan-pages.css` — verbatim
copies of the site's stylesheets) and every GSAP/Lenis animation are preserved;
React components became Liquid snippets, React state became small vanilla
scripts, and the SPA router became real Shopify URLs.

## Layout of the theme

- `layout/theme.liquid` — head (fonts, CSS, GSAP + ScrollTrigger + Lenis +
  data + core JS, loaded synchronously so section scripts can rely on them),
  then header / `main` / footer, matching the React tree.
- `snippets/` — one file per React component or page
  (`home-*` = the 14 home-page components, `page-*` = the sub-pages,
  `product-piece` = the product page, `shrujan-header` / `shrujan-footer`).
  Interactive behavior lives in an inline `<script>` at the end of the same
  snippet.
- `templates/*.liquid` — thin wrappers that render the right snippet per URL.
  `404.liquid` and `page.liquid` render the home sections because the React
  app's catch-all route rendered the storefront.
- `assets/` — all images/videos from `website/public` (three files renamed:
  `bottom left/bottom right/top right.webp` → hyphenated), the two stylesheets,
  `gsap.min.js`, `ScrollTrigger.min.js`, `lenis.min.js` (self-hosted, per
  SMOOTH-SCROLL.md), `shrujan-catalogue.js` (the catalogue/product data as
  `window.SHRUJAN`) and `shrujan-core.js` (smooth scroll, scroll reveals,
  header/footer behavior).

## Installing

**Fastest — the ready-made zip.** `../shrujan-theme.zip` (46.9 MB) uploads
directly: **Online Store → Themes → Add theme → Upload zip file**. To fit
Shopify's 50 MB zip cap (the theme carries ~160 MB of media) the zip:

- leaves out the 11 large films (`craft-*.mp4`, `reel-*.mp4`, 107 MB) — every
  page still renders correctly, those players show their poster frames;
- re-encodes the 141 largest photos at webp q78 (dimensions/ICC unchanged,
  visually identical). The originals in this folder are untouched.

**Full fidelity afterwards (optional, one command).** From this folder:
`shopify theme push` targeting the uploaded theme — the CLI syncs
file-by-file with no 50 MB cap, restoring the original images byte-for-byte
and uploading the films. `craft-discharge.mp4` (24 MB) may exceed the
per-file upload limit; if it's rejected, either shrink it once
(`ffmpeg -i craft-discharge.mp4 -crf 26 -preset slow -movflags +faststart
assets/craft-discharge.mp4`) or upload it under **Content → Files** and swap
that one URL in `snippets/page-craft-traditions.liquid`.
3. Create the pages (Online Store → Pages) so the URLs exist. Give each page
   its matching template; the page body can stay empty:

   | Page title | Handle | Template |
   |---|---|---|
   | Shop Shrujan | `shop-shrujan` | `page.shop-shrujan` |
   | Studio Collection | `studio-collection` | `page.studio-collection` |
   | Heritage | `studio-heritage` | `page.studio-heritage` |
   | Avinya | `studio-avinya` | `page.studio-avinya` |
   | Gifting & Collaborations | `studio-gifting` | `page.studio-gifting` |
   | Craft Traditions of Kutch | `video` | `page.video` |
   | The Shrujan Story | `the-shrujan-story` | `page.the-shrujan-story` |
   | Living & Learning Design Centre | `lldc` | `page.lldc` |
   | Visit & Experience | `visit-experience` | `page.visit-experience` |

   (The React routes `/pages/studio-collection/heritage|avinya|gifting` became
   flat handles — Shopify page URLs cannot nest.)
4. Product pages: `/products/<slug>` renders `templates/product.liquid`, which
   draws everything client-side from `window.SHRUJAN` by the URL slug — the
   same way the React page did. For those URLs to resolve, create products in
   admin whose **handles equal the catalogue slugs** (the slug is
   `piece.slug ?? slugify(piece.name)` from `website/src/data/`). Until a
   handle exists Shopify returns its 404 (which renders the storefront, like
   the React fallback). Prices/checkout stay display-only until you decide to
   wire the catalogue to real Shopify products.

## Static preview (no Shopify needed)

```
node build-preview.mjs
```

writes `../preview/*.html` — the identical markup with `asset_url` resolved to
`../shopify-theme/assets/` and a tiny click-time shim that maps the theme's
real URLs onto the local files. Open `preview/index.html` directly, or serve
the repo root (`python3 -m http.server` in `..`) and browse
`http://localhost:8000/preview/`.

## Notes

- Smooth scroll = Lenis driven by GSAP's ticker, exactly as documented in
  `website/SMOOTH-SCROLL.md`, including the reduced-motion opt-out and the
  glide-to-anchor settling loop.
- The theme editor (`shopify:section:load`) triggers `ScrollTrigger.refresh()`
  from `shrujan-core.js`.
- Cart/search/account/collection templates are minimal stubs (the React build
  had no such flows); the required template set exists so the theme uploads
  cleanly.
- Newsletter + enquiry forms reproduce the React behavior (client-side success
  message, nothing submitted). Swap in `{% form %}` tags when you want them
  live.
