import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  buildCitation,
  buildCredibility,
  buildJsonLd,
  buildListingUrl,
  buildRating,
  errorResponse,
  isNicheEnabled,
  OWNED_REVIEW_COUNT_SQL,
  parseJsonArray,
  SERVED_PROVIDER_FILTER,
  wrapResponse,
} from '../lib/response.js';
import { getServiceLabel } from '../lib/service-labels.js';
import { logQuery, type ToolDeps } from '../lib/query-log.js';

interface ProviderRow {
  name: string;
  slug: string;
  niche_id: string;
  description: string | null;
  listing_tier: string | null;
  phone: string | null;
  rating_tier: string | null;
  rating_star: number | null;
  owned_review_count: number | null;
  enriched_services: string | null;
  enriched_pricing: string | null;
  enriched_certifications: string | null;
  enriched_coverage: string | null;
  enriched_years: number | null;
  year_established: number | null;
  niche_domain: string;
  // Freshness + credibility columns (improvement #1 + #3)
  updated_at: string | null;
  claimed_at: string | null;
  our_summary: string | null;
  review_summary: string | null;
  // Provider FK row id
  id: string;
}

interface LocationRow {
  city_name: string;
  state_abbr: string;
  city_slug: string;
  metro_area: string | null;
  coverage_radius_miles: number | null;
  is_primary: number;
}

interface ServiceRow {
  service_type: string;
  pricing_model: string | null;
  price_min: number | null;
  price_max: number | null;
  turnaround: string | null;
}

