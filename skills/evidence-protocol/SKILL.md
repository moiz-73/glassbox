---
name: evidence-protocol
description: >-
  Use immediately before stating any completion, correctness, or repair claim —
  done, fixed, verified, passing — or when verifying someone else's
  deliverable. Also covers watching a new check fail before trusting it,
  proving something is not happening end-to-end, stress-testing before
  release, sampling-auditing a large deliverable, and reporting results
  honestly with graded evidence. Every claim needs its matching artifact:
  claim → command → observed output. For pre-ship judgment of an artifact,
  use `adversarial-review`.
license: MIT
metadata:
  version: 1.0.0
---

# Evidence Protocol

Assertions are cheap and evidence is expensive, so reports drift toward
assertion. This skill is the discipline that stops the drift: every claim of
completion, correctness, or repair is backed by a command run in the same turn
and its observed output. It is deliberately uncompromising, because the moment
evidence becomes optional, every other skill in the pack becomes decoration.

The one inversion:

> **You do not get to believe your own summary. The artifact is the claim.**

## Decision table

| Situation | Action | Load |
|---|---|---|
| About to say done, fixed, or passing | Run the gate function first; claim only after | Method 1 |
| Unsure which evidence fits the claim | Look up the claim-to-evidence mapping | Method 2 |
| A new test or check was written | Falsify it: watch it fail for the right reason | Method 3 |
| The chain has many steps | Define terminal success; build the smallest probe to it | Method 4 |
| Verifying work you delegated | Inspect the artifact and re-run the check yourself | Method 5 |
| Proving something is NOT happening | Before/after capture, repeated, with a freshness discriminator | Method 6 |
| Claiming one approach is faster | Benchmark back-to-back in the same window | Method 7 |
| Declaring production-ready | Stress, then check health after the stress | Method 8 |
| A large deliverable needs assurance | Sample with a read-only probe; advisory verdicts | Method 9 |
| Claiming a file or artifact exists | Verify bytes, shape, hash, and content markers | Method 10 |
| Something broke with several suspects | Run failure forensics before fixing | Method 11 |
| Reporting results | Journal the evidence; label grades; report failures too | Method 12 |

## Golden rules

1. **No claim without an artifact run in the same turn.** "Should work" and
   "works" read like the same sentence, but only one of them is allowed. If
   you did not run the check, the honest sentence is "I have not verified
   this".
2. **Match the instrument to the claim.** A linter is not a compiler, a
   message sent is not a message received, and a worker's status line is not
   its deliverable. Cross-domain evidence never substitutes.
3. **Tests are trusted only after failing.** A check that has never failed
   may prove nothing; watch it fail for the right reason, then pass.
4. **Verify through the surface the user will use, to the terminal state.**
   Intermediate signals correlate with success; they do not prove it.
5. **Absence needs repetition.** One observation of nothing proves nothing;
   capture before and after across several triggers, with a discriminator
   that separates fresh from stale.
6. **Delegation does not transfer trust.** The receiver inspects the artifact;
   the worker's own report is a pointer, not evidence.
7. **Report the actual state.** Failures, blocks, and partial results are
   reported with the same care as successes; unverified items stay labeled.

## The method

### 1. Run the gate function before any claim

Six steps, none skippable: identify the command that would prove the claim;
run it fresh; read the full output including the exit status; count the
failures; decide whether that output actually confirms the claim; only then
state the claim with the evidence attached. Partial commands, extrapolation
from an earlier run, and "it looked fine" are all not verifying. The reason is
economic: a false claim costs downstream work that dwarfs the seconds saved by
skipping the check.

### 2. Map the claim to its evidence

Each claim type has one instrument that counts. The common map:

| Claim | Required evidence |
|---|---|
| Tests pass | Test output with zero failures counted |
| Linter clean | Linter output |
| Build succeeds | Build command, exit status zero, artifact produced |
| Bug fixed | The original symptom's check passes |
| Regression covered | Red-green cycle observed on the new check |
| Delegated work done | The artifact or diff inspected by the receiver |
| Requirements met | Line-by-line checklist against the plan |
| Artifact delivered | Bytes, shape, hash, content markers |
| Nothing was sent | Before/after with a freshness discriminator |

The reference file expands this table. The failure it prevents is the quiet
substitution of a convenient check for the correct one.

### 3. Falsify every new check

