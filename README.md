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
2. Products: `/products/<handle>` renders `templates/product.json` from the real
   Shopify product, so a product has to exist for its URL to resolve. On the
   dev store all 84 catalogue pieces are already seeded — handle == the old
   catalogue slug (`piece.slug ?? slugify(piece.name)` in `website/src/data/`)
   — with prices, four images each, `product_type` set to the collection name,
   and the four `shrujan` metafields. Editing any of it in admin changes the
   storefront; see "Where the content lives" below.

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

## Where the content lives

| What | Edited in |
|---|---|
| Products: title, price, compare-at, images, availability | Shopify **Products** |
| Craft line, Occasion, Badge, Colour swatches | the product's **Metafields** (namespace `shrujan`) |
| Which collections the catalogue rail shows, and their order | the Shop section's **Collection blocks** |
| Collection title, cover image, description | Shopify **Collections** |
| Page copy, headings, images, toggles, layout | **Customize** (each section) |
| Palette, fonts, widths, motion | **Customize → Theme settings** |

The product page, the Shop catalogue grid and the home "edit" all render from
the real product objects, so editing a product in admin changes the storefront.
Nothing about a product is hard-coded in the theme any more —
`assets/shrujan-catalogue.js` now only resolves the craft films' asset paths.

Two Shopify behaviours worth knowing when working on this theme:

- **Liquid `concat` silently no-ops on `collection.products`.** Building a
  cross-collection union that way collapses to the first collection. The Shop
  grid walks the collections with nested loops and an id ledger instead, which
  also sidesteps the 50-item cap a single products loop carries.
- **A rejected file fails quietly.** The GitHub sync log is vague; `PUT`ing the
  file through the Admin API returns the actual validation error. Rules that
  have bitten this theme: `theme_name` ≤ 25 characters, `url` settings may not
  carry a default, range settings need at least three steps, and `gift_card`
  must stay a `.liquid` template.

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
