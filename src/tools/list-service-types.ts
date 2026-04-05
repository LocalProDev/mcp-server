import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SERVICE_LABELS, getServiceTypesForNiche } from '../lib/service-labels.js';
import { wrapResponse, errorResponse, isNicheEnabled } from '../lib/response.js';

export function registerListServiceTypes(server: McpServer, db: D1Database) {
  server.tool(
    'list_service_types',
    'List the valid service type categories for a given niche directory. Use this before calling search_providers with a service_type filter to ensure you pass a valid value. Each niche has its own taxonomy — for example, "coated-local" has epoxy, polyaspartic, metallic_epoxy, etc., while "radon-local" has radon_testing, radon_mitigation, ssd_installation, etc.',
    {
      niche_id: z.string().describe('Niche ID (e.g. "coated-local", "radon-local"). Get options from list_niches.'),
    },
    async ({ niche_id }) => {
      if (!isNicheEnabled(niche_id)) {
        return errorResponse('NOT_FOUND', `Niche "${niche_id}" is not available. Use list_niches to see available niches.`);
      }
      try {
        const staticTypes = getServiceTypesForNiche(niche_id);

        const { results } = await db
          .prepare(
            `SELECT DISTINCT ps.service_type
             FROM provider_services ps
             JOIN providers p ON p.id = ps.provider_id
             WHERE p.niche_id = ? AND p.verified = 1
             ORDER BY ps.service_type`,
          )
          .bind(niche_id)
          .all<{ service_type: string }>();

        const nicheLabels = SERVICE_LABELS[niche_id] ?? {};
        const dbTypes = results.map((r) => ({
          type: r.service_type,
          label: nicheLabels[r.service_type] ?? r.service_type,
        }));

        const seen = new Set(dbTypes.map((t) => t.type));
        const merged = [
          ...dbTypes,
          ...staticTypes.filter((t) => !seen.has(t.type)),
        ];

        if (merged.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: wrapResponse({
                results: [],
                niche_id,
                data_note: `No service types found for niche "${niche_id}". Use list_niches to see valid niche IDs.`,
              }),
            }],
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: wrapResponse({
              results: merged,
              niche_id,
              data_note: 'Pass the "type" value to search_providers service_type parameter.',
            }),
          }],
        };
      } catch (err) {
        return errorResponse('INTERNAL_ERROR', `Failed to list service types: ${(err as Error).message}`);
      }
    },
  );
}
