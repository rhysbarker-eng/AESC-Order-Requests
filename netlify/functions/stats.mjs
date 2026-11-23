import { getStore } from "@netlify/blobs";
import { json } from "./lib.mjs";

// Read-only: how many requests each requester has made, all time (for the dashboard).
export default async (req) => {
  if (req.method !== "GET") return json({ error: "GET only" }, 405);

  const store = getStore("submissions");
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key);

  const counts = {};
  for (let i = 0; i < keys.length; i += 40) {
    const batch = await Promise.all(keys.slice(i, i + 40).map((k) => store.get(k, { type: "json" })));
    for (const r of batch) if (r && r.requester) counts[r.requester] = (counts[r.requester] || 0) + 1;
  }

  const requesters = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return json({ total: keys.length, requesters });
};

export const config = { path: "/api/stats" };
