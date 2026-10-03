# Engagement Journal - Fictional Partner API

Durable timeline for one authorized integration engagement. Every entry
carries a date and an evidence grade: `[OBS]` observed live, `[REP]` reported
secondhand, `[INF]` inferred and untested.

Scope statement (2026-09-10, [REP]): integration with the partner service,
authorized by a written engagement. In scope: job creation, job status, and
item listing. Out of scope: billing and account management. Human gate: a
human approves any action that mutates partner records; reads do not require
approval.

## 2026-09-10 - Start

- Wrote the scope statement above. The partner's developer notes claim an
  `X-Api-Key` header and a three-job concurrency cap per project [REP]; marked
  as hypotheses, not facts.
- Decision: capture before building. No client code until the handshake is
  observed.

## 2026-09-11 - Handshake captured

- Sent a minimal create request with a bearer credential; the service
  accepted `Authorization: Bearer $TOKEN` and answered `202 Accepted` [OBS].
  The header shape named in the developer notes is still untested; the plan
  changed: probe it before calling the notes stale.
- Tested the stale note; the capture wins. The notes' header shape was
  refused with `HTTP 401`, `auth.missing` [OBS]; bearer is the working
  credential shape.
- The response carried a `job_id` but no status link, so the plan changed:
  poll a constructed path, `GET /v1/jobs/{job_id}` [INF], to be verified
  next.

## 2026-09-12 - Job states and pagination

- Polled the constructed status path; it works. Observed states: `queued`,
  `running`, `succeeded`, `failed` (a job whose item did not exist), and
  `cancelled` (a queued job canceled before it started) [OBS].
- Canceled that job a second time: `HTTP 409`, `job.state_conflict` [OBS].
  The conflict row in the error census is observed, not assumed.
- Discovered cursor pagination on `GET /v1/items`: the response carries an
  opaque `next_cursor`, and omitting the cursor returns the first page [OBS].
  A cursor echoed exactly was accepted; a trimmed copy was rejected [OBS], so
  the plan changed: echo cursors byte for byte.

## 2026-09-13 - In-band failures

- Requested a job id that does not exist and received `HTTP 200` with a body
  of `{"ok":false,...}` [OBS]. Success is a payload property, not a transport
  property; the plan changed: every reaction gates on the payload, and the
  error census in the protocol map was started.

## 2026-09-14 - Error probes

- Malformed payload: `HTTP 200`, `ok:false`, code `validation.failed`, with a
  field list [OBS].
- Stale credential: `HTTP 401`, `ok:false`, code `auth.expired` [OBS]. One
  refresh is allowed; a second consecutive failure stops the run.

## 2026-09-15 - Rate window probe

- Sent 120 item-list requests within 60 seconds: all served, no throttle
  [OBS].
- Sent 130 within the same window: the tail received `HTTP 429`, `ok:false`,
  code `rate.limited`, with `Retry-After: 30` [OBS]. Working model: about 120
  requests per 60 seconds per credential; honor `Retry-After` on 429.

## 2026-09-16 - Cursor lifetime probe

- A cursor minted at the start of the session was accepted 12 minutes later
  and rejected after 18 minutes [OBS]. Recorded as a working bound of about
  15 minutes [INF]; re-verify before relying on it.

## 2026-09-17 - Replay check

- Listing from a clean state twice produced identical pages; listing is
  idempotent [OBS].
- Replaying creation produced a second job: there is no idempotency key
  [OBS]. Plan changed: keep a local dedupe registry keyed by request content.

## 2026-09-18 - Gate passed

- The model predicted the next observation in all replay checks; the model
  gate is met. Moving to the execution harness with the guards recorded in the
  lessons file.
