"use client";
import { createClient } from "@supabase/supabase-js";

// Live sync via Supabase, keyed by a secret per-device key (no accounts).
// Without these env vars the app runs in link-only mode.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

const DEVICE_KEY = "playdates.deviceKey";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const newId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
      );

export function deviceKey() {
  try {
    let k = localStorage.getItem(DEVICE_KEY);
    if (!k || !UUID_RE.test(k)) {
      k = newId();
      localStorage.setItem(DEVICE_KEY, k);
    }
    return k;
  } catch {
    return null;
  }
}
export function adoptDeviceKey(k) {
  if (!UUID_RE.test(k || "")) return false;
  try {
    localStorage.setItem(DEVICE_KEY, k);
    return true;
  } catch {
    return false;
  }
}
export const isUuid = (s) => UUID_RE.test(s || "");

let client = null;
function sb() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
const rpc = async (fn, args) => {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw error;
  return data;
};

const DATA_KEYS = ["hostName", "hostKid", "guestName", "guestKid", "guestPhone", "guestEmail", "activity", "place", "bring", "note", "created"];
const dataOf = (e) => Object.fromEntries(DATA_KEYS.map((k) => [k, e[k] ?? null]));

export const fromRow = (r) => ({
  ...r.data,
  id: r.id,
  start: r.start_at,
  duration: r.duration_min,
  status: r.status,
  reply: r.reply,
  token: r.guest_token,
  role: r.role,
  synced: true,
  updated: Date.parse(r.updated_at),
});

export const listMine = async () => (await rpc("pd_list", { p_key: deviceKey() })).map(fromRow);
export const saveHost = (e) =>
  rpc("pd_save", {
    p_key: deviceKey(),
    p_id: e.id,
    p_data: dataOf(e),
    p_start: e.start,
    p_duration: e.duration,
    p_status: e.status || "pending",
    p_reply: e.reply ?? null,
  });
export const removeHost = (id) => rpc("pd_delete", { p_key: deviceKey(), p_id: id });
export const getInvite = (id, token) => rpc("pd_get_invite", { p_id: id, p_token: token });
export const respond = (id, token, status, { note = "", alt = null, by = "" } = {}) =>
  rpc("pd_respond", {
    p_id: id,
    p_token: token,
    p_status: status,
    p_note: note || null,
    p_alt: alt || null,
    p_by: by || null,
    p_guest_key: deviceKey(),
  });
