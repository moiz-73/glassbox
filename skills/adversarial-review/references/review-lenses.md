# Review Lenses

Companion to `adversarial-review/SKILL.md`. Three lenses, each written as a
checklist a judge can apply without hearing the author's explanation, plus the
adjudication record, the fix-loop rules, the publication checklist, and the
hostile-reader questionnaire.

Contents:

1. Lens one — security and leakage
2. Lens two — correctness and adversary simulation
3. Lens three — method and clarity
4. Verdict and adjudication record
5. Fix loop rules and the breaker
6. Publication checklist
7. Hostile-reader questionnaire

---

## 1. Lens one — security and leakage

**Use when** the artifact is text, code, configuration, or instruction, and it
could carry something that should not travel.

Checklist:

- Secret-shaped values: no keys, tokens, session material, private keys, or
  connection strings, including in examples, comments, and test fixtures.
- Personal identifiers: no names, handles, addresses, or anything that points
  at a person or a machine.
- Target-specific operational detail: no hostnames, private endpoints, ports,
  paths, versions tied to one environment, or inventories of a real system.
- Reserved-name discipline: examples use reserved names and reserved test
  ranges only.
- Instruction safety: nothing teaches or enables boundary crossing, gate
  circumvention, or access beyond what an operator explicitly grants.
- Destructive operations: sending, deleting, paying, publishing all sit behind
  an explicit human gate with no alternate path.
- Working-area discipline: tools and scripts stay inside their bound
  directories; nothing reaches outside without a stated, authorized reason.
- Structural leakage: metadata, hashes, counts, and timing that reveal more
  than the content should.
- Error paths: messages that echo secrets back, or logs that record them.
- Dependency risk: bundled code or binaries with unclear provenance.

**Quality bar.** A pattern scan is clean, and a human has read the artifact
looking for meaning, not just patterns.

**Prevents.** Shipping material that leaks a secret, a person, or a target —
the class of mistake that cannot be recalled once published.

## 2. Lens two — correctness and adversary simulation

**Use when** the artifact claims to do something, and someone will rely on it.

Checklist:

- Claims: every factual claim has attached evidence or is labeled as an
  assumption, inference, or open question.
- Inputs: empty, oversized, malformed, duplicated, out of order, and
  concurrent inputs are handled or explicitly out of scope.
- Failure paths: errors are named, mapped to reactions, and tested, not only
  described.
- Terminal state: the artifact's success definition is the end of the chain,
  not an intermediate signal.
- State: transitions have guards, persisted fields, and resume semantics.
- Assumptions: each assumption is written down and, where it matters, marked
  for testing.
- Gameability: could the producer weaken the test it is judged by? Are write
  scopes disjoint — producer owns source, reviewer owns tests — and are tests
  strengthen-only?
- Independence: is any judgment made by the author of the thing judged?
- Hostile input: what happens with adversarial or wildly unexpected input,
  and does the failure stay safe?
- Hostile reader: what would a reader do with this that the author did not
  intend?

**Quality bar.** A hostile reader cannot find a claim without evidence, a path
without a failure mode, or a test the producer can edit.

**Prevents.** Confirmation review — checking that the happy path works and
declaring the artifact correct.

## 3. Lens three — method and clarity

**Use when** the artifact instructs a capable reader (human or agent) to do
something.

Checklist:

- Purpose: the opening states what the artifact is for in one or two
  sentences.
- Decision table: real situations route to concrete actions; a reader can
  choose a path in seconds.
- Golden rules: each rule explains why, so it generalizes to novel inputs.
- Method: steps carry exit gates; each gate is checkable, not a mood.
- Boundaries: a when-not-to-use section names the near-misses and the skills
  to use instead.
- Triggers: the description includes the phrases a user would type plus the
  explicit when-not-to-use, so it fires when needed and stays quiet on
  near-misses.
- Examples: generic, reserved-range only, and actually executable where the
  artifact claims executability.
- Progressive disclosure: the body answers how; references answer where the
  detail is; nothing large is duplicated in the body.
- Cross-links: sibling skills are referenced by name, and every reference
  resolves.
- Budgets: line and size limits are respected; a reader pays only for what
  the task needs.