Before trusting a check when it passes, watch it fail for the right reason:
the missing behavior, not a typo or a broken invocation. For a regression
check, run the full cycle: write the check, watch it pass, revert the fix,
watch it fail, restore, watch it pass again. A check that has only ever been
green is an untested hypothesis wearing a green badge. For a harness or
similar deliverable, build a suite with the same discipline: happy paths,
failure paths, and edge shapes — empty, oversized, malformed, duplicated —
with expected-failure cases treated as first-class results, because a suite
that only proves success hides the failure modes that matter.

### 4. Build airtight probes

Define terminal success for the whole chain — the downstream consumer
received the row, the final state changed — not an intermediate signal that
merely correlates. Build the smallest probe that reaches that terminal state
from a clean baseline, and prefer probes that also produce a usable artifact.
Probes may cost one unit of capacity; budget for them. Verify through the same
surface the user will use, with the observed result attached, then re-run the
probe after any outage before resuming scale, because recycled resources can
carry stale success artifacts.

### 5. Verify delegated work independently

For every delegated result: inspect the artifact or diff, then run the
verification check yourself, then report the actual state. A worker's summary
is a claim, and claims are exactly what this skill exists to gate. Record the
per-worker evidence — artifact, check, output — so integration decisions are
auditable. This is the difference between a swarm and a rumor mill.

### 6. Prove negatives with before/after

When the question is whether something is not happening: capture a before
state with a freshness discriminator, trigger the behavior, capture the after
state, and repeat across several triggers. Unchanged state across repeated
triggers is evidence of suppression or absence; a single trigger is not. The
discriminator is the hard part: find the field that would differ if the
suspected event had occurred, and record it alongside the captures.

### 7. Benchmark back-to-back

When claiming one approach is faster: run both in the same window,
interleaved, with the same task mix and parameters, and repeat the pairs until
the direction is stable. Never benchmark a system that is recovering or
degraded; report medians and tails, not only averages. Keep comparisons inside
one window: cross-window and cross-day numbers are noise dressed as
measurement.

### 8. Stress, then check health after

Before declaring anything production-ready: run full concurrency, long
sessions, and the ugly inputs; document the safe operating envelope; soak at
the intended steady state. Then check health after the stress, not only during
it. A system that survives stress and is broken the next morning was not
verified; it was lucky.

### 9. Audit large deliverables by sampling

When a deliverable is too large to verify exhaustively: sample items, check
each with a cheap read-only probe, and report pass, warn, or fail per item as
advisory. An audit never silently edits what it audits; findings escalate into
the normal fix path. Zero verification and full-cost exhaustive audits are
both failures; sampling is the middle that scales.

### 10. Verify deliverables concretely

When claiming a file or artifact was produced: save it locally, verify
nonzero bytes and expected shape, and record the path plus the verification
command. For rendered output, run a headless check and assert no undefined or
placeholder artifacts. For downloads, compare hashes byte-exactly. A link is
not a deliverable, and a size is not a shape.

### 11. Do failure forensics before fixing

When something breaks and several layers could be responsible: test the same
unit directly against the simplest path to separate an upstream problem from a
local bug; distinguish local stale state from service-side state; write the
incident into a failure catalogue as symptom, cause, and fix. Then consult the
catalogue before diagnosing — most "new" incidents are a recorded class
recurring, and re-deriving a known cause is budget burned twice.

### 12. Journal evidence and report honestly

Keep a written trail: milestones with their evidence, spend events, guard
states. On any stop, report the best state reached, the trajectory, what
improved, what did not, and unresolved risks — including when the answer is
failure. Label every claim with its grade: observed live, reported, or
inferred, and date every number, because volatile facts decay. A reader must
be able to tell verified from unverified line by line; that is what makes the
report reusable by someone who was not there.

**Exit gate.** Every completion criterion maps to a command and its observed
output recorded in the evidence log. Unverified items are labeled, never
presented as done.

## When NOT to use

- The work itself is not done and the question is how to do it — use the
  engineering skill for that domain, then return here to prove it.
- Reviewing an artifact before it ships — `adversarial-review` consumes this
  skill's evidence and adds independent judgment.
- Establishing what a system does before any claim exists — use `recon`;
  perception produces facts, this skill gates claims about them.
- Exploring or brainstorming, where no claim is being made yet.

## References

- `references/verification-playbooks.md` — expanded claim-to-evidence map,
  gate-function worksheet, falsification recipes, probe patterns, benchmark
  and stress protocols, sampling and deliverable checks, forensics, and
  reporting templates. Read it when a verification task is larger than one
  command.
- `adversarial-review` — independent review before shipping.
- `deep-reverse-engineering` — the parent loop; Verify is this skill's phase.
- `flow-modeling` — the state model that tells you which state to verify.
