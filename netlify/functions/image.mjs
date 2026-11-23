import { getStore } from "@netlify/blobs";

export default async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9]+-[a-z0-9]+$/.test(id)) return new Response("Not found", { status: 404 });

  const images = getStore("images");
  const res = await images.getWithMetadata(id, { type: "arrayBuffer" });
  if (!res) return new Response("Not found", { status: 404 });

  return new Response(res.data, {
    headers: {
      "content-type": res.metadata?.contentType || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/image" };
