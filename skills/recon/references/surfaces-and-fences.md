# Surfaces and Fences — field manual

Long-form companion to `recon/SKILL.md`. Read it while running a perception
pass on a system you have not mapped before: it carries the detail behind the
skill's decision table.

Contents:

1. Surface taxonomy
2. Protection classification and the honest-fence policy
3. Quota-surface mapping
4. Resource-tier assessment
5. Utilization audit before acquisition
6. Machine resource probe before fanout
7. Lease and session inventory
8. The zero-think decision table
9. The facts table and the exit gate

---

## 1. Surface taxonomy

A system is rarely one thing. Logic, identity, and friction are distributed
across surfaces, and each surface hides different things. Enumerate all of
them before concluding anything.

| Surface | Where its logic lives | How you observe it | What it hides |
|---|---|---|---|
| Static content | Markup and assets served as-is | A single fetch | Little; this is rarely where decisions happen |
| Client-rendered application | Bundled scripts executed in a runtime | Runtime inspection, rendered state | Request shapes, route names, field names |
| Background request traffic | The API layer beneath the interface | Traffic capture while exercising the interface | The real contract, ordering, identifiers, limits |
| Native or desktop client | A compiled application | Its own logs, its outbound traffic | Its own update and compatibility checks |
| Command-line tool | A packaged interface to the same backend | Verbose or diagnostic modes | Convenience flags that map to API calls |
| Embedded third-party frames | Another origin's assets | Frame-level inspection | Logic invisible to the outer document |

Rules that prevent the classic mistakes:

- "Nothing visible on the first surface" means "inspect the next surface", not
  "there is nothing here". Client-rendered applications hide their logic in
  bundles and cross-origin frames that a plain document read will not show.
- Record the decisive surface for this job, and write down why the others were
  deprioritized. The map is a decision document; an unranked inventory helps
  no one.
- A rendered application exercising a checkout flow, for example, is a poor
  place to read a contract. The contract lives in the background traffic that
  the rendered interface generates.

## 2. Protection classification and the honest-fence policy

Classify each surface before automating anything on it. The probe is harmless:
observe response headers and timing, read the behavior of a single request,
watch what happens on a quiet repeat. Classify into exactly three classes.

| Class | Signals | Policy |
|---|---|---|
| none | No friction observed on the paths in scope | Automate, keeping normal budgets and logging |
| silent | Throttle windows, caps, entitlement checks, quiet rejection or suppression | Automate within stated limits, with pacing and backoff |
| interactive | A step that explicitly requires a human to act | Route to a human as a designed step; never automate it |

Why the classes matter: the silent class is where respectful automation lives,
and the interactive class is where automation ends. Blurring the two is the
single most common way an authorized engagement drifts out of bounds. If you
cannot tell which class a surface is, treat it as interactive until a dated
observation says otherwise.

Additional discipline:

- Record each classification with a date and the probe that produced it.
  Postures tighten over time; re-check before scaling.
- A silent class does not license its whole surface family. Classify per
  surface, per path, at the granularity where behavior actually changes.
- When a system shows defensive posture — global turning-away, suppression,
  or a sudden tightening — stop the campaign, cool down, and probe once at
  low frequency. Waiting is the correct move; pushing is how authorized work
  becomes unauthorized.
- Interactive steps belong in the workflow diagram as a human handoff with an
  explicit approval point, not as an error path. The boundary is part of the
  method.

## 3. Quota-surface mapping

Limits are attached to axes, and the axis is the part people get wrong. Map
the system before optimizing anything.

Procedure:

1. Vary one axis at a time: project, connection pool, address, concurrency.
2. Observe which change moves the measured limit. A limit that does not move
   when you add units is not a per-unit limit.
3. Read limit headers and error bodies. Record the window length and the
   reset epoch rather than guessing them.
4. Probe the counterintuitive pair using resources you already own: a shared
   pool with several units, versus a single unit serving several tasks.
   Shared pools limit the former; per-unit limits cap the latter.
5. Draw the model as a chain: axis, then limit, then window, then reset.

| Observation | Likely model | Implication |
|---|---|---|
| Adding a unit raises the cap | Per-unit limit | More units help, within terms |
| Adding a unit changes nothing | Shared pool or per-account cap | New units are wasted effort |
| Raising concurrency raises errors, not throughput | Pool-bound service | Parallelism must come from distinct units |
| Cap resets on a visible epoch | Windowed quota | Pause to the reset, do not retry through it |

A quota model earns its keep when it predicts which resource to add for more
throughput — and which additions are useless. Use it to plan honestly within
the limits you are entitled to; moving a limit by adding identities or
accounts is out of scope for this pack (`honest-fences`).

