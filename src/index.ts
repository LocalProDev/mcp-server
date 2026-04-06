import { createMcpHandler } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListNiches } from './tools/list-niches.js';
import { registerListCities } from './tools/list-cities.js';
import { registerListServiceTypes } from './tools/list-service-types.js';
import { registerSearchProviders } from './tools/search-providers.js';
import { registerGetProvider } from './tools/get-provider.js';
import { errorResponse } from './lib/response.js';

interface Env {
  DB: D1Database;
  API_KEY?: string;
  MCP_RATE_LIMITER?: RateLimit;
}

function createServer(db: D1Database, authenticated: boolean): McpServer {
  const server = new McpServer({
    name: 'LocalPro',
    version: '1.0.0',
  });

  registerListNiches(server, db);
  registerListCities(server, db);
  registerListServiceTypes(server, db);
  registerSearchProviders(server, db);
  registerGetProvider(server, db, authenticated);

  return server;
}

// ---- Well-known discovery endpoints ----

const LLMS_TXT = `# LocalPro MCP Server
> Verified local service provider data for AI agents. 2,950+ providers across 4 trade categories, with more being added.

## What this server does
LocalPro serves structured, verified data about local trade and service businesses. Currently live with 4 categories:
- Floor Coating (epoxy, polyaspartic, metallic) — 713 providers, 47 states
- Crawl Space Repair (encapsulation, structural, waterproofing) — 1,222 providers, 46 states
- Radon Testing & Mitigation — 334 providers, 15 states
- Laundry Services (wash & fold, pickup & delivery) — 681 providers, 39 states

Additional categories (foundation repair, waterproofing, remediation, septic, electrical) are being enriched and will be added soon.

## MCP Endpoint
POST /mcp

## Access
- Search and list tools are PUBLIC — no authentication required
- get_provider returns basic data publicly; full pricing and certifications require an API key (X-API-Key header)
- Rate limited to 30 requests/minute per IP or API key

## Available Tools
- list_niches: Discover available service categories (public)
- list_cities: Find available metro areas for a category (public)
- list_service_types: Get valid service type filters (public)
- search_providers: Search for verified providers by location and service type (public)
- get_provider: Detailed provider profile — basic data public, premium fields (certifications, full pricing) require API key

## Data
- All providers are verified before inclusion
- Ratings sourced from Google Places (78-92% coverage on live niches)
- Contact details (phone, email, address) available on provider listing pages via listing_url
- Data is enriched and refreshed weekly

## Operator
LocalPro is built and operated by Laced Labs LLC — https://laced.dev
`;

const MCP_JSON = JSON.stringify(
  {
    name: 'LocalPro',
    version: '1.0.0',
    description:
      'Verified local service provider directory. 2,950+ providers across floor coating, crawl space repair, radon mitigation, and laundry services. Public access, rate-limited. More categories coming soon.',
    endpoint: '/mcp',
    transport: 'streamable-http',
    authentication: {
      type: 'api-key',
      header: 'X-API-Key',
      note: 'Optional. Search and list tools are public. API key unlocks premium fields (certifications, full pricing) on get_provider.',
    },
    categories: [
      { id: 'coated-local', name: 'Floor Coating', providers: 713, states: 47 },
      { id: 'crawl-local', name: 'Crawl Space Repair', providers: 1222, states: 46 },
      { id: 'radon-local', name: 'Radon Testing & Mitigation', providers: 334, states: 15 },
      { id: 'suds-local', name: 'Laundry Services', providers: 681, states: 39 },
    ],
    tools: [
      { name: 'list_niches', description: 'Discover available service categories', access: 'public' },
      { name: 'list_cities', description: 'Find available metro areas for a category', access: 'public' },
      { name: 'list_service_types', description: 'Get valid service type filters', access: 'public' },
      { name: 'search_providers', description: 'Search for verified providers by location and service type', access: 'public' },
      { name: 'get_provider', description: 'Detailed provider profile with services, pricing, and certifications', access: 'public (premium fields require API key)' },
    ],
    rate_limit: { requests: 30, period_seconds: 60 },
    operator: { name: 'Laced Labs LLC', url: 'https://laced.dev' },
  },
  null,
  2,
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

  return null;
}

// ---- API Key Authentication ----
// Search/list tools are public. get_provider gates premium fields (certs, full pricing)
// based on whether the caller provided a valid API key.

function isAuthenticated(request: Request, env: Env): boolean {
  if (!env.API_KEY) return true; // No key configured = all access (dev)
  const providedKey = request.headers.get('X-API-Key');
  return providedKey === env.API_KEY;
}

// ---- Worker entry point ----

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Well-known endpoints are public
    const wellKnown = handleWellKnown(request);
    if (wellKnown) return wellKnown;

    // Rate limiting (by API key or IP — applies to all requests)
    if (env.MCP_RATE_LIMITER) {
      const rateLimitKey = request.headers.get('X-API-Key') || request.headers.get('CF-Connecting-IP') || 'anonymous';
      const { success } = await env.MCP_RATE_LIMITER.limit({ key: rateLimitKey });
      if (!success) {
        return new Response(
          JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded. Max 30 requests per minute.' } }),
          { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60' } },
        );
      }
    }

    // Check auth — list/search tools are public, get_provider gates premium fields
    const authenticated = isAuthenticated(request, env);

    // MCP handler
    const server = createServer(env.DB, authenticated);
    return createMcpHandler(server)(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
