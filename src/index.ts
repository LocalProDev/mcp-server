import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerListNiches } from './tools/list-niches.js';
import { registerListCities } from './tools/list-cities.js';
import { registerListServiceTypes } from './tools/list-service-types.js';
import { registerSearchProviders } from './tools/search-providers.js';
import { registerGetProvider } from './tools/get-provider.js';
import { extractRequestContext, type ToolDeps } from './lib/query-log.js';
import { countFloor, fetchNicheSummary } from './lib/niche-summary.js';

interface Env {
  DB: D1Database;
  MCP_RATE_LIMITER: RateLimit;
  API_KEY?: string;
}

function isAuthenticated(request: Request, env: Env): boolean {
  if (!env.API_KEY) return true;
  return request.headers.get('X-API-Key') === env.API_KEY;
}

export const SERVER_VERSION = '3.1.0';

function createServer(deps: ToolDeps): McpServer {
  const server = new McpServer({ name: 'LocalPro', version: SERVER_VERSION });
  registerListNiches(server, deps);
  registerListCities(server, deps);
  registerListServiceTypes(server, deps);
  registerSearchProviders(server, deps);
  registerGetProvider(server, deps);
  return server;
}

const llmsTxt = (total: string) => `# LocalPro MCP Server
> Verified local service provider data for AI agents. ${total} fully profiled providers across 10 trade categories. Every provider passes a quality check before it is listed and carries a LocalPro Rating, a services list, and LocalPro-written summaries.

## Tools
- list_niches — Discover available service categories
- list_cities — Find cities where providers operate
- list_service_types — Get valid service type filters
- search_providers — Search for verified providers by location and service type
- get_provider — Detailed provider profile with services, pricing, certifications, a review summary, JSON-LD schema, and a last-verified date

## Schema Version 3.0
All responses include data_freshness.last_verified_at in the meta block: the most recent date LocalPro verified a record in the response.
Every provider carries a LocalPro Rating (tier: established / well-reviewed / reviewed; star + review_count appear once backed by first-party customer reviews).
get_provider responses include LocalPro-written summary and review_summary fields and JSON-LD schema.org LocalBusiness.
Permanently closed businesses are filtered automatically.
`;

