// Traffic for the portal Dashboard. Proxies Cloudflare's GraphQL Analytics API server-side
// using a read-only token (CF_ANALYTICS_TOKEN) so the token never reaches the browser.
// Returns pageviews + top pages + top sources + countries + devices for a date range.
import { requireAuth } from "./_session.js";

export async function onRequest(context) {
  const { request, env } = context;
  const { session, response } = await requireAuth(env, request);
  if (!session) return response;

  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID || !env.WEB_ANALYTICS_SITE_TAG) {
    return json({ error: "analytics_not_configured" }, 503);
  }

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "7", 10) || 7, 30);
  const sinceISO = new Date(Date.now() - days * 86400_000).toISOString();

  const query = `
    query Traffic($account: String!, $siteTag: String!, $since: Time!) {
      viewer {
        accounts(filter: { accountTag: $account }) {
          totals: rumPageloadEventsAdaptiveGroups(
            limit: 1, filter: { datetime_geq: $since, siteTag: $siteTag }
          ) { count sum { visits } }
          pages: rumPageloadEventsAdaptiveGroups(
            limit: 10, orderBy: [count_DESC],
            filter: { datetime_geq: $since, siteTag: $siteTag }
          ) { count dimensions { requestPath } }
          referers: rumPageloadEventsAdaptiveGroups(
            limit: 10, orderBy: [sum_visits_DESC],
            filter: { datetime_geq: $since, siteTag: $siteTag }
          ) { sum { visits } dimensions { refererHost } }
          countries: rumPageloadEventsAdaptiveGroups(
            limit: 8, orderBy: [count_DESC],
            filter: { datetime_geq: $since, siteTag: $siteTag }
          ) { count dimensions { countryName } }
          devices: rumPageloadEventsAdaptiveGroups(
            limit: 6, orderBy: [count_DESC],
            filter: { datetime_geq: $since, siteTag: $siteTag }
          ) { count dimensions { deviceType } }
          daily: rumPageloadEventsAdaptiveGroups(
            limit: 60, orderBy: [date_ASC],
            filter: { datetime_geq: $since, siteTag: $siteTag }
          ) { count dimensions { date } }
        }
      }
    }`;

  const gqlResp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        account: env.CF_ACCOUNT_ID,
        siteTag: env.WEB_ANALYTICS_SITE_TAG,
        since: sinceISO,
      },
    }),
  });

  const data = await gqlResp.json();
  if (data.errors) {
    return json({ error: "graphql_error", detail: data.errors }, 502);
  }

  const acct = data?.data?.viewer?.accounts?.[0] || {};
  const out = {
    days,
    pageviews: acct.totals?.[0]?.count || 0,
    visits: acct.totals?.[0]?.sum?.visits || 0,
    topPages: (acct.pages || []).map((p) => ({ path: p.dimensions.requestPath, views: p.count })),
    topSources: (acct.referers || []).map((r) => ({
      source: r.dimensions.refererHost || "Direct / none",
      visits: r.sum?.visits || 0,
    })),
    countries: (acct.countries || []).map((c) => ({ country: c.dimensions.countryName, views: c.count })),
    devices: (acct.devices || []).map((d) => ({ device: d.dimensions.deviceType || "unknown", views: d.count })),
    daily: (acct.daily || []).map((d) => ({ date: d.dimensions.date, views: d.count })),
  };
  return json(out);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
