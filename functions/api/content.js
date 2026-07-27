// Stores and returns Frank's inline edits (the "overrides" map keyed by data-edit-id).
// GET is public-ish (returns current overrides so the editor can show what's live).
// PUT requires a valid session and replaces the overrides map.
import { requireAuth } from "./_session.js";

const OVERRIDES_KEY = "site_overrides_v1";

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.PORTAL_KV) return json({ error: "storage_unavailable" }, 503);

  if (request.method === "GET") {
    const overrides = (await env.PORTAL_KV.get(OVERRIDES_KEY, "json")) || {};
    return json({ overrides });
  }

  if (request.method === "PUT") {
    const { session, response } = await requireAuth(env, request);
    if (!session) return response;

    let incoming;
    try {
      incoming = await request.json();
    } catch {
      return json({ error: "bad_json" }, 400);
    }
    const overrides = incoming && typeof incoming.overrides === "object" ? incoming.overrides : null;
    if (!overrides) return json({ error: "missing_overrides" }, 400);

    // Sanity cap: keep the blob small and reject absurd payloads.
    const serialized = JSON.stringify(overrides);
    if (serialized.length > 500_000) return json({ error: "too_large" }, 413);

    await env.PORTAL_KV.put(OVERRIDES_KEY, serialized);
    // Keep a timestamped backup so Gustavo can roll back.
    await env.PORTAL_KV.put(
      `backup_${Date.now()}`,
      JSON.stringify({ by: session.email, overrides }),
      { expirationTtl: 60 * 60 * 24 * 30 }
    );
    return json({ ok: true, savedBy: session.email });
  }

  return json({ error: "method" }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
