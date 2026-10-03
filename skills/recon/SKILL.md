---
name: recon
description: >-
  Establish ground truth about a system you are authorized to work with. Use
  when documentation and observed behavior disagree, when mapping where logic
  lives, classifying protection posture as none, silent, or interactive,
  mapping quotas to the axis that moves them, auditing utilization before
  adding capacity, or probing resources before parallel work. Produces a dated
  facts table where every load-bearing claim has a live capture. Not for
  protocol decoding (`protocol-cartography`) or retry, lease, and run state
  design (`flow-modeling`).
license: MIT
metadata:
  version: 1.0.0
---

# Recon

Recon is the perception discipline: before any model, harness, or automation
depends on a system, establish what actually happens there. Its single product
is a dated facts table where every load-bearing claim is observed live and
carries the capture or probe that produced it. Every later artifact — a
protocol contract, a state machine, a retry policy — is only as reliable as
this table.

## Decision table

| Situation | Action | Load |
|---|---|---|
| Starting work on an unfamiliar system | Write the authorization scope statement; keep it with the work | `honest-fences` |
| Docs, a client library, and live behavior disagree | Rank the sources; reproduce the load-bearing claim live | Method 2 |
| You cannot tell where logic or friction lives | Map surfaces; mark the decisive one and deprioritize the rest | `references/surfaces-and-fences.md` |
| Deciding whether a surface can be automated | Classify protection posture honestly before automating | Method 4 |
| Limits or entitlements shape the strategy | Map each limit to the axis that actually moves it | Method 6 |
| Tempted to add capacity | Audit utilization of existing capacity first | Method 6 |
| About to run parallel workers | Probe machine resources; derive and log the cap | Method 8 |
| A multi-step flow keeps being re-decided mid-run | Freeze the branch points into a zero-think table | Method 7 |
| Ready to leave perception | Exit gate: every load-bearing fact is `[OBS]` with an artifact | `evidence-protocol` |

## Golden rules

1. **The wire is the truth.** Live observed behavior outranks the system's own
   client, which outranks documentation, which outranks memory. Any argument
   that starts with "surely it behaves like that" is settled by one probe, not
   by discussion.
2. **One surface is never the whole system.** Client-rendered applications hide
   their logic in bundles and across origins, so "nothing on the first surface"
   means "look at the next surface", never "there is nothing here".
3. **Classify before you automate.** Every surface gets a protection class:
   none, silent, or interactive. Quiet mechanics are automated within their
   stated limits; interactive human-verification steps are routed to a human
   as a designed part of the workflow. An unclassified boundary is discovered
   after the build, when it is most expensive and most tempting to mishandle.
4. **Numbers decay.** Every measurement carries a date and an evidence grade.
   An undated number is a rumor, and volatile numbers must be re-verified
   before they influence a decision.
5. **Measure the machine before you parallelize.** Concurrency is a measured
   quantity, not a wish; a fanout that exceeds the measured cap converts
   progress into contention.
6. **Stop when the system defends itself.** Persistent turning-away,
   suppression, or tightening limits is a signal to stop, cool down, and probe
   once — not a defect to push through. Waiting is the correct move.
7. **The scope statement comes first.** Availability is not permission; when
   the authorization basis is unclear, stop and ask before collecting
   anything.

## The method

### 1. Scope the engagement

Write one paragraph, in a file, before touching anything technical: what the
system is, the authorization basis (your own system, a written engagement, a
sanctioned exercise, or an integration you were asked to build), what is in
scope, what is explicitly out of scope, and where a human must act or approve.
Every later judgment — "may I automate this step?", "may I push through this
friction?" — is a scope question wearing a technical costume. With the scope
written and dated, those judgments take seconds.

### 2. Rank the sources of truth

Establish the hierarchy and never let a lower rank overrule a higher one:

| Rank | Source | Trust posture |
|---|---|---|
| 1 | Live observed behavior | Reproduce before relying on it |
| 2 | The system's own client, SDK, or CLI | A convenience layer; may lag |
| 3 | Official documentation | Frequently stale; treat as hypothesis |
| 4 | Memory and pattern-matching from other systems | Hypothesis only |

Tag each fact `[OBS]` observed live, `[REP]` reported or configured
secondhand, or `[INF]` inferred and untested, with a date. A `[REP]` or
`[INF]` fact is re-verified before it influences a build decision.

