# Lessons - Fictional Partner API

Consult these before a run; append after one. Each lesson is deduplicated by
symptom and cites the evidence entry that verified the fix.

## L-001 - Transport success with a failure payload

- symptom: `HTTP 200` arrived while the body carried `{"ok":false,...}`
- root cause: the transport status describes delivery only; the domain result
  lives in the payload
- fix: gate every reaction on the payload result, never on the status alone
- verified-by: EV-007, EV-008
- first-seen: 2026-09-13
- last-seen: 2026-09-14
- count: 2

## L-002 - Duplicate job on replay

- symptom: replaying an identical create request produced two jobs
- root cause: the service has no idempotency key; every accepted create is a
  new job
- fix: keep a local dedupe registry keyed by request content and check it
  before creating
- verified-by: EV-012
- first-seen: 2026-09-17
- last-seen: 2026-09-17
- count: 1

## L-003 - Cursor rejected after an inexact echo

- symptom: a cursor copied from a logged line returned `validation.failed`
- root cause: the cursor was trimmed during copy; it must be echoed byte for
  byte
- fix: store and send the raw cursor value without trimming or re-encoding
- verified-by: EV-006
- first-seen: 2026-09-12
- last-seen: 2026-09-12
- count: 1

## L-004 - Stale developer notes on authentication

- symptom: the header named in the notes was rejected with `auth.missing`
- root cause: the notes lagged the live contract; the capture is the truth
- fix: record the observed header in state.md during every engagement and
  re-check it whenever a 401 appears
- verified-by: EV-003
- first-seen: 2026-09-11
- last-seen: 2026-09-11
- count: 1
