"use client";
import { createClient } from "@supabase/supabase-js";

// Live sync via Supabase. If these env vars are missing the app runs in
// link-only mode (replies travel back as links, data stays on the device).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

let client = null;
export function sb() {
  if (!cloudEnabled) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true, storageKey: "playdates.auth" },
    });
  }
  return client;
}

const DATA_KEYS = ["hostName", "hostKid", "guestName", "guestKid", "activity", "place", "bring", "note", "created"];
const toRow = (e) => ({
  id: e.id,
  data: Object.fromEntries(DATA_KEYS.map((k) => [k, e[k] ?? null])),
  start_at: e.start,
  duration_min: e.duration,
  status: e.status,
  reply: e.reply ?? null,
  updated_at: new Date().toISOString(),
});
export const fromRow = (r, uid) => ({
  ...r.data,
  id: r.id,
  start: r.start_at,
  duration: r.duration_min,
  status: r.status,
  reply: r.reply,
  token: r.guest_token,
  role: r.host_id === uid ? "host" : "guest",
  synced: true,
  updated: Date.parse(r.updated_at),
});

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const listMine = async (uid) =>
  must(await sb().from("playdates").select("*").order("start_at")).map((r) => fromRow(r, uid));
export const saveHost = async (entry) => must(await sb().from("playdates").upsert(toRow(entry)).select().single());
export const removeHost = async (id) => must(await sb().from("playdates").delete().eq("id", id));
export const getInvite = async (id, token) => must(await sb().rpc("get_playdate_invite", { p_id: id, p_token: token }));
export const respond = async (id, token, status, { note = "", alt = null, by = "" } = {}) =>
  must(
    await sb().rpc("respond_to_playdate", {
      p_id: id,
      p_token: token,
      p_status: status,
      p_note: note || null,
      p_alt: alt || null,
      p_by: by || null,
    })
  );

export function subscribe(uid, onChange) {
  const ch = sb()
    .channel(`playdates-${uid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "playdates" }, onChange)
    .subscribe();
  return () => sb().removeChannel(ch);
}