- Style: concrete verbs, short sentences, no decoration, no vendor specifics,
  no operational detail from any real engagement.

**Quality bar.** A cold reader can follow the artifact end to end and knows
exactly what it does not cover.

**Prevents.** Unusable and untriggerable artifacts: correct content that no
one loads, or loaded instructions that fail on the first novel input.

## 4. Verdict and adjudication record

**Use when** a lens pass completes.

Verdict format per criterion:

| Criterion | Verdict | Evidence |
|---|---|---|
| e.g. no secret-shaped values | pass | pattern scan output; manual read |
| e.g. empty input handled | fail | the empty case returns a raw error |

Adjudication record per finding:

| Field | Content |
|---|---|
| Id | Stable identifier |
| Lens | Which lens found it |
| Severity | Critical, major, or minor |
| Finding | One sentence, testable |
| Evidence | How it was observed |
| Ruling | Fix or park |
| Reasoning | Why this ruling; for park, the risk accepted |
| Reopen condition | What would reopen a parked finding |
| Verified by | Who confirmed the fix or the ruling |

**Quality bar.** No finding left without a ruling; no parked finding without a
reopen condition.

**Prevents.** Silent discards — the ruling that was never written and is
therefore indistinguishable from a defect that was never seen.

## 5. Fix loop rules and the breaker

**Use when** findings require changes.

1. One fix dispatch per wave, covering the wave's findings together; per
   finding dispatches multiply cost and collide.
2. Resume the original author first; it holds the context. After repeated
   failures, escalate to a fresh implementer on a stronger tier.
3. Tests are strengthen-only. Never weaken, skip, or delete a passing check to
   get a change through; keep write scopes disjoint.
4. Every round ends with a scoped re-review of only the fix delta, in a fresh
   context.
5. Set a round cap and a patience counter. Stop at the first of: all criteria
   pass, the cap, or the breaker.
6. Minor findings are deferred to the final review, not fixed inline.
7. Record the termination cause: pass, cap, or breaker.

The breaker: when a load-bearing finding is neither fixed nor safely parkable,
stop the line and hand the decision to a human. Load-bearing means later work
would build on the flawed part; shipping it forwards the defect with
compounded interest.

**Quality bar.** No advance with an open critical finding that is neither
fixed nor parked with a ruling.

**Prevents.** Fix waves that never converge; per-finding churn; quietly
accepting a weak foundation to keep moving.

## 6. Publication checklist

**Use when** anything leaves the project.

1. Secret-pattern scan over every file, including examples and comments.
2. Person-identifying and target-specific detail scan.
3. Abstraction pass: replace every specific with its class; if a detail only
   matters for one real target, remove it.
4. Reserved-name and reserved-range check for all examples.
5. Privacy test: a reader who sees only the description should not be able to
   reconstruct operational detail.
6. Independent review: at least one separate context per lens, findings fixed
   or parked with rulings.
7. Hash check: the artifact that ships is the artifact that was reviewed.
8. Provenance: anything borrowed is credited and license-compatible.

**Quality bar.** Clean scans, recorded reviews, and a written publishability
verdict — scans and review catch different classes and neither replaces the
other.

**Prevents.** Publishing raw working material; shipping a specific recipe
dressed as an example; reviewing one version and shipping another.

## 7. Hostile-reader questionnaire

**Use when** reviewing your own artifact, before an external judge sees it.

Answer each in writing:

1. Who is the hostile reader, and what do they want?
2. What is the worst thing they could do with this artifact?
3. What would they quote out of context, and does the quote mislead?
4. Which of my claims would collapse under one probing question?
5. Which assumption am I treating as a fact without having tested it?
6. What did I leave out because it was hard, and is the omission visible?
7. If this text were followed literally by a malicious reader, what would
   happen, and is that acceptable?
8. What would a reviewer who dislikes me flag first?
9. Which example would stop working tomorrow, and does the artifact say what
   to do when it does?
10. If the description were all a reader saw, what would they predict — and
    does the artifact match that prediction exactly?

**Quality bar.** Every answer is either fixed in the artifact or recorded as a
ruling with a reopen condition.

**Prevents.** The blind spot that survives because nobody asked the hostile
question before publication.
