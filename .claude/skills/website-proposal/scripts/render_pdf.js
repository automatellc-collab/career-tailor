// Usage: node render_pdf.js <report.html> <out.pdf>
// Renders the proposal to US Letter PDF and fails loudly if any page's content runs into its footer.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [src, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(src), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const problems = await p.evaluate(() => [...document.querySelectorAll('.page')].flatMap((pg, i) => {
    const foot = pg.querySelector('.foot'); if (!foot) return [];
    const limit = foot.getBoundingClientRect().top - 4;
    return [...pg.children].filter(el => el !== foot && el.getBoundingClientRect().bottom > limit)
      .map(el => `page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> overlaps the footer`);
  }));
  await p.pdf({ path: out, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await b.close();
  if (problems.length) { console.error('LAYOUT PROBLEMS:\n' + problems.join('\n')); process.exit(2); }
  console.log('ok', out);
})();