export function registerGetProvider(server: McpServer, deps: ToolDeps): void {
  const { db, authenticated, requestCtx, executionCtx } = deps;
  server.tool(
    'get_provider',
    'Get a detailed summary of a specific verified service provider. Returns business description, services, pricing summary, coverage area, service details, and a link to the full profile page. With a valid API key (X-API-Key header): also returns full pricing breakdown and certifications. Without a key: returns pricing_summary and a pro_available flag. Contact details (phone, email, address) are available on the listing page via listing_url.',
    {
      niche_id: z.string().describe('Niche ID (e.g. "coated-local"). Must match the niche used in search_providers.'),
      provider_slug: z.string().describe('Provider URL slug from search_providers results (e.g. "abc-coatings")'),
    },
    async ({ niche_id, provider_slug }) => {
      const startTimeMs = Date.now();
      if (!isNicheEnabled(niche_id)) {
        executionCtx.waitUntil(logQuery(db, { toolName: 'get_provider', nicheId: niche_id, providerSlug: provider_slug, errorCode: 'NOT_FOUND', startTimeMs }, requestCtx));
        return errorResponse('NOT_FOUND', `Niche "${niche_id}" is not available. Use list_niches to see available niches.`);
      }
      try {
        const provider = await db
          .prepare(
            `SELECT p.id, p.name, p.slug, p.niche_id, p.description, p.listing_tier,
                    p.phone,
                    pr.confidence AS rating_tier, pr.star AS rating_star,
                    ${OWNED_REVIEW_COUNT_SQL} AS owned_review_count,
                    p.enriched_services, p.enriched_pricing,
                    p.enriched_certifications, p.enriched_coverage,
                    p.enriched_years, p.year_established,
                    p.updated_at, p.claimed_at,
                    p.our_summary, p.review_summary,
                    n.domain AS niche_domain
             FROM providers p
             JOIN provider_ratings pr ON pr.provider_id = p.id
             JOIN niches n ON n.id = p.niche_id
             WHERE p.niche_id = ? AND p.slug = ?
               AND ${SERVED_PROVIDER_FILTER}`
          )
          .bind(niche_id, provider_slug)
          .first<ProviderRow>();

        if (!provider) {
          executionCtx.waitUntil(logQuery(db, { toolName: 'get_provider', nicheId: niche_id, providerSlug: provider_slug, errorCode: 'NOT_FOUND', startTimeMs }, requestCtx));
          return errorResponse(
            'NOT_FOUND',
            `Provider "${provider_slug}" not found in niche "${niche_id}". Use search_providers to find valid provider slugs.`
          );
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
               ORDER BY pl.is_primary DESC`
            )
            .bind(niche_id, provider_slug)
            .all<LocationRow>(),
          db
            .prepare(
              `SELECT ps.service_type, ps.pricing_model, ps.price_min, ps.price_max, ps.turnaround
               FROM provider_services ps
               JOIN providers p ON p.id = ps.provider_id
               WHERE p.niche_id = ? AND p.slug = ?`
            )
            .bind(niche_id, provider_slug)
            .all<ServiceRow>(),
        ]);

        const primaryLocation = locResult.results.find((l) => l.is_primary) ?? locResult.results[0];
        const citySlug = primaryLocation ? (primaryLocation.metro_area ?? primaryLocation.city_slug) : '';
        const rawServices = parseJsonArray(provider.enriched_services);
        const pricingArr = parseJsonArray(provider.enriched_pricing);
        const certsArr = parseJsonArray(provider.enriched_certifications);
        const listingUrl = citySlug
          ? buildListingUrl(provider.niche_domain, citySlug, provider.slug)
          : `https://${provider.niche_domain}/`;

        const json_ld = buildJsonLd({
          name: provider.name,
          description: provider.description,
          phone: provider.phone,
          rating_star: provider.rating_star,
          owned_review_count: provider.owned_review_count,
          city_name: primaryLocation?.city_name ?? null,
          state_abbr: primaryLocation?.state_abbr ?? null,
          listing_url: listingUrl,
        });

        // Improvement #3: structured credibility block
        const credibility = buildCredibility({
          listing_tier: provider.listing_tier,
          claimed_at: provider.claimed_at,
          updated_at: provider.updated_at,
          enriched_services: provider.enriched_services,
          owned_review_count: provider.owned_review_count,
        });

        // Improvement #4: pre-formatted citation fields
        const citation = buildCitation({
          name: provider.name,
          city_name: primaryLocation?.city_name ?? null,
          state_abbr: primaryLocation?.state_abbr ?? null,
          listing_url: listingUrl,
        });

        const result: Record<string, unknown> = {
          name: provider.name,
          description: provider.description ?? null,
          rating: buildRating(provider),
          // LocalPro-written summaries: an overview of the business, and what its customers say.
          ...(provider.our_summary ? { summary: provider.our_summary } : {}),
          ...(provider.review_summary ? { review_summary: provider.review_summary } : {}),
          years_in_business: provider.enriched_years ?? provider.year_established ?? null,
          services: rawServices.map((s) => ({
            type: s,
            label: getServiceLabel(provider.niche_id, s),
          })),
          // Authenticated: full pricing + certifications. Public: summary only.
          ...(authenticated
            ? { pricing: pricingArr, certifications: certsArr }
            : { pricing_summary: pricingArr.length > 0 ? pricingArr[0] : null }),
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
          listing_url: listingUrl,
          // Improvement #2: JSON-LD for AI semantic parsing
          json_ld,
          // Improvement #3: credibility block
          credibility,
          // Improvement #4: pre-formatted citation fields
          citation,
          ...(!authenticated && (pricingArr.length > 1 || certsArr.length > 0)
            ? { pro_available: true }
            : {}),
        };

        executionCtx.waitUntil(logQuery(db, { toolName: 'get_provider', nicheId: niche_id, providerSlug: provider_slug, resultCount: 1, startTimeMs }, requestCtx));
        return {
          content: [
            {
              type: 'text',
              text: wrapResponse({
                results: [result],
                niche_id,
                last_verified_at: provider.updated_at,
              }),
            },
          ],
        };
      } catch (err) {
        executionCtx.waitUntil(logQuery(db, { toolName: 'get_provider', nicheId: niche_id, providerSlug: provider_slug, errorCode: 'INTERNAL_ERROR', startTimeMs }, requestCtx));
        return errorResponse('INTERNAL_ERROR', `Failed to get provider: ${(err as Error).message}`);
      }
    }
  );
}
