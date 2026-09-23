# R&A Concrete LLC — website & identity

A static, dependency-free marketing site and brand identity for R&A Concrete LLC, a concrete pouring company serving metro Atlanta, Georgia.

- `index.html`: the website
- `brand.html`: brand guidelines (logo concepts, lockups, color, type, applications, file list)
- `assets/brand/`: outlined SVG logos (horizontal, stacked, mark × color, reverse, black, white, plus `favicon.svg`)
- `tools/build_logos.py`: regenerates every logo SVG from one source (`pip install fonttools brotli`)

**Stack.** Plain HTML, CSS and ~200 lines of vanilla JS. No framework and no build step, with self-hosted fonts (Archivo variable + IBM Plex Mono, both SIL OFL). All page imagery is procedural SVG, so the whole site is about 470 KB including fonts and the social image. It can be deployed to any static host (Netlify, Cloudflare Pages, Vercel, GitHub Pages, S3) by uploading this folder.

**Preview locally.** `npx serve .` from this folder, then open http://localhost:3000.

---

## Launch handoff

### 1. Facts the owner must confirm or supply
Nothing below has been invented. Each item is marked on the page with a dashed **"owner to confirm"** tag (`.confirm`). Delete the tag once the content is approved.

| Item | Where | Status |
|---|---|---|
| Service list (driveways, patios, walkways, slabs, repair/replacement) and scope tags | Services | Proposed |
| Workmanship priorities / wording | Why R&A | Proposed |
| Six-step process | Process | Proposed |
| Service area limits (which counties/cities, travel radius) | Service area | Only "metro Atlanta" is verified |
| Tear-out & haul-off offered? | FAQ | Unconfirmed |
| Who handles permits? | FAQ | Unconfirmed |
| License & insurance details | FAQ | **Required before claiming anything** |
| Phone number, email | Header (phone button intentionally omitted), footer, JSON-LD | Not supplied |
| Street address / service-area-business setup | JSON-LD, Google Business Profile | Not supplied |
| Domain | `og:image`, `og:url`, JSON-LD `url` | Not supplied |

When a phone number is confirmed, add a `tel:` link in the header next to the estimate button and in the footer, and add `"telephone"` to the JSON-LD block in `index.html`.

### 2. Missing assets
- **Project photography.** The five gallery tiles are labeled placeholders with procedural concrete textures. Replace each `.photo` div's contents with an `<img>` (WebP/AVIF, ~1600px on the long edge, `loading="lazy"`, descriptive `alt`) and fill in location, scope and finish. Only use R&A's own completed work. Good shots: low-angle raking light across the finish, joint and edge close-ups, and wide "after" shots with the house for context.
- **Hero image (optional).** The hero is an illustrated plan drawing, captioned "Illustration only". A real photo of an R&A crew finishing a pour could replace it later, but keep the caption honest.
- **Social image.** `assets/img/og-image.jpg` is ready. Change `og:image` to an absolute URL once the domain is live, since most platforms ignore relative paths.

### 3. Integrations needed
- **Estimate form backend.** Set `FORM_ENDPOINT` at the top of `assets/js/main.js` (Formspree, Basin, Netlify Forms, or your own API accepting a `FormData` POST). Until then the form validates but **explicitly reports that nothing was sent** and shows a "Demo form" banner. Setting the endpoint removes the banner automatically and turns on real success/error states. Add spam protection (honeypot or Turnstile) with it.
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
