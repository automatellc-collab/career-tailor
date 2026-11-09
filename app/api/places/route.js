// Server-side proxy for OpenStreetMap search (used when no Google key is set).
// Nominatim's usage policy asks for an identifying User-Agent and light, cached use,
// and it refuses many direct browser requests.
export const dynamic = "force-dynamic";

const cache = new Map(); // tiny in-memory cache: query -> { at, body }
const TTL = 1000 * 60 * 60;
let lastCall = 0;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 120);
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));
  const lang = (searchParams.get("lang") || "en").slice(0, 20);
  const cc = /^[a-z]{2}$/i.test(searchParams.get("cc") || "") ? searchParams.get("cc").toLowerCase() : "";
  if (q.length < 2) return Response.json([]);

  const near = Number.isFinite(lat) && Number.isFinite(lng);
  const key = `${q.toLowerCase()}|${near ? `${lat.toFixed(2)},${lng.toFixed(2)}` : ""}|${lang}|${cc}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return Response.json(hit.body);

  // stay under ~1 request/second across all users of this instance
  const wait = Math.max(0, lastCall + 1000 - Date.now());
  lastCall = Date.now() + wait;
  if (wait) await new Promise((r) => setTimeout(r, wait));

  const params = new URLSearchParams({ q, format: "jsonv2", limit: "5", "accept-language": lang });
  if (cc && !near) params.set("countrycodes", cc);
  if (near) params.set("viewbox", `${lng - 0.35},${lat + 0.35},${lng + 0.35},${lat - 0.35}`);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "Playdates/1.0 (playdate invitations web app)" },
      cache: "no-store",
    });
    if (!res.ok) return Response.json([], { status: 502 });
    const rows = await res.json();
    const body = rows.map((r) => {
      const parts = r.display_name.split(",").map((x) => x.trim());
      const name = r.name || parts[0];
      return {
        key: String(r.place_id),
        main: name,
        sub: parts.slice(1, 4).join(", "),
        place: { name, address: r.display_name, lat: +r.lat, lng: +r.lon },
      };
    });
    if (cache.size > 500) cache.clear();
    cache.set(key, { at: Date.now(), body });
    return Response.json(body);
  } catch {
    return Response.json([], { status: 502 });
  }
}
