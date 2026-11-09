"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ────────────────────────────────────────────────────────────
   Playdates — invite another parent, they accept or decline,
   accepted playdates go on the calendar.

   No backend: an invite is a link that carries the playdate in its
   URL hash (#i=…). The other parent's answer comes back the same way
   (#r=…). Each device keeps its own list in localStorage.

   Location search uses Google Places when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   is set (Maps JavaScript API + Places API (New) enabled), and falls
   back to OpenStreetMap search when it isn't.
   ──────────────────────────────────────────────────────────── */

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const STORE_KEY = "playdates.v1";
const ME_KEY = "playdates.me";

const ACTIVITIES = [
  { id: "park", label: "Park", emoji: "🌳", hue: 135, search: "park" },
  { id: "playground", label: "Playground", emoji: "🛝", hue: 22, search: "playground" },
  { id: "splash", label: "Splash pad", emoji: "💦", hue: 200, search: "splash pad" },
  { id: "museum", label: "Museum", emoji: "🦕", hue: 275, search: "children's museum" },
  { id: "library", label: "Library", emoji: "📚", hue: 42, search: "library" },
  { id: "indoor", label: "Indoor play", emoji: "🧸", hue: 330, search: "indoor playground" },
  { id: "swim", label: "Swimming", emoji: "🏊", hue: 188, search: "swimming pool" },
  { id: "home", label: "Our place", emoji: "🏡", hue: 8, search: "" },
];
const BRING = ["Snacks", "Water bottle", "Sunscreen", "Hat", "Change of clothes", "Scooter / bike", "Swimsuit"];
const DURATIONS = [
  { m: 60, label: "1h" },
  { m: 90, label: "1½h" },
  { m: 120, label: "2h" },
  { m: 180, label: "3h" },
];
const activityOf = (id) => ACTIVITIES.find((a) => a.id === id) || ACTIVITIES[0];

/* ── Encoding (UTF‑8 safe, URL‑safe base64) ─────────────── */
const enc = (obj) => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const dec = (str) => {
  try {
    const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
};

/* ── Storage ───────────────────────────────────────────── */
const readJSON = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

/* ── Dates ─────────────────────────────────────────────── */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const nextWeekday = (dow) => {
  const t = new Date();
  const diff = (dow - t.getDay() + 7) % 7 || 7;
  return addDays(t, diff);
};
const endOf = (p) => new Date(new Date(p.start).getTime() + p.duration * 60000);
const fmtDay = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const fmtShortDay = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const fmtRange = (p) => `${fmtTime(p.start)} – ${fmtTime(endOf(p))}`;
const relDay = (iso) => {
  const a = new Date(iso);
  const b = new Date();
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const days = Math.round((a - b) / 864e5);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const s = Math.abs(days) < 14 ? rtf.format(days, "day") : rtf.format(Math.round(days / 7), "week");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ── Playdate helpers ──────────────────────────────────── */
const titleOf = (p) => {
  if (p.hostKid && p.guestKid) return `${p.hostKid} + ${p.guestKid}`;
  if (p.hostKid) return `Playdate with ${p.hostKid}`;
  return "Playdate";
};
const placeLine = (place) => (place ? [place.name, place.address && place.address !== place.name ? place.address : ""].filter(Boolean).join(", ") : "");
const describe = (p) =>
  [
    `${activityOf(p.activity).emoji} ${activityOf(p.activity).label} playdate`,
    p.hostName && `Hosted by ${p.hostName}${p.hostKid ? ` (${p.hostKid})` : ""}`,
    p.guestName && `With ${p.guestName}${p.guestKid ? ` (${p.guestKid})` : ""}`,
    p.bring?.length ? `Bring: ${p.bring.join(", ")}` : "",
    p.note ? `Note: ${p.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
const publicInvite = (p) => {
  const { role, status, reply, updated, ...rest } = p;
  return rest;
};
const baseUrl = () => `${location.origin}${location.pathname}`;
const inviteLink = (p) => `${baseUrl()}#i=${enc(publicInvite(p))}`;
const replyLink = (r) => `${baseUrl()}#r=${enc(r)}`;

/* ── Calendar ──────────────────────────────────────────── */
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const googleCalUrl = (p) =>
  "https://calendar.google.com/calendar/render?" +
  new URLSearchParams({
    action: "TEMPLATE",
    text: `${activityOf(p.activity).emoji} ${titleOf(p)}`,
    dates: `${stamp(p.start)}/${stamp(endOf(p))}`,
    details: describe(p),
    location: placeLine(p.place),
  });
const outlookUrl = (p) =>
  "https://outlook.live.com/calendar/0/deeplink/compose?" +
  new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `${activityOf(p.activity).emoji} ${titleOf(p)}`,
    startdt: new Date(p.start).toISOString(),
    enddt: endOf(p).toISOString(),
    location: placeLine(p.place),
    body: describe(p),
  });
const icsEscape = (s = "") => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const downloadIcs = (p) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Playdates//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${p.id}@playdates`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(p.start)}`,
    `DTEND:${stamp(endOf(p))}`,
    `SUMMARY:${icsEscape(`${activityOf(p.activity).emoji} ${titleOf(p)}`)}`,
    `LOCATION:${icsEscape(placeLine(p.place))}`,
    `DESCRIPTION:${icsEscape(describe(p))}`,
    p.place?.lat != null ? `GEO:${p.place.lat};${p.place.lng}` : null,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Playdate in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `playdate-${ymd(new Date(p.start))}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

/* ── Maps ──────────────────────────────────────────────── */
const mapEmbedUrl = (place) =>
  place?.lat != null ? `https://maps.google.com/maps?q=${place.lat},${place.lng}&z=15&output=embed` : null;
const directionsUrl = (place) =>
  `https://www.google.com/maps/dir/?api=1&destination=${
    place?.lat != null ? `${place.lat},${place.lng}` : encodeURIComponent(placeLine(place))
  }`;

let gmapsPromise = null;
function loadGoogle() {
  if (!GMAPS_KEY) return Promise.resolve(null);
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) return resolve(window.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GMAPS_KEY)}&v=weekly&loading=async&libraries=places`;
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => {
      gmapsPromise = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });
  return gmapsPromise;
}

async function searchPlaces(term, near, tokenRef) {
  const g = await loadGoogle().catch(() => null);
  if (g) {
    const { AutocompleteSuggestion, AutocompleteSessionToken } = await g.maps.importLibrary("places");
    if (!tokenRef.current) tokenRef.current = new AutocompleteSessionToken();
    const req = { input: term, sessionToken: tokenRef.current };
    if (near) req.locationBias = { center: near, radius: 25000 };
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
    return suggestions
      .filter((s) => s.placePrediction)
      .slice(0, 5)
      .map((s) => ({
        key: s.placePrediction.placeId,
        main: s.placePrediction.mainText?.text || s.placePrediction.text.text,
        sub: s.placePrediction.secondaryText?.text || "",
        prediction: s.placePrediction,
      }));
  }
  const params = new URLSearchParams({ q: term, format: "jsonv2", limit: "5", "accept-language": navigator.language || "en" });
  if (near) params.set("viewbox", `${near.lng - 0.35},${near.lat + 0.35},${near.lng + 0.35},${near.lat - 0.35}`);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  const rows = await res.json();
  return rows.map((r) => {
    const parts = r.display_name.split(",").map((x) => x.trim());
    const name = r.name || parts[0];
    return {
      key: String(r.place_id),
      main: name,
      sub: parts.slice(1, 4).join(", "),
      place: { name, address: r.display_name, lat: +r.lat, lng: +r.lon },
    };
  });
}

async function resolvePlace(item) {
  if (item.place) return item.place;
  const place = item.prediction.toPlace();
  await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "googleMapsURI"] });
  return {
    id: place.id,
    name: place.displayName,
    address: place.formattedAddress,
    lat: place.location?.lat(),
    lng: place.location?.lng(),
    url: place.googleMapsURI,
  };
}

/* ── Small utilities ───────────────────────────────────── */
const buzz = (ms = 8) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

/* ── Icons (SF Symbols-ish) ────────────────────────────── */
const PATHS = {
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  calendar: "M4 8h16M8 3v3M16 3v3M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  clock: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  locate: "M12 2v3M12 19v3M2 12h3M19 12h3M12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  share: "M12 3v12M8 7l4-4 4 4M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7",
  copy: "M9 9h10v11H9zM5 15V4h10",
  message: "M4 5h16v11H9l-5 4z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  car: "M5 16l1.5-6A2 2 0 018.4 8.5h7.2a2 2 0 011.9 1.5L19 16M4 16h16v3H4zM7 19v1M17 19v1",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  swap: "M7 7h11l-3-3M17 17H6l3 3",
};
function Icon({ name, size = 20, stroke = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/* ── UI atoms ──────────────────────────────────────────── */
function Segmented({ options, value, onChange }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="seg" role="tablist" style={{ "--n": options.length, "--i": idx }}>
      <span className="seg-thumb" />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? "on" : ""}
          onClick={() => {
            buzz();
            onChange(o.value);
          }}
        >
          {o.label}
          {o.badge ? <span className="seg-badge">{o.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

function CalTile({ iso, size = 56 }) {
  const d = new Date(iso);
  return (
    <div className="caltile" style={{ width: size, height: size }}>
      <span className="caltile-m">{d.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}</span>
      <span className="caltile-d" style={{ fontSize: size * 0.48 }}>
        {d.getDate()}
      </span>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: ["Awaiting reply", "orange"],
    accepted: ["Going", "green"],
    declined: ["Declined", "red"],
    proposed: ["New time suggested", "purple"],
  };
  const [label, tone] = map[status] || map.pending;
  return <span className={`pill pill-${tone}`}>{label}</span>;
}

function Confetti({ burst }) {
  const pieces = useMemo(
    () =>
      burst
        ? Array.from({ length: 70 }, (_, i) => ({
            left: Math.random() * 100,
            delay: Math.random() * 0.4,
            dur: 1.8 + Math.random() * 1.4,
            rot: Math.random() * 720 - 360,
            color: ["#ff2d55", "#ff9500", "#ffcc00", "#34c759", "#5ac8fa", "#af52de"][i % 6],
            w: 6 + Math.random() * 6,
          }))
        : [],
    [burst]
  );
  if (!burst) return null;
  return (
    <div className="confetti" key={burst} aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.w,
            height: p.w * 1.6,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            "--rot": `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

function Sheet({ onClose, children, label }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet glass-strong" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  );
}

/* ── Invite card (preview + recipient view) ────────────── */
function InviteCard({ p, showMap = true }) {
  const act = activityOf(p.activity);
  const hasDate = !!p.start && !isNaN(new Date(p.start));
  return (
    <article className="invite glass">
      <div className="invite-hero" style={{ "--h": act.hue }}>
        <span className="invite-emoji">{act.emoji}</span>
        <div>
          <div className="invite-kicker">{act.label} playdate</div>
          <h2 className="invite-title">{titleOf(p)}</h2>
          {p.hostName ? <div className="invite-from">from {p.hostName}</div> : null}
        </div>
      </div>
      <div className="invite-body">
        {hasDate ? (
          <div className="invite-when">
            <CalTile iso={p.start} />
            <div>
              <div className="strong">{fmtDay(p.start)}</div>
              <div className="muted">
                {fmtRange(p)} · {relDay(p.start)}
              </div>
            </div>
          </div>
        ) : null}
        {p.place?.name ? (
          <a className="invite-where" href={directionsUrl(p.place)} target="_blank" rel="noopener noreferrer">
            <span className="icon-bubble" style={{ background: "rgba(255,59,48,.14)", color: "var(--red)" }}>
              <Icon name="pin" size={18} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="strong ellipsis">{p.place.name}</div>
              {p.place.address && p.place.address !== p.place.name ? <div className="muted ellipsis">{p.place.address}</div> : null}
            </div>
            <Icon name="chevron" size={16} style={{ marginLeft: "auto", opacity: 0.4, flexShrink: 0 }} />
          </a>
        ) : null}
        {showMap && mapEmbedUrl(p.place) ? (
          <div className="map">
            <iframe title="Map" src={mapEmbedUrl(p.place)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        ) : null}
        {p.bring?.length ? (
          <div>
            <div className="eyebrow">Bring along</div>
            <div className="chips">
              {p.bring.map((b) => (
                <span key={b} className="chip chip-static">
                  {b}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {p.note ? <p className="note">“{p.note}”</p> : null}
      </div>
    </article>
  );
}

/* ── Place picker ──────────────────────────────────────── */
function PlacePicker({ value, onChange, activity, invalid }) {
  const [q, setQ] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [near, setNear] = useState(null);
  const [locating, setLocating] = useState(false);
  const tokenRef = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2 || (value && !value.custom && term === value.name)) {
      setResults([]);
      setLoading(false);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(
      async () => {
        try {
          const r = await searchPlaces(term, near, tokenRef);
          if (id === seq.current) setResults(r);
        } catch {
          if (id === seq.current) setResults([]);
        } finally {
          if (id === seq.current) setLoading(false);
        }
      },
      GMAPS_KEY ? 220 : 650 // OSM asks for ≤1 request/second
    );
    return () => clearTimeout(t);
  }, [q, open, near]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (item) => {
    buzz();
    setOpen(false);
    setResults([]);
    setQ(item.main);
    try {
      const place = await resolvePlace(item);
      tokenRef.current = null;
      setQ(place.name);
      onChange(place);
    } catch {
      onChange({ name: item.main, address: item.sub });
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const a = activityOf(activity);
        if (!q.trim() && a.search) setQ(a.search);
        setOpen(true);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  const act = activityOf(activity);
  return (
    <div className="picker">
      <div className={`row search ${invalid ? "invalid" : ""}`}>
        <Icon name="pin" size={18} style={{ color: "var(--red)", flexShrink: 0 }} />
        <input
          value={q}
          placeholder={act.id === "home" ? "Your address" : `Search a ${act.label.toLowerCase()} or address`}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            onChange(e.target.value.trim() ? { name: e.target.value.trim(), custom: true } : null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          aria-label="Location"
          autoComplete="off"
        />
        {loading ? <span className="spinner" /> : null}
        <button className={`locate ${near ? "on" : ""}`} onClick={locate} type="button" aria-label="Search near me" title="Search near me">
          {locating ? <span className="spinner" /> : <Icon name="locate" size={18} />}
        </button>
      </div>
      {open && results.length ? (
        <ul className="results glass-strong" role="listbox">
          {results.map((r) => (
            <li key={r.key}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)}>
                <span className="icon-bubble small">
                  <Icon name="pin" size={14} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="strong ellipsis block">{r.main}</span>
                  <span className="muted ellipsis block small">{r.sub}</span>
                </span>
              </button>
            </li>
          ))}
          <li className="attribution">{GMAPS_KEY ? "Powered by Google" : "Search © OpenStreetMap contributors"}</li>
        </ul>
      ) : null}
      {near ? <div className="hint">📍 Showing places near you</div> : null}
      {mapEmbedUrl(value) ? (
        <div className="map map-small">
          <iframe title="Selected location" src={mapEmbedUrl(value)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      ) : null}
    </div>
  );
}

/* ── Calendar + share button rows ──────────────────────── */
function CalendarButtons({ p }) {
  return (
    <div className="btn-grid">
      <a className="btn btn-tinted" href={googleCalUrl(p)} target="_blank" rel="noopener noreferrer" onClick={() => buzz()}>
        <span className="g-dot">G</span> Google
      </a>
      <button className="btn btn-tinted" onClick={() => (buzz(), downloadIcs(p))}>
        <Icon name="calendar" size={18} /> Apple / iCal
      </button>
      <a className="btn btn-tinted" href={outlookUrl(p)} target="_blank" rel="noopener noreferrer" onClick={() => buzz()}>
        <Icon name="mail" size={18} /> Outlook
      </a>
    </div>
  );
}

function ShareButtons({ url, text, title, toast, label = "Share invite link" }) {
  const full = `${text}\n${url}`;
  const nativeShare = async () => {
    buzz();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    if (await copyText(url)) toast("Link copied");
  };
  return (
    <>
      <button className="btn btn-primary btn-lg" onClick={nativeShare}>
        <Icon name="share" size={19} /> {label}
      </button>
      <div className="btn-grid four">
        <a className="btn btn-glass" href={`sms:?&body=${encodeURIComponent(full)}`}>
          <Icon name="message" size={18} /> Text
        </a>
        <a className="btn btn-glass" href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener noreferrer">
          <span style={{ fontSize: 16 }}>💬</span> WhatsApp
        </a>
        <a className="btn btn-glass" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(full)}`}>
          <Icon name="mail" size={18} /> Email
        </a>
        <button className="btn btn-glass" onClick={async () => (buzz(), (await copyText(url)) && toast("Link copied"))}>
          <Icon name="copy" size={18} /> Copy
        </button>
      </div>
    </>
  );
}

/* ── Create view ───────────────────────────────────────── */
function CreateView({ initial, onCancel, onSend }) {
  const me = useMemo(() => readJSON(ME_KEY, {}), []);
  const tomorrow = addDays(new Date(), 1);
  const [f, setF] = useState(() =>
    initial
      ? {
          ...initial,
          date: ymd(new Date(initial.start)),
          time: hm(new Date(initial.start)),
        }
      : {
          hostName: me.hostName || "",
          hostKid: me.hostKid || "",
          guestName: "",
          guestKid: "",
          activity: "park",
          date: ymd(tomorrow),
          time: "10:00",
          duration: 120,
          place: null,
          bring: ["Snacks", "Water bottle"],
          note: "",
        }
  );
  const [tried, setTried] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const start = f.date && f.time ? new Date(`${f.date}T${f.time}`) : null;
  const draft = { ...f, start: start && !isNaN(start) ? start.toISOString() : null };
  const errors = {
    hostName: !f.hostName.trim(),
    when: !draft.start,
    past: draft.start && new Date(draft.start) < new Date(),
    place: !f.place?.name,
  };
  const valid = !errors.hostName && !errors.when && !errors.past && !errors.place;

  const quickDates = [
    { label: "Today", d: new Date() },
    { label: "Tomorrow", d: tomorrow },
    { label: "Sat", d: nextWeekday(6) },
    { label: "Sun", d: nextWeekday(0) },
  ];

  const submit = () => {
    setTried(true);
    if (!valid) {
      buzz(30);
      return;
    }
    writeJSON(ME_KEY, { hostName: f.hostName.trim(), hostKid: f.hostKid.trim() });
    const { date, time, ...rest } = draft;
    onSend({
      ...rest,
      id: initial?.id || uid(),
      hostName: f.hostName.trim(),
      hostKid: f.hostKid.trim(),
      guestName: f.guestName.trim(),
      guestKid: f.guestKid.trim(),
      note: f.note.trim(),
      created: initial?.created || Date.now(),
    });
  };

  return (
    <div className="create">
      <header className="nav">
        <button className="nav-btn" onClick={onCancel}>
          <Icon name="back" size={20} /> Back
        </button>
        <span className="nav-title">{initial ? "Edit playdate" : "New playdate"}</span>
        <span style={{ width: 64 }} />
      </header>

      <div className="create-grid">
        <div className="create-form">
          <section>
            <div className="section-label">Who</div>
            <div className="group glass">
              <label className={`row ${tried && errors.hostName ? "invalid" : ""}`}>
                <span className="row-label">You</span>
                <input value={f.hostName} onChange={(e) => set("hostName", e.target.value)} placeholder="Your name" autoComplete="given-name" />
              </label>
              <label className="row">
                <span className="row-label">Your kid</span>
                <input value={f.hostKid} onChange={(e) => set("hostKid", e.target.value)} placeholder="e.g. Maya" />
              </label>
              <label className="row">
                <span className="row-label">Inviting</span>
                <input value={f.guestName} onChange={(e) => set("guestName", e.target.value)} placeholder="Other parent" />
              </label>
              <label className="row">
                <span className="row-label">Their kid</span>
                <input value={f.guestKid} onChange={(e) => set("guestKid", e.target.value)} placeholder="e.g. Leo" />
              </label>
            </div>
          </section>

          <section>
            <div className="section-label">What</div>
            <div className="activity-grid">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`activity glass ${f.activity === a.id ? "on" : ""}`}
                  style={{ "--h": a.hue }}
                  onClick={() => (buzz(), set("activity", a.id))}
                  aria-pressed={f.activity === a.id}
                >
                  <span className="activity-emoji">{a.emoji}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="section-label">When</div>
            <div className="chips" style={{ marginBottom: 10 }}>
              {quickDates.map((q) => (
                <button key={q.label} type="button" className={`chip ${f.date === ymd(q.d) ? "on" : ""}`} onClick={() => (buzz(), set("date", ymd(q.d)))}>
                  {q.label}
                </button>
              ))}
            </div>
            <div className="group glass">
              <label className={`row ${tried && (errors.when || errors.past) ? "invalid" : ""}`}>
                <Icon name="calendar" size={18} style={{ color: "var(--red)" }} />
                <span className="row-label">Date</span>
                <input type="date" value={f.date} min={ymd(new Date())} onChange={(e) => set("date", e.target.value)} />
              </label>
              <label className={`row ${tried && (errors.when || errors.past) ? "invalid" : ""}`}>
                <Icon name="clock" size={18} style={{ color: "var(--blue)" }} />
                <span className="row-label">Starts</span>
                <input type="time" value={f.time} step={900} onChange={(e) => set("time", e.target.value)} />
              </label>
              <div className="row">
                <span className="row-label" style={{ minWidth: 0 }}>
                  Length
                </span>
                <div style={{ flex: 1 }}>
                  <Segmented options={DURATIONS.map((d) => ({ value: d.m, label: d.label }))} value={f.duration} onChange={(v) => set("duration", v)} />
                </div>
              </div>
            </div>
            {tried && errors.past ? <div className="error">That time has already passed.</div> : null}
          </section>

          <section>
            <div className="section-label">Where</div>
            <div className="group glass" style={{ overflow: "visible" }}>
              <PlacePicker value={f.place} onChange={(v) => set("place", v)} activity={f.activity} invalid={tried && errors.place} />
            </div>
          </section>

          <section>
            <div className="section-label">Bring along</div>
            <div className="chips">
              {BRING.map((b) => {
                const on = f.bring.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    className={`chip ${on ? "on" : ""}`}
                    onClick={() => (buzz(), set("bring", on ? f.bring.filter((x) => x !== b) : [...f.bring, b]))}
                    aria-pressed={on}
                  >
                    {on ? <Icon name="check" size={14} stroke={2.6} /> : null} {b}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="section-label">Note</div>
            <div className="group glass">
              <textarea
                className="row textarea"
                rows={3}
                maxLength={280}
                value={f.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="Allergies, parking tips, which entrance…"
              />
            </div>
          </section>
        </div>

        <aside className="create-preview">
          <div className="section-label">Preview</div>
          <InviteCard p={draft} showMap={false} />
          <p className="muted small center" style={{ marginTop: 12 }}>
            This is what {f.guestName.trim() || "the other parent"} will see.
          </p>
        </aside>
      </div>

      <div className="bottom-bar glass-strong">
        <button className="btn btn-primary btn-lg" onClick={submit}>
          <Icon name="sparkle" size={18} /> {initial ? "Update invite" : "Create invite"}
        </button>
      </div>
    </div>
  );
}

/* ── Sent view ─────────────────────────────────────────── */
function SentView({ p, onDone, toast }) {
  const url = inviteLink(p);
  const text = `${p.hostName} invited ${p.guestKid || "you"} to a playdate 🎈 ${fmtShortDay(p.start)}, ${fmtTime(p.start)} at ${p.place?.name}. Tap to RSVP:`;
  return (
    <div className="center-col">
      <div className="success-badge">
        <svg viewBox="0 0 52 52" width="64" height="64" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3" className="draw-circle" />
          <path d="M15 27l7 7 15-15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="draw-check" />
        </svg>
      </div>
      <h1 className="large-title center">Invite ready</h1>
      <p className="muted center" style={{ marginTop: -6 }}>
        Send it to {p.guestName || "the other parent"}. When they answer, they send you back a link. Open it and the reply shows up here.
      </p>
      <InviteCard p={p} showMap={false} />
      <ShareButtons url={url} text={text} title={`Playdate: ${titleOf(p)}`} toast={toast} />
      <button className="btn btn-plain" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

/* ── Recipient view ────────────────────────────────────── */
function InviteView({ invite, existing, onRespond, onClose, toast }) {
  const [mode, setMode] = useState(null); // null | "propose"
  const [note, setNote] = useState("");
  const [altDate, setAltDate] = useState(ymd(new Date(invite.start)));
  const [altTime, setAltTime] = useState(hm(new Date(invite.start)));
  const isHost = existing?.role === "host";
  const answered = existing?.role === "guest" ? existing : null;
  const expired = endOf(invite) < new Date();

  if (answered) {
    const r = answered.reply || {};
    const url = replyLink({ id: invite.id, status: answered.status, by: invite.guestName || "", note: r.note || "", alt: r.alt || null });
    const host = invite.hostName || "the host";
    const msg =
      answered.status === "accepted"
        ? `We're in! 🎉 See you ${fmtShortDay(invite.start)}.`
        : answered.status === "declined"
        ? `Sorry, we can't make this one.`
        : `Could we do ${fmtShortDay(r.alt)} at ${fmtTime(r.alt)} instead?`;
    return (
      <div className="center-col">
        <div className={`result-emoji ${answered.status}`}>{answered.status === "accepted" ? "🎉" : answered.status === "declined" ? "💌" : "🗓️"}</div>
        <h1 className="large-title center">
          {answered.status === "accepted" ? "You're going!" : answered.status === "declined" ? "Declined" : "New time suggested"}
        </h1>
        {answered.status === "accepted" ? (
          <>
            <InviteCard p={invite} />
            <div className="section-label">Add to calendar</div>
            <CalendarButtons p={invite} />
          </>
        ) : null}
        <div className="section-label">Let {host} know</div>
        <ShareButtons url={url} text={`${msg}${r.note ? ` “${r.note}”` : ""} — reply for ${titleOf(invite)}:`} title="Playdate reply" toast={toast} label={`Send reply to ${host}`} />
        <button className="btn btn-plain" onClick={onClose}>
          Go to my playdates
        </button>
      </div>
    );
  }

  return (
    <div className="center-col">
      {isHost ? <div className="banner glass">👀 This is your own invite. You're seeing what the other parent sees.</div> : null}
      <p className="eyebrow center" style={{ marginBottom: -8 }}>
        You're invited
      </p>
      <h1 className="large-title center">
        {invite.hostName || "Someone"} wants a playdate{invite.guestKid ? ` with ${invite.guestKid}` : ""}
      </h1>
      <InviteCard p={invite} />

      {expired ? (
        <div className="banner glass">This playdate has already happened.</div>
      ) : mode === "propose" ? (
        <div className="glass propose">
          <div className="section-label" style={{ marginTop: 0 }}>
            Suggest another time
          </div>
          <div className="group">
            <label className="row">
              <span className="row-label">Date</span>
              <input type="date" value={altDate} min={ymd(new Date())} onChange={(e) => setAltDate(e.target.value)} />
            </label>
            <label className="row">
              <span className="row-label">Time</span>
              <input type="time" value={altTime} step={900} onChange={(e) => setAltTime(e.target.value)} />
            </label>
            <textarea className="row textarea" rows={2} placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="btn-grid two">
            <button className="btn btn-glass" onClick={() => setMode(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const alt = new Date(`${altDate}T${altTime}`);
                if (isNaN(alt) || alt < new Date()) return toast("Pick a time in the future");
                onRespond("proposed", { note: note.trim(), alt: alt.toISOString() });
              }}
            >
              Send suggestion
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea className="glass note-input" rows={2} placeholder={`Add a note for ${invite.hostName || "the host"} (optional)`} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="btn-grid two">
            <button className="btn btn-decline btn-lg" onClick={() => onRespond("declined", { note: note.trim() })}>
              <Icon name="close" size={18} stroke={2.6} /> Decline
            </button>
            <button className="btn btn-accept btn-lg" onClick={() => onRespond("accepted", { note: note.trim() })}>
              <Icon name="check" size={18} stroke={2.6} /> Accept
            </button>
          </div>
          <button className="btn btn-plain" onClick={() => (buzz(), setMode("propose"))}>
            <Icon name="swap" size={18} /> Suggest another time
          </button>
        </>
      )}
    </div>
  );
}

/* ── Detail sheet ──────────────────────────────────────── */
function DetailSheet({ entry, onClose, onUpdate, onDelete, onReshare, toast }) {
  const isHost = entry.role === "host";
  const r = entry.reply || {};
  const other = isHost ? entry.guestName || "They" : entry.hostName || "The host";
  return (
    <Sheet onClose={onClose} label={titleOf(entry)}>
      <div className="sheet-head">
        <StatusPill status={entry.status} />
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" size={16} stroke={2.6} />
        </button>
      </div>
      <InviteCard p={entry} />

      {r.note || r.alt ? (
        <div className="reply glass">
          <div className="eyebrow">{other} said</div>
          {r.alt ? (
            <div className="strong">
              How about {fmtDay(r.alt)} at {fmtTime(r.alt)}?
            </div>
          ) : null}
          {r.note ? <div className="muted">“{r.note}”</div> : null}
        </div>
      ) : null}

      {entry.status === "proposed" && isHost && r.alt ? (
        <button className="btn btn-primary btn-lg" onClick={() => onReshare({ ...entry, start: r.alt, status: "pending", reply: null })}>
          <Icon name="check" size={18} /> Use new time & resend
        </button>
      ) : null}

      {entry.status === "accepted" || isHost ? (
        <>
          <div className="section-label">Add to calendar</div>
          <CalendarButtons p={entry} />
        </>
      ) : null}

      <a className="btn btn-glass" href={directionsUrl(entry.place)} target="_blank" rel="noopener noreferrer">
        <Icon name="car" size={18} /> Directions
      </a>

      {isHost && entry.status !== "accepted" ? (
        <>
          <div className="section-label">Got a reply another way?</div>
          <div className="btn-grid two">
            <button className="btn btn-tinted green" onClick={() => (onUpdate({ ...entry, status: "accepted" }), toast("Marked as going"))}>
              Mark accepted
            </button>
            <button className="btn btn-tinted red" onClick={() => (onUpdate({ ...entry, status: "declined" }), toast("Marked as declined"))}>
              Mark declined
            </button>
          </div>
        </>
      ) : null}

      {isHost && endOf(entry) > new Date() ? (
        <button className="btn btn-glass" onClick={() => onReshare(entry)}>
          <Icon name="share" size={18} /> Share invite again
        </button>
      ) : null}

      <button
        className="btn btn-plain danger"
        onClick={() => {
          if (confirm("Delete this playdate from this device?")) onDelete(entry.id);
        }}
      >
        <Icon name="trash" size={18} /> Delete
      </button>
    </Sheet>
  );
}

/* ── Home ──────────────────────────────────────────────── */
function PlaydateRow({ p, onOpen, i }) {
  const act = activityOf(p.activity);
  return (
    <button className="pd-row glass" onClick={() => (buzz(), onOpen(p.id))} style={{ animationDelay: `${i * 45}ms` }}>
      <span className="pd-row-emoji" style={{ "--h": act.hue }}>
        {act.emoji}
      </span>
      <span className="pd-row-main">
        <span className="pd-row-top">
          <span className="strong ellipsis">{titleOf(p)}</span>
          <span className="rel">{relDay(p.start)}</span>
        </span>
        <span className="muted ellipsis small block">
          {fmtShortDay(p.start)} · {fmtTime(p.start)} · {p.place?.name}
        </span>
        <span className="pd-row-bottom">
          <StatusPill status={p.status} />
          <span className="muted small">{p.role === "host" ? `to ${p.guestName || "guest"}` : `from ${p.hostName || "host"}`}</span>
        </span>
      </span>
      <Icon name="chevron" size={16} style={{ opacity: 0.35, flexShrink: 0 }} />
    </button>
  );
}

function Home({ items, onNew, onOpen }) {
  const [tab, setTab] = useState("upcoming");
  const now = new Date();
  const groups = useMemo(() => {
    const live = items.filter((x) => endOf(x) > now);
    const sortAsc = (a, b) => new Date(a.start) - new Date(b.start);
    return {
      upcoming: live.filter((x) => x.status === "accepted").sort(sortAsc),
      pending: live.filter((x) => x.status === "pending" || x.status === "proposed").sort(sortAsc),
      past: items.filter((x) => endOf(x) <= now || x.status === "declined").sort((a, b) => sortAsc(b, a)),
    };
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = groups.upcoming[0];
  const list = groups[tab];
  const empty = {
    upcoming: ["☀️", "Nothing on the calendar yet", "Accepted playdates show up here."],
    pending: ["📬", "No open invites", "Invites waiting on an answer show up here."],
    past: ["🧺", "No past playdates", "Playdates that have happened, and declined ones, end up here."],
  }[tab];

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <div className="eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="large-title">Playdates</h1>
        </div>
        <button className="fab" onClick={() => (buzz(), onNew())} aria-label="New playdate">
          <Icon name="plus" size={24} stroke={2.6} />
        </button>
      </header>

      {next ? (
        <button className="next glass" onClick={() => onOpen(next.id)} style={{ "--h": activityOf(next.activity).hue }}>
          <span className="next-glow" />
          <span className="eyebrow">Up next · {relDay(next.start)}</span>
          <span className="next-title">
            {activityOf(next.activity).emoji} {titleOf(next)}
          </span>
          <span className="muted">
            {fmtDay(next.start)} · {fmtRange(next)}
          </span>
          <span className="muted ellipsis block">📍 {next.place?.name}</span>
        </button>
      ) : null}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming", badge: groups.upcoming.length || null },
          { value: "pending", label: "Pending", badge: groups.pending.length || null },
          { value: "past", label: "Past" },
        ]}
      />

      <div className="list">
        {list.length ? (
          list.map((p, i) => <PlaydateRow key={p.id} p={p} onOpen={onOpen} i={i} />)
        ) : (
          <div className="empty glass">
            <div className="empty-emoji">{empty[0]}</div>
            <div className="strong">{empty[1]}</div>
            <div className="muted small">{empty[2]}</div>
            {tab !== "past" ? (
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={onNew}>
                <Icon name="plus" size={18} stroke={2.6} /> Plan a playdate
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── App ───────────────────────────────────────────────── */
export default function PlaydatesPage() {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState([]);
  const [view, setView] = useState({ name: "home" });
  const [detailId, setDetailId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [burst, setBurst] = useState(0);
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const save = useCallback((next) => {
    setItems(next);
    writeJSON(STORE_KEY, next);
  }, []);
  const upsert = useCallback(
    (entry) => {
      const cur = readJSON(STORE_KEY, []);
      save([{ ...entry, updated: Date.now() }, ...cur.filter((x) => x.id !== entry.id)]);
    },
    [save]
  );

  const clearHash = () => history.replaceState(null, "", location.pathname + location.search);

  useEffect(() => {
    setItems(readJSON(STORE_KEY, []));
    setReady(true);
    const route = () => {
      const h = new URLSearchParams(location.hash.slice(1));
      if (h.get("i")) {
        const inv = dec(h.get("i"));
        if (inv?.id && inv?.start) setView({ name: "invite", invite: inv });
        else {
          toast("That invite link looks broken");
          clearHash();
        }
      } else if (h.get("r")) {
        const rep = dec(h.get("r"));
        clearHash();
        if (!rep?.id) return toast("That reply link looks broken");
        const cur = readJSON(STORE_KEY, []);
        const found = cur.find((x) => x.id === rep.id && x.role === "host");
        if (!found) return toast("That reply is for an invite made on another device");
        const next = cur.map((x) =>
          x.id === rep.id ? { ...x, status: rep.status, reply: { note: rep.note, alt: rep.alt, by: rep.by, at: Date.now() }, updated: Date.now() } : x
        );
        setItems(next);
        writeJSON(STORE_KEY, next);
        setView({ name: "home" });
        setDetailId(rep.id);
        const who = rep.by || found.guestName || "They";
        if (rep.status === "accepted") {
          setBurst((b) => b + 1);
          buzz(20);
          toast(`🎉 ${who} accepted!`);
        } else if (rep.status === "declined") toast(`${who} can't make it`);
        else toast(`${who} suggested a new time`);
      }
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, [toast]);

  const detail = items.find((x) => x.id === detailId);

  let content = null;
  if (!ready) content = null;
  else if (view.name === "create")
    content = (
      <CreateView
        initial={view.initial}
        onCancel={() => setView({ name: "home" })}
        onSend={(p) => {
          const entry = { ...p, role: "host", status: "pending", reply: null };
          upsert(entry);
          setView({ name: "sent", p: entry });
          buzz(15);
        }}
      />
    );
  else if (view.name === "sent") content = <SentView p={view.p} toast={toast} onDone={() => setView({ name: "home" })} />;
  else if (view.name === "invite")
    content = (
      <InviteView
        invite={view.invite}
        existing={items.find((x) => x.id === view.invite.id)}
        toast={toast}
        onClose={() => {
          clearHash();
          setView({ name: "home" });
        }}
        onRespond={(status, reply) => {
          upsert({ ...view.invite, role: "guest", status, reply });
          if (status === "accepted") {
            setBurst((b) => b + 1);
            buzz(20);
          } else buzz(10);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  else content = <Home items={items} onNew={() => setView({ name: "create" })} onOpen={setDetailId} />;

  return (
    <div className="pd-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pd-bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="blob b4" />
      </div>
      <main className="pd-main" key={view.name}>
        {content}
      </main>
      {detail ? (
        <DetailSheet
          entry={detail}
          toast={toast}
          onClose={() => setDetailId(null)}
          onUpdate={upsert}
          onDelete={(id) => {
            save(items.filter((x) => x.id !== id));
            setDetailId(null);
            toast("Deleted");
          }}
          onReshare={(entry) => {
            upsert(entry);
            setDetailId(null);
            setView({ name: "sent", p: entry });
          }}
        />
      ) : null}
      <Confetti burst={burst} />
      <div className={`toast glass-strong ${toastMsg ? "show" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────── */
const CSS = `
.pd-root{
  --bg:#f2f2f7; --text:#1c1c1e; --text2:rgba(60,60,67,.62); --text3:rgba(60,60,67,.32);
  --glass:rgba(255,255,255,.58); --glass-strong:rgba(255,255,255,.82); --stroke:rgba(255,255,255,.75);
  --hair:rgba(60,60,67,.13); --fill:rgba(118,118,128,.12); --fill2:rgba(118,118,128,.2);
  --blue:#007aff; --green:#34c759; --red:#ff3b30; --orange:#ff9500; --purple:#af52de;
  --shadow:0 1px 1px rgba(0,0,0,.02), 0 12px 40px rgba(40,50,110,.10);
  --inner:inset 0 1px 0 rgba(255,255,255,.7);
  --blob-o:.55;
  position:relative; min-height:100vh; min-height:100dvh; background:var(--bg); color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Inter","Helvetica Neue",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; letter-spacing:-.01em;
  -webkit-tap-highlight-color:transparent; overflow-x:hidden;
}
@media (prefers-color-scheme: dark){
  .pd-root{
    --bg:#000; --text:#f5f5f7; --text2:rgba(235,235,245,.62); --text3:rgba(235,235,245,.3);
    --glass:rgba(30,30,34,.55); --glass-strong:rgba(40,40,44,.82); --stroke:rgba(255,255,255,.09);
    --hair:rgba(84,84,88,.5); --fill:rgba(118,118,128,.24); --fill2:rgba(118,118,128,.34);
    --blue:#0a84ff; --green:#30d158; --red:#ff453a; --orange:#ff9f0a; --purple:#bf5af2;
    --shadow:0 12px 40px rgba(0,0,0,.5); --inner:inset 0 1px 0 rgba(255,255,255,.06); --blob-o:.32;
    color-scheme:dark;
  }
}
.pd-root *{box-sizing:border-box}
:where(.pd-root) :where(button,input,textarea){font:inherit;color:inherit;letter-spacing:inherit}
:where(.pd-root) :where(button){cursor:pointer;border:0;background:none;padding:0}
:where(.pd-root) :where(a){color:inherit;text-decoration:none}
:where(.pd-root) :where(input,textarea){outline:none}
.pd-root :focus-visible:not(input):not(textarea){outline:2px solid var(--blue);outline-offset:2px}

/* background */
.pd-bg{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;width:55vmax;height:55vmax;border-radius:50%;filter:blur(70px);opacity:var(--blob-o);animation:float 26s ease-in-out infinite alternate}
.b1{background:radial-gradient(circle,#ff9ad5,transparent 65%);top:-20vmax;left:-15vmax}
.b2{background:radial-gradient(circle,#7ab8ff,transparent 65%);top:-10vmax;right:-20vmax;animation-delay:-6s}
.b3{background:radial-gradient(circle,#8ef0c6,transparent 65%);bottom:-25vmax;left:5vmax;animation-delay:-12s}
.b4{background:radial-gradient(circle,#ffd29a,transparent 65%);bottom:-20vmax;right:-10vmax;animation-delay:-18s}
@keyframes float{0%{transform:translate(0,0) scale(1)}50%{transform:translate(6vmax,4vmax) scale(1.1)}100%{transform:translate(-4vmax,7vmax) scale(.95)}}

.pd-main{position:relative;z-index:1;max-width:560px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 20px) 16px calc(env(safe-area-inset-bottom) + 40px);animation:fadeUp .45s cubic-bezier(.2,.8,.2,1)}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* glass */
.glass{background:var(--glass);-webkit-backdrop-filter:saturate(180%) blur(28px);backdrop-filter:saturate(180%) blur(28px);border:1px solid var(--stroke);box-shadow:var(--shadow),var(--inner);border-radius:22px}
.glass-strong{background:var(--glass-strong);-webkit-backdrop-filter:saturate(180%) blur(36px);backdrop-filter:saturate(180%) blur(36px);border:1px solid var(--stroke);box-shadow:var(--shadow),var(--inner)}

/* type */
.large-title{font-size:34px;line-height:1.1;font-weight:700;letter-spacing:-.025em;margin:0}
.eyebrow{font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.04em}
.section-label{font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin:26px 4px 8px}
.strong{font-weight:600}
.muted{color:var(--text2)}
.small{font-size:13px}
.center{text-align:center}
.block{display:block}
.ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 18px;border-radius:14px;font-size:16px;font-weight:600;transition:transform .15s ease,filter .15s ease,background .2s ease;user-select:none;width:100%}
.btn:active{transform:scale(.97);filter:brightness(.95)}
.btn-lg{min-height:54px;font-size:17px;border-radius:16px}
.btn-primary{background:linear-gradient(180deg,#2a8cff,var(--blue));color:#fff;box-shadow:0 8px 22px rgba(0,122,255,.32),inset 0 1px 0 rgba(255,255,255,.25)}
.btn-accept{background:linear-gradient(180deg,#44d36a,var(--green));color:#fff;box-shadow:0 8px 22px rgba(52,199,89,.32),inset 0 1px 0 rgba(255,255,255,.25)}
.btn-decline{background:var(--fill);color:var(--red)}
.btn-tinted{background:rgba(0,122,255,.12);color:var(--blue)}
.btn-tinted.green{background:rgba(52,199,89,.14);color:var(--green)}
.btn-tinted.red{background:rgba(255,59,48,.12);color:var(--red)}
.btn-glass{background:var(--glass);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid var(--stroke);box-shadow:var(--inner)}
.btn-plain{color:var(--blue);background:transparent;min-height:44px}
.btn-plain.danger{color:var(--red)}
.btn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.btn-grid.two{grid-template-columns:1fr 1fr}
.btn-grid.four{grid-template-columns:repeat(4,1fr)}
.btn-grid .btn{padding:0 8px;font-size:14px}
.btn-grid.two .btn-lg{font-size:17px}
@media (max-width:420px){.btn-grid.four{grid-template-columns:1fr 1fr}.btn-grid .btn{font-size:13px;gap:6px}}
@media (max-width:340px){.btn-grid:not(.two):not(.four){grid-template-columns:1fr}}
.g-dot{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:conic-gradient(#ea4335 0 25%,#fbbc05 0 50%,#34a853 0 75%,#4285f4 0);color:#fff;font-size:11px;font-weight:800}
.fab{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#2a8cff,var(--blue));color:#fff;box-shadow:0 10px 26px rgba(0,122,255,.38),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .2s cubic-bezier(.3,1.6,.5,1)}
.fab:hover{transform:rotate(90deg)}
.fab:active{transform:scale(.92)}
.spinner{width:16px;height:16px;border-radius:50%;border:2px solid var(--fill2);border-top-color:var(--blue);animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}

/* segmented */
.seg{position:relative;display:grid;grid-template-columns:repeat(var(--n),1fr);background:var(--fill);border-radius:10px;padding:2px;margin-top:20px}
.row .seg{margin-top:0}
.seg-thumb{position:absolute;top:2px;bottom:2px;left:2px;width:calc((100% - 4px)/var(--n));border-radius:8px;background:var(--glass-strong);box-shadow:0 3px 8px rgba(0,0,0,.12),0 0 1px rgba(0,0,0,.1);transform:translateX(calc(var(--i)*100%));transition:transform .35s cubic-bezier(.3,1.25,.5,1)}
.seg button{position:relative;z-index:1;height:32px;font-size:14px;font-weight:500;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:6px;color:var(--text2);transition:color .2s}
.seg button.on{color:var(--text);font-weight:600}
.seg-badge{min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--red);color:#fff;font-size:11px;font-weight:700;display:inline-grid;place-items:center}

/* chips */
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 14px;border-radius:999px;background:var(--glass);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid var(--stroke);font-size:14px;font-weight:500;transition:all .2s ease}
.chip.on{background:var(--blue);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(0,122,255,.3)}
.chip:active{transform:scale(.95)}
.chip-static{height:28px;padding:0 11px;font-size:13px;background:var(--fill);border:0}
.pill{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:600}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.pill-orange{color:var(--orange);background:rgba(255,149,0,.14)}
.pill-green{color:var(--green);background:rgba(52,199,89,.14)}
.pill-red{color:var(--red);background:rgba(255,59,48,.12)}
.pill-purple{color:var(--purple);background:rgba(175,82,222,.14)}

/* grouped list */
.group{border-radius:16px;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;min-height:50px;padding:6px 16px;position:relative;font-size:17px}
.group > .row + .row::before,.group > .picker + .row::before{content:"";position:absolute;top:0;left:16px;right:0;height:1px;background:var(--hair);transform:scaleY(.5)}
.row-label{min-width:82px;color:var(--text);font-weight:500}
.row input{flex:1;min-width:0;background:transparent;border:0;text-align:right;color:var(--text);font-size:17px}
.row input::placeholder,.textarea::placeholder,.note-input::placeholder{color:var(--text3)}
.row input[type=date],.row input[type=time]{color:var(--blue);font-weight:500}
.row.invalid{box-shadow:inset 3px 0 0 var(--red)}
.row.invalid input::placeholder{color:var(--red);opacity:.7}
.textarea{width:100%;border:0;background:transparent;resize:none;padding:14px 16px;font-size:16px;line-height:1.4;display:block}
.error{color:var(--red);font-size:13px;margin:8px 4px 0}
.hint{font-size:13px;color:var(--text2);padding:0 16px 10px}

/* home */
.home-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:8px}
.next{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:4px;text-align:left;width:100%;padding:20px;margin-top:20px;border-radius:24px}
.next-glow{position:absolute;inset:-40% -20% auto auto;width:70%;height:160%;background:radial-gradient(circle,hsl(var(--h) 95% 65% / .45),transparent 60%);pointer-events:none}
.next-title{font-size:22px;font-weight:700;letter-spacing:-.02em;margin:2px 0}
.list{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.pd-row{display:flex;align-items:center;gap:14px;padding:14px;text-align:left;width:100%;border-radius:20px;animation:fadeUp .4s both cubic-bezier(.2,.8,.2,1);transition:transform .15s}
.pd-row:active{transform:scale(.98)}
.pd-row-emoji{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;font-size:28px;flex-shrink:0;background:linear-gradient(135deg,hsl(var(--h) 95% 78%),hsl(calc(var(--h) + 35) 90% 62%));box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 14px hsl(var(--h) 80% 50% / .25)}
.pd-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.pd-row-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.pd-row-bottom{display:flex;align-items:center;gap:8px;margin-top:3px}
.rel{font-size:13px;color:var(--blue);font-weight:600;flex-shrink:0}
.empty{padding:36px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}
.empty-emoji{font-size:44px;margin-bottom:6px;animation:bob 3s ease-in-out infinite}
.empty .btn{width:auto}
@keyframes bob{50%{transform:translateY(-6px)}}

/* invite card */
.invite{overflow:hidden;border-radius:26px}
.invite-hero{display:flex;align-items:center;gap:16px;padding:22px 20px;background:linear-gradient(135deg,hsl(var(--h) 95% 80% / .9),hsl(calc(var(--h) + 40) 90% 66% / .85));color:#1c1c1e;position:relative}
.invite-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.35),transparent 55%);pointer-events:none}
.invite-emoji{font-size:44px;width:68px;height:68px;border-radius:20px;display:grid;place-items:center;background:rgba(255,255,255,.45);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 8px 20px rgba(0,0,0,.08);flex-shrink:0}
.invite-kicker{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;opacity:.65}
.invite-title{font-size:24px;line-height:1.15;font-weight:700;letter-spacing:-.02em;margin:2px 0 0}
.invite-from{font-size:14px;opacity:.7;margin-top:2px}
.invite-body{padding:18px 20px 20px;display:flex;flex-direction:column;gap:16px}
.invite-when{display:flex;align-items:center;gap:14px}
.invite-where{display:flex;align-items:center;gap:12px;min-width:0}
.icon-bubble{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex-shrink:0;background:var(--fill)}
.icon-bubble.small{width:30px;height:30px;border-radius:9px;color:var(--red);background:rgba(255,59,48,.12)}
.caltile{border-radius:14px;background:var(--glass-strong);box-shadow:0 4px 12px rgba(0,0,0,.08),inset 0 0 0 1px var(--hair);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
.caltile-m{font-size:10px;font-weight:700;color:var(--red);letter-spacing:.05em;line-height:1;margin-top:2px}
.caltile-d{font-weight:300;line-height:1;letter-spacing:-.04em}
.note{margin:0;padding:12px 14px;border-radius:14px;background:var(--fill);font-size:15px;line-height:1.4}
.map{border-radius:16px;overflow:hidden;height:170px;box-shadow:inset 0 0 0 1px var(--hair);background:var(--fill)}
.map iframe{width:100%;height:100%;border:0;display:block}
.map-small{height:140px;margin:0 12px 12px}

/* create */
.nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;margin:-8px -4px 6px;padding:8px 4px}
.nav-btn{display:flex;align-items:center;gap:2px;color:var(--blue);font-size:17px;width:64px}
.nav-title{font-size:17px;font-weight:600}
.activity-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.activity{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 4px 12px;border-radius:18px;font-size:12.5px;font-weight:600;transition:transform .2s cubic-bezier(.3,1.5,.5,1),box-shadow .2s}
.activity-emoji{font-size:28px;transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.activity.on{background:linear-gradient(135deg,hsl(var(--h) 95% 80% / .95),hsl(calc(var(--h) + 35) 90% 65% / .9));color:#1c1c1e;border-color:transparent;box-shadow:0 10px 24px hsl(var(--h) 80% 50% / .3),inset 0 1px 0 rgba(255,255,255,.6);transform:translateY(-2px)}
.activity.on .activity-emoji{transform:scale(1.18) rotate(-6deg)}
.activity:active{transform:scale(.94)}
.picker{position:relative}
.picker .search input{text-align:left}
.locate{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--blue);background:rgba(0,122,255,.1);flex-shrink:0}
.locate.on{background:var(--blue);color:#fff}
.results{position:absolute;left:8px;right:8px;top:calc(100% - 4px);z-index:20;list-style:none;margin:0;padding:6px;border-radius:16px;animation:fadeUp .2s ease}
.results button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border-radius:11px;text-align:left}
.results button:hover{background:var(--fill)}
.attribution{font-size:11px;color:var(--text3);text-align:right;padding:4px 10px 2px}
.bottom-bar{position:fixed;left:0;right:0;bottom:0;z-index:10;padding:12px 16px calc(env(safe-area-inset-bottom) + 12px);border-width:1px 0 0;border-radius:0}
.bottom-bar .btn{max-width:528px;margin:0 auto;display:flex}
.create{padding-bottom:90px}
.create-preview{margin-top:8px}
@media (min-width:980px){
  .pd-main:has(.create){max-width:1040px}
  .create-grid{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:36px;align-items:start}
  .create-preview{position:sticky;top:20px}
  .bottom-bar .btn{max-width:420px}
}

/* sent / invite */
.center-col{display:flex;flex-direction:column;gap:14px;padding-top:12px}
.center-col > .section-label{margin-bottom:-4px}
.success-badge{color:var(--green);display:grid;place-items:center;margin:10px auto 0;filter:drop-shadow(0 8px 20px rgba(52,199,89,.35))}
.draw-circle{stroke-dasharray:151;stroke-dashoffset:151;animation:draw .6s ease forwards}
.draw-check{stroke-dasharray:40;stroke-dashoffset:40;animation:draw .35s .5s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.result-emoji{font-size:64px;text-align:center;margin-top:8px;animation:pop .6s cubic-bezier(.3,1.6,.5,1)}
@keyframes pop{from{transform:scale(.3);opacity:0}}
.banner{padding:12px 16px;font-size:14px;text-align:center;border-radius:16px}
.note-input{width:100%;resize:none;padding:14px 16px;font-size:16px;border-radius:16px;line-height:1.4}
.propose{padding:16px;display:flex;flex-direction:column;gap:12px}
.propose .group{background:var(--fill)}

/* sheet */
.overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.28);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .25s ease}
@keyframes fadeIn{from{opacity:0}}
.sheet{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:30px 30px 0 0;padding:8px 16px calc(env(safe-area-inset-bottom) + 20px);display:flex;flex-direction:column;gap:12px;animation:slideUp .45s cubic-bezier(.32,.72,0,1);overscroll-behavior:contain}
.sheet > *{flex-shrink:0}
.sheet > .section-label{margin:10px 4px -4px}
@keyframes slideUp{from{transform:translateY(100%)}}
@media (min-width:640px){.overlay{align-items:center}.sheet{border-radius:30px;max-height:88vh}}
.grabber{width:38px;height:5px;border-radius:3px;background:var(--fill2);margin:2px auto 4px;flex-shrink:0}
.sheet-head{display:flex;align-items:center;justify-content:space-between}
.close-btn{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--fill);color:var(--text2)}
.reply{padding:14px 16px;display:flex;flex-direction:column;gap:4px;border-radius:18px}

/* toast + confetti */
.toast{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 14px);z-index:80;transform:translate(-50%,-140%);padding:12px 20px;border-radius:999px;font-size:15px;font-weight:600;transition:transform .45s cubic-bezier(.3,1.4,.5,1);white-space:nowrap;max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis}
.toast.show{transform:translate(-50%,0)}
.confetti{position:fixed;inset:0;pointer-events:none;z-index:90;overflow:hidden}
.confetti i{position:absolute;top:-20px;border-radius:2px;animation:fall linear forwards}
@keyframes fall{to{transform:translateY(110vh) rotate(var(--rot));opacity:.9}}

@media (prefers-reduced-motion: reduce){
  .blob,.empty-emoji{animation:none}
  .pd-root *{transition-duration:.01ms!important;animation-duration:.01ms!important}
}
`;
