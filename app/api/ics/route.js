// Returns a calendar file built by the Playdates page (passed URL-safe base64 in ?c=).
// Serving it with text/calendar lets iOS Safari show "Add to Calendar" directly.
export const dynamic = "force-dynamic";

const decode = (str) => {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const c = searchParams.get("c") || "";
  const name = (searchParams.get("n") || "playdate").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "playdate";
  let text = "";
  try {
    // the page encodes with its JSON-based helper, so the payload is a JSON string
    text = c.length < 12000 ? JSON.parse(decode(c)) : "";
    if (typeof text !== "string") text = "";
  } catch {}
  // only ever serve a single, well-formed calendar
  if (!/^BEGIN:VCALENDAR\r?\n[\s\S]*END:VCALENDAR\s*$/.test(text)) {
    return new Response("Invalid calendar", { status: 400 });
  }
  return new Response(text, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${name}.ics"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}
