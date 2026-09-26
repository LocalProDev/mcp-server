# LocalPro MCP Server

[![LocalPro MCP server](https://glama.ai/mcp/servers/LocalProDev/mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/LocalProDev/mcp-server)

A [Model Context Protocol](https://modelcontextprotocol.io) server that provides verified local service provider data to AI agents. Built on Cloudflare Workers + D1.

When someone asks an AI assistant *"find me a radon mitigation company near Denver"* — LocalPro is the data source that powers the answer.

## What it does

LocalPro exposes a curated database of **<!-- @live:total -->9,000+<!-- /@live:total --> fully profiled local trade and service businesses** across 10 live categories. Every provider passes a quality check before it is served, and carries a LocalPro Rating, a business description, and a services list, plus (where available) LocalPro-written business and review summaries. No incomplete profiles.

All data is LocalPro-owned: collected and verified by us, corrected by business owners who claim their listing, and increasingly backed by first-party customer reviews left on the directories themselves.

### Live Now

<!-- @live:niches:start -->
<!-- @live:niches:end -->

### Coming Soon

| Category | Niche ID | Status |
|----------|----------|--------|
| Chimney Services | `chimney-local` | Live provider data; description + service enrichment in progress |
| Well Water Services | `wellwater-local` | Provider data in preparation (county-based model) |

## Quick Start

**No API key required.** All search and list tools are public. An optional API key unlocks pro fields on `get_provider` (full pricing array, certifications) — see [Access Tiers](#access-tiers).

### 60-second probe

Confirm the server is live without any client setup:

```bash
curl -s https://mcp.localpro.dev/.well-known/mcp.json | head -20
```

This returns the schema-2.0 manifest: tool list, rate limits, and operator info. If you see a `"schema_version": "2.0"` JSON document, the server is healthy.

### Claude Code CLI

```bash
claude mcp add --transport http localpro https://mcp.localpro.dev/mcp
```

That's it — `list_niches`, `search_providers`, etc. are now available in your Claude Code session.

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "localpro": {
      "url": "https://mcp.localpro.dev/mcp"
    }
  }
}
```

(Add an `"X-API-Key"` header inside a `"headers"` block only if you have a premium key.)

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "localpro": {
      "url": "https://mcp.localpro.dev/mcp"
    }
  }
}
```

### Raw HTTP (JSON-RPC)

The MCP protocol is JSON-RPC over HTTP. Because this server runs in stateless mode, you can call any public tool directly:

```bash
curl -s -X POST https://mcp.localpro.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_niches","arguments":{}}}'
```

You'll get back a Server-Sent-Events frame with the 10 niches, their slugs, and current provider counts.

### TypeScript SDK

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL('https://mcp.localpro.dev/mcp'),
);
const client = new Client({ name: 'localpro-example', version: '1.0' });
await client.connect(transport);

const niches = await client.callTool({ name: 'list_niches', arguments: {} });
console.log(niches);

const denver = await client.callTool({
  name: 'search_providers',
  arguments: { niche_id: 'radon-local', city: 'denver-co', limit: 3 },
});
console.log(denver);
```

Install: `npm i @modelcontextprotocol/sdk`

### Python SDK

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client("https://mcp.localpro.dev/mcp") as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            niches = await session.call_tool("list_niches", {})
            print(niches)

            denver = await session.call_tool(
                "search_providers",
                {"niche_id": "radon-local", "city": "denver-co", "limit": 3},
            )
            print(denver)

asyncio.run(main())
```

Install: `pip install mcp`

## Tools

### `list_niches`

Discover available service directories. Call this first.

**Parameters:** none

**Example response:**

```json
{
  "meta": {
    "schema_version": "3.0",
    "total_results": 10,
    "niche": null,
    "data_freshness": {
      "last_verified_at": "2026-09-22 12:57:07"
    },
    "data_note": "Use niche_id values with search_providers, list_cities, and list_service_types."
  },
  "results": [
    {
      "niche_id": "soaked-local",
      "name": "Water Damage Restoration Contractors",
      "slug": "water-damage-restoration",
      "domain": "soakedlocal.com",
      "provider_count": 1128
    }
  ]
}
```

### `list_cities`

Find available metros for a given niche.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `niche_id` | string | yes | Niche ID from `list_niches` |
| `state` | string | no | Two-letter state abbreviation (e.g. `"MN"`) |

**Example request:**

```json
{ "niche_id": "radon-local", "state": "CO" }
```

**Example response:**

```json
{
  "meta": {
    "schema_version": "1.0",
    "total_results": 3,
    "niche": "radon-local",
    "data_note": "Use slug values with search_providers city parameter."
  },
  "results": [
    { "name": "Denver", "state": "CO", "slug": "denver-co", "provider_count": 18 },
    { "name": "Colorado Springs", "state": "CO", "slug": "colorado-springs-co", "provider_count": 7 },
    { "name": "Fort Collins", "state": "CO", "slug": "fort-collins-co", "provider_count": 4 }
  ]
}
```

### `list_service_types`

Get valid service type filters for a niche. Call before using `service_type` in `search_providers`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `niche_id` | string | yes | Niche ID from `list_niches` |

**Example response:**

```json
{
  "meta": { "schema_version": "1.0", "total_results": 7, "niche": "coated-local" },
  "results": [
    { "type": "epoxy", "label": "Epoxy Floor Coating" },
    { "type": "polyaspartic", "label": "Polyaspartic Coating" },
    { "type": "metallic_epoxy", "label": "Metallic Epoxy" },
    { "type": "flake_chip", "label": "Flake / Chip Broadcast" },
    { "type": "concrete_polishing", "label": "Concrete Polishing" },
    { "type": "concrete_sealing", "label": "Concrete Sealing" },
    { "type": "polyurea", "label": "Polyurea Coating" }
  ]
}
```

### `search_providers`

Search for verified providers by location, service type, and trade category.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `niche_id` | string | yes | Niche ID from `list_niches` |
| `city` | string | no | City/metro slug from `list_cities` |
| `service_type` | string | no | Service type slug from `list_service_types` |
| `limit` | number | no | Max results, 1–25 (default 10) |

**Example request:**

```json
{ "niche_id": "coated-local", "city": "denver-co", "service_type": "epoxy", "limit": 3 }
```

**Example response:**

```json
{
  "meta": {
    "schema_version": "3.0",
    "total_results": 3,
    "niche": "coated-local",
    "data_freshness": {
      "last_verified_at": "2026-09-18 09:41:02"
    },
    "data_note": "Verified providers only. Visit listing_url for full contact details."
  },
  "results": [
    {
      "name": "Colorado Concrete Coatings",
      "description": "Full-service garage floor coating company serving the Denver metro.",
      "city": "Denver",
      "state": "CO",
      "rating": { "tier": "established", "label": "Established" },
      "services": [
        { "type": "epoxy", "label": "Epoxy Floor Coating" },
        { "type": "polyaspartic", "label": "Polyaspartic Coating" }
      ],
      "pricing_summary": "$6-9/sq ft",
      "coverage_area": "Denver metro, Front Range, 50-mile radius",
      "years_in_business": 8,
      "listing_url": "https://coatedlocal.com/providers/denver-co/colorado-concrete-coatings/",
      "pro_available": true
    }
  ]
}
```

### `get_provider`

Get detailed profile for a specific provider. Use the `provider_slug` from search results.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `niche_id` | string | yes | Niche ID |
| `provider_slug` | string | yes | Provider slug from `search_providers` |

**Example response:**

```json
{
  "meta": {
    "schema_version": "3.0",
    "total_results": 1,
    "niche": "coated-local",
    "data_freshness": { "last_verified_at": "2026-09-18 09:41:02" }
  },
  "results": [
    {
      "name": "Colorado Concrete Coatings",
      "description": "Full-service garage floor coating company...",
      "rating": { "tier": "established", "label": "Established", "star": 4.8, "review_count": 12 },
      "summary": "Full-service epoxy floor coating contractor specializing in garage and commercial floors across the Denver metro.",
      "review_summary": "Customers single out on-time, on-budget garage and commercial floor jobs and a crew that cleans up after itself.",
      "years_in_business": 8,
      "services": [
        { "type": "epoxy", "label": "Epoxy Floor Coating" },
        { "type": "polyaspartic", "label": "Polyaspartic Coating" }
      ],
      "pricing": ["$6-9/sq ft"],
      "certifications": ["Penntek Certified Installer"],
      "coverage_area": "Denver metro, Front Range",
      "service_areas": [
        { "city": "Denver", "state": "CO", "radius_miles": 50 }
      ],
      "service_details": [
        {
          "type": "epoxy",
          "label": "Epoxy Floor Coating",
          "pricing_model": "per_sqft",
          "price_range": "$6–$9",
          "turnaround": "two_day"
        }
      ],
      "listing_url": "https://coatedlocal.com/providers/denver-co/colorado-concrete-coatings/",
      "json_ld": { "@context": "https://schema.org", "@type": "LocalBusiness", "...": "..." },
      "credibility": { "verified": true, "listing_tier": "claimed", "data_sources": ["business_website", "owner_verified", "customer_reviews"] },
      "citation": { "display_name": "Colorado Concrete Coatings — Denver, CO", "...": "..." }
    }
  ]
}
```

## Schema Reference

### Response Envelope

Every response is wrapped in a consistent envelope:

```typescript
{
  meta: {
    schema_version: string                // Currently "3.0"
    total_results: number                 // Count of items in results array
    niche: string | null                  // Niche ID if applicable
    data_freshness: {
      last_verified_at: string | null     // Most recent verification date among the records returned
    }
    data_note: string                     // Context about the data returned
  }
  results: Array<T>                       // Tool-specific result objects
}
```

**Freshness.** `last_verified_at` is the date LocalPro last verified the newest record in the response. Each provider carries its own verification date in `credibility.verification_date`.

**Migrating from 2.x:** `rating` is now an object (the LocalPro Rating) rather than a number; `review_count` moved inside it and appears only with first-party reviews. `summary` and `review_summary` are top-level strings. `business_status`, map links, opening hours and geo coordinates are no longer returned. `data_freshness` is a single `last_verified_at` date.

### Error Response

Errors use the same envelope with an `error` object:

```typescript
{
  meta: { schema_version: string }
  error: {
    code: string     // "NOT_FOUND" | "INTERNAL_ERROR" | "UNAUTHORIZED" | "FORBIDDEN"
    message: string  // Human-readable error description
  }
}
```

### Provider Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `name` | string | no | Business name (always present) |
| `description` | string | no | Business description (always present) |
| `city` | string | no | City name (always present) |
| `state` | string | no | Two-letter state abbreviation (always present) |
| `rating` | object | no | LocalPro Rating — see below (always present) |
| `services` | array | no | `[{ type: string, label: string }]` (always present, non-empty) |
| `pricing_summary` | string | yes | Pricing info (public access) |
| `coverage_area` | string | yes | Geographic coverage description |
| `years_in_business` | number | yes | Years operating |
| `listing_url` | string | no | Full profile URL with contact details |

**`get_provider` adds:**

| Field | Type | Description |
|-------|------|-------------|
| `service_areas` | array | `[{ city, state, radius_miles }]` |
| `service_details` | array | `[{ type, label, pricing_model, price_range, turnaround }]` |
| `summary` | string | LocalPro-written overview of the business (when available) |
| `review_summary` | string | LocalPro-written "what customers say" summary; no raw review text or reviewer PII (when available) |
| `json_ld` | object | Schema.org `LocalBusiness` JSON-LD; `AggregateRating` included only when backed by first-party reviews |
| `credibility` | object | `{ verified, listing_tier, verification_date, data_sources }` |
| `citation` | object | Pre-formatted strings: `{ display_name, in_text, attribution }` |

**`rating` object (LocalPro Rating):**

| Field | Type | Description |
|-------|------|-------------|
| `tier` | string | `established` / `well-reviewed` / `reviewed` / `unrated`: standing relative to other providers in the same category |
| `label` | string | Display label for the tier |
| `star` | number | 1.0–5.0, present only when backed by first-party customer reviews |
| `review_count` | number | Count of published first-party reviews, present alongside `star` |

Results are ranked by listing tier, then by LocalPro Rating.

### Nullable Fields

Fields marked nullable return `null` when data is unavailable — they are **never omitted** from the response. Arrays return `[]` when empty, never `null`.

## Access Tiers

### Public (no authentication)

All search and list tools work without an API key:
- `list_niches`, `list_cities`, `list_service_types`, `search_providers`
- `get_provider` returns basic data (name, description, LocalPro Rating, services, pricing summary, listing URL)
- Rate limited to 30 requests/minute per IP

### Premium (API key)

Include an `X-API-Key` header to unlock additional data on `get_provider`:
- Full pricing array (vs. summary string)
- Certifications and credentials
- Rate limited to 30 requests/minute per key

```
X-API-Key: your-api-key
```

Request an API key at [localpro.dev](https://localpro.dev/#get-started) or email will@localpro.dev.

## Discovery

AI agents can self-discover this server via standard well-known endpoints:

- `GET /.well-known/llms.txt` — Plain text description of the server and its tools
- `GET /.well-known/mcp.json` — Structured JSON with tool list, auth info, and operator details

## Data Policy

- **What's returned:** Business name, city, state, LocalPro Rating, services, certifications, pricing ranges, coverage area, LocalPro-written business and review summaries, and a link to the full listing page.
- **What's withheld:** Phone numbers, email addresses, physical addresses, and websites are available only on the listing page (via `listing_url`). This protects provider data while driving traffic to the directory.
- **Provenance:** Listings are built from public business information and, where we can confirm it belongs to the business, the company's own website. Every listing passes a quality check before it is served. Owners can claim and correct their listing; customers can leave first-party reviews on the directory. Permanently closed businesses are filtered automatically.
- **Freshness:** Each response states when its records were last verified (`last_verified_at`). Listings are re-verified as needed, not on a fixed cycle.

## Rate Limits

| Access | Limit |
|--------|-------|
| Public (no key) | 30 requests/minute per IP |
| Premium (API key) | 30 requests/minute per key |

Higher limits available for partners — contact will@localpro.dev.

## Data Quality

Every provider returned by the API has been verified and meets a minimum completeness threshold:

- **LocalPro Rating** — present on 100% of results
- **Business description** — present on 100% of results
- **Services list** — present on 100% of results
- **Name, city, state** — present on 100% of results

Per-category provider and state counts are in [Live Now](#live-now), generated from the live database.

**Additional fields** (pricing, certifications, coverage area, years in business, business and review summaries) are available on most providers but not guaranteed. Fields without data return explicit `null` — never omitted, never empty strings.

Two additional categories are being prepared for launch.

## Self-Hosting

LocalPro runs as a Cloudflare Worker with a D1 database binding. To deploy your own instance:

```bash
npm install
npx wrangler secret put API_KEY    # Set your production API key
npx wrangler deploy
```

Requires a Cloudflare account with a D1 database named `laced-directory`.

## Operator

LocalPro is built and operated by [Laced Labs LLC](https://localpro.dev).

## License

MIT
