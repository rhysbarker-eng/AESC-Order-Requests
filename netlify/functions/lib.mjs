// Shared helpers: requester list + week logic (all in Europe/London time).
// A "week" runs Monday 09:00 -> next Monday 08:59. Its key is the Monday date (YYYY-MM-DD).

export const TZ = "Europe/London";

export const REQUESTERS = [
  "Rhys Barker", "Steve Sproat", "John Leeman", "Matt Fishwick", "Neil Edmonds",
  "Rob Gustafson", "Luke Jobling", "James Rhymer", "Keelan Robinson", "Lewis Connelly",
  "Alex Hume", "Liam Marsden", "Steve Kingdon", "Lindon Smith", "Michael Palmer",
  "Dale Perkins", "Paul Teasdale", "Ethan Marrs", "Joe Mitchell", "Steve Guz",
  "Jack Marley", "Billy Connelly",
];

function londonParts(date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p = {};
  for (const x of f.formatToParts(date)) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

// Monday-date key of the week a moment belongs to (week starts Monday 09:00 London time).
export function weekKey(date = new Date()) {
  const { y, m, d, h, mi } = londonParts(date);
  const shifted = new Date(Date.UTC(y, m - 1, d, h, mi) - 9 * 3600e3);
  const dow = (shifted.getUTCDay() + 6) % 7; // Monday = 0
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCDate(shifted.getUTCDate() - dow);
  return shifted.toISOString().slice(0, 10);
}

export function addDays(key, n) {
  const dt = new Date(key + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function londonHour(date = new Date()) {
  return londonParts(date).h;
}

export function londonDow(date = new Date()) {
  const name = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(date);
  return name; // "Mon", "Tue", ...
}

export function fmtDate(key) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(key + "T00:00:00Z"));
}

export function weekLabel(key) {
  return `Mon ${fmtDate(key)} 09:00 – Mon ${fmtDate(addDays(key, 7))} 08:59`;
}

export function fmtStamp(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(new Date(iso));
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// ---------- Validation shared by "submit" and "edit" ----------
export const FIELD_NAMES = {
  description: "Description",
  reason: "Reason for request",
  dimensions: "Dimensions",
  material: "Material",
  qty: "QTY",
  url: "URL Link",
  requester: "Requester",
};

const trimTo = (v, max) => String(v ?? "").trim().slice(0, max);

// Every field except the image is required.
export function validateFields(body = {}) {
  const f = {
    description: trimTo(body.description, 2000),
    reason: trimTo(body.reason, 2000),
    dimensions: trimTo(body.dimensions, 300),
    material: trimTo(body.material, 300),
    qty: trimTo(body.qty, 10),
    url: trimTo(body.url, 1000),
    requester: trimTo(body.requester, 100),
  };
  const missing = Object.keys(FIELD_NAMES).filter((k) => !f[k]).map((k) => FIELD_NAMES[k]);
  if (missing.length) {
    return { error: `Please fill in: ${missing.join(", ")}. (Type N/A if something does not apply.)` };
  }
  if (!/^[1-9]\d{0,5}$/.test(f.qty)) return { error: "QTY must be a whole number, 1 or more." };
  if (!REQUESTERS.includes(f.requester)) return { error: "Unknown requester." };
  return { fields: f };
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function parseImage(dataUrl) {
  const m = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return { error: "Image must be a JPG, PNG, WEBP or GIF." };
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_IMAGE_BYTES) return { error: "Image is too large." };
  return { type: m[1], data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
}

export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
