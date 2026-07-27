// Serves uploaded images back to the public site from KV.
// Upload keys are stored as "media/uploads/123.jpg" and served at "/media/uploads/123.jpg".
export async function onRequest({ params, env }) {
  if (!env.PORTAL_KV) return new Response("Not found", { status: 404 });
  const path = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!path.startsWith("uploads/")) return new Response("Not found", { status: 404 });
  const { value, metadata } = await env.PORTAL_KV.getWithMetadata(`media/${path}`, {
    type: "arrayBuffer",
  });
  if (!value) return new Response("Not found", { status: 404 });
  return new Response(value, {
    headers: {
      "content-type": (metadata && metadata.contentType) || "image/jpeg",
      "cache-control": "public, max-age=86400",
    },
  });
}
