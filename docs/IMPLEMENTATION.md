# Implementation notes

The application is a Docker-hosted Next.js service. It deliberately uses PostgreSQL/PostGIS rather than a browser database or the Sites hosting database. Guest submissions have no authentication dependency. Better Auth protects only the administration routes.

## Publication boundary

`POST /api/reports` (also `/api/locations`) validates a bounded JSON request, signed guest session, origin, content and coordinates. It locks the guest/idempotency pair in PostgreSQL. A completed request can be retried without spending another Turnstile token. Changed content under the same key is a conflict. Atomic Valkey limits, Siteverify, and a content fingerprint lock protect first-time requests. The transaction inserts the location if needed, a `published` report, and the idempotency record together.

Public map, search, stats, details and media endpoints all filter reports by `status='published'`. Responses are `no-store`. React Query refreshes on navigation/focus, after successful submission, and every ten seconds on open map/detail screens. An already open map learns about another visitor's submission or moderation within ten seconds; subsequent public API queries see the committed change immediately. This is polling, not a WebSocket guarantee.

Reports have their own publication status. A location is a geographic grouping, never a moderation unit. Hiding/deleting one witness's account leaves others untouched. Soft deletion, restoration and an audit entry run in one transaction. Purging is explicit, after the configured retention interval. Audit IDs remain valid references even after content is purged.

## Privacy

Sensitive is on by default. Coordinates are rounded to a 0.01-degree grid **before insertion**. Precise residential coordinates are therefore not available through distance searches, another endpoint, the database or map source. This is approximate disclosure protection, not differential privacy. Users must not include someone else's address in free text. Concrete email and 13-digit identifier detection prevents some common disclosures but cannot recognize every personal detail in prose. Privacy flags alone never hide a report; the narrowly scoped automatic rule checks for a concrete 13-digit identifier in the original content.

## Media

A report publishes before evidence upload. Upload authorization requires the signed guest session that created the report, within an hour. Files go to private quarantine under random keys. The public API has no route to arbitrary storage keys and checks both the attachment processing state and its parent report status on every request.

Images are signature checked, pixel limited, resized, re-encoded to WebP and stripped of metadata. Audio/video require a successful ClamAV INSTREAM scan; unavailable scanning leaves them private in the queue. Non-image containers are not transcoded and may still contain embedded metadata; do not attach sensitive recordings. S3/R2 buckets must remain private. No signed public URL can outlive a moderation decision because delivery goes through the status-checked application proxy. Large video streaming/range optimization is a future extension; current uploads are capped at 20 MB.

## Infrastructure assumptions

Next.js Request does not reliably expose the socket peer address across deployments. Forwarded IPs are ignored unless `TRUST_PROXY=true` and `TRUSTED_IP_HEADER` is configured. Without trust, requests use a common network bucket plus individual signed guest buckets. With Cloudflare Tunnel, bind the origin to loopback and configure the trusted header only when no alternate path reaches it. This is necessary to avoid attacker-controlled forwarding headers.

Valkey failure, absent Turnstile keys and verification timeouts fail closed. Production refuses Cloudflare test secrets. Development uses official test keys, still calls Siteverify, and skips the supplementary local replay key for that known test secret because Cloudflare's dummy token is reusable. There is no production captcha bypass or testing endpoint.

## Coverage and limits

Integration tests call the actual Route Handlers against isolated PostgreSQL/PostGIS and Valkey databases; only Cloudflare's HTTP response is mocked. Browser tests use official test credentials and a deterministic widget fixture; production assets remain unchanged. The README records the commands actually run and any verification limits.

The English toggle currently translates primary navigation, hero, map controls and category labels. Long-form copy, forms, abuse messages and administration remain Thai. It is a partial secondary-language experience, not full bilingual editorial coverage. Place search currently searches the community archive; selecting arbitrary world locations uses map clicks, numeric coordinates or GPS. An external address geocoder is not integrated.
