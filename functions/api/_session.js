// Tiny signed-cookie session helper (HMAC-SHA256). No external deps.
// A session is a base64url JSON payload {email, name, exp} plus a signature.

const COOKIE = "fpt_session";
const TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function b64urlEncode(bytes) {
  let s = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecodeToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
const enc = new TextEncoder();
const dec = new TextDecoder();

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSession(env, { email, name }) {
  const secret = env.SESSION_SECRET || env.GOOGLE_CLIENT_ID || "dev-secret";
  const payload = { email, name, exp: nowSeconds() + TTL_SECONDS };
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const token = `${body}.${b64urlEncode(sig)}`;
  const cookie =
    `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL_SECONDS}`;
  return cookie;
}

export async function readSession(env, request) {
  const secret = env.SESSION_SECRET || env.GOOGLE_CLIENT_ID || "dev-secret";
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const token = cookies[COOKIE];
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecodeToBytes(sig),
    enc.encode(body)
  );
  if (!ok) return null;
  let payload;
  try {
    payload = JSON.parse(dec.decode(b64urlDecodeToBytes(body)));
  } catch {
    return null;
  }
  if (!payload || payload.exp < nowSeconds()) return null;
  return payload;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function parseCookies(str) {
  const out = {};
  str.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// new Date()/Date.now() are fine inside Workers runtime (not the workflow sandbox).
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export async function requireAuth(env, request) {
  const session = await readSession(env, request);
  if (!session) {
    return {
      session: null,
      response: new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  return { session, response: null };
}
