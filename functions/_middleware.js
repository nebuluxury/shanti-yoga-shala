// Shanti Yoga site edge middleware.
//  1. Canonical host: always redirect the bare domain to the www version (keeps path + query).
//  2. Live edits: apply any content Frank saved in the portal, injected server-side via
//     HTMLRewriter so the page (and search engines) see the edited text/images directly.
//
// Both are fully guarded: if the portal storage (PORTAL_KV) is not bound yet, this is a no-op
// and the site serves exactly as authored.

const OVERRIDES_KEY = "site_overrides_v1";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  const response = await next();

  // Only rewrite real HTML pages of the public marketing site.
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  if (url.pathname.startsWith("/portal") || url.pathname.startsWith("/api")) return response;

  // No storage bound yet -> serve as authored.
  if (!env.PORTAL_KV) return response;

  let overrides = null;
  try {
    overrides = await env.PORTAL_KV.get(OVERRIDES_KEY, "json");
  } catch (_) {
    overrides = null;
  }
  if (!overrides || typeof overrides !== "object") return response;

  const rewriter = new HTMLRewriter().on("[data-edit-id]", {
    element(el) {
      const id = el.getAttribute("data-edit-id");
      if (!id || !Object.prototype.hasOwnProperty.call(overrides, id)) return;
      const val = overrides[id];
      if (val == null) return;
      if (el.tagName === "img") {
        if (typeof val === "string" && val) el.setAttribute("src", val);
      } else if (typeof val === "string") {
        el.setInnerContent(val, { html: true });
      }
    },
  }).on("[data-edit-href]", {
    element(el) {
      const id = el.getAttribute("data-edit-href");
      const key = "href::" + id;
      if (!id || !Object.prototype.hasOwnProperty.call(overrides, key)) return;
      const v = overrides[key];
      if (typeof v === "string" && v) el.setAttribute("href", v);
    },
  }).on("[data-edit-collection]", {
    element(el) {
      const id = el.getAttribute("data-edit-collection");
      const key = "coll::" + id;
      if (!id || !Object.prototype.hasOwnProperty.call(overrides, key)) return;
      const v = overrides[key];
      if (typeof v === "string") el.setInnerContent(v, { html: true });
    },
  });
  return rewriter.transform(response);
}
