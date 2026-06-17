import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerListNiches } from './tools/list-niches.js';
import { registerListCities } from './tools/list-cities.js';
import { registerListServiceTypes } from './tools/list-service-types.js';
import { registerSearchProviders } from './tools/search-providers.js';
import { registerGetProvider } from './tools/get-provider.js';
import { extractRequestContext, type ToolDeps } from './lib/query-log.js';

interface Env {
  DB: D1Database;
  MCP_RATE_LIMITER: RateLimit;
  API_KEY?: string;
}

function isAuthenticated(request: Request, env: Env): boolean {
  if (!env.API_KEY) return true;
  return request.headers.get('X-API-Key') === env.API_KEY;
}

function createServer(deps: ToolDeps): McpServer {
  const server = new McpServer({ name: 'LocalPro', version: '2.0.1' });
  registerListNiches(server, deps);
  registerListCities(server, deps);
  registerListServiceTypes(server, deps);
  registerSearchProviders(server, deps);
  registerGetProvider(server, deps);
  return server;
}

const LLMS_TXT = `# LocalPro MCP Server
> Verified local service provider data for AI agents. 7,000+ fully profiled providers across 10 trade categories. Each provider served includes a customer rating, services list, opening hours, and business status, with AI-generated summaries and recent reviews where available.

## Tools
- list_niches — Discover available service categories
- list_cities — Find cities where providers operate
- list_service_types — Get valid service type filters
- search_providers — Search for verified providers by location and service type
- get_provider — Detailed provider profile with services, pricing, certifications, recent reviews, opening hours, JSON-LD schema, and freshness signals

## Schema Version 2.0
All responses include data_freshness in the meta block. Two cadence signals: directory_refresh_cadence (weekly — provider names, services, websites) and google_data_refresh_cadence (quarterly — ratings, reviews, hours).
get_provider responses include a google_data block (business_status, opening_hours, recent_reviews, summary, formatted_address, google_maps_url) and JSON-LD schema.org LocalBusiness with AggregateRating + OpeningHoursSpecification + GeoCoordinates.
Closed-permanently providers are filtered automatically.
`;

const LLMS_FULL_TXT = `# LocalPro MCP Server — Extended Reference for AI Agents

> Verified local service provider data. 7,000+ fully profiled providers across 10 trade categories. Public, no API key required.

## Endpoint
\`POST https://mcp.localpro.dev/mcp\` (JSON-RPC 2.0 over Streamable HTTP, stateless mode — \`tools/call\` works without prior \`initialize\`).

## Auth model
- All five tools are publicly callable with no API key.
- An optional \`X-API-Key\` header unlocks pro fields on \`get_provider\` (full pricing array, certifications) for partners.
- Rate limit: 30 requests / 60 seconds, keyed by \`X-API-Key\` then \`CF-Connecting-IP\` then \`anonymous\`. 429 includes \`retry-after: 60\`.

## Categories served (call list_niches for live counts)
Water damage restoration, foundation/slab repair, crawl space repair, basement waterproofing, mold/asbestos/lead remediation, radon mitigation, septic services, commercial electrical, floor coating, and laundry pickup & delivery.

## Tool signatures and example responses

### list_niches
**Parameters:** none.
**Returns:** array of available niches with provider counts and the directory domain that hosts each.
\`\`\`json
{
  "meta": { "schema_version": "2.0", "total_results": 10, "data_freshness": { "directory_refresh_cadence": "weekly" } },
  "results": [
    { "niche_id": "slab-local",   "name": "Foundation Repair Contractors", "slug": "foundation-repair", "domain": "slablocal.com", "provider_count": 1033 },
    { "niche_id": "crawl-local",  "name": "Crawl Space Repair Contractors", "slug": "crawl-space-repair", "domain": "crawllocal.com", "provider_count": 1030 },
    { "niche_id": "soaked-local", "name": "Water Damage Restoration", "slug": "water-damage-restoration", "domain": "soakedlocal.com", "provider_count": 974 }
  ]
}
\`\`\`

### list_cities
**Parameters:** \`niche_id\` (required), \`state\` (optional, two-letter abbr).
**Returns:** cities/metros where the niche has providers, sorted by provider_count.
\`\`\`json
{ "meta": { "schema_version": "2.0", "niche": "radon-local" }, "results": [ { "name": "Denver", "state": "CO", "slug": "denver-co", "provider_count": 18 } ] }
\`\`\`

### list_service_types
**Parameters:** \`niche_id\` (required).
**Returns:** valid service-type slugs for that niche; use these in \`search_providers.service_type\`.
\`\`\`json
{ "results": [ { "type": "epoxy", "label": "Epoxy Floor Coating" }, { "type": "polyaspartic", "label": "Polyaspartic Coating" } ] }
\`\`\`

### search_providers
**Parameters:** \`niche_id\` (required), \`city\` (optional slug), \`service_type\` (optional slug), \`limit\` (optional 1–25, default 10).
**Returns:** verified providers with rating, services, business_status, listing_url, and Google maps URL.
\`\`\`json
{
  "meta": { "schema_version": "2.0", "data_freshness": { "directory_refresh_cadence": "weekly", "google_data_refresh_cadence": "quarterly" } },
  "results": [
    {
      "name": "Colorado Concrete Coatings", "city": "Denver", "state": "CO",
      "rating": 4.9, "review_count": 47, "business_status": "OPERATIONAL",
      "services": [ { "type": "epoxy", "label": "Epoxy Floor Coating" } ],
      "listing_url": "https://coatedlocal.com/providers/denver-co/colorado-concrete-coatings/"
    }
  ]
}
\`\`\`

### get_provider
**Parameters:** \`niche_id\` (required), \`provider_slug\` (required, from a search result).
**Returns:** full profile — services, service_areas, google_data block (opening_hours, recent_reviews, AI summary, business_status), JSON-LD schema.org LocalBusiness with AggregateRating + OpeningHoursSpecification + GeoCoordinates, credibility, and a pre-formatted citation block.

## Example queries this server answers well
- "Find verified water-damage restoration providers in Tampa, FL with a 4.5+ rating." → \`search_providers({niche_id:"soaked-local", city:"tampa-fl"})\`, then filter on \`rating\`.
- "Which crawl-space encapsulation companies serve the Charlotte metro?" → \`search_providers({niche_id:"crawl-local", city:"charlotte-nc", service_type:"encapsulation"})\`.
- "Get the full profile for Colorado Concrete Coatings, including opening hours and recent reviews." → \`get_provider({niche_id:"coated-local", provider_slug:"colorado-concrete-coatings"})\`.
- "What radon-mitigation companies operate in Colorado?" → \`list_cities({niche_id:"radon-local", state:"CO"})\`, then \`search_providers\` per city.
- "Which trade categories does LocalPro currently cover?" → \`list_niches({})\`.
- "What service types are valid for floor coating?" → \`list_service_types({niche_id:"coated-local"})\`.

## Example queries this server cannot answer well (and why)
- **HVAC, plumbing, roofing, pest control.** Not in the niche set yet. \`list_niches\` is authoritative — anything not returned there is not served. Chimney services have provider data in progress but are not yet exposed.
- **Phone numbers, email addresses, websites in tool responses.** These are intentionally surfaced only on the listing page (\`listing_url\`), not in tool output, to drive traffic to the directory.
- **Real-time availability or current pricing quotes.** This is a directory, not a marketplace. Pricing fields are summary ranges, not live quotes.
- **Closed-permanently providers.** Filtered automatically; they will not appear in \`search_providers\` or \`get_provider\` even if you have the slug.

## Data freshness
Every response includes a \`data_freshness\` block with two cadence signals:
- \`directory_refresh_cadence: "weekly"\` — provider name, services, websites, descriptions.
- \`google_data_refresh_cadence: "quarterly"\` — rating, review count, opening hours, business status, AI summary.

When in doubt, re-call the tool rather than caching responses indefinitely.

## Source and contact
- GitHub: https://github.com/LocalProDev/mcp-server
- Issues / partner inquiries: https://github.com/LocalProDev/mcp-server/issues
- Operator: Laced Labs LLC — https://localpro.dev
`;

