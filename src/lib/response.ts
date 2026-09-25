export function buildListingUrl(domain: string, citySlug: string, providerSlug: string): string {
  return `https://${domain}/providers/${citySlug}/${providerSlug}/`;
}

export function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const SCHEMA_VERSION = '3.0';

// Enabled niches — the categories this server serves. Mirrors the production
// allowlist (config/mcp-niches.json in the LocalPro monorepo). Only providers
// in these niches that also pass the completeness gate (SERVED_PROVIDER_FILTER) are returned by any tool. Edit
// this list to change which categories are exposed.
export const ENABLED_NICHES = new Set<string>([
  'coated-local',
  'radon-local',
  'crawl-local',
  'suds-local',
  'abate-local',
  'basement-local',
  'slab-local',
  'pump-local',
  'soaked-local',
  'hire-electrical',
]);

export function nicheInClause(): string {
  return [...ENABLED_NICHES].map(() => '?').join(', ');
}

export function nicheBindValues(): string[] {
  return [...ENABLED_NICHES];
}

/**
 * The served-provider gate, shared by list_niches / search_providers / get_provider so
 * counts agree across tools. Requires a LocalPro Rating row (alias `pr`), a real
 * description, a services list, and excludes permanently closed businesses.
 */
export const SERVED_PROVIDER_FILTER = `p.verified = 1 AND p.review_status = 'approved'
  AND p.description IS NOT NULL AND length(p.description) > 5
  AND p.enriched_services IS NOT NULL AND p.enriched_services != '[]'
  AND (p.google_business_status IS NULL OR p.google_business_status != 'CLOSED_PERMANENTLY')`;

/** Published first-party review count for provider alias `p`. */
export const OWNED_REVIEW_COUNT_SQL = `(SELECT COUNT(*) FROM reviews rv WHERE rv.provider_id = p.id AND rv.status = 'published')`;

export function isNicheEnabled(nicheId: string): boolean {
  return ENABLED_NICHES.has(nicheId);
}

interface WrapOptions {
  results: unknown[];
  niche_id?: string;
  data_note?: string;
  /** ISO timestamp of the most recently verified record in this response */
  last_verified_at?: string | null;
}

/** Latest non-null ISO timestamp in a set of rows. */
export function latest<T>(rows: T[], pick: (r: T) => string | null | undefined): string | null {
  return rows.reduce<string | null>((max, r) => {
    const v = pick(r);
    return v && (!max || v > max) ? v : max;
  }, null);
}

export function wrapResponse(data: WrapOptions): string {
  return JSON.stringify(
    {
      meta: {
        schema_version: SCHEMA_VERSION,
        total_results: data.results.length,
        niche: data.niche_id ?? null,
        data_freshness: { last_verified_at: data.last_verified_at ?? null },
        data_note:
          data.data_note ??
          'Verified providers only. Visit listing_url for full contact details.',
      },
      results: data.results,
    },
    null,
    2
  );
}

export function errorResponse(
  code: string,
  message: string
): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          { meta: { schema_version: SCHEMA_VERSION }, error: { code, message } },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

/** LocalPro Rating descriptors, matching the directory sites. */
const RATING_TIER_LABELS: Record<string, string> = {
  established: 'Established',
  'well-reviewed': 'Well reviewed',
  reviewed: 'Reviewed',
  unrated: 'Not yet rated',
};

/**
 * LocalPro Rating block. `tier` is our curve-graded standing within the category;
 * `star` + `review_count` are present only once first-party reviews back them.
 */
export function buildRating(r: {
  rating_tier: string | null;
  rating_star: number | null;
  owned_review_count: number | null;
}): object {
  const tier = r.rating_tier ?? 'unrated';
  const hasReviews = r.rating_star != null && (r.owned_review_count ?? 0) > 0;
  return {
    tier,
    label: RATING_TIER_LABELS[tier] ?? tier,
    ...(hasReviews ? { star: r.rating_star, review_count: r.owned_review_count } : {}),
  };
}

/** Build a JSON-LD LocalBusiness object for schema.org */
export function buildJsonLd(provider: {
  name: string;
  description: string | null;
  phone: string | null;
  rating_star: number | null;
  owned_review_count: number | null;
  city_name: string | null;
  state_abbr: string | null;
  listing_url: string;
}): object {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: provider.name,
    url: provider.listing_url,
  };
  if (provider.description) ld.description = provider.description;
  if (provider.city_name || provider.state_abbr) {
    ld.address = {
      '@type': 'PostalAddress',
      ...(provider.city_name ? { addressLocality: provider.city_name } : {}),
      ...(provider.state_abbr ? { addressRegion: provider.state_abbr } : {}),
      addressCountry: 'US',
    };
  }
  if (provider.phone) ld.telephone = provider.phone;
  // Only first-party reviews back an AggregateRating.
  if (provider.rating_star != null && (provider.owned_review_count ?? 0) > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: provider.rating_star,
      reviewCount: provider.owned_review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return ld;
}

/** Build pre-formatted citation fields so LLMs can cite providers directly */
export function buildCitation(provider: {
  name: string;
  city_name: string | null;
  state_abbr: string | null;
  listing_url: string;
}): object {
  const location = [provider.city_name, provider.state_abbr].filter(Boolean).join(', ');
  const display_name = location ? `${provider.name} — ${location}` : provider.name;
  const in_text = location ? `${provider.name} (${location})` : provider.name;
  const attribution = `${display_name}. Verified listing: ${provider.listing_url}`;
  return { display_name, in_text, attribution };
}

/** Build structured credibility block to replace bare `verified: true` */
export function buildCredibility(provider: {
  listing_tier: string | null;
  claimed_at: string | null;
  updated_at: string | null;
  enriched_services: string | null;
  owned_review_count: number | null;
}): object {
  const sources: string[] = [];
  if (provider.enriched_services && provider.enriched_services !== '[]') {
    sources.push('business_website');
  }
  const tier = provider.listing_tier ?? 'free';
  if (['claimed', 'featured', 'pro'].includes(tier)) sources.push('owner_verified');
  if ((provider.owned_review_count ?? 0) > 0) sources.push('customer_reviews');

  return {
    verified: true,
    listing_tier: tier,
    verification_date: provider.claimed_at ?? provider.updated_at ?? null,
    data_sources: sources,
  };
}
