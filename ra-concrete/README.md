# R&A Concrete Construction LLC — website & identity

A static, dependency-free marketing site and brand identity for R&A Concrete Construction LLC, a residential and commercial concrete contractor serving metro Atlanta, Georgia.

- `index.html`: the website (English)
- `es/index.html`: the Spanish site, **generated** from `index.html` (see below)
- `brand.html`: brand guidelines (logo concepts, lockups, color, type, applications, file list)
- `assets/brand/`: outlined SVG logos (horizontal, stacked, mark × color, reverse, black, white, plus `favicon.svg`)
- `tools/build_logos.py`: regenerates every logo SVG from one source (`pip install fonttools brotli`)

**Stack.** Plain HTML, CSS and ~200 lines of vanilla JS. No framework and no build step, with self-hosted fonts (Archivo variable + IBM Plex Mono, both SIL OFL). All page imagery is procedural SVG, so the whole site is about 470 KB including fonts and the social image. It can be deployed to any static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages, S3) by uploading this folder.

**After any change, run `python3 tools/build.py`.** It stamps every CSS, JS and image link with a content hash (`styles.css?v=1a2b3c4d`) so returning visitors never get a stale stylesheet with new HTML, and it regenerates the Spanish page. Commit the result.

**Preview locally.** `npx serve .` from this folder, then open http://localhost:3000.

## Deploying to Vercel

The site lives in the `ra-concrete/` folder of this repo, next to an unrelated Next.js app at the repo root, so Vercel needs to be pointed at the folder:

1. In Vercel, **Add New → Project** and import this GitHub repository.
2. Set **Root Directory** to `ra-concrete`.
3. Set **Framework Preset** to **Other**. Leave the build command empty and the output directory as the default (`.`).
4. Deploy. Every push to the production branch redeploys automatically.

`vercel.json` adds security headers, a `/es` → `/es/` redirect, long caching for fonts, and makes browsers re-check CSS, JS and images on every visit. `.vercelignore` keeps `tools/` and this README out of the deployment.

Or from a terminal: `cd ra-concrete && npx vercel --prod`.

After the first deploy, add the custom domain under **Settings → Domains**, then update the absolute URLs listed under "Facts the owner must confirm" below.

## Spanish version

- The EN | ES switch in the header (and a link in the footer) moves between `/` and `/es/`. The choice is remembered: someone who picked Spanish lands on `/es/` the next time they visit `/`.
- `es/index.html` is generated. **Don't edit it by hand.** Change the English page, update the matching entry in `tools/es_strings.py`, then run `python3 tools/build.py`. The script refuses to write the page if any English text it expects has changed, so the two versions can't quietly drift apart.
- Form messages in both languages are in `assets/js/main.js` (`STRINGS`).
- Every estimate request includes a hidden `language` field (`en` or `es`), so the owner knows which language to reply in.
- **Before launch, have the owner (or another native speaker) read the Spanish page.** It uses formal *usted*, neutral Latin American Spanish, and trade terms common in Mexico and Central America (*colado*, *cimbra*, *allanado*). The owner should check that these match how R&A's customers actually talk.

---

## Launch handoff

### 1. Facts the owner must confirm or supply
Nothing below has been invented. Items still open are marked with a dashed **"owner to confirm"** tag (`.confirm`). These tags are **hidden from the public** and appear only in review mode: open the site with `?draft` (e.g. `/?draft` or `/es/?draft`). Delete a tag once its content is approved.

**Questions for the owner** (answers unlock the next round of copy):
1. Which number does he answer himself: 0670 or 0666? Does 0670 take texts? (The site offers "Text us photos" via `sms:`, so a landline would silently lose leads.) WhatsApp?
2. Are estimates free? Does he visit every site in person?
3. Pool renovations: concrete and hardscape only, or also plaster, tile, coping?
4. Which counties or cities does he cover?
5. Tear-out and haul-off, and permits: does R&A handle them?
6. License and insurance: numbers or carriers he's happy to publish?