const GLAMA_JSON = JSON.stringify(
  {
    $schema: 'https://glama.ai/mcp/schemas/connector.json',
    maintainers: [{ email: 'will@localpro.dev' }],
  },
  null,
  2
);

const MCP_JSON = JSON.stringify(
  {
    schema_version: '2.0',
    name: 'LocalPro Provider Directory',
    description:
      'Verified local service provider data for AI agents across 10 home-services categories — water damage restoration, foundation/slab repair, crawl space repair, basement waterproofing, mold/asbestos/lead remediation, radon mitigation, septic services, commercial electrical, floor coating, and laundry pickup & delivery.',
    tools: [
      { name: 'list_niches', description: 'Discover available service categories', access: 'public' },
      { name: 'list_cities', description: 'Find cities where providers operate', access: 'public' },
      { name: 'list_service_types', description: 'Get valid service type filters', access: 'public' },
      { name: 'search_providers', description: 'Search for verified providers by location and service type', access: 'public' },
      { name: 'get_provider', description: 'Detailed provider profile with services, pricing, certifications, recent reviews, opening hours, business status, and JSON-LD schema', access: 'public (pro pricing/certifications fields require API key)' },
    ],
    rate_limit: { requests: 30, period_seconds: 60 },
    operator: { name: 'Laced Labs LLC', url: 'https://localpro.dev' },
  },
  null,
  2
);

function handleWellKnown(request: Request): Response | null {
  const url = new URL(request.url);
  if (request.method !== 'GET') return null;
  if (url.pathname === '/.well-known/llms.txt') {
    return new Response(LLMS_TXT, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }
  if (url.pathname === '/.well-known/mcp.json') {
    return new Response(MCP_JSON, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }
  if (url.pathname === '/.well-known/llms-full.txt') {
    return new Response(LLMS_FULL_TXT, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }
  if (url.pathname === '/.well-known/glama.json') {
    return new Response(GLAMA_JSON, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    });
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const wellKnown = handleWellKnown(request);
    if (wellKnown) return wellKnown;

    if (env.MCP_RATE_LIMITER) {
      const rateLimitKey =
        request.headers.get('X-API-Key') ||
        request.headers.get('CF-Connecting-IP') ||
        'anonymous';
      const { success } = await env.MCP_RATE_LIMITER.limit({ key: rateLimitKey });
      if (!success) {
        return new Response(
          JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Max 30 requests per minute.' } }),
          { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60' } }
        );
      }
    }

    // Stateless transport: new instance per request, no session state
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const authenticated = isAuthenticated(request, env);
    const requestCtx = extractRequestContext(request);
    const server = createServer({ db: env.DB, authenticated, requestCtx, executionCtx: ctx });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
