# career-tailor

## Playdates (`/playdates`)

Invite another parent to a playdate. They accept, decline, or suggest a new time, and add it to Google, Apple or Outlook Calendar in one tap.

- No backend: the invite and the reply each travel as a link (URL hash). Each device keeps its own list in `localStorage`.
- Location search: set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (enable **Maps JavaScript API** + **Places API (New)**, restrict the key to your domain) to use Google Places autocomplete. Without a key it falls back to OpenStreetMap search.
