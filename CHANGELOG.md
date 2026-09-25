# Changelog

All notable changes to the LocalPro MCP Server.

## [3.0.0] — 2026-09-25

Schema 3.0: every field the server returns is now LocalPro-owned data.

### Changed (breaking)
- **`rating` is now the LocalPro Rating object** `{ tier, label, star?, review_count? }`. `tier` (`established` / `well-reviewed` / `reviewed` / `unrated`) is each provider's standing relative to others in its category. `star` and `review_count` appear only when backed by first-party customer reviews collected on the directories. Search results rank by listing tier, then LocalPro Rating.
- **`summary` and `review_summary` are top-level strings** on `get_provider` (previously nested in a data block with a `source` field). Both are written by LocalPro.
- **`meta.data_freshness` is a single `last_verified_at` date**, the most recent verification among the records returned. Refresh-cycle fields are removed.
- **`credibility.data_sources`** now lists how a listing was verified: `business_website`, `owner_verified`, `customer_reviews`.
- **`json_ld`** includes `AggregateRating` only when backed by first-party reviews.

### Removed
- `review_count` as a top-level provider field (now inside `rating`).
- `business_status`, map links, opening hours, formatted address and geo coordinates. Permanently closed businesses are still filtered out.

### Migrating from 2.x
Read `rating.tier` / `rating.label` where you read the numeric `rating`; read `summary` / `review_summary` at the top level; read `meta.data_freshness.last_verified_at` for freshness.

## Earlier releases

- **2026-08-08 / 2026-07-05 maintenance:** liveness verified; README per-niche counts reconciled to live `list_niches`.
- **2.1.0 (2026-06-20):** `get_provider` gained an owned `review_summary`; raw review text removed from responses.
- **2.0.2 (2026-06-17):** published source synced to the deployed worker; discovery metadata corrected to 10 categories; registry description shortened to pass validation.
- **2.0.1 (2026-06-12):** `hire-electrical` (Commercial & Industrial Electricians) added; 10 categories served.
- **2.0.0 (2026-04-27):** 9-category allowlist; JSON-LD `LocalBusiness`, credibility and citation blocks; permanently closed businesses filtered; privacy-preserving query logging (no raw IPs stored).
- **1.0.0 (2026-04-02):** five tools (`list_niches`, `list_cities`, `list_service_types`, `search_providers`, `get_provider`), optional API key for pro fields, rate limiting, `/.well-known` discovery endpoints, versioned response envelope.
