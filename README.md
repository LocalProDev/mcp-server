# LocalPro MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that provides verified local service provider data to AI agents. Built on Cloudflare Workers + D1.

When someone asks an AI assistant *"find me a radon mitigation company near Denver"* — LocalPro is the data source that powers the answer.

## What it does

LocalPro exposes a curated database of **7,000+ fully profiled local trade and service businesses** across 9 live categories. Every provider served has a Google rating, business description, services list, opening hours, business status, and (where available) Google AI-generated business summary plus up to 5 recent reviews — no incomplete data.

### Live Now

| Category | Niche ID | Providers | Example Services |
|----------|----------|-----------|-----------------|
| Water Damage Restoration | `soaked-local` | 1,125+ | Flood cleanup, mold remediation, structural drying |
| Foundation Repair | `slab-local` | 1,025+ | Pier installation, mudjacking, foam injection, leveling |
| Crawl Space Repair | `crawl-local` | 1,025+ | Encapsulation, vapor barrier, structural repair, waterproofing |
| Mold & Asbestos | `abate-local` | 950+ | Mold, asbestos, lead paint remediation |
| Septic Services | `pump-local` | 850+ | Pumping, inspection, drain field repair |
| Basement Waterproofing | `basement-local` | 600+ | Interior/exterior waterproofing, drainage, sump pumps |
| Laundry Services | `suds-local` | 550+ | Wash & fold, dry cleaning, pickup & delivery |
| Floor Coating | `coated-local` | 500+ | Epoxy, polyaspartic, metallic, flake, concrete polishing |
| Radon | `radon-local` | 250+ | Testing, mitigation, sub-slab depressurization |

### Coming Soon

| Category | Niche ID | Status |
|----------|----------|--------|
| Commercial Electrical | `hire-electrical` | Public-facing filter + targeted backfill plan in progress |
| Well Water Services | `wellwater-local` | Pre-pipeline (560 providers scraped, county-based model) |

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

