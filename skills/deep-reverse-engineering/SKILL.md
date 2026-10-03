---
name: deep-reverse-engineering
description: >-
  Start here for a multi-phase engagement on a black-box system you are
  authorized to work with — work that spans perception, modeling, execution,
  and verification, where no single specialist fits. Runs the perception loop
  (perceive, model, execute, verify, evolve) and routes to `recon`,
  `protocol-cartography`, `flow-modeling`, `evidence-protocol`, and
  `honest-fences` at each phase. For a single-phase task, load the specialist
  directly. Not for greenfield development or feature work on systems you
  already understand.
license: MIT
metadata:
  version: 1.0.0
---

# Deep Reverse Engineering

A black box is any system whose behavior you need but did not design: a third
party's API, an undocumented service, a legacy process, a protocol you can only
observe from the outside. This skill is the operating method for those systems.
It is deliberately unglamorous: observe before theorizing, model before
building, verify before claiming, record before moving on.

The entire method rests on one inversion:

> **Your assumptions are the least reliable data you have.**
> Observed behavior is the most reliable. Everything else is ranked below it.

## Decision table

| Situation | Action | Load |
|---|---|---|
| Starting a new engagement | Write the scope statement, then begin perception | `honest-fences` |
| Need ground truth about behavior | Capture live traffic; build the truth table | `recon` |
| Decoding requests, streams, or dialects | Derive the contract from captures | `protocol-cartography` |
| A flow has many steps or hidden limits | Model it as a state machine | `flow-modeling` |
| Sessions, tokens, keys are involved | Design the credential path first | `credential-hygiene` |
| About to claim something works | Run the gate function; produce artifacts | `evidence-protocol` |
| Work is about to ship or be published | Run independent adversarial review | `adversarial-review` |
| The engagement will run for hours or days | Set up durable state and watchdogs | `durable-goals` |
| Work fans out across workers | Probe the machine, cap concurrency, run waves | `swarm-orchestration` |
| Iterating toward a quality bar | Use evaluator-optimizer loops with budgets | `quality-loops` |
| Repeating a workflow you have done before | Consult and extend the skill's memory | `self-evolving-skills` |

## The five phases

### 1. Perceive — establish ground truth

Goal: know what actually happens, not what is claimed to happen.

- Rank sources of truth: **live observed behavior > the system's own client >
  official documentation > memory**. Tag every fact with its rank and date.
- Enumerate the surfaces you can observe (static pages, rendered clients,
  background traffic, native clients, CLI tools, embedded frames) and find
  where the real logic lives.
- Capture complete exchanges for every operation you need — request, response,
  timing, ordering, identifiers.
- Build an error census: deliberately probe malformed, missing, expired, and
  wrong-shaped inputs. Record how each failure presents (including failures
  that arrive with success-looking transport status).

**Exit gate:** a facts table where every load-bearing claim is `[OBS]` with a
capture or a probe command attached. No guessing survives this gate.

### 2. Model — write down what explains the observations

Goal: one written artifact that predicts behavior.

- Write the minimal request/response **contract** from captures; validate it by
  replaying a minimal reproduction from a clean state.
- If the system is a conversation or a multi-step flow, draw the **state
  machine**: states, transitions, per-step artifacts, resumption fields,
  expiry windows.
- Map the **limits**: rate windows, quotas, silent caps, lease lifetimes.
  Which axis actually moves each limit (identity, key, project, address,
  concurrency)? Draw the quota model.
- Note every **route variant** for the same capability and how their error
  domains differ.

**Exit gate:** a model that predicts the next observation before you make it.
If a prediction fails, the model is wrong — update it, do not explain it away.

### 3. Execute — build the smallest thing that uses the model

Goal: real work, on top of the model, with guards.

- Build the minimal harness first — one path end-to-end — then generalize.
- Classify failures before retrying: contention (switch unit, no penalty),
  shared throttle (global backoff), hard limit (stop), auth failure (refresh
  once and retry; disable the unit only if it still fails), outage (pause the
  lane, keep one canary). One behavior per class.
- Make replays safe: fresh nonces per attempt, idempotency keys where the
  system supports them, consumed artifacts marked by rename.
- Gate every limit in code and **prove the gate gates** (a concurrency sweep
  must plateau at the cap, not blow through it).
- Keep secrets out of logs by construction, not by discipline.

**Exit gate:** the minimal harness works from a clean start, twice in a row,
with the second run proving idempotency and no duplicate side effects.

### 4. Verify — prove it with artifacts

Goal: evidence that any other party can reproduce.

- Run the **gate function** before any claim: identify the proving command,
  run it fresh, read the full output, count failures, then — and only then —
  state the result.
- Use **airtight probes**: success means the terminal state of the whole chain,
  never an intermediate signal that merely looks correlated.
- Prove negative claims with **before/after** evidence and a freshness
  discriminator, not with silence.
- Falsify your own tests: watch them fail for the right reason before they pass.
- Stress it, then check health *after* the stress, not just during.

**Exit gate:** every completion criterion has a command + observed output
recorded in the evidence log. Unverified items are labeled `[INF]`, never
presented as done.

### 5. Evolve — leave the next run smarter

Goal: the second engagement with this system costs a fraction of the first.

- Keep the **memory triad** next to the work: lessons (deduped by symptom),
  current state (verified facts, dates attached), run log (append-only,
  redacted).
- **Consult before, append after**: read the lessons before starting, record
  what changed when finishing. Never repeat a failure that has a recorded fix.
- Watch for **drift**: when observed behavior contradicts the written state,
  the state is wrong — update it immediately and date the correction.
- Adapt parameters only with evidence: repeated identical failures or a clear
  success, never one noisy run.

**Exit gate:** a fresh session with zero context can read the memory and
continue the work correctly.

## Golden rules

1. **The wire is the truth.** When the docs and the capture disagree, the
   capture wins; when the client and the server disagree, the server wins.
2. **Write the model down.** A model that lives only in your context dies at
   the next compaction. Files outlive sessions.
3. **One change per iteration.** If two things changed, you learned nothing
   about either.
4. **Bounded attempts, then blocked-with-evidence.** Three distinct attempts is
   the default; a fourth identical attempt is budget arson.
5. **Respect is part of the method.** Classify protection surfaces honestly;
   automate the quiet ones, route interactive ones to a human, and stop when a
   system shows it is defending itself. The boundary is the method — not an
   obstacle to it.

## Evidence grades

Every fact that travels between phases carries a grade and a date:

- `[OBS]` — observed live; capture or command attached.
- `[REP]` — reported or configured secondhand; not yet reproduced.
- `[INF]` — inferred; must be tested before it influences a decision.

Numbers decay. A measurement without a date is a rumor.

## When NOT to use

- Systems you already understand and have documentation for — just build.
- Anything outside your authorization. Availability is not permission; if the
  basis is unclear, stop and ask before proceeding.
- Greenfield development where no unknown behavior exists to discover.

## References

- `references/the-loop.md` — the full phase-by-phase playbook with traps,
  patterns, and exit gates. Read when running an engagement end to end.
- `references/decision-tables.md` — quick lookup for routing, failure
  classification, evidence grades, and stop conditions.
