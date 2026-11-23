import { getStore } from "@netlify/blobs";
import { weekKey, weekLabel, json } from "./lib.mjs";

// Read-only: returns every week that has data (with how many requests it holds)
// plus one week's submissions.
export default async (req) => {
  if (req.method !== "GET") return json({ error: "GET only" }, 405);

  const current = weekKey();
  const requested = new URL(req.url).searchParams.get("week");
  const week = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : current;

  const store = getStore("submissions");
  const { blobs } = await store.list();

  const counts = { [current]: 0 };
  const keysForWeek = [];
  for (const b of blobs) {
    const wk = b.key.split("/")[0];
    counts[wk] = (counts[wk] || 0) + 1;
    if (wk === week) keysForWeek.push(b.key);
  }

  keysForWeek.sort();
  const items = (await Promise.all(keysForWeek.map((k) => store.get(k, { type: "json" }))))
    .filter(Boolean)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  return json({
    current,
    week,
    label: weekLabel(week),
    weeks: Object.keys(counts).sort().reverse().map((k) => ({ key: k, count: counts[k] })),
    items,
  });
};

export const config = { path: "/api/list" };
