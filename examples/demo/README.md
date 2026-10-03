# Demo: the five-phase loop against a mock API

This directory holds the 60-second demo referenced by the repository README.

    Perceive -> Model -> Execute -> Verify -> Evolve

`run.mjs` starts a local mock HTTP API on 127.0.0.1 with an ephemeral port,
then plays the loop against it and prints a graded evidence log. It is one
file, zero dependencies, and needs only Node 18 or newer (for the built-in
fetch).

## Run it

    node examples/demo/run.mjs

The run takes about a second, ends on its own, and exits 0 when every check
holds.

## What the mock hides

Four deterministic quirks, the kind that break a naive client:

1. In-band failure: one route answers HTTP 200 with `{ "ok": false, ... }`
   in the body, so a status-only client records a success that never was.
2. Cursor pagination: a list route returns `{ items, next_cursor }`; the
   cursor is opaque and must be echoed until it comes back as null.
3. Chunked streaming: a route sends line-framed `data: { ... }` events that
   must be read incrementally, frame by frame.
4. Idempotent writes: a write route dedupes on an `idempotency-key` header;
   the same write twice must leave exactly one side effect.

## What you should see

- `== PERCEIVE ==` raw observations of each route, before any claims.
- `== MODEL ==` the contract derived from those observations.
- `== EXECUTE ==` paging to the end, draining the stream, replaying a write.
- `== VERIFY ==` ten graded checks: `[OBS]` for observed facts, `[INF]` for
  model predictions under test. Every line prints PASS.
- `== EVOLVE ==` a fresh memory directory under the OS temp directory with
  `lessons.md`, `state.json`, and `run-log.md`.

The final line is `DEMO PASSED (10 checks)` with exit code 0, or
`DEMO FAILED (x of n checks failed)` with exit code 1.

Running it twice in a row is safe; each run writes its own memory directory.
