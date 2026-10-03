---
name: adversarial-review
description: >-
  Run an independent, checkable review before work ships. Use when an
  artifact, document, skill, or change is about to be published or merged;
  when reviewing your own work adversarially before others see it; when
  findings need adjudication into fixes or written rulings; when a fix loop
  needs a bound and a breaker; or when running a publication checklist over
  text that could leak specifics. Three lenses: security and leakage,
  correctness and adversary simulation, method and clarity. Not for producing
  evidence about behavior (`evidence-protocol`) or reconnaissance.
license: MIT
metadata:
  version: 1.0.0
---

# Adversarial Review

Review is not a reading; it is an adversarial simulation with a verdict. The
author knows what they meant, so the author is the worst available judge of
what the artifact actually says. This skill defines the pre-ship protocol:
separate read-only judges, three defined lenses, checkable rubrics, bounded
fix loops with a breaker, and adjudication that never silently discards a
finding.

The principle that drives the whole protocol:

> **Assume a hostile reader exists. Find what they will do with this before
> they do it, then either remove it or write down why it stays.**

## Decision table

| Situation | Action | Load |
|---|---|---|
| Work is about to ship, merge, or publish | Run all three lenses with independent judges | Method 2-3 |
| You must review your own artifact | Threat-model it as a hostile reader first | Method 4 |
| A judge returned findings | Adjudicate each: fix, or park with a written ruling | Method 6 |
| A fix landed in response to findings | Run a scoped re-review of the fix delta only | Method 5 |
| A fix loop is not converging | Apply the breaker: stop the line, adjudicate | Method 5 |
| Preparing text for publication | Run the publication checklist | Method 7 |
| Checking a skill or instruction set | Run the lack-of-surprise test | Method 8 |
| The artifact is still moving | Freeze it, or review the plan instead | Method 1 |

## Golden rules

1. **The author never approves.** Self-review carries author bias, which is
   why the most predictable defects survive it. Judges are separate contexts,
   and where possible read-only roles that cannot edit the artifact.
2. **Rubrics are checkable statements.** "Covers the three failure classes" is
   a criterion; "high quality" is a mood. PASS means every criterion is met,
   because a blended score with no per-criterion feedback cannot be acted on.
3. **Every finding gets a ruling.** Fixed, or parked with written reasoning.
   Silent discards are forbidden: an unrecorded decision is indistinguishable
   from a missed defect, and the next reviewer pays for it.
4. **Fix loops are bounded.** One fix dispatch per wave, then a scoped
   re-review. At the cap, adjudicate. Unbounded loops converge on exhaustion,
   not on quality.
5. **The breaker protects the line.** A load-bearing finding that later work
   would build on stops the advance even if the budget is exhausted; parking
   it silently would ship the defect with compounded interest.
6. **Review the delta, not the world.** After a fix, re-review the fix's diff
   in a fresh context; re-reading everything reintroduces review that already
   passed and burns the loop's budget.
7. **Lack of surprise is a safety property.** A reasonable reader of the
   description should be able to predict what the artifact does. Hidden side
   effects, boundary escapes, and unexplained destructive behavior are
   findings, not details.

## The method

### 1. Prepare the review

State the artifact's intent in one paragraph, write the rubric as a list of
checkable criteria, define what "done" means for the review, then freeze the
artifact and record its hash. A review of a moving target is a conversation,
not a verdict. If the artifact is too large to freeze, split it — reviewable
units are a deliverable of the split, not a compromise.

### 2. Run the three lenses

Each lens is a separate pass with its own rubric. A judge may cover more than
one lens only if each verdict comes from a genuinely separate pass.

- **Security and leakage.** Does it contain secret-shaped values, personal
  identifiers, or target-specific operational detail? Does it instruct or
  enable boundary crossing? Are destructive operations behind an explicit
  human gate? What does it leak by structure, not just by content?
- **Correctness and adversary simulation.** Simulate a hostile reader and a
  hostile input: empty, oversized, malformed, duplicated, out of order,
  concurrent. Which instructions fail on a novel input? Which claims are
  unsupported? What would someone do with this that the author did not intend?
