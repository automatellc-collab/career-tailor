// Usage: node screenshots.js <out_dir> <name=url> [<name=url> ...]
// Phone-sized (iPhone 13) first-screen captures for the side-by-side page, saved as <name>.jpg-ready PNGs.
const { chromium, devices } = require('playwright');
(async () => {
  const [out, ...pairs] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  for (const pair of pairs) {
    const i = pair.indexOf('='); const name = pair.slice(0, i), url = pair.slice(i + 1);
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(5000);
    await p.screenshot({ path: `${out}/${name}.png` });
    await p.close(); console.log('saved', name);
  }
  await b.close();
})();
