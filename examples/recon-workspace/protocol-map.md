# Protocol Map - Fictional Partner API

The model derived from the journal's observations. Host: `api.example.com`
(fictional). Placeholders: `$BASE` stands for the host, `$TOKEN` stands for a
credential. All identifiers are invented.

## Contract

### Authentication

    Authorization: Bearer $TOKEN

Missing or stale credentials produce `HTTP 401` with an in-band failure body.
The header named in the developer notes is stale and is refused
[OBS 2026-09-11, EV-003].

### Create a job

    POST $BASE/v1/jobs
    Authorization: Bearer $TOKEN
    Content-Type: application/json

    {"job_type":"sync","items":["item-0001"]}

Accepted:

    HTTP/1.1 202 Accepted

    {"ok":true,"job_id":"job-a1b2c3","state":"queued"}

### Read a job

    GET $BASE/v1/jobs/job-a1b2c3
    Authorization: Bearer $TOKEN

    HTTP/1.1 200 OK

    {"ok":true,"job_id":"job-a1b2c3","state":"running"}

### List items

    GET $BASE/v1/items?limit=50
    Authorization: Bearer $TOKEN

    {"ok":true,"items":[{"item_id":"item-0001","status":"ready"}],"next_cursor":"cur-9f8e7d"}

The cursor is opaque. Echo it exactly as received with `?cursor=$CURSOR`. An
absent cursor means the first page; an empty `next_cursor` means the end.

## Error census

Rows graded `[OBS]` cite the evidence entry that observed them. Rows graded
`[INF]` are drafted reactions for classes not observed yet; probe before a
harness depends on them.

| Symptom | Meaning | Grade | Reaction |
|---|---|---|---|
| `200` + `ok:false` + `validation.failed` | Request shape rejected | [OBS 2026-09-14, EV-008] | Fix the payload; do not retry unchanged |
| `401` + `ok:false` + `auth.missing` or `auth.expired` | Credential absent, stale, or expired | [OBS 2026-09-14, EV-001, EV-003, EV-009] | Refresh once; stop on a second failure |
| `200` + `ok:false` + `job.unknown` | Job id not visible to this credential | [OBS 2026-09-13, EV-007] | Verify the id; do not retry |
| `409` + `ok:false` + `job.state_conflict` | Transition invalid for the current state | [OBS 2026-09-12, EV-005] | Read the state; re-plan the step |
| `429` + `ok:false` + `rate.limited` | Short-window throttle | [OBS 2026-09-15, EV-010] | Honor `Retry-After`; back off |
| `5xx` + `ok:false` + `server.error` | Transient service failure | [INF] | Bounded retry with backoff; then park the lane |

## Limits

| Limit | Value | Window | Axis | Grade | Reaction |
|---|---|---|---|---|---|
| Requests | about 120 | 60 s | credential | [OBS 2026-09-15, EV-010] | Back off on 429; honor `Retry-After` |
| Page size | 100 | per request | request | [INF] | Paginate with the cursor |
| Cursor lifetime | about 15 min | rolling | cursor | [INF 2026-09-16, EV-011] | Restart listing from the first page |
| Concurrent jobs | 3 | until terminal | project | [REP 2026-09-10] | Queue locally; one job per slot |

## Job state machine

    queued --start--> running --success--> succeeded
      |                   |
      |                   +--failure--> failed
      |
      +--cancel--> cancelled

- `POST /v1/jobs` enters `queued`.
- `GET /v1/jobs/{job_id}` reports the current state; poll every 2 s while the
  state is `queued` or `running`.
- `POST /v1/jobs/{job_id}/cancel` moves a queued job to `cancelled`; a second
  cancel on a terminal job returns `409` + `job.state_conflict`
  [OBS 2026-09-12, EV-005].
- Terminal states are `succeeded`, `failed`, and `cancelled`
  [OBS 2026-09-12, EV-004, EV-005]. Stop polling on any of them.
- Resumption: a new session re-reads the state from the status endpoint; no
  local state is needed beyond the job id.
