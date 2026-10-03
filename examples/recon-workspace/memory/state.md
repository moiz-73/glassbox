# State - Fictional Partner API

Verified facts carried between sessions. Volatile facts carry a date and are
re-verified before they influence a decision. Grades: `[OBS]` observed live,
`[REP]` reported secondhand, `[INF]` inferred and untested.

- Authentication uses `Authorization: Bearer $TOKEN`; the header named in the
  developer notes is stale. [OBS 2026-09-11]
- Success is the payload property `ok:true`; a `200` status alone is not a
  success signal. [OBS 2026-09-13]
- Job states are `queued`, `running`, `succeeded`, `failed`, and `cancelled`.
  [OBS 2026-09-12]
- Cursors are opaque; they must be echoed exactly as received, and an absent
  cursor means the first page. [OBS 2026-09-12]
- Cursor lifetime is about 15 minutes; treat the bound as approximate and
  re-verify. [INF 2026-09-16]
- The observed request ceiling is about 120 requests per 60 seconds per
  credential; a `429` carries `Retry-After`. [OBS 2026-09-15]
- At most 3 jobs run concurrently per project; excess jobs are queued
  locally. [REP 2026-09-10, not yet re-verified]
- A duplicate create is possible because the service treats every accepted
  create as new; dedupe locally before sending. [OBS 2026-09-17]
