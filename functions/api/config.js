// Public, non-secret config the portal page needs to boot.
export async function onRequest({ env }) {
  const body = {
    loginReady: Boolean(env.PORTAL_PASSWORD),
    storageReady: Boolean(env.PORTAL_KV),
    analyticsReady: Boolean(env.CF_ANALYTICS_TOKEN && env.CF_ACCOUNT_ID && env.WEB_ANALYTICS_SITE_TAG),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
