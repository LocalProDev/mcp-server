# Changelog

All notable changes to the LocalPro MCP Server.

## [1.0.0] — 2026-04-02

### Added
- **5 MCP tools** serving verified local service provider data from Cloudflare D1:
  - `list_niches` — discover 9 trade categories
  - `list_cities` — find available metro areas per niche
  - `list_service_types` — get valid service type filters with human-readable labels
  - `search_providers` — search by niche, city, and service type
  - `get_provider` — detailed provider profile with services, pricing, certifications
- **API key authentication** via `X-API-Key` header (env secret `API_KEY`)
- **Rate limiting** — 30 requests/minute per API key or IP via CF Workers Rate Limit binding
- **Agent discovery endpoints**:
  - `GET /.well-known/llms.txt` — plain text server description
  - `GET /.well-known/mcp.json` — structured JSON discovery document
- **Structured error handling** — all errors return `{ meta: { schema_version }, error: { code, message } }` with `isError: true`
- **Schema version** (`1.0`) in every response `meta` wrapper for forward compatibility
- **Explicit null handling** — nullable fields always return `null`, never omitted
- **Service label normalization** — fuzzy keyword matching maps free-text enriched data (e.g. "epoxy flooring") to canonical labels (e.g. "Epoxy Floor Coating")
- **Partial response pattern** — contact details (phone, email, address) withheld from MCP; `listing_url` drives traffic to directory sites
- **Custom domain** — `mcp.localpro.dev`

### Data
- 8,600+ verified providers across 9 niches
- 48 US states covered
- Provider data sourced from Google Places, Yellow Pages, franchise directories, EPA RRP, web scraping
- Weekly enrichment cycle (rating backfill + new provider discovery + completeness audit)
