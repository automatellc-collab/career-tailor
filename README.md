# career-tailor

## Playdates (`/playdates`)

Invite another parent to a playdate. They accept, decline, or suggest a new time, and add it to Google, Apple or Outlook Calendar in one tap.

- **Live sync (Supabase):** set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No accounts: each device holds a secret key, and the database is reachable only through key/token-checked functions (`supabase/migrations`). Hosts see answers within ~10s; "Add a device" shares playdates with a partner's phone.
- **Without Supabase** it runs in link-only mode: the invite and the reply each travel as a link, and data stays in `localStorage`.
- **Location search:** set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (enable **Maps JavaScript API** + **Places API (New)**, restrict the key to your domain) for Google Places. Without a key, or if the key fails, it uses OpenStreetMap through `/api/places`.