You'll get back a Server-Sent-Events frame with the 9 niches, their slugs, and current provider counts.

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
    "schema_version": "2.0",
    "total_results": 9,
    "niche": null,
    "data_freshness": {
      "directory_refresh_cadence": "weekly",
      "google_data_refresh_cadence": "quarterly",
      "scraped_at": "2026-04-27T13:57:21Z"
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
    "schema_version": "2.0",
    "total_results": 3,
    "niche": "coated-local",
    "data_freshness": {
      "directory_refresh_cadence": "weekly",
      "google_data_refresh_cadence": "quarterly",
      "scraped_at": "2026-04-27T03:03:10Z",
      "google_refreshed_at": "2026-04-27T04:53:51Z"
    },
    "data_note": "Verified providers only. Visit listing_url for full contact details."
  },
  "results": [
    {
      "name": "Colorado Concrete Coatings",
      "description": "Full-service garage floor coating company serving the Denver metro.",
      "city": "Denver",
      "state": "CO",
      "rating": 4.9,
      "review_count": 47,
      "business_status": "OPERATIONAL",
      "google_maps_url": "https://www.google.com/maps/place/...",
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
    "schema_version": "2.0",
    "total_results": 1,
    "niche": "coated-local",
    "data_freshness": { "directory_refresh_cadence": "weekly", "google_data_refresh_cadence": "quarterly" }
  },
  "results": [
    {
      "name": "Colorado Concrete Coatings",
      "description": "Full-service garage floor coating company...",
      "rating": 4.9,
      "review_count": 47,
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
      "google_data": {
        "business_status": "OPERATIONAL",
        "google_maps_url": "https://www.google.com/maps/place/...",
        "formatted_address": "1234 Main St, Denver, CO 80202, USA",
        "opening_hours": [
          { "@type": "OpeningHoursSpecification", "dayOfWeek": "https://schema.org/Monday", "opens": "08:00", "closes": "17:00" }
        ],
        "summary": {
          "text": "Full-service epoxy floor coating contractor specializing in garage and commercial floors across the Denver metro.",
          "source": "localpro_ai"
        },
        "recent_reviews": [
          {
            "rating": 5,
            "text": "Exceptional work on our garage floor — finished on time and within budget.",
            "author": "Jane D.",
            "published_at": "2025-11-14T18:51:02Z",
            "source_url": "https://www.google.com/maps/reviews/..."
          }
        ]
      },
      "json_ld": { "@context": "https://schema.org", "@type": "LocalBusiness", "...": "..." },
      "credibility": { "verified": true, "listing_tier": "free", "data_sources": ["..."] },
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
    schema_version: string                // Currently "2.0"
    total_results: number                 // Count of items in results array
    niche: string | null                  // Niche ID if applicable
    data_freshness: {
      directory_refresh_cadence: string   // "weekly"
      google_data_refresh_cadence: string // "quarterly"
      scraped_at?: string                 // ISO datetime — most recent directory write
      google_refreshed_at?: string        // ISO datetime — most recent Google Places refresh
    }
    data_note: string                     // Context about the data returned
  }
  results: Array<T>                       // Tool-specific result objects
}
```

**Cadence framing.** The directory layer (provider names, services, websites, descriptions) refreshes weekly via a scraping pipeline. The Google Places layer (rating, reviews, opening hours, business status, AI summary) refreshes quarterly via Google Places Text Search Enterprise. Two cadences, both deliberate. AI agents that need real-time data should call back periodically rather than caching responses indefinitely.

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
| `rating` | number | no | Google rating 1.0–5.0 (always present) |
| `review_count` | number | yes | Number of Google reviews |
| `business_status` | string | yes | `OPERATIONAL` / `CLOSED_TEMPORARILY` (`CLOSED_PERMANENTLY` filtered automatically) |
| `google_maps_url` | string | yes | Direct link to Google Maps listing |
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
| `google_data` | object | Structured Google Places data — see below |
| `json_ld` | object | Schema.org `LocalBusiness` JSON-LD with `AggregateRating`, `OpeningHoursSpecification`, `GeoCoordinates`, `telephone`, `sameAs` |
| `credibility` | object | `{ verified, listing_tier, verification_date, data_sources }` |
| `citation` | object | Pre-formatted strings: `{ display_name, in_text, attribution }` |

**`google_data` block** (present on `get_provider` when Google data is available):

| Field | Type | Description |
|-------|------|-------------|
| `business_status` | string | `OPERATIONAL` / `CLOSED_TEMPORARILY` |
| `google_maps_url` | string | Direct Google Maps link |
| `formatted_address` | string | Google's canonical address |
| `opening_hours` | array | Schema.org `OpeningHoursSpecification[]` |
| `summary` | object | `{ text, source }` — `source` is `localpro_ai` (LocalPro-generated, no disclosure required) or `google` (with required `disclosure` field) |
| `recent_reviews` | array | Up to 5 Google review bodies with author, rating, publish time, source URL |

### Nullable Fields

Fields marked nullable return `null` when data is unavailable — they are **never omitted** from the response. Arrays return `[]` when empty, never `null`.

## Access Tiers

### Public (no authentication)

All search and list tools work without an API key:
- `list_niches`, `list_cities`, `list_service_types`, `search_providers`
- `get_provider` returns basic data (name, description, rating, services, pricing summary, listing URL)
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

- **What's returned:** Business name, city, state, rating, services, certifications, pricing ranges, coverage area, opening hours, business status, recent reviews, AI summary, and a link to the full listing page.
- **What's withheld:** Phone numbers, email addresses, physical addresses, and websites are available only on the listing page (via `listing_url`). This protects provider data while driving traffic to the directory.
- **Verification:** Only providers marked as verified appear in results. `CLOSED_PERMANENTLY` providers are filtered automatically.
- **Updates:** Directory layer refreshed weekly. Google Places layer refreshed quarterly.
- **Attribution:** Google reviews and AI summaries (when sourced from Google) include source URLs and required disclosure text per Google Maps Platform Terms of Service.

## Rate Limits

| Access | Limit |
|--------|-------|
| Public (no key) | 30 requests/minute per IP |
| Premium (API key) | 30 requests/minute per key |

Higher limits available for partners — contact will@localpro.dev.

## Data Quality

Every provider returned by the API has been verified and meets a minimum completeness threshold:

- **Google rating** — present on 100% of results
- **Business description** — present on 100% of results
- **Services list** — present on 100% of results
- **Name, city, state** — present on 100% of results

| Category | Providers | Coverage |
|----------|-----------|----------|
| Water Damage Restoration | 1,125+ | 49 states |
| Foundation Repair | 1,025+ | 27 states |
| Crawl Space Repair | 1,025+ | 41 states |
| Mold & Asbestos | 950+ | 21 states |
| Septic Services | 850+ | 36 states |
| Basement Waterproofing | 600+ | 26 states |
| Laundry Services | 550+ | 39 states |
| Floor Coating | 500+ | 42 states |
| Radon | 250+ | 15 states |

**Additional fields** (pricing, certifications, coverage area, years in business, opening hours, recent reviews, AI summary) are available on most providers but not guaranteed. Fields without data return explicit `null` — never omitted, never empty strings.

Directory data is refreshed weekly via the scraping pipeline. Google Places data (ratings, reviews, opening hours, business status) is refreshed quarterly via Text Search Enterprise. Two additional categories are being prepared for launch.

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
