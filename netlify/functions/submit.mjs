import { getStore } from "@netlify/blobs";
import { weekKey, json, validateFields, parseImage, newId } from "./lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  // Honeypot: bots fill this hidden field, people never see it.
  if (body.website) return json({ ok: true });

  const v = validateFields(body);
  if (v.error) return json({ error: v.error }, 400);

  const now = new Date();
  const id = newId();

  let imageId = "";
  if (body.image) {
    const img = parseImage(body.image);
    if (img.error) return json({ error: img.error }, 400);
    imageId = id;
    await getStore("images").set(imageId, img.data, { metadata: { contentType: img.type } });
  }

  const record = { id, submittedAt: now.toISOString(), ...v.fields, imageId };
  await getStore("submissions").setJSON(`${weekKey(now)}/${id}`, record);

  return json({ ok: true });
};

export const config = { path: "/api/submit" };
