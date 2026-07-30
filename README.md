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
- `sections/` — one customizer-editable section per React component or page
  (`home-*` = the 14 home-page components, `page-*` = the sub-pages,
  `product-piece` = the product page, `shrujan-header` / `shrujan-footer`
  wired through the `header-group`/`footer-group` section groups). Every
  section carries a `{% schema %}` whose setting defaults reproduce today's
  content exactly — texts, images and links are editable in Online Store →
  Customize, repeating items (cards, FAQs, testimonials…) are blocks.
  Interactive behavior lives in an inline `<script>` in the same section.
- `templates/*.json` — OS 2.0 templates pre-populated with today's real
  content as section blocks. `404.json` and `page.json` render the home
  sections because the React app's catch-all route rendered the storefront.
- `assets/` — all images/videos from `website/public` (three files renamed:
  `bottom left/bottom right/top right.webp` → hyphenated), the two stylesheets,
  `gsap.min.js`, `ScrollTrigger.min.js`, `lenis.min.js` (self-hosted, per
  SMOOTH-SCROLL.md), `shrujan-catalogue.js` (the catalogue/product data as
  `window.SHRUJAN`) and `shrujan-core.js` (smooth scroll, scroll reveals,
  header/footer behavior).

## Installing

The whole theme — code plus **all 384 media files** — fits Shopify's 50 MB
theme cap (49 MB total). Two equivalent routes:

- **Zip:** `../shrujan-theme.zip` (48 MB, also on the Desktop) via
  **Online Store → Themes → Add theme → Upload ZIP file**.
- **GitHub:** the same theme lives at
  `github.com/AIBInnovations/shrujan-shopify` (branch `main`) — **Add theme →
  Connect from GitHub**. Commits to `main` auto-sync to the store.

To fit the cap, media is compressed in the theme (masks, logos and all code
untouched): films re-encoded 960×540 two-pass H.264 with audio dropped (every
player on the site is muted), card/gallery photos webp q58, editorial photos
q68, single-generation from the pristine originals in `../website/public` —
which remain the full-quality masters if a lossless setup is ever wanted
(e.g. serving media from Content → Files via `file_url`).

After installing:


1. Create the pages (Online Store → Pages) so the URLs exist. Give each page
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
2. Product pages: `/products/<slug>` renders `templates/product.liquid`, which
   draws everything client-side from `window.SHRUJAN` by the URL slug — the
   same way the React page did. For those URLs to resolve, create products in
   admin whose **handles equal the catalogue slugs** (the slug is
   `piece.slug ?? slugify(piece.name)` from `website/src/data/`). Until a
   handle exists Shopify returns its 404 (which renders the storefront, like
   the React fallback). Prices/checkout stay display-only until you decide to
   wire the catalogue to real Shopify products.

## Customizing without code

Everything below is editable in **Online Store → Customize**. No file needs to
be touched to run the store.

**Theme settings** (the gear icon) drive the design tokens the stylesheets are
actually built on, so a change there re-themes the whole site rather than
patching one spot:

| Group | What it controls |
|---|---|
| Brand | logo image + width, tagline |
| Colours | the full palette — canvas, text, dark panels, accents |
| Typography | font pairing (Heritage / Classic / Modern) and overall text size |
| Layout | content + header width, gutters, space between sections, corner radius |
| Motion | animate on scroll, smooth scrolling, animation speed, easing |
| Custom CSS | site-wide escape hatch |

**Every section** carries the same Design panel — section width, extra top and
bottom spacing for desktop *and* mobile, background / text / accent colour,
hide on mobile or desktop, animate on scroll, and Custom CSS scoped to that
section alone. On top of that each section exposes its own controls: the header
has sticky behaviour, dropdown trigger, utility toggles and mobile logo
settings; grids expose columns per row; carousels expose arrows and autoplay;
the films expose autoplay / loop / posters-only; every page section can show or
hide each of its regions.

Two conventions make this safe to hand to a non-technical editor:

- **Every default is a no-op.** Spacing is applied as additive margin, colours
  are only emitted when set, and behaviour flags only reach the markup once
  moved off their default. An untouched theme renders byte-identically to the
  hand-built design — that is verified by render-diffing each section against
  its pre-customizer version.
- **Layout knobs drive real CSS custom properties** (`--journal-cols`,
  `--hero-min-h`, `--marquee-dur`, `--footer-bg`, …) whose stylesheet fallback
  is the packaged value, so the stylesheet alone still renders the original
  design.

Content lives in the sections too: repeating things (product cards, FAQs,
testimonials, craft films, stops, journal shots) are **blocks** you can add,
remove and reorder — numbering, alternating treatments and meters recompute
from position.

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
