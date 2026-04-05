import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildListingUrl, parseJsonArray, wrapResponse, errorResponse, isNicheEnabled } from '../lib/response.js';
import { getServiceLabel } from '../lib/service-labels.js';

interface ProviderRow {
  provider_name: string;
  provider_slug: string;
  description: string | null;
  listing_tier: string;
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
  niche_id: string;
}

export function registerSearchProviders(server: McpServer, db: D1Database) {
  server.tool(
    'search_providers',
    'Search for verified local service providers across 9 trade categories including floor coating, radon mitigation, foundation repair, basement waterproofing, crawl space repair, mold/asbestos remediation, septic services, commercial electrical, and laundry services. Returns provider name, rating, services offered, certifications, years in business, and a link to the full profile with contact details. Covers major US metro areas. Use list_niches first to get valid niche IDs, and list_service_types for valid service_type values.',
    {
      niche_id: z.string().describe('Niche ID (e.g. "coated-local", "radon-local"). Get options from list_niches.'),
      city: z.string().optional().describe('City or metro area slug (e.g. "denver-co", "minneapolis-mn"). Get options from list_cities.'),
      service_type: z.string().optional().describe('Service type slug to filter by (e.g. "epoxy", "radon_testing"). Get valid values from list_service_types.'),
      limit: z.number().min(1).max(25).optional().describe('Max results to return (default 10)'),
    },
    async ({ niche_id, city, service_type, limit }) => {
      if (!isNicheEnabled(niche_id)) {
        return errorResponse('NOT_FOUND', `Niche "${niche_id}" is not available. Use list_niches to see available niches.`);
      }
      try {
        const maxResults = limit ?? 10;
        const binds: (string | number)[] = [niche_id];

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
            ${cityFilter}
            ${serviceFilter}
          ORDER BY
            CASE p.listing_tier
              WHEN 'premium' THEN 0
              WHEN 'featured' THEN 1
              WHEN 'claimed' THEN 2
              ELSE 3
            END,
            p.google_rating DESC NULLS LAST
          LIMIT ?`;

        const { results } = await db.prepare(sql).bind(...binds).all<ProviderRow>();

        const providers = results.map((r) => {
          const rawServices = parseJsonArray(r.enriched_services);
          return {
            name: r.provider_name,
            description: r.description ?? null,
            city: r.city_name,
            state: r.state_abbr,
            rating: r.google_rating ?? null,
            review_count: r.google_review_count ?? null,
            services: rawServices.map((s) => ({
              type: s,
              label: getServiceLabel(r.niche_id, s),
            })),
            pricing: parseJsonArray(r.enriched_pricing),
            certifications: parseJsonArray(r.enriched_certifications),
            coverage_area: r.enriched_coverage ?? null,
            years_in_business: r.enriched_years ?? null,
            listing_url: buildListingUrl(
              r.niche_domain,
              r.metro_area || r.city_slug,
              r.provider_slug,
            ),
          };
        });

        if (providers.length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: wrapResponse({
                results: [],
                niche_id,
                data_note: 'No providers found matching your criteria. Try broadening your search or check list_cities for valid city slugs.',
              }),
            }],
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: wrapResponse({ results: providers, niche_id }),
          }],
        };
      } catch (err) {
        return errorResponse('INTERNAL_ERROR', `Failed to search providers: ${(err as Error).message}`);
      }
    },
  );
}
