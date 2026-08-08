# Changelog

All notable changes to the LocalPro MCP Server.

## Maintenance: 2026-08-08

- **Liveness verified.** `list_niches` on `https://mcp.localpro.dev/mcp` returns the schema-2.0 manifest; server healthy, no behavior change. **9,180 fully-profiled providers served across 10 niches** (up from 9,167 at the last check).
- **One README floor corrected for accuracy:** `crawl-local` 1,025+ → 1,000+ (live count 1,020 had slipped under the stated floor). All other per-niche floors verified against live `list_niches` and hold.

## Maintenance: 2026-07-05

- **Liveness verified.** `list_niches` on `https://mcp.localpro.dev/mcp` returns the schema-2.0 manifest; server healthy, no behavior change. `scraped_at` fresh (2026-07-05).
- **README counts reconciled to live `list_niches` (9,167 served across 10 niches).** Two niches had grown well past their floors — `soaked-local` 950+ → 1,900+, `hire-electrical` 850+ → 1,200+ — and the headline floor was lifted 7,000+ → 9,000+ (still a durable floor under the live 9,167). Two floors were *overstated* and corrected down for accuracy: `radon-local` 300+ → 250+ (live 272), `pump-local` 875+ → 850+ (live 864).

### Changed
- **`get_provider` now returns an owned `google_data.review_summary` (`{ text, source: "localpro_ai" }`) in place of raw `google_data.recent_reviews`.** It is an abstractive "what customers say" summary synthesized from Google reviews — no raw review text and no third-party author PII. Part of the data-independence wean off cached Google data; the raw review bodies have been retired from the serving database.
- Discovery surfaces (`/.well-known/llms.txt`, `/.well-known/llms-full.txt`, `/.well-known/mcp.json`) and the README updated to describe `review_summary` instead of `recent_reviews`.

### Removed
- `google_data.recent_reviews` from `get_provider` responses.

## [2.0.2] — 2026-06-17

- **Published source synced to the deployed worker.** The repo's `src/` had drifted to an older schema-1.0, 4-niche implementation (and imported an `agents/mcp` dependency that was not in `package.json`). It now mirrors the production worker behind `mcp.localpro.dev`: schema 2.0, the 10-niche allowlist, the `google_data` block on `get_provider`, JSON-LD `LocalBusiness`, credibility + citation blocks, cadence-keyed freshness, and best-effort query logging. No live behavior change — production was already on 2.0 / 10 niches; this aligns the public source with what actually serves.
- **Discovery metadata corrected.** `/.well-known/llms.txt`, `/.well-known/mcp.json`, `/.well-known/llms-full.txt`, and the tool descriptions now describe the live 10 categories (commercial electrical is served, not excluded) instead of the stale "9 categories." ~7,600 fully-profiled providers served per live `list_niches`.
- **Provider count framing** set to a durable `7,000+` floor (was `7,800+`) and "Google rating" reworded to "customer rating" across README + server.json.
- **Registry `description` shortened to satisfy the registry's 100-character limit** (an em-dash was also removed). The over-length description was the cause of the stalled v2.0.x registry publish — the registry's latest accepted version had been stuck at v1.0.0. v2.0.2 now passes `mcp-publisher validate` and is ready to republish.

## [2.0.1] — 2026-06-12

### Added
- **`hire-electrical` (Commercial & Industrial Electricians) added to the allowlist — 10 niches now (was 9).** The category was rebuilt via the Google Places pipeline (35,948 raw rows pruned to ~3,000 live commercial/industrial outfits); ~858 now pass the completeness filter and serve over MCP. Resolves the prior "Coming Soon — targeted backfill in progress" status.

### Changed
- **Served pool ~7,000 → ~7,800 providers across 10 niches.** README per-niche floors recounted from live `list_niches`; server.json description updated.
- **Coming Soon** now lists `chimney-local` (live provider data; description + service enrichment in progress) in place of `hire-electrical`.

## Maintenance: 2026-06-03

- **Liveness verified.** `list_niches` on `https://mcp.localpro.dev/mcp` returns the schema-2.0 manifest with current per-niche counts. Server healthy, no behavior change.
- **Counts current.** 9 served niches, ~7,000 fully-profiled providers (every served provider carries a Google rating, description, and services list). The backing D1 holds 25,496 approved providers across the 10 categories; the served pool is the completeness-passing subset. README per-niche floors reconciled to live `list_niches` output (`suds-local` corrected from 575+ to 550+).
- **Dependencies** aligned to the deployed monorepo (`@modelcontextprotocol/sdk`).

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