- **Method and clarity.** Is the method correct and complete? Does the
  decision table route real situations? Do the golden rules explain why? Are
  examples generic and reserved-range only? Does anything depend on a
  specific target that would stop working tomorrow?

The reference file carries the full checklists per lens.

### 3. Keep judges independent and read-only

Use a separate context for every judgment, review, and final gate; where the
tooling allows, a role that physically cannot edit the artifact. Structured
verdicts — criterion, pass or fail, evidence for the verdict — let the
orchestrator route work mechanically. Judge prompts state the rubric, never a
desired conclusion; a prompt that says "do not flag X" has destroyed its own
review.

### 4. Self-review as a hostile reader

When no external judge exists, or before one sees the work, run this drill:
write a one-page threat model of your own deliverable. Who is the hostile
reader? What is the worst thing they could do with this text, code, or
instruction set? What would they quote out of context? Which assumption of
yours is visibly untested? Answer each in the artifact or in a recorded
ruling. This is not a substitute for independent review, but it is where most
real findings originate: the author who simulates hostility finds what
politeness hides.

### 5. Bound the fix loop and install the breaker

Findings go to one fix dispatch per wave, not one per finding. Resume the
original author first, because it has the context; escalate to a fresh
implementer on a stronger tier after repeated failures. Every round ends with
a scoped re-review of only the fix delta, in a fresh context. Set both a round
cap and a patience counter, and stop at the first of: all criteria pass, the
cap, or the breaker. The breaker fires when a load-bearing finding is neither
fixed nor safely parkable — it stops the line and hands the decision to a
human rather than shipping a known weak foundation. Record every termination
cause.

### 6. Adjudicate findings in writing

Every finding ends with exactly one of two rulings:

- **Fix** — the finding was addressed, and the scoped re-review confirms it.
- **Park** — the finding is deliberately not addressed, with a written ruling
  that names the finding, the reasoning, the risk accepted, and the condition
  that would reopen it.

Deferred minor findings go to the final review, not fixed inline mid-loop.
Adjudicating early to end a loop is the failure this step exists to prevent;
the ruling must be defensible to a reader who never saw the discussion.

### 7. Run the publication checklist

Before anything ships: scan for secret-shaped patterns and for
person-identifying or target-specific content; run an abstraction pass that
replaces every specific with its class; confirm examples use reserved names
and reserved test ranges only; run the privacy test — a reader who sees only
the description should not be able to reconstruct operational detail; and get
an independent review whose findings are fixed or parked with rulings. Clean
scans do not replace review, and review does not replace scans; they catch
different classes of defect.

### 8. Apply the lack-of-surprise test

Read only the description and predict everything the artifact does. Any
discrepancy between the prediction and the artifact is a finding: hidden side
effects, tools that reach outside their working area, destructive operations
without a gate, or intent that is obfuscated rather than stated. The test is
cheap and catches an entire class of trust failures early.

**Exit gate.** All three lenses have verdicts; every finding has a ruling; the
publication checklist passes; and the final hash of the reviewed artifact
matches the hash of the artifact that ships.

## When NOT to use

- There is no frozen artifact to judge yet — review the plan, or return when
  the work is frozen.
- You need evidence about how something behaves — `evidence-protocol` runs
  the probes; this skill judges the result.
- The task is to map or decode a system — use `recon` or
  `protocol-cartography`.
- A one-line typo fix in a living document: fix it and move on. Full ceremony
  on trivial changes spends the review budget that risky changes need.

## References

- `references/review-lenses.md` — the complete checklists for all three
  lenses, the adjudication record template, the fix-loop and breaker rules,
  the publication checklist, and the hostile-reader questionnaire. Read it
  when running a review end to end.
- `evidence-protocol` — the evidence a review inspects.
- `honest-fences` — authorization and boundary doctrine.
- `self-evolving-skills` — turning recurring findings into lessons.