### 3. Map the surfaces

Enumerate the surfaces before concluding anything: static content, the
client-rendered application, background request traffic, native or desktop
clients, command-line tools, and embedded third-party frames. For each
surface, record where its logic lives, how you observe it, and whether it
matters for this job. Then name the decisive surface and say why the others
were deprioritized — the map is a decision document, not an inventory.

### 4. Classify protection posture

Probe each surface harmlessly and classify what you find:

- **none** — no friction observed in the paths you are authorized to use.
- **silent** — quiet mechanics that shape behavior: throttle windows, caps,
  entitlements, reset schedules. Automate these within stated limits, with
  budgets and backoff.
- **interactive** — a step that explicitly requires a human. Route it to a
  human as a designed part of the workflow.

Record the classification as a dated observation and re-check before scaling,
because postures change. The classification is a policy input, not a
description: an interactive step ends the automation question, and the honest
answer is a human handoff, never engineering around the wall.

### 5. Capture complete exchanges

For every operation in scope, capture the full exchange: request, response,
timing, ordering, identifiers, and the headers that matter. Prefer the
system's own client as the capture vehicle — it knows the current contract.
Capture enough per operation to replay it later from a clean state. Protocol
decoding proper belongs to `protocol-cartography`; recon's job is to know
which exchanges exist and to keep the raw material.

### 6. Map quota surfaces and audit utilization

Vary one axis at a time — project, connection pool, address, concurrency —
and observe which change actually moves the limit. Read limit headers and
error bodies; record the window length and the reset epoch. Compare the
shared-pool case with the per-unit case using the resources you already own.
Then draw the quota model: axis to limit to window to reset.

Mapping exists to respect limits and plan capacity honestly, not to extend
them. Never add identities, accounts, or keys to move an axis where the
platform's terms prohibit it; when the basis is unclear, that question
belongs to `honest-fences`.

Before adding capacity, audit utilization of what you already have: usage
counters, served versus idle capacity, headroom. If most capacity sits idle,
the fix is routing and wiring, not acquisition. Acquisition before an audit is
spending used as a substitute for measurement.

### 7. Freeze branch points into a zero-think table

As you observe repeated branch points, write them into a table: situation,
exact action, exact command. Read it once, then act without deliberation.
Update it only from evidence after a run — never mid-run from a hunch.
Re-deciding settled questions under time pressure is where consistency and
cooling discipline are lost.

### 8. Probe machine resources before fanout

Before any parallel run, measure the machine live: CPU, free memory, disk
pressure, and any other hard limit. Derive a safe cap from the measurement,
keep an explicit safety buffer free, and cap every fanout at that number. When
work exceeds the cap, run waves. Log the probe output and the derived cap with
the run. The `swarm-orchestration` skill carries the full fanout doctrine.

### 9. Inventory leases and sessions

Anything with a lifetime — sessions, sandboxes, tunnels, machines — gets
inventoried during recon: the lease object, its identifier, its affinity, its
time-to-live, and its renewal mechanism. Probe survival explicitly: restart
mid-job and record what rehydrates and what is lost. The lifecycle design is
`flow-modeling`'s job; recon owes it an honest inventory.

**Exit gate.** A facts table where every load-bearing claim is `[OBS]` with a
capture or a probe command attached, protection classes recorded per surface
with dates, and the decisive surface named. No guessing survives this gate.

## When NOT to use

- You already have a current, replayable contract for the system — build.
- The task is decoding requests, streams, or dialects — use
  `protocol-cartography`, which consumes recon's captures.
- The task is state machines, retries, leases, or run state — use
  `flow-modeling`, which consumes recon's facts.
- The authorization basis is unclear, or the path requires crossing an
  interactive verification wall: stop and hand back to a human. Availability
  is not permission; a silent protection is not consent.

## References

- `references/surfaces-and-fences.md` — the long-form field manual for surface
  mapping, protection classification, quota-surface mapping, resource probes,
  utilization audits, and lease inventories. Read it while running a
  perception pass on a system you have not mapped before.
- `deep-reverse-engineering` — the parent loop this skill feeds.
- `evidence-protocol` — how to turn recon's facts into verifiable claims.
- `honest-fences` — the authorization and boundary doctrine.
