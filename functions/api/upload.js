// Image upload for the editor (photo swaps). Stores the file in KV (no R2 needed) and returns
// a stable URL the site serves back via /media/<key>. Auth required.
import { requireAuth } from "./_session.js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (KV value cap is 25 MB; keep photos lean)
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const { session, response } = await requireAuth(env, request);
  if (!session) return response;
  if (!env.PORTAL_KV) return json({ error: "storage_unavailable" }, 503);

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "no_file" }, 400);
  if (!OK_TYPES.includes(file.type)) return json({ error: "bad_type" }, 415);
  const buf = await file.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ error: "too_large" }, 413);

  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const name = `uploads/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  await env.PORTAL_KV.put(`media/${name}`, buf, { metadata: { contentType: file.type } });

  return json({ ok: true, url: `/media/${name}` });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
