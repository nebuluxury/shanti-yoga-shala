// Lead log for the portal Dashboard.
//  POST  (public): the contact form pings this so each inquiry is saved. Best-effort; the form
//                  still emails Frank via Web3Forms independently, so this never blocks a lead.
//  GET   (auth):   the portal lists recent inquiries.
import { requireAuth } from "./_session.js";

const LIST_KEY = "inquiries_v1";
const MAX = 200;

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.PORTAL_KV) return json({ error: "storage_unavailable" }, 503);

  if (request.method === "POST") {
    let data = {};
    try {
      data = await request.json();
    } catch {
      data = {};
    }
    const entry = {
      name: String(data.name || "").slice(0, 120),
      email: String(data.email || "").slice(0, 160),
      phone: String(data.phone || "").slice(0, 60),
      message: String(data.message || "").slice(0, 2000),
      at: Date.now(),
    };
    const list = (await env.PORTAL_KV.get(LIST_KEY, "json")) || [];
    list.unshift(entry);
    if (list.length > MAX) list.length = MAX;
    await env.PORTAL_KV.put(LIST_KEY, JSON.stringify(list));
    return json({ ok: true });
  }

  if (request.method === "GET") {
    const { session, response } = await requireAuth(env, request);
    if (!session) return response;
    const list = (await env.PORTAL_KV.get(LIST_KEY, "json")) || [];
    return json({ inquiries: list });
  }

  return json({ error: "method" }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