| Item | Where | Status |
|---|---|---|
| Legal name | Title, footer, JSON-LD, brand guide | **Confirmed** from business card: R&A Concrete Construction LLC. The logo wordmark reads "R&A Concrete" |
| Service list | Services, hero, form options, JSON-LD | **Confirmed** from business card: residential & commercial; driveways/slabs/patios; sidewalks; stamped & colored; hardscape/pavers; retaining walls/fire pits; sitting walls; pool renovations |
| Exact scope of "pool renovations" | Services | Copy says concrete and hardscape around an existing pool. Confirm with owner |
| Scope tags under each service (e.g. "Outdoor kitchen pads") | Services | Descriptive; owner to confirm |
| "Why it matters" section | Why | Rewritten as general concrete facts (base, joints, finish, weather, cure), with no promises. Can become R&A-specific commitments once the owner confirms them |
| Six-step process | Process | Neutral wording ("a pour date is set…"); owner to confirm it matches how he works |
| Service area limits (which counties/cities, travel radius) | Service area | Only "metro Atlanta" is verified |
| Tear-out & haul-off offered? | FAQ | Unconfirmed |
| Who handles permits? | FAQ | Unconfirmed |
| License & insurance details | FAQ | **Required before claiming anything** |
| Phone numbers | Header, hero, estimate section, footer, mobile call bar, JSON-LD | **Confirmed:** (470) 392-0670 (primary), (470) 392-0666 |
| Email | Estimate section, footer, JSON-LD, demo-form email fallback | **Confirmed:** alanconcrete97@gmail.com |
| Project videos | Work section, footer | **Confirmed link:** https://vqr.vc/jV6PxfV80 (opens in a new tab; not embedded) |
| Spanish-language service | Hero, FAQ, footer, JSON-LD `availableLanguage`, `/es/` | **Confirmed** (owner speaks Spanish) |
| Street address / service-area-business setup | JSON-LD, Google Business Profile | Not supplied |
| Domain | see "When the domain is live" below | Not supplied |

**When the domain is live** (search engines ignore relative URLs in these):
- In `index.html`: make `og:image` absolute, add `og:url`, `<link rel="canonical">`, and hreflang links for `en`, `es` and `x-default` (all absolute), and add `"url"` to the JSON-LD. Mirror the structural parts in `tools/build_es.py` and run `python3 tools/build.py`.
- Add `sitemap.xml` listing `/` and `/es/` (with `xhtml:link` hreflang alternates) and uncomment the `Sitemap:` line in `robots.txt`.

### 2. Missing assets
- **Project videos → gallery.** The Work section links to the owner's video page. Embedding the videos (or stills from them) in the gallery needs the video files or their direct URLs; the link page could not be read from the build environment.
- **Project photography.** The five gallery tiles are labeled placeholders with procedural concrete textures. Replace each `.photo` div's contents with an `<img>` (WebP/AVIF, ~1600px on the long edge, `loading="lazy"`, descriptive `alt`) and fill in location, scope and finish. Only use R&A's own completed work. Good shots: low-angle raking light across the finish, joint and edge close-ups, and wide "after" shots with the house for context.
- **Hero image (optional).** The hero is an illustrated plan drawing, captioned "Illustration only". A real photo of an R&A crew finishing a pour could replace it later, but keep the caption honest.
- **Social image.** `assets/img/og-image.jpg` is ready. Change `og:image` to an absolute URL once the domain is live, since most platforms ignore relative paths.

### 3. Integrations needed
- **Estimate form backend.** Set `FORM_ENDPOINT` at the top of `assets/js/main.js` (Formspree, Basin, Netlify Forms, or your own API accepting a `FormData` POST). Until then a valid submission **opens the visitor's email app** with the request pre-filled to alanconcrete97@gmail.com. A note above the form says so, and the status message says it isn't delivered until they press send (there's also an "Open email again" button and the phone number). This works, but some visitors, especially on desktop, have no mail app set up. Quickest real fix: a free Formspree form pointed at that address. Setting the endpoint removes the note automatically and turns on real success/error states. Add spam protection (honeypot or Turnstile) with it.
- **Analytics** (optional): track clicks on "Request an Estimate" and form submissions as conversions.
- **Google Business Profile**: set it up as a service-area business for metro Atlanta. It matters more for local search than anything on this page.
- **Privacy note**: once the form sends real data, add a short privacy policy page and link it next to the submit button.

### 4. Brand production notes
- Logo SVGs are fully outlined, so no fonts are needed. Send them straight to sign, vinyl and embroidery vendors.
- Match Iron Oxide (#A8432A) against a physical swatch before printing; don't rely on the screen value.
- Embroidery: use the mark alone below 3 in wide.

### 5. QA already done
- Rendered and checked at 390, 820 and 1440 px wide with no horizontal overflow.
- All text/background pairs meet WCAG AA (4.88:1 is the lowest ratio, for secondary text on the darker ivory).
- Keyboard: skip link, visible focus rings, the mobile menu closes on Escape and is `inert` while hidden, and the form's error summary links move focus to the field.
- `prefers-reduced-motion` disables the reveal and hero animations; content is fully visible without JavaScript.
