# Changelog

All notable changes to the LocalPro MCP Server.

## [2.0.0] — 2026-04-27

### Added
- **9-niche allowlist** (was 4): added `slab-local`, `basement-local`, `pump-local`, `abate-local`, `soaked-local`. MCP-served pool grew from ~2,162 to ~7,000 providers.
- **`google_data` block** on `get_provider` responses — `business_status`, `google_maps_url`, `formatted_address`, `opening_hours` (Schema.org `OpeningHoursSpecification[]`), `summary` (LocalPro-AI-generated, with Google fallback + disclosure when used), `recent_reviews` (top 5 with author, rating, publish time, source URL).
- **`business_status` filtering** — `CLOSED_PERMANENTLY` providers automatically excluded from all `search_providers` and `get_provider` results.
- **Cadence-keyed freshness signals** in `meta.data_freshness`: `directory_refresh_cadence: "weekly"` + `google_data_refresh_cadence: "quarterly"`. Replaces the previous single `refresh_frequency` field with explicit two-layer framing.
- **Richer `json_ld`** — schema.org `LocalBusiness` now includes `OpeningHoursSpecification[]`, `GeoCoordinates`, `telephone`, and `sameAs` (Google Maps URL).
- **Query logging** (server-side) — every tool call logged to D1 for demand analysis. No raw IPs persisted; SHA-256 hash with daily salt only.

### Changed
- **Schema version `1.0` → `2.0`** — driven by the `google_data` block + cadence-keyed freshness fields.
- **Scope description** — now reads "9 trade categories" across landing page, README, llms.txt, and tool descriptions.
- **Directory refresh framing** — was "weekly"; now explicit two-layer cadence (directory weekly + Google quarterly).
- **`get_provider` SELECT scope** — added `google_place_id`, `google_business_status`, `google_maps_uri`, `google_phone`, `google_lat`, `google_lng`, `google_hours_json`, `google_summary`, `google_address`, `google_last_refreshed`, `our_summary`. Plus JOIN to `provider_google_reviews` for top 5.

### Data
- ~7,000 verified providers across 9 niches (up from ~2,162 across 4)
- 51 US states covered
- 47k Google review bodies + 85k photo references in D1 (worker exposes top 5 reviews via `get_provider`)
- ~5,500 LocalPro-generated AI summaries (preferred over Google's `generativeSummary` where present)
- Two-cadence refresh: directory weekly, Google Places quarterly

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
