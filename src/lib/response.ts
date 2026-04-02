/**
 * Response shaping helpers — strips sensitive fields, builds listing URLs,
 * wraps responses with metadata for agent trust signals.
 */

/** Build the canonical listing URL for a provider on its directory site. */
export function buildListingUrl(
  domain: string,
  citySlug: string,
  providerSlug: string,
): string {
  return `https://${domain}/providers/${citySlug}/${providerSlug}/`;
}

/** Parse a JSON text column into an array, returning [] on failure. */
export function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Schema version — increment on breaking response shape changes. */
export const SCHEMA_VERSION = '1.0';

/**
 * Wrap a tool response with metadata that helps agents assess data quality.
 * Every MCP tool response should use this to maintain consistent structure.
 */
export function wrapResponse(data: {
  results: unknown[];
  niche_id?: string;
  data_note?: string;
}): string {
  return JSON.stringify(
    {
      meta: {
        schema_version: SCHEMA_VERSION,
        total_results: data.results.length,
        niche: data.niche_id ?? null,
        data_note:
          data.data_note ??
          'Verified providers only. Visit listing_url for full contact details.',
      },
      results: data.results,
    },
    null,
    2,
  );
}

/** Structured error response — consistent shape for all tool failures. */
export function errorResponse(code: string, message: string): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        meta: { schema_version: SCHEMA_VERSION },
        error: { code, message },
      }, null, 2),
    }],
    isError: true,
  };
}
