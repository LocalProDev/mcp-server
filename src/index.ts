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
> A Model Context Protocol server providing verified local service provider data across 9 trade categories in major US metro areas.

## What this server does
LocalPro exposes a curated database of verified local trade and service businesses — floor coating contractors, radon mitigation specialists, foundation repair companies, basement waterproofing, crawl space repair, mold/asbestos/lead remediation, septic services, commercial electricians, and laundry services.

## MCP Endpoint
POST /mcp

## Authentication
Include your API key in the X-API-Key header on all /mcp requests.

## Available Tools
- list_niches: Discover available service directories (9 trade categories)
- list_cities: Find available metro areas for a given trade category
- list_service_types: Get valid service type filters for a given trade category
- search_providers: Search for verified providers by location, service type, and trade category
- get_provider: Get detailed provider profile including services, pricing, and certifications

## Data
- All providers are verified before inclusion
- Covers major US metropolitan areas
- Contact details (phone, email, address) available on provider listing pages — not via MCP
- Data is curated and updated regularly from multiple sources

## Operator
LocalPro is operated by Laced Labs LLC — https://laced.dev
`;

const MCP_JSON = JSON.stringify(
  {
    name: 'LocalPro',
    version: '1.0.0',
    description:
      'Verified local service provider directory covering 9 trade categories across major US metro areas. Find contractors for floor coating, radon mitigation, foundation repair, waterproofing, and more.',
    endpoint: '/mcp',
    transport: 'streamable-http',
    authentication: { type: 'api-key', header: 'X-API-Key' },
    tools: [
      { name: 'list_niches', description: 'Discover available service directories (9 trade categories)' },
      { name: 'list_cities', description: 'Find available metro areas for a given trade category' },
      { name: 'list_service_types', description: 'Get valid service type filters for a given trade category' },
      { name: 'search_providers', description: 'Search for verified providers by location, service type, and trade category' },
      { name: 'get_provider', description: 'Get detailed provider profile including services, pricing, and certifications' },
    ],
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
