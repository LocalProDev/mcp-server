/**
 * MCP query logging — fire-and-forget D1 inserts on every tool call.
 *
 * Privacy:
 *   - IP is hashed with a daily salt (so same caller-same-day collapses, but
 *     same caller across days does not). Raw IPs are never persisted.
 *   - API key is reduced to its last 4 chars before storage.
 *   - User-Agent truncated to 80 chars.
 *
 * Use via `ctx.waitUntil(logQuery(...))` so the response isn't blocked on the
 * D1 insert. If logging fails, the original tool response is unaffected.
 *
 * Self-hosting note: writes to an `mcp_query_log` table. If that table does not
 * exist, the insert fails silently (logging is best-effort) and tool responses
 * are unaffected — so the server runs fine without it.
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface QueryLogEntry {
  toolName: string;
  nicheId?: string | null;
  citySlug?: string | null;
  serviceType?: string | null;
  providerSlug?: string | null;
  resultCount?: number | null;
  errorCode?: string | null;
  startTimeMs: number;
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  apiKey: string | null;
}

/** Threaded into each tool register function so handlers can call logQuery
 *  via executionCtx.waitUntil without blocking the tool's response. */
export interface ToolDeps {
  db: D1Database;
  authenticated: boolean;
  requestCtx: RequestContext;
  executionCtx: ExecutionContext;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomId(): string {
  // 16 hex chars — collision-safe at our query volume, no UUID dependency
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function extractRequestContext(request: Request): RequestContext {
  return {
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
    apiKey: request.headers.get('X-API-Key'),
  };
}

export async function logQuery(
  db: D1Database,
  entry: QueryLogEntry,
  ctx: RequestContext,
): Promise<void> {
  try {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const ipHash = ctx.ip ? (await sha256Hex(ctx.ip + ':' + day)).slice(0, 32) : null;
    const apiKeyId = ctx.apiKey ? ctx.apiKey.slice(-4) : null;
    const uaShort = ctx.userAgent ? ctx.userAgent.slice(0, 80) : null;
    const durationMs = Math.max(0, Date.now() - entry.startTimeMs);

    await db
      .prepare(
        `INSERT INTO mcp_query_log
         (id, tool_name, niche_id, city_slug, service_type, provider_slug,
          result_count, error_code, api_key_id, ip_hash, user_agent_short, duration_ms)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        randomId(),
        entry.toolName,
        entry.nicheId ?? null,
        entry.citySlug ?? null,
        entry.serviceType ?? null,
        entry.providerSlug ?? null,
        entry.resultCount ?? null,
        entry.errorCode ?? null,
        apiKeyId,
        ipHash,
        uaShort,
        durationMs,
      )
      .run();
  } catch {
    // Logging is best-effort. Never let a logging failure surface to the caller.
  }
}