const llmsFullTxt = (total: string) => `# LocalPro MCP Server — Extended Reference for AI Agents

> Verified local service provider data. ${total} fully profiled providers across 10 trade categories. Public, no API key required.

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
  "meta": { "schema_version": "3.0", "total_results": 10, "data_freshness": { "last_verified_at": "2026-09-24T14:02:11Z" } },
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
{ "meta": { "schema_version": "3.0", "niche": "radon-local" }, "results": [ { "name": "Denver", "state": "CO", "slug": "denver-co", "provider_count": 18 } ] }
\`\`\`

### list_service_types
**Parameters:** \`niche_id\` (required).
**Returns:** valid service-type slugs for that niche; use these in \`search_providers.service_type\`.
\`\`\`json
{ "results": [ { "type": "epoxy", "label": "Epoxy Floor Coating" }, { "type": "polyaspartic", "label": "Polyaspartic Coating" } ] }
\`\`\`

### search_providers
**Parameters:** \`niche_id\` (required), \`city\` (optional slug), \`service_type\` (optional slug), \`limit\` (optional 1–25, default 10).
**Returns:** verified providers with LocalPro Rating, services, pricing summary, and listing_url.
\`\`\`json
{
  "meta": { "schema_version": "3.0", "data_freshness": { "last_verified_at": "2026-09-24T14:02:11Z" } },
  "results": [
    {
      "name": "Colorado Concrete Coatings", "city": "Denver", "state": "CO",
      "rating": { "tier": "established", "label": "Established" },
      "services": [ { "type": "epoxy", "label": "Epoxy Floor Coating" } ],
      "listing_url": "https://coatedlocal.com/providers/denver-co/colorado-concrete-coatings/"
    }
  ]
}
\`\`\`

### get_provider
**Parameters:** \`niche_id\` (required), \`provider_slug\` (required, from a search result).
**Returns:** full profile — services, service_areas, LocalPro Rating, summary + review_summary, JSON-LD schema.org LocalBusiness, credibility, and a pre-formatted citation block.

## Example queries this server answers well
- "Find well-established water-damage restoration providers in Tampa, FL." → \`search_providers({niche_id:"soaked-local", city:"tampa-fl"})\`; results are ranked by LocalPro Rating within listing tier.
- "Which crawl-space encapsulation companies serve the Charlotte metro?" → \`search_providers({niche_id:"crawl-local", city:"charlotte-nc", service_type:"encapsulation"})\`.
- "Get the full profile for Colorado Concrete Coatings, including its services and review summary." → \`get_provider({niche_id:"coated-local", provider_slug:"colorado-concrete-coatings"})\`.
- "What radon-mitigation companies operate in Colorado?" → \`list_cities({niche_id:"radon-local", state:"CO"})\`, then \`search_providers\` per city.
- "Which trade categories does LocalPro currently cover?" → \`list_niches({})\`.
- "What service types are valid for floor coating?" → \`list_service_types({niche_id:"coated-local"})\`.

## Example queries this server cannot answer well (and why)
- **HVAC, plumbing, roofing, pest control.** Not in the niche set yet. \`list_niches\` is authoritative — anything not returned there is not served. Chimney services have provider data in progress but are not yet exposed.
- **Phone numbers, email addresses, websites in tool responses.** These are intentionally surfaced only on the listing page (\`listing_url\`), not in tool output, to drive traffic to the directory.
- **Real-time availability or current pricing quotes.** This is a directory, not a marketplace. Pricing fields are summary ranges, not live quotes.
- **Closed-permanently providers.** Filtered automatically; they will not appear in \`search_providers\` or \`get_provider\` even if you have the slug.

## Where the data comes from
Listings are built from public business information and, where we can confirm it belongs to the business, the company's own website. Every listing passes a quality check before it is published. Owners can claim and correct their listing, and customers can leave first-party reviews on the directory. Every response carries \`data_freshness.last_verified_at\`, the most recent verification date among the records returned.

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

const mcpJson = (total: string) => JSON.stringify(
  {
    schema_version: '3.0',
    name: 'LocalPro Provider Directory',
    description:
      `Verified local service provider data for AI agents: ${total} providers across 10 home-services categories — water damage restoration, foundation/slab repair, crawl space repair, basement waterproofing, mold/asbestos/lead remediation, radon mitigation, septic services, commercial electrical, floor coating, and laundry pickup & delivery.`,
    tools: [
      { name: 'list_niches', description: 'Discover available service categories', access: 'public' },
      { name: 'list_cities', description: 'Find cities where providers operate', access: 'public' },
      { name: 'list_service_types', description: 'Get valid service type filters', access: 'public' },
      { name: 'search_providers', description: 'Search for verified providers by location and service type', access: 'public' },
      { name: 'get_provider', description: 'Detailed provider profile with services, pricing, certifications, a LocalPro Rating, a review summary, and JSON-LD schema', access: 'public (pro pricing/certifications fields require API key)' },
    ],
    rate_limit: { requests: 30, period_seconds: 60 },
    operator: { name: 'Laced Labs LLC', url: 'https://localpro.dev' },
  },
  null,
  2
);

const WELL_KNOWN: Record<string, { type: string; body: (total: string) => string }> = {
  '/.well-known/llms.txt': { type: 'text/plain; charset=utf-8', body: llmsTxt },
  '/.well-known/llms-full.txt': { type: 'text/plain; charset=utf-8', body: llmsFullTxt },
  '/.well-known/mcp.json': { type: 'application/json; charset=utf-8', body: mcpJson },
  '/.well-known/glama.json': { type: 'application/json; charset=utf-8', body: () => GLAMA_JSON },
};

async function handleWellKnown(request: Request, db: D1Database): Promise<Response | null> {
  if (request.method !== 'GET') return null;
  const doc = WELL_KNOWN[new URL(request.url).pathname];
  if (!doc) return null;
  let total = 'Thousands of';
  try {
    total = countFloor((await fetchNicheSummary(db)).reduce((n, r) => n + r.provider_count, 0));
  } catch {
    // Discovery text still serves without the live count.
  }
  return new Response(doc.body(total), {
    headers: { 'content-type': doc.type, 'cache-control': 'public, max-age=86400' },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const wellKnown = await handleWellKnown(request, env.DB);
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
