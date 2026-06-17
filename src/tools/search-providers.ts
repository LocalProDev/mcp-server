import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildListingUrl, errorResponse, isNicheEnabled, parseJsonArray, wrapResponse } from '../lib/response.js';
import { getServiceLabel } from '../lib/service-labels.js';
import { logQuery, type ToolDeps } from '../lib/query-log.js';

interface ProviderRow {
  provider_name: string;
  provider_slug: string;
  description: string | null;
  listing_tier: string | null;
  niche_id: string;
  google_rating: number | null;
  google_review_count: number | null;
  enriched_services: string | null;
  enriched_pricing: string | null;
  enriched_certifications: string | null;
  enriched_coverage: string | null;
  enriched_years: number | null;
  city_name: string;
  state_abbr: string;
  city_slug: string;
  metro_area: string | null;
  niche_domain: string;
  updated_at: string | null;
  google_business_status: string | null;
  google_maps_uri: string | null;
  google_last_refreshed: string | null;
}

export function registerSearchProviders(server: McpServer, deps: ToolDeps): void {
  const { db, requestCtx, executionCtx } = deps;
  server.tool(
    'search_providers',
    'Search for verified local service providers across 10 trade categories: water damage restoration, foundation/slab repair, crawl space repair, basement waterproofing, mold/asbestos/lead remediation, radon mitigation, septic services, commercial electrical, floor coating (epoxy/polyaspartic), and laundry pickup & delivery. Returns provider name, rating, review count, business status, services offered, certifications, years in business, and a link to the full profile with contact details. Each provider includes Google Maps URL when available. Covers major US metro areas. Use list_niches first to get valid niche IDs, and list_service_types for valid service_type values.',
    {
      niche_id: z.string().describe('Niche ID (e.g. "coated-local", "radon-local"). Get options from list_niches.'),
      city: z.string().optional().describe('City or metro area slug (e.g. "denver-co", "minneapolis-mn"). Get options from list_cities.'),
      service_type: z.string().optional().describe('Service type slug to filter by (e.g. "epoxy", "radon_testing"). Get valid values from list_service_types.'),
      limit: z.number().min(1).max(25).optional().describe('Max results to return (default 10)'),
    },
    async ({ niche_id, city, service_type, limit }) => {
      const startTimeMs = Date.now();
      if (!isNicheEnabled(niche_id)) {
        executionCtx.waitUntil(logQuery(db, { toolName: 'search_providers', nicheId: niche_id, citySlug: city, serviceType: service_type, errorCode: 'NOT_FOUND', startTimeMs }, requestCtx));
        return errorResponse('NOT_FOUND', `Niche "${niche_id}" is not available. Use list_niches to see available niches.`);
      }
      try {
        const maxResults = limit ?? 10;
        const binds: unknown[] = [niche_id];
        let cityFilter = '';
        if (city) {
          cityFilter = 'AND (c.slug = ? OR c.metro_area = ?)';
          binds.push(city, city);
        }
        let serviceFilter = '';
        if (service_type) {
          serviceFilter = `AND EXISTS (
            SELECT 1 FROM provider_services ps
            WHERE ps.provider_id = p.id AND ps.service_type = ?
          )`;
          binds.push(service_type);
        }
        binds.push(maxResults);

        const sql = `
          SELECT DISTINCT
            p.name AS provider_name,
            p.slug AS provider_slug,
            p.description,
            p.listing_tier,
            p.niche_id,
            p.google_rating,
            p.google_review_count,
            p.enriched_services,
            p.enriched_pricing,
            p.enriched_certifications,
            p.enriched_coverage,
            p.enriched_years,
            p.updated_at,
            p.google_business_status,
            p.google_maps_uri,
            p.google_last_refreshed,
            c.name AS city_name,
            c.state_abbr,
            c.slug AS city_slug,
            c.metro_area,
            n.domain AS niche_domain
          FROM providers p
          JOIN provider_locations pl ON pl.provider_id = p.id
          JOIN cities c ON c.id = pl.city_id
          JOIN niches n ON n.id = p.niche_id
          WHERE p.niche_id = ?
            AND p.verified = 1
            AND p.review_status = 'approved'
            AND p.google_rating IS NOT NULL
            AND p.description IS NOT NULL AND length(p.description) > 5
            AND p.enriched_services IS NOT NULL AND p.enriched_services != '[]'
            AND (p.google_business_status IS NULL OR p.google_business_status != 'CLOSED_PERMANENTLY')
            ${cityFilter}
            ${serviceFilter}
          ORDER BY
            CASE p.listing_tier
              WHEN 'pro' THEN 0
              WHEN 'featured' THEN 1
              WHEN 'claimed' THEN 2
              ELSE 3
            END,
            p.google_rating DESC NULLS LAST
          LIMIT ?`;

        const { results } = await db.prepare(sql).bind(...binds).all<ProviderRow>();

        const providers = results.map((r) => {
          const rawServices = parseJsonArray(r.enriched_services);
          const pricingArr = parseJsonArray(r.enriched_pricing);
          const certsArr = parseJsonArray(r.enriched_certifications);
          const citySlug = r.metro_area || r.city_slug;
          return {
            name: r.provider_name,
            description: r.description ?? null,
            city: r.city_name,
            state: r.state_abbr,
            rating: r.google_rating ?? null,
            review_count: r.google_review_count ?? null,
            // Surface business status when known (filtered to OPERATIONAL/null/CLOSED_TEMPORARILY)
            ...(r.google_business_status ? { business_status: r.google_business_status } : {}),
            ...(r.google_maps_uri ? { google_maps_url: r.google_maps_uri } : {}),
            services: rawServices.map((s) => ({
              type: s,
              label: getServiceLabel(r.niche_id, s),
            })),
            pricing_summary: pricingArr.length > 0 ? pricingArr[0] : null,
            coverage_area: r.enriched_coverage ?? null,
            years_in_business: r.enriched_years ?? null,
            listing_url: buildListingUrl(r.niche_domain, citySlug, r.provider_slug),
            pro_available: pricingArr.length > 1 || certsArr.length > 0,
          };
        });

        if (providers.length === 0) {
          executionCtx.waitUntil(logQuery(db, { toolName: 'search_providers', nicheId: niche_id, citySlug: city, serviceType: service_type, resultCount: 0, startTimeMs }, requestCtx));
          return {
            content: [
              {
                type: 'text',
                text: wrapResponse({
                  results: [],
                  niche_id,
                  data_note:
                    'No providers found matching your criteria. Try broadening your search or check list_cities for valid city slugs.',
                }),
              },
            ],
          };
        }

        // Use latest updated_at among returned providers as scraped_at, and the
        // most recent google_last_refreshed for the Google data freshness signal.
        const scraped_at = results.reduce<string | null>((max, r) => {
          if (!r.updated_at) return max;
          if (!max) return r.updated_at;
          return r.updated_at > max ? r.updated_at : max;
        }, null);
        const google_refreshed_at = results.reduce<string | null>((max, r) => {
          if (!r.google_last_refreshed) return max;
          if (!max) return r.google_last_refreshed;
          return r.google_last_refreshed > max ? r.google_last_refreshed : max;
        }, null);

        executionCtx.waitUntil(logQuery(db, { toolName: 'search_providers', nicheId: niche_id, citySlug: city, serviceType: service_type, resultCount: providers.length, startTimeMs }, requestCtx));
        return {
          content: [
            {
              type: 'text',
              text: wrapResponse({ results: providers, niche_id, scraped_at, google_refreshed_at }),
            },
          ],
        };
      } catch (err) {
        executionCtx.waitUntil(logQuery(db, { toolName: 'search_providers', nicheId: niche_id, citySlug: city, serviceType: service_type, errorCode: 'INTERNAL_ERROR', startTimeMs }, requestCtx));
        return errorResponse('INTERNAL_ERROR', `Failed to search providers: ${(err as Error).message}`);
      }
    }
  );
}
