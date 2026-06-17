import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { errorResponse, nicheBindValues, nicheInClause, wrapResponse } from '../lib/response.js';
import { logQuery, type ToolDeps } from '../lib/query-log.js';

export function registerListNiches(server: McpServer, deps: ToolDeps): void {
  const { db, requestCtx, executionCtx } = deps;
  server.tool(
    'list_niches',
    'List all available service directories in the LocalPro network. This is the starting point for discovering what categories of verified local service providers are available. Categories include water damage restoration, foundation repair, crawl space repair, basement waterproofing, mold/asbestos/lead remediation, radon mitigation, septic services, commercial electrical, floor coating, and laundry pickup & delivery. Returns niche IDs needed for all other tools.',
    {},
    async () => {
      const startTimeMs = Date.now();
      try {
        // provider_count is aligned to search_providers' filter set: requires a
        // provider_locations + cities row (search_providers JOINs them), excludes
        // CLOSED_PERMANENTLY, and applies the same completeness gate (rating + desc
        // + enriched_services). Mismatched counts here would let an AI agent see N
        // providers in list_niches and get fewer than N from search_providers.
        const { results } = await db
          .prepare(
            `SELECT n.id, n.name, n.slug, n.domain,
                    (SELECT COUNT(*)
                     FROM providers p
                     WHERE p.niche_id = n.id
                       AND p.verified = 1 AND p.review_status = 'approved'
                       AND p.google_rating IS NOT NULL
                       AND p.description IS NOT NULL AND length(p.description) > 5
                       AND p.enriched_services IS NOT NULL AND p.enriched_services != '[]'
                       AND (p.google_business_status IS NULL OR p.google_business_status != 'CLOSED_PERMANENTLY')
                       AND EXISTS (
                         SELECT 1 FROM provider_locations pl
                         JOIN cities c ON c.id = pl.city_id
                         WHERE pl.provider_id = p.id
                       )) AS provider_count,
                    (SELECT MAX(p.updated_at)
                     FROM providers p
                     WHERE p.niche_id = n.id
                       AND p.verified = 1 AND p.review_status = 'approved') AS last_updated
             FROM niches n
             WHERE n.id IN (${nicheInClause()})
             ORDER BY n.name`
          )
          .bind(...nicheBindValues())
          .all<{ id: string; name: string; slug: string; domain: string; provider_count: number; last_updated: string | null }>();

        const niches = results.map((r) => ({
          niche_id: r.id,
          name: r.name,
          slug: r.slug,
          domain: r.domain,
          provider_count: r.provider_count,
        }));

        const scraped_at = results.reduce<string | null>((max, r) => {
          if (!r.last_updated) return max;
          if (!max) return r.last_updated;
          return r.last_updated > max ? r.last_updated : max;
        }, null);

        executionCtx.waitUntil(logQuery(db, { toolName: 'list_niches', resultCount: niches.length, startTimeMs }, requestCtx));
        return {
          content: [
            {
              type: 'text',
              text: wrapResponse({
                results: niches,
                scraped_at,
                data_note: 'Use niche_id values with search_providers, list_cities, and list_service_types.',
              }),
            },
          ],
        };
      } catch (err) {
        executionCtx.waitUntil(logQuery(db, { toolName: 'list_niches', errorCode: 'INTERNAL_ERROR', startTimeMs }, requestCtx));
        return errorResponse('INTERNAL_ERROR', `Failed to list niches: ${(err as Error).message}`);
      }
    }
  );
}
