import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildListingUrl, parseJsonArray, wrapResponse, errorResponse, isNicheEnabled } from '../lib/response.js';
import { getServiceLabel } from '../lib/service-labels.js';

interface ProviderDetailRow {
  name: string;
  slug: string;
  niche_id: string;
  description: string | null;
  listing_tier: string;
  google_rating: number | null;
  google_review_count: number | null;
  enriched_services: string | null;
  enriched_pricing: string | null;
  enriched_certifications: string | null;
  enriched_coverage: string | null;
  enriched_years: number | null;
  year_established: number | null;
  niche_domain: string;
}

interface LocationRow {
  city_name: string;
  state_abbr: string;
  city_slug: string;
  metro_area: string | null;
  coverage_radius_miles: number;
  is_primary: number;
}

interface ServiceRow {
  service_type: string;
  pricing_model: string | null;
  price_min: number | null;
  price_max: number | null;
  turnaround: string | null;
}

export function registerGetProvider(server: McpServer, db: D1Database) {
  server.tool(
    'get_provider',
    'Get a detailed summary of a specific verified service provider. Returns business description, services offered with pricing, certifications, coverage area, and a link to the full profile page with contact details (phone, email, address). Use the provider_slug value from search_providers results. Does not return direct contact info — visit the listing_url for phone, email, and address.',
    {
      niche_id: z.string().describe('Niche ID (e.g. "coated-local"). Must match the niche used in search_providers.'),
      provider_slug: z.string().describe('Provider URL slug from search_providers results (e.g. "abc-coatings")'),
    },
    async ({ niche_id, provider_slug }) => {
      if (!isNicheEnabled(niche_id)) {
        return errorResponse('NOT_FOUND', `Niche "${niche_id}" is not available. Use list_niches to see available niches.`);
      }
      try {
        const provider = await db
          .prepare(
            `SELECT p.name, p.slug, p.niche_id, p.description, p.listing_tier,
                    p.google_rating, p.google_review_count,
                    p.enriched_services, p.enriched_pricing,
                    p.enriched_certifications, p.enriched_coverage,
                    p.enriched_years, p.year_established,
                    n.domain AS niche_domain
             FROM providers p
             JOIN niches n ON n.id = p.niche_id
             WHERE p.niche_id = ? AND p.slug = ? AND p.verified = 1 AND p.review_status = 'approved'`,
          )
          .bind(niche_id, provider_slug)
          .first<ProviderDetailRow>();

        if (!provider) {
          return errorResponse('NOT_FOUND', `Provider "${provider_slug}" not found in niche "${niche_id}". Use search_providers to find valid provider slugs.`);
        }

        const [locResult, svcResult] = await Promise.all([
          db
            .prepare(
              `SELECT c.name AS city_name, c.state_abbr, c.slug AS city_slug,
                      c.metro_area, pl.coverage_radius_miles, pl.is_primary
               FROM provider_locations pl
               JOIN cities c ON c.id = pl.city_id
               JOIN providers p ON p.id = pl.provider_id
               WHERE p.niche_id = ? AND p.slug = ?
               ORDER BY pl.is_primary DESC`,
            )
            .bind(niche_id, provider_slug)
            .all<LocationRow>(),
          db
            .prepare(
              `SELECT ps.service_type, ps.pricing_model, ps.price_min, ps.price_max, ps.turnaround
               FROM provider_services ps
               JOIN providers p ON p.id = ps.provider_id
               WHERE p.niche_id = ? AND p.slug = ?`,
            )
            .bind(niche_id, provider_slug)
            .all<ServiceRow>(),
        ]);

        const primaryLocation = locResult.results.find((l) => l.is_primary) ?? locResult.results[0];
        const citySlug = primaryLocation
          ? primaryLocation.metro_area || primaryLocation.city_slug
          : '';

        const rawServices = parseJsonArray(provider.enriched_services);

        const result = {
          name: provider.name,
          description: provider.description ?? null,
          rating: provider.google_rating ?? null,
          review_count: provider.google_review_count ?? null,
          years_in_business: provider.enriched_years ?? provider.year_established ?? null,
          services: rawServices.map((s) => ({
            type: s,
            label: getServiceLabel(provider.niche_id, s),
          })),
          pricing: parseJsonArray(provider.enriched_pricing),
          certifications: parseJsonArray(provider.enriched_certifications),
          coverage_area: provider.enriched_coverage ?? null,
          service_areas: locResult.results.map((l) => ({
            city: l.city_name,
            state: l.state_abbr,
            radius_miles: l.coverage_radius_miles,
          })),
          service_details: svcResult.results.map((s) => ({
            type: s.service_type,
            label: getServiceLabel(niche_id, s.service_type),
            pricing_model: s.pricing_model ?? null,
            price_range:
              s.price_min != null && s.price_max != null
                ? `$${s.price_min}–$${s.price_max}`
                : s.price_min != null
                  ? `From $${s.price_min}`
                  : null,
            turnaround: s.turnaround ?? null,
          })),
          listing_url: citySlug
            ? buildListingUrl(provider.niche_domain, citySlug, provider.slug)
            : `https://${provider.niche_domain}/`,
        };

        return {
          content: [{
            type: 'text' as const,
            text: wrapResponse({ results: [result], niche_id }),
          }],
        };
      } catch (err) {
        return errorResponse('INTERNAL_ERROR', `Failed to get provider: ${(err as Error).message}`);
      }
    },
  );
}
