---
name: website-proposal
description: Generate a client-facing "Website Review & Redesign Proposal" PDF alongside every website design or redesign. Audits the client's current site and the new build with Google Lighthouse (mobile), captures phone screenshots, and lays out a 6-page branded report (cover, summary, scorecard, findings, side-by-side + feature comparison, next steps). Use whenever building, redesigning, or pitching a website for a business, or when the user asks for a website audit, site comparison, pitch document, or client proposal for a site, even if they don't name this skill.
---

# Website Review & Redesign Proposal

Every website we design ships with a proposal PDF the client can read in five minutes. It shows, with measured numbers, what's wrong with their current site and what the new one fixes. `assets/report-template.html` is the approved layout. `assets/example/Green-Landscaping-Website-Review.pdf` shows what a finished one looks like. Match that quality.

## When to produce it

- After building a new site or redesign for a business: generate the proposal as part of the deliverable, without being asked.
- When the client has **no current site**: skip the scorecard and findings pages. Make page 2 "What a website does for you" (search visibility, mobile calls, the specific services) and benchmark the new build alone.
- Run it only once the new build is deployed to a URL. Lighthouse needs a live address, and the report links to it.

## Workflow

1. **Research the current site.** Fetch the home page and record:
   - The platform (look for a `generator` meta tag).
   - The title, meta description and H1.
   - The listed services.
   - The number of `tel:` links.
   - Whether there's LocalBusiness structured data.
   - Language support (`hreflang`, translation plugins, a `/es/` path).
   - Social links and logo.

   Compare it with whatever brought us to the client (a yard sign, flyer, Google listing). A service the client advertises offline but leaves off the site is the strongest finding a report can have.
2. **Audit both sites:**
   `bash scripts/audit.sh <out_dir> <current_url> <redesign_url>`
   This writes `summary.json` with scores, metrics, Google ratings, third-party weight and failing audits. Use these numbers verbatim. Never round them in our favor.
3. **Capture screenshots:**
   `node scripts/screenshots.js <out_dir> current=<url> ours=<url> [ours-es=<url>?lang=es]`
   Crop each to about 560px wide JPGs for the side-by-side page.
4. **Fill the template.** Copy `assets/report-template.html` next to the images and rewrite every section for this client:
   - **Cover:** a headline hook from the client's own marketing, the client's name, city, date and demo URL. Use the hero photo from the build as `cover.jpg` (the example cover is left out of the repo to keep it small).
   - **Summary:** the two biggest measured numbers (usually main-image time), then 3–4 key findings and a bottom line.
   - **Scorecard:** every metric from `summary.json`, with pills from its ratings.
   - **Findings:** 5–7 issues, each with "Why it matters" written in terms of calls and customers, not tech.
   - **Redesign:** three phone screenshots and a feature comparison table, with any callout feature (for example the EN/ES toggle).
   - **Next steps:** demo links, the launch checklist, and "How we tested".

   Re-theme the `:root` colors and fonts to match the website we built, so the proposal and site look like one brand.
5. **Render:** `node scripts/render_pdf.js report.html <Client>-Website-Review.pdf`
   It exits non-zero if any page's content runs into its footer. Fix spacing (image heights, padding) and re-render until it passes. Then view each page once (`pdftoppm -r 60 -png`) before sending.
6. **Deliver** the PDF to the user. Ask for anything only they can supply (below).

## Honesty rules (non-negotiable)

The client will check the claims. One false line costs the whole pitch.
- **Only claim features the build actually has.** If the proposal mentions a feature (Spanish toggle, booking, live chat), verify it works on the deployed demo first, or build it first. For the EN/ES toggle, `scripts/i18n-toggle.js` is the drop-in implementation.
- **Claim the client lacks a feature only after checking.** Example: "English only" requires that `hreflang`, translation plugins and a `/es/` path were all checked and absent.
- **Keep our own "Needs work" ratings.** Don't hide metrics where the redesign isn't "Good".
- **Disclose limits:**
  - concept or illustrated images (night views, mockups)
  - unconnected forms
  - deliberate noindex on demos
  - single-run lab data covering the home page only.
- **Never invent** testimonials, stats, customer counts, prices or the preparer's name. Leave them out and ask the user.
- **Open by saying something true and positive** about the current site if it's warranted. It makes the criticism credible.

## Ask the user for

- Their name or company and contact details for the cover ("Prepared by").
- Pricing, if they want an "Investment" page. Add it as page 6 and move next steps after it.
- Permission status. A public demo of a real business without the owner's OK keeps a "concept demo — not the official site" banner and noindex.

## Google thresholds used for ratings

| Metric | Good | Needs work | Poor |
|---|---|---|---|
| Main image appears (LCP) | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| First thing on screen (FCP) | ≤ 1.8 s | ≤ 3.0 s | > 3.0 s |
| Page frozen (TBT) | ≤ 200 ms | ≤ 600 ms | > 600 ms |
| Category scores | ≥ 90 | ≥ 50 | < 50 |

## Plain-language labels (use these, not jargon)

| Lighthouse term | Write in the report |
|---|---|
| LCP | Main image appears |
| FCP | First thing on screen |
| TBT | Page frozen while loading |
| TTI | Ready to use |
| Total byte weight | Page weight |
| Structured data | Local business information for Google |