## 4. Resource-tier assessment

When several candidate resources or lanes can serve a job, tier them by
observable behavior, not by claims. Sample each candidate live and score it:

- acceptance rate on the operations you need;
- liveness over a short soak;
- cost per unit of work;
- decay rate — how quickly its quality or availability drifts.

Then map each tier to the job classes it can actually serve. High-trust needs
usually have a real cost floor; zero-cost capacity tends to cover only
utility-grade work. Decide the mix before building volume on any single lane,
because a tier that silently degrades takes the whole build with it.

Anti-pattern: growing volume on a lane before measuring its quality. The
measurement is cheaper than the rebuild.

## 5. Utilization audit before acquisition

Acquisition feels like progress and is easy to justify. Measure first:

1. Read usage counters for existing capacity: served versus idle, headroom,
   and per-lane distribution.
2. Compare demand against capacity lane by lane. If most capacity is idle,
   the problem is routing, wiring, or selection — not supply.
3. Only when utilization is genuinely high does acquisition make sense.
4. Re-audit after each wiring change, because the bottleneck moves.

Example: a deployment pipeline with twenty available runners where three do
all the work does not need more runners; it needs the scheduler fixed. Buying
capacity first would have hidden the actual defect at real cost.

## 6. Machine resource probe before fanout

Parallel work multiplies resource use and multiplies mistakes. Before any
fanout:

1. Measure the machine live: CPU load, free memory, disk headroom, and any
   other hard limit. A measurement from yesterday is not a measurement.
2. Derive a safe parallel cap from the numbers with an explicit rule: memory
   per worker, a CPU tier rule, and an always-free safety buffer.
3. Cap every fanout at that number. When work exceeds the cap, queue it and
   run waves.
4. Record the probe output and the derived cap alongside the run, so later
   scaling decisions have evidence rather than folklore.

The full fanout doctrine lives in `swarm-orchestration`; recon's obligation
is the probe itself.

## 7. Lease and session inventory

Anything the system hands out with a lifetime is a lease: sessions,
sandboxes, tunnels, machines. Inventory it during perception so the modeling
phase starts from facts.

| Field | What to record |
|---|---|
| Identifier | How the lease is addressed on every later call |
| Affinity | What the lease is bound to — an identity, a project, an address |
| Lifetime | Time-to-live, idle timeout, and the renewal mechanism |
| State | What the lease carries: files, context, queued work |
| Rehydration | What survives a restart versus what must be rebuilt |

Then run the survival drill: restart the worker mid-job and record exactly
what comes back. The drill answers the only question that matters for long
runs — what does a crash cost? `flow-modeling` designs the lifecycle; recon
produces this inventory and the drill result.

## 8. The zero-think decision table

Repeated branch points get frozen once they are settled by evidence:

| Situation | Exact action | Exact mechanism |
|---|---|---|
| A quiet throttle appears | Back off globally, then resume | Paced retry with jitter |
| One unit answers slowly | Switch to the least-busy unit | Pool selection by score |
| A session id disappears mid-run | Re-adopt from persisted state | Load state, re-issue |
| A response looks empty | Re-probe with a fresh request before concluding | Single fresh probe |

Read the table once, then act without deliberation. Update it only after a
run, from evidence — never mid-run from a hunch. This is what keeps an
operator (human or agent) consistent when the run gets interesting.

## 9. The facts table and the exit gate

Every fact that leaves recon carries a grade and a date:

- `[OBS]` — observed live; capture or command attached.
- `[REP]` — reported or configured secondhand; not yet reproduced.
- `[INF]` — inferred; must be tested before it influences a decision.

| Fact | Grade | Date | Evidence |
|---|---|---|---|
| Request shape for the primary operation | `[OBS]` | dated | Captured exchange |
| Documented limit on the primary operation | `[REP]` | dated | Documentation quote |
| Protection class of the login surface | `[OBS]` | dated | Probe output |
| Which axis moves the limit | `[OBS]` | dated | Axis-variation probes |

Exit gate checklist:

- [ ] Authorization scope statement written and dated.
- [ ] Surfaces enumerated; decisive surface named with a reason.
- [ ] Protection classes recorded per surface, with dates.
- [ ] Quota model drawn: axis, limit, window, reset.
- [ ] Utilization audited before any capacity decision.
- [ ] Machine probe recorded before any parallel run.
- [ ] Lease inventory and survival drill result recorded.
- [ ] Every load-bearing claim graded `[OBS]` with an artifact attached.

When the checklist passes, move to modeling with `protocol-cartography` or
`flow-modeling` as appropriate — and keep this table next to the work.
