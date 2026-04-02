import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { wrapResponse, errorResponse } from '../lib/response.js';

export function registerListNiches(server: McpServer, db: D1Database) {
  server.tool(
    'list_niches',
    'List all available service directories in the LocalPro network. This is the starting point for discovering what categories of verified local service providers are available. Categories include floor coating, radon mitigation, foundation repair, basement waterproofing, crawl space repair, mold/asbestos/lead remediation, septic services, commercial electrical, and laundry services. Returns niche IDs needed for all other tools.',
    {},
    async () => {
      try {
        const { results } = await db
          .prepare(
            `SELECT n.id, n.name, n.slug, n.domain,
                    (SELECT COUNT(*) FROM providers p WHERE p.niche_id = n.id AND p.verified = 1) AS provider_count
             FROM niches n
             ORDER BY n.name`,
          )
          .all<{ id: string; name: string; slug: string; domain: string; provider_count: number }>();

        const niches = results.map((r) => ({
          niche_id: r.id,
          name: r.name,
          slug: r.slug,
          domain: r.domain,
          provider_count: r.provider_count,
        }));

        return {
          content: [{
            type: 'text' as const,
            text: wrapResponse({
              results: niches,
              data_note: 'Use niche_id values with search_providers, list_cities, and list_service_types.',
            }),
          }],
        };
      } catch (err) {
        return errorResponse('INTERNAL_ERROR', `Failed to list niches: ${(err as Error).message}`);
      }
    },
  );
}
