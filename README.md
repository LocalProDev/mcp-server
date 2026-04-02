# LocalPro MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that provides verified local service provider data to AI agents. Built on Cloudflare Workers + D1.

When someone asks an AI assistant *"find me a radon mitigation company near Denver"* — LocalPro is the data source that powers the answer.

## What it does

LocalPro exposes a curated database of **8,600+ verified local trade and service businesses** across 9 categories:

| Category | Niche ID | Example Services |
|----------|----------|-----------------|
| Floor Coating | `coated-local` | Epoxy, polyaspartic, metallic, concrete polishing |
| Radon | `radon-local` | Testing, mitigation, sub-slab depressurization |
| Foundation Repair | `slab-local` | Pier installation, mudjacking, foam injection, leveling |
| Basement Waterproofing | `basement-local` | Interior/exterior waterproofing, drainage, sump pumps |
| Crawl Space Repair | `crawl-local` | Encapsulation, vapor barrier, structural repair |
| Remediation | `abate-local` | Mold, asbestos, lead paint removal, air quality testing |
| Septic Services | `pump-local` | Pumping, inspection, drain field repair |
| Commercial Electrical | `hire-electrical` | IR thermography, generators, EV chargers |
| Laundry Services | `suds-local` | Wash & fold, dry cleaning, pickup & delivery |

Coverage spans **major US metro areas** across 48 states.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "localpro": {
      "url": "https://mcp.localpro.dev/mcp",
      "headers": {
        "X-API-Key": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "localpro": {
      "url": "https://mcp.localpro.dev/mcp",
      "headers": {
        "X-API-Key": "your-api-key"
      }
    }
  }
}
```

### Raw HTTP

```bash
# Initialize session
curl -X POST https://mcp.localpro.dev/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "example", "version": "1.0" }
    }
  }'
```

## Tools

### `list_niches`

Discover available service directories. Call this first.

**Parameters:** none

**Example response:**

```json
{
  "meta": {
    "schema_version": "1.0",
    "total_results": 9,
    "niche": null,
    "data_note": "Use niche_id values with search_providers, list_cities, and list_service_types."
  },
  "results": [
    {
      "niche_id": "coated-local",
      "name": "Epoxy & Concrete Coating Installers",
      "slug": "epoxy-floor-coating",
      "domain": "coatedlocal.com",
      "provider_count": 713
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
    "schema_version": "1.0",
    "total_results": 3,
    "niche": "coated-local",
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
      "services": [
        { "type": "epoxy", "label": "Epoxy Floor Coating" },
        { "type": "polyaspartic", "label": "Polyaspartic Coating" }
      ],
      "pricing": ["$6-9/sq ft"],
      "certifications": ["Penntek Certified Installer"],
      "coverage_area": "Denver metro, Front Range, 50-mile radius",
      "years_in_business": 8,
      "listing_url": "https://coatedlocal.com/providers/denver-co/colorado-concrete-coatings/"
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
  "meta": { "schema_version": "1.0", "total_results": 1, "niche": "coated-local" },
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
      "listing_url": "https://coatedlocal.com/providers/denver-co/colorado-concrete-coatings/"
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
    schema_version: string   // Currently "1.0"
    total_results: number    // Count of items in results array
    niche: string | null     // Niche ID if applicable
    data_note: string        // Context about the data returned
  }
  results: Array<T>          // Tool-specific result objects
}
```

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
| `name` | string | no | Business name |
| `description` | string | yes | Business description |
| `city` | string | no | City name |
| `state` | string | no | Two-letter state abbreviation |
| `rating` | number | yes | Google rating (1.0–5.0) |
| `review_count` | number | yes | Number of Google reviews |
| `services` | array | no | `[{ type: string, label: string }]` |
| `pricing` | array | no | Pricing info strings (may be empty `[]`) |
| `certifications` | array | no | Certification/credential names (may be empty `[]`) |
| `coverage_area` | string | yes | Geographic coverage description |
| `years_in_business` | number | yes | Years operating |
| `listing_url` | string | no | Full profile URL with contact details |

**`get_provider` adds:**

| Field | Type | Description |
|-------|------|-------------|
| `service_areas` | array | `[{ city, state, radius_miles }]` |
| `service_details` | array | `[{ type, label, pricing_model, price_range, turnaround }]` |

### Nullable Fields

Fields marked nullable return `null` when data is unavailable — they are **never omitted** from the response. Arrays return `[]` when empty, never `null`.

## Authentication

All `/mcp` requests require an `X-API-Key` header. Discovery endpoints (`/.well-known/*`) are public.

```
X-API-Key: your-api-key
```

Missing or invalid keys return `401` or `403` with a structured error body.

## Discovery

AI agents can self-discover this server via standard well-known endpoints:

- `GET /.well-known/llms.txt` — Plain text description of the server and its tools
- `GET /.well-known/mcp.json` — Structured JSON with tool list, auth info, and operator details

## Data Policy

- **What's returned:** Business name, city, state, rating, services, certifications, pricing ranges, coverage area, and a link to the full listing page.
- **What's withheld:** Phone numbers, email addresses, physical addresses, and websites are available only on the listing page (via `listing_url`). This protects provider data while driving traffic to the directory.
- **Verification:** Only providers marked as verified appear in results.
- **Updates:** Data is enriched and refreshed weekly from multiple sources.

## Rate Limits

| Tier | Limit |
|------|-------|
| Standard | 30 requests/minute per API key |

Higher limits available for partners — contact will@laced.dev.

## Data Coverage

LocalPro serves verified provider data across 9 trade categories. Coverage and completeness vary by niche:

| Category | Providers | States | Cities | Phone | Description | Services |
|----------|-----------|--------|--------|-------|-------------|----------|
| Foundation Repair | 1,656 | 27 | 638 | 99% | 69% | 65% |
| Crawl Space Repair | 1,219 | 46 | 521 | 89% | 88% | 88% |
| Septic Services | 1,165 | 46 | 592 | 98% | 88% | 78% |
| Remediation | 1,158 | 21 | 475 | 100% | 88% | 87% |
| Basement Waterproofing | 1,126 | 48 | 583 | 91% | 65% | 66% |
| Floor Coating | 705 | 47 | 485 | 99% | 87% | 87% |
| Laundry Services | 680 | 39 | 2,933 | 99% | 98% | 98% |
| Commercial Electrical | 618 | 15 | 202 | 98% | 67% | 0%* |
| Radon | 331 | 15 | 214 | 99% | 87% | 84% |

*\*Commercial Electrical enrichment is in progress.*

**What this means for agents:**
- **Name, city, state** are 100% complete across all niches — every result has these fields.
- **Phone** is 89–100% — the vast majority of providers have contact info on their listing page.
- **Services and descriptions** vary — some niches are deeply enriched (88%+), others are being backfilled.
- **Ratings** are being backfilled via Google Places. Coverage is growing weekly.
- Fields that don't have data return explicit `null` — never omitted, never empty strings pretending to be values.

Data is refreshed weekly. Coverage percentages improve with each enrichment cycle.

## Self-Hosting

LocalPro runs as a Cloudflare Worker with a D1 database binding. To deploy your own instance:

```bash
npm install
npx wrangler secret put API_KEY    # Set your production API key
npx wrangler deploy
```

Requires a Cloudflare account with a D1 database named `laced-directory`.

## Operator

LocalPro is built and operated by [Laced Labs LLC](https://laced.dev).

## License

MIT
