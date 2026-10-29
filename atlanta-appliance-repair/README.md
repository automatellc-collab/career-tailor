# Mr. V Appliance Repair: website

Static site for **Mr. V Appliance Repair** (Mr. V Appliance & Electrical, LLC, Loganville, GA). No build step.

```
index.html   page structure
styles.css   design system + animations
main.js      rendering + interactions
config.js    ALL business content (edit this file)
assets/      logo + photos (from the company's current site)
```

Preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

Live on Render: https://mrv-appliance-repair.onrender.com (static site `mrv-appliance-repair`, publish path `atlanta-appliance-repair`, no build step). Every push to `claude/atlanta-appliance-repair-site-e4gah3` redeploys automatically.

Design file: https://www.figma.com/design/CbalGRdDSfAqv7765X3m5X (tokens, components, desktop homepage).

## Before launch
- [ ] Replace the 5 **sample reviews** in `config.js` with real Google/Yelp reviews (they show a "Sample" tag until `sample: false`).
- [ ] Add a form backend (`formEndpoint`). Without one, the booking form opens a pre-filled text to 770-757-3097.
- [ ] Confirm the ZIP prefixes, owner name and email (if public).
- [ ] The logo is the 1563px PNG from their Wix site. For print or very large use, ask the wrap vendor for the vector original.
