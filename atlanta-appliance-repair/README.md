# Mr. V Appliance Repair: website

Static site for **Mr. V Appliance Repair** (Mr. V Appliance & Electrical, LLC, Loganville, GA). No build step.

```
index.html   page structure
styles.css   design system + animations
main.js      rendering + interactions
config.js    ALL business content (edit this file)
assets/      seal mark
```

Preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

Deploy on Vercel: import the repo and set **Root Directory** to `atlanta-appliance-repair` (framework preset: Other).

## Before launch
- [ ] Replace the 5 **sample reviews** in `config.js` with real Google/Yelp reviews (they show a "Sample" tag until `sample: false`).
- [ ] Add a form backend (`formEndpoint`). Without one, the booking form opens a pre-filled text to 770-757-3097.
- [ ] Confirm the ZIP prefixes, owner name and email (if public).
- [ ] Optionally swap `assets/mascot.svg` for the real mascot vector from the wrap vendor.
