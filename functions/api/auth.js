// Simple password login for the Shanti Yoga portal.
//   POST   {password}  -> if it matches PORTAL_PASSWORD, issue a 14-day session cookie.
//   GET                -> "who am I" (used to restore a session on page load).
//   DELETE             -> log out.
import { createSession, clearCookie, requireAuth } from "./_session.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    const { session } = await requireAuth(env, request);
    return json({ user: session ? { name: session.name || "Denise" } : null });
  }

  if (request.method === "DELETE") {
    return json({ ok: true }, 200, { "set-cookie": clearCookie() });
  }

  if (request.method !== "POST") return json({ error: "method" }, 405);

  if (!env.PORTAL_PASSWORD) return json({ error: "not_configured" }, 503);

  let password = "";
  try {
    password = (await request.json()).password || "";
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  if (!safeEqual(String(password), String(env.PORTAL_PASSWORD))) {
    return json({ error: "wrong_password" }, 401);
  }

  const cookie = await createSession(env, { email: "denise", name: "Denise" });
  return json({ user: { name: "Denise" } }, 200, { "set-cookie": cookie });
}

// Length-stable comparison to avoid trivial timing leaks.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extraHeaders },
  });
}
