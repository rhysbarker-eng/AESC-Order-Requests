import { getStore } from "@netlify/blobs";
import { json, validateFields, parseImage, newId } from "./lib.mjs";

// Edit or delete a submitted request. Open to everyone (no password).
export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  const week = String(body.week || "");
  const id = String(body.id || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !/^[0-9]+-[a-z0-9]+$/.test(id)) {
    return json({ error: "Bad request" }, 400);
  }

  const store = getStore("submissions");
  const images = getStore("images");
  const key = `${week}/${id}`;
  const record = await store.get(key, { type: "json" });
  if (!record) return json({ error: "That request no longer exists." }, 404);

  if (body.action === "delete") {
    if (record.imageId) await images.delete(record.imageId);
    await store.delete(key);
    return json({ ok: true });
  }

  if (body.action === "edit") {
    const v = validateFields(body.fields || {});
    if (v.error) return json({ error: v.error }, 400);

    let imageId = record.imageId || "";
    let newImage = null;
    if (body.image) {
      newImage = parseImage(body.image);
      if (newImage.error) return json({ error: newImage.error }, 400);
    }
    if (newImage) {
      const freshId = newId(); // new id so browsers do not show the old cached picture
      await images.set(freshId, newImage.data, { metadata: { contentType: newImage.type } });
      if (imageId) await images.delete(imageId);
      imageId = freshId;
    } else if (body.removeImage && imageId) {
      await images.delete(imageId);
      imageId = "";
    }

    await store.setJSON(key, { ...record, ...v.fields, imageId, editedAt: new Date().toISOString() });
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
};

export const config = { path: "/api/admin" };
