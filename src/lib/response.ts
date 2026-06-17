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

export const SCHEMA_VERSION = '2.0';

// Enabled niches — the categories this server serves. Mirrors the production
// allowlist (config/mcp-niches.json in the LocalPro monorepo). Only providers
// in these niches that also pass the completeness gate (rating + description +
// services, business not permanently closed) are returned by any tool. Edit
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

export function isNicheEnabled(nicheId: string): boolean {
  return ENABLED_NICHES.has(nicheId);
}

interface WrapOptions {
  results: unknown[];
  niche_id?: string;
  data_note?: string;
  /** ISO timestamp of most recently scraped/updated record in this response */
  scraped_at?: string | null;
  /** ISO timestamp of most recent Google Places refresh in this response */
  google_refreshed_at?: string | null;
}

export function wrapResponse(data: WrapOptions): string {
  // Cadence-keyed freshness signals (per the directory's design principle:
  // display deliberate cadence, not age). Directory data refreshed weekly on
  // average via scrapers; Google Places data refreshed quarterly via TSE.
  const freshness: Record<string, string> = {
    directory_refresh_cadence: 'weekly',
    google_data_refresh_cadence: 'quarterly',
  };
  if (data.scraped_at) freshness.scraped_at = data.scraped_at;
  if (data.google_refreshed_at) freshness.google_refreshed_at = data.google_refreshed_at;

  return JSON.stringify(
    {
      meta: {
        schema_version: SCHEMA_VERSION,
        total_results: data.results.length,
        niche: data.niche_id ?? null,
        data_freshness: freshness,
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

/** Convert Google Places regularOpeningHours JSON to schema.org OpeningHoursSpecification array.
 * Google's day-of-week is 0=Sunday..6=Saturday (per Places API New). Schema.org uses URL refs.
 */
const SCHEMA_DAYS = [
  'https://schema.org/Sunday',
  'https://schema.org/Monday',
  'https://schema.org/Tuesday',
  'https://schema.org/Wednesday',
  'https://schema.org/Thursday',
  'https://schema.org/Friday',
  'https://schema.org/Saturday',
];
function pad2(n: number): string { return n.toString().padStart(2, '0'); }
export function buildOpeningHoursSpec(hoursJson: string | null): object[] | null {
  if (!hoursJson) return null;
  let hrs: { periods?: Array<{ open?: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }> };
  try { hrs = JSON.parse(hoursJson); } catch { return null; }
  if (!Array.isArray(hrs.periods)) return null;
  return hrs.periods
    .filter((p) => p.open && p.close)
    .map((p) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAYS[p.open!.day],
      opens: `${pad2(p.open!.hour)}:${pad2(p.open!.minute)}`,
      closes: `${pad2(p.close!.hour)}:${pad2(p.close!.minute)}`,
    }));
}

/** Build a JSON-LD LocalBusiness object for schema.org */
export function buildJsonLd(provider: {
  name: string;
  description: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_address: string | null;
  google_lat: number | null;
  google_lng: number | null;
  google_phone: string | null;
  google_hours_json: string | null;
  google_business_status: string | null;
  google_maps_uri: string | null;
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
  // Prefer Google's canonical formattedAddress when present; fall back to city/state.
  if (provider.google_address) {
    ld.address = provider.google_address;
  } else if (provider.city_name || provider.state_abbr) {
    ld.address = {
      '@type': 'PostalAddress',
      ...(provider.city_name ? { addressLocality: provider.city_name } : {}),
      ...(provider.state_abbr ? { addressRegion: provider.state_abbr } : {}),
      addressCountry: 'US',
    };
  }
  if (provider.google_lat != null && provider.google_lng != null) {
    ld.geo = {
      '@type': 'GeoCoordinates',
      latitude: provider.google_lat,
      longitude: provider.google_lng,
    };
  }
  if (provider.google_phone) ld.telephone = provider.google_phone;
  if (provider.google_rating != null && provider.google_review_count != null) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: provider.google_rating,
      reviewCount: provider.google_review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  const hours = buildOpeningHoursSpec(provider.google_hours_json);
  if (hours && hours.length > 0) {
    ld.openingHoursSpecification = hours;
  }
  if (provider.google_business_status === 'CLOSED_TEMPORARILY' || provider.google_business_status === 'CLOSED_PERMANENTLY') {
    ld.specialAnnouncement = provider.google_business_status;
  }
  if (provider.google_maps_uri) {
    ld.sameAs = [provider.google_maps_uri];
  }
  return ld;
}

/** Format Google reviews row set into schema.org Review array */
interface GoogleReviewRow {
  rating: number | null;
  text: string | null;
  language: string | null;
  author_name: string | null;
  author_uri: string | null;
  publish_time: string | null;
  google_maps_uri: string | null;
}
export function formatReviews(rows: GoogleReviewRow[]): object[] {
  return rows
    .filter((r) => r.text && r.rating)
    .map((r) => ({
      rating: r.rating,
      text: r.text,
      ...(r.language ? { language: r.language } : {}),
      author: r.author_name ?? null,
      ...(r.author_uri ? { author_uri: r.author_uri } : {}),
      published_at: r.publish_time ?? null,
      ...(r.google_maps_uri ? { source_url: r.google_maps_uri } : {}),
    }));
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
  source: string | null;
  enriched_services: string | null;
}): object {
  const sources: string[] = [];
  if (provider.source) sources.push(provider.source);
  if (provider.enriched_services && provider.enriched_services !== '[]') {
    sources.push('website_enrichment');
  }
  const tier = provider.listing_tier ?? 'free';
  if (['claimed', 'featured', 'premium', 'pro'].includes(tier)) {
    sources.push('claimed');
  }

  return {
    verified: true,
    listing_tier: tier,
    verification_date: provider.claimed_at ?? provider.updated_at ?? null,
    data_sources: [...new Set(sources)],
  };
}
