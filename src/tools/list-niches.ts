import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { errorResponse, latest, wrapResponse } from '../lib/response.js';
import { fetchNicheSummary } from '../lib/niche-summary.js';
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
        // Counts use the same served-provider gate as search_providers, so an agent that
        // sees N providers here gets N from search_providers.
        const results = await fetchNicheSummary(db);
        const niches = results.map(({ last_updated, ...n }) => n);

        executionCtx.waitUntil(logQuery(db, { toolName: 'list_niches', resultCount: niches.length, startTimeMs }, requestCtx));
        return {
          content: [
            {
              type: 'text',
              text: wrapResponse({
                results: niches,
                last_verified_at: latest(results, (r) => r.last_updated),
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
