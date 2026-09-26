import type { D1Database } from '@cloudflare/workers-types';
import { nicheBindValues, nicheInClause, SERVED_PROVIDER_FILTER } from './response.js';

export interface NicheSummary {
  niche_id: string;
  name: string;
  slug: string;
  domain: string;
  provider_count: number;
  state_count: number;
  last_updated: string | null;
}

/**
 * Live per-category counts straight from D1, through the same served-provider gate
 * search_providers uses. The one source for list_niches, the /.well-known discovery
 * text, and the public README (scripts/mcp-sync-mirror.mjs reads list_niches).
 */
export async function fetchNicheSummary(db: D1Database): Promise<NicheSummary[]> {
  const { results } = await db
    .prepare(
      `WITH served AS (
         SELECT p.id, p.niche_id, p.updated_at, c.state_abbr
         FROM providers p
         JOIN provider_ratings pr ON pr.provider_id = p.id
         JOIN provider_locations pl ON pl.provider_id = p.id
         JOIN cities c ON c.id = pl.city_id
         WHERE p.niche_id IN (${nicheInClause()})
           AND ${SERVED_PROVIDER_FILTER}
       )
       SELECT n.id AS niche_id, n.name, n.slug, n.domain,
              COUNT(DISTINCT s.id) AS provider_count,
              COUNT(DISTINCT s.state_abbr) AS state_count,
              MAX(s.updated_at) AS last_updated
       FROM niches n
       JOIN served s ON s.niche_id = n.id
       GROUP BY n.id
       ORDER BY n.name`
    )
    .bind(...nicheBindValues())
    .all<NicheSummary>();
  return results;
}

/** Round down to a durable floor for prose ("9,500+"), never overstating the live count. */
export function countFloor(n: number): string {
  const step = n >= 5000 ? 500 : n >= 1000 ? 50 : n >= 100 ? 25 : 5;
  return `${(Math.floor(n / step) * step).toLocaleString('en-US')}+`;
}
