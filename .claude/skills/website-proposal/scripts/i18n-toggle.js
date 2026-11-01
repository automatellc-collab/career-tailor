/* Drop-in EN/ES toggle for a static page.
   1. Add a button: <button class="lang" id="lang" type="button" aria-label="Ver en español"><span data-l="en">EN</span><span data-l="es">ES</span></button>
   2. Paste this script before </body> and fill ES with "English text": "Spanish text" pairs.
      Keys are the visible text of a single text node, whitespace-collapsed. Prefix "@" for alt / placeholder / aria-label values.
   3. Style: html[lang="es"] .lang [data-l="es"] { highlighted } — and the reverse for EN.
   Supports ?lang=es links and remembers the visitor's choice. Get a native speaker to review before launch. */
(() => {
  const ES = { /* "Free quote": "Cotización gratis", "@Photo alt text": "Texto alternativo" */ };
  const texts = [], attrs = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT,
    { acceptNode: n => ['SCRIPT', 'STYLE'].includes(n.parentNode.nodeName) ? 2 : 1 });
  let n; while ((n = w.nextNode())) {
    const k = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (ES[k]) { const v = n.nodeValue; texts.push([n, v, v.match(/^\s*/)[0] + ES[k] + v.match(/\s*$/)[0]]); }
  }
  document.querySelectorAll('[placeholder],[aria-label],img[alt]').forEach(el =>
    ['placeholder', 'aria-label', 'alt'].forEach(a => { const v = el.getAttribute(a); if (v && ES['@' + v]) attrs.push([el, a, v, ES['@' + v]]); }));
  const btn = document.getElementById('lang');
  const set = lang => {
    const es = lang === 'es';
    document.documentElement.lang = es ? 'es' : 'en';
    texts.forEach(([node, en, sp]) => node.nodeValue = es ? sp : en);
    attrs.forEach(([el, a, en, sp]) => el.setAttribute(a, es ? sp : en));
    btn.setAttribute('aria-label', es ? 'View in English' : 'Ver en español');
    btn.setAttribute('aria-pressed', es);
    try { localStorage.setItem('site-lang', document.documentElement.lang); } catch (e) {}
  };
  btn.addEventListener('click', () => set(document.documentElement.lang === 'es' ? 'en' : 'es'));
  let start = new URLSearchParams(location.search).get('lang');
  if (!start) { try { start = localStorage.getItem('site-lang'); } catch (e) {} }
  if (start === 'es') set('es');
})();
