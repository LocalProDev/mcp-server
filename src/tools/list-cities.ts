import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { wrapResponse, errorResponse, isNicheEnabled } from '../lib/response.js';

export function registerListCities(server: McpServer, db: D1Database) {
  server.tool(
    'list_cities',
    'List available cities and metro areas where verified providers operate for a given niche. Use this to discover valid city slugs before calling search_providers. Cities are grouped by metro area where applicable (e.g. "minneapolis-mn" covers Minneapolis, St. Paul, and surrounding suburbs). Optionally filter by state abbreviation.',
    {
      niche_id: z.string().describe('Niche ID from list_niches (e.g. "coated-local", "radon-local")'),
      state: z.string().length(2).optional().describe('Two-letter state abbreviation to filter by (e.g. "MN", "CO")'),
    },
    async ({ niche_id, state }) => {
      if (!isNicheEnabled(niche_id)) {
        return errorResponse('NOT_FOUND', `Niche "${niche_id}" is not available. Use list_niches to see available niches.`);
      }
      try {
        let sql = `
          SELECT c.name, c.state_abbr, c.slug, c.metro_area,
                 (SELECT COUNT(DISTINCT pl.provider_id)
                  FROM provider_locations pl
                  JOIN providers p ON p.id = pl.provider_id
                  WHERE pl.city_id = c.id AND p.verified = 1 AND p.review_status = 'approved') AS provider_count
          FROM cities c
          WHERE c.niche_id = ? AND c.published = 1`;
        const binds: string[] = [niche_id];

        if (state) {
          sql += ' AND c.state_abbr = ?';
          binds.push(state.toUpperCase());
        }

        sql += ' ORDER BY c.state_abbr, c.name';

        const { results } = await db.prepare(sql).bind(...binds).all<{
          name: string;
          state_abbr: string;
          slug: string;
          metro_area: string | null;
          provider_count: number;
        }>();

        const cities = results.map((r) => ({
          name: r.name,
          state: r.state_abbr,
          slug: r.metro_area || r.slug,
          provider_count: r.provider_count,
        }));

        return {
          content: [{
            type: 'text' as const,
            text: wrapResponse({
              results: cities,
              niche_id,
              data_note: 'Use slug values with search_providers city parameter. Metro-area slugs aggregate nearby cities.',
            }),
          }],
        };
      } catch (err) {
        return errorResponse('INTERNAL_ERROR', `Failed to list cities: ${(err as Error).message}`);
      }
    },
  );
}
