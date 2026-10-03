# Pattern Library — 60+ named techniques

Every technique below has a name, a one-line purpose, and a home in the pack.
Names matter: a named pattern can be referenced, tested, and improved. When two
people share names, they share understanding.

## Perception (`recon`)

| Pattern | Purpose |
|---|---|
| Truth hierarchy | Rank sources: live behavior > client > docs > memory |
| Surface taxonomy | Enumerate every observable surface before concluding anything |
| Protection classification | Label each surface: none / silent / interactive |
| Zero-think decision table | Pre-compute branch decisions so runs don't re-litigate them |
| Quota-axis mapping | Find which axis (identity, key, project, concurrency) moves the limit |
| Silent limit bisection | Find undocumented caps between known-good and known-failing |
| Utilization audit | Measure existing capacity before acquiring more |
| Resource probe | Measure the machine before any parallel run |
| Lease inventory | Find every resource with a lifetime before depending on it |

## Protocol (`protocol-cartography`)

| Pattern | Purpose |
|---|---|
| Capture-to-contract | Derive the minimal request/response contract from real exchanges |
| Streaming event grammar | Map every event type and phase of a stream, including heartbeats |
| Terminal-delta law | Parse the final authoritative value, never concatenated fragments |
| In-band error census | Build the table of payload-level failures that look like transport success |
| Route-variant mapping | Benchmark each route/dialect for the same capability |
| Dialect bridging | Convert between two API dialects structurally, with fixtures |
| Stream emulation | Serve an honest stream from a non-streaming backend |
| Sanctioned-client validation | Understand and respect what a system requires of callers |
| Multi-turn threading | Persist session/parent ids; never trust implied memory |
| Keep-alive hardening | Heartbeats sized to the slowest intermediary; abort on disconnect |

## Flow & state (`flow-modeling`)

| Pattern | Purpose |
|---|---|
| Flow state machine | States, guards, artifacts, resume points from observed runs |
| Lease lifecycle | TTLs, renewal, re-adoption after restart |
| Retry taxonomy | One reaction per failure class; no blanket backoff |
| Nonce & idempotency discipline | Replay-safe operations proven by double-run tests |
| Gates that actually gate | Every cap verified by a sweep that plateaus |
| Capacity governor | Slow growth, multiplicative retreat, measured ceiling |
| Backpressure law | Bounded queues, defined overflow, per-unit in-flight limits |
| Crash-safe run state | Atomic writes + ledger + throw-on-corrupt loaders |
| Artifact lifecycle | Produce → transfer → collect → decrypt → mark consumed, idempotently |
| Deadline clocks | Model every reset window; pause to the reset, not into it |

## Credentials (`credential-hygiene`)

| Pattern | Purpose |
|---|---|
| Session-over-key | Prefer the least-durable exposure that fits the task |
| Cold-start portability test | Prove a session works imported into a fresh context |
| Refresh treadmill | Proactive refresh; one retry on 401, then disable |
| Unit pools | Least-busy selection with EWMA + cooldown classes per failure |
| Consent flow completeness | Exercise allow, deny, and expiry — nonce intact |
| Recovery drill | Prove fallback paths with a freshness discriminator |
| Secret hygiene | Redaction by construction; nothing secret in logs or commits |
| Envelope encryption | AES-GCM payload + RSA-OAEP wrapped key for untrusted transport |

## Evidence (`evidence-protocol`)

| Pattern | Purpose |
|---|---|
| Gate function | Run, read, count, decide, only then claim |
| Claim ladder | Grade every statement: observed / reported / inferred |
| Airtight probe | Terminal success of the whole chain, from a clean baseline |
| Negative verification | Prove absence with before/after + freshness, across repeats |
| Falsification (red-green) | Watch the check fail for the right reason before trusting it |
| Back-to-back benchmarking | Same window, same mix, medians and tails |
| Adversarial self-test suite | Expected-failure cases, rotated over time |
| Stress validation | Envelope documented; health checked after the stress |
| Sampling audit | Advisory read-only checks over a large deliverable |
| Deliverable verification | Bytes, shape, content markers, hashes |
| Failure forensics | Symptom → cause → fix rows; re-check the catalogue first |

## Autonomy & orchestration (`durable-goals`, `swarm-orchestration`, `quality-loops`)

| Pattern | Purpose |
|---|---|
| State outside context | Resume from files, never from memory |
| Atomic writes + ledger | Crash-safe snapshots plus append-only history |
| Watchdog stack | Liveness, staleness, loop, progress, budget guards with remedies |
| Three-currency budgets | Time, actions, spend — each exhaustion = checkpoint, not completion |
| Deterministic resume | Idempotent re-entry; never re-dispatch completed work |
| Blocked-with-evidence | Three distinct attempts, then a precise blocker note |
| Parked check-ins | Async notes at boundaries; no mid-run permission stalls |
| Probe-before-fanout | Measured concurrency cap; queued waves, never floods |
| Worker contract | One scoped task, explicit deliverable, verification step |
| Artifact verification | Inspect every delegated result; status lines are not evidence |
| Shared-resource leases | Least-busy allocation with expiry and liveness |
| Evaluator-optimizer | Produce, grade against a rubric, refine within a budget |
| Checkable rubrics | Every criterion maps to a concrete fix |
| Author/judge separation | Read-only judges; no self-approval |
| Disjoint write scopes | Producer owns source; critic owns tests |
| One change per iteration | Attributable deltas; revert on regression |
| Plateau & best-variant | Stop conditions stated; restore the best, not the last |
| De-sloppify pass | A separate cleanup context removes noise tests and dead defensiveness |
| Tiered pipeline depth | Ceremony proportional to blast radius |
| Breaker + adjudication | Bounded fix loops; findings fixed or parked with a written ruling |
| Graph routing, fail-closed | Explicit verdict tokens; errored nodes activate nothing |

## Evolution (`self-evolving-skills`)

| Pattern | Purpose |
|---|---|
| Memory triad | Lessons + state + run log beside the skill |
| Consult-before/append-after | Read memory at start; write reality at end |
| Lesson schema | Symptom → cause → fix → verified-by, deduped with counts |
| Promotion checklist | A lesson becomes a rule only with repeated evidence |
| Guarded adaptation | Delta caps, never-change lists, evidence thresholds |
| Drift watch | Doc matches reality; contradictions update the doc immediately |
| Supersession | One canonical source; retired docs leave pointers |
| Memory recovery | Redundant stores; rebuild and re-verify after loss |

## Boundaries (`honest-fences`)

| Pattern | Purpose |
|---|---|
| Scope statement | One paragraph that answers a hundred judgment calls |
| Construction-enforced gates | No code path reaches the action without approval |
| Stop-on-defensive-posture | Cool down, probe once, resume slowly |
| Honest walls | Interactive steps routed to humans, named in the workflow |
| Platform-rule risk register | Quoted clauses, blast radius, keep/drop verdicts |
| Personal-space etiquette | Named surface only; user drives logins; no surprises |
| Publication discipline | Scan, abstract, value-test, independent review, verdict |