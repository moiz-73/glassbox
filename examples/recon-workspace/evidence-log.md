# Evidence Log - Fictional Partner API

Commands use `$BASE` for the fictional host, `$TOKEN` for a credential
placeholder, `$CURSOR` for a pagination cursor, and `$JOB_ID` for a job
identifier. No real values appear here. Each entry records the generic command
shape, the observed result, the evidence grade, and the date.

## EV-001 - 2026-09-10 - Baseline request without a credential

    curl -sS -i -X POST "$BASE/v1/jobs" -H "Content-Type: application/json" -d '{"job_type":"sync"}'

Observed: `HTTP 401` with `{"ok":false,"error":{"code":"auth.missing"}}`.
Grade: [OBS]. Confirms the endpoint exists and that failures arrive in-band.

## EV-002 - 2026-09-11 - Handshake with a bearer credential

    curl -sS -i -X POST "$BASE/v1/jobs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"job_type":"sync","items":["item-0001"]}'

Observed: `HTTP 202`, `{"ok":true,"job_id":"job-a1b2c3","state":"queued"}`.
Grade: [OBS]. Bearer is the accepted credential shape; the header the
developer notes name is probed in EV-003.

## EV-003 - 2026-09-11 - Header shape from the stale developer notes

    curl -sS -i -X POST "$BASE/v1/jobs" -H "X-Api-Key: $TOKEN" -H "Content-Type: application/json" -d '{"job_type":"sync"}'

Observed: `HTTP 401` with `{"ok":false,"error":{"code":"auth.missing"}}`.
Grade: [OBS]. The header named in the developer notes is refused; the notes
are stale and the capture wins.

## EV-004 - 2026-09-12 - Job status polling

    curl -sS "$BASE/v1/jobs/job-a1b2c3" -H "Authorization: Bearer $TOKEN"

Observed: state moved `queued` -> `running` -> `succeeded` over about 6 s;
every body carried `ok:true` with the job id. Grade: [OBS].

## EV-005 - 2026-09-12 - Terminal states and state conflict

    curl -sS -X POST "$BASE/v1/jobs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"job_type":"sync","items":["item-9999"]}'
    curl -sS "$BASE/v1/jobs/$JOB_ID" -H "Authorization: Bearer $TOKEN"

    curl -sS -X POST "$BASE/v1/jobs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"job_type":"sync","items":["item-0002"]}'
    curl -sS -i -X POST "$BASE/v1/jobs/$JOB_ID/cancel" -H "Authorization: Bearer $TOKEN"
    curl -sS -i -X POST "$BASE/v1/jobs/$JOB_ID/cancel" -H "Authorization: Bearer $TOKEN"

Observed: the job with the unknown item ended `failed`; the second job ended
`cancelled` after one cancel; the repeated cancel returned `HTTP 409` with
`{"ok":false,"error":{"code":"job.state_conflict"}}`. Grade: [OBS].

## EV-006 - 2026-09-12 - Cursor echo check

    curl -sS "$BASE/v1/items?limit=50" -H "Authorization: Bearer $TOKEN"
    curl -sS "$BASE/v1/items?limit=50&cursor=$CURSOR" -H "Authorization: Bearer $TOKEN"

Observed: the no-cursor call returned the first page; the second page returned
different item ids; paging to the last page returned an empty `next_cursor`; a
trimmed copy of a cursor returned `validation.failed`. Grade: [OBS].

## EV-007 - 2026-09-13 - Unknown job id

    curl -sS -i "$BASE/v1/jobs/job-9999" -H "Authorization: Bearer $TOKEN"

Observed: `HTTP 200` with `{"ok":false,"error":{"code":"job.unknown"}}`.
Grade: [OBS]. This is the observation that changed success gating.

## EV-008 - 2026-09-14 - Malformed payload probe

    curl -sS -i -X POST "$BASE/v1/jobs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"job_type":123}'

Observed: `HTTP 200` with `ok:false`, code `validation.failed`, and a field
list naming the rejected value. Grade: [OBS].

## EV-009 - 2026-09-14 - Stale credential probe

    curl -sS -i "$BASE/v1/jobs/job-a1b2c3" -H "Authorization: Bearer $TOKEN"

Observed with an expired placeholder credential: `HTTP 401` with `ok:false`,
code `auth.expired`. Grade: [OBS].

## EV-010 - 2026-09-15 - Rate window probe

    for i in $(seq 1 130); do
      curl -sS -o /dev/null -w "%{http_code}\n" "$BASE/v1/items?limit=1" -H "Authorization: Bearer $TOKEN"
      sleep 0.4
    done

Observed: the first 120 requests were served; the tail returned `HTTP 429`
with `ok:false`, code `rate.limited`, and `Retry-After: 30`. Grade: [OBS].
The exact boundary is approximate; the reaction is the durable part.

## EV-011 - 2026-09-16 - Cursor lifetime probe

    curl -sS "$BASE/v1/items?limit=1&cursor=$CURSOR" -H "Authorization: Bearer $TOKEN"

Observed: a cursor captured at the start of the session was accepted at
12 minutes and rejected at 18 minutes with code `cursor.expired`. Grade:
[OBS]. Single sample, so the bound is recorded as approximate.

## EV-012 - 2026-09-17 - Replay behavior

    curl -sS "$BASE/v1/items?limit=50" -H "Authorization: Bearer $TOKEN"
    curl -sS -X POST "$BASE/v1/jobs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"job_type":"sync","items":["item-0001"]}'

Observed: listing twice produced identical pages; create twice produced a
second job (`job-d4e5f6`) alongside the first. Grade: [OBS]. Listing is safe
to replay; creation is not.
