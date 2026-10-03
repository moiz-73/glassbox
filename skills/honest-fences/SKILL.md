---
name: honest-fences
description: >-
  Use before automating anything on a live account or service, and whenever the
  question is "am I allowed to do this?" — is this permitted, do I have
  authorization, can I automate my own account or this site, should I ask
  before sending, posting, deleting, paying, or publishing. Also use when a
  system starts blocking or suppressing you, and when anything is about to
  ship publicly. Covers scope statements, human approval gates, respectful
  handling of blocks, and publication scans. Not for protocol decoding
  (`protocol-cartography`), retry design (`flow-modeling`), or credential
  mechanics (`credential-hygiene`).
license: MIT
metadata:
  version: 1.0.0
---

# Honest Fences

Every engagement runs inside a boundary. The boundary is not an obstacle to the
engineering — it is the precondition for it: work that crosses an unclear
boundary stops being authorized work, and trust, once spent, does not come
back. Fences are honest because they are declared before the work starts,
classified when found, and respected when they cost something. The governing
charter of this repository is `docs/ETHICS.md`; this skill is its operational
method.

The boundary protects three things the method depends on: authorization (a
scope statement turns a hundred mid-run judgment calls into lookups), trust
(users and platforms extend it in small increments and withdraw it all at
once), and speed (a run that can act irreversibly without asking cannot run at
full speed).

## Decision table

| Situation | Action | Read |
|---|---|---|
| Starting any engagement, or the basis is unclear | Write the authorized-scope statement; if the basis is unclear, stop and ask | Method 1 |
| A surface has friction you must interpret | Classify it: none, silent, or interactive; apply the class policy | Method 2 |
| An action is irreversible, public, or costs money | Stop at the human gate: preview, then explicit approval | Method 3 |
| The system shows defensive posture | Stop, cool down, probe once, resume slowly | Method 4 |
| A step explicitly requires a human | Treat it as an honest wall; route it as a designed step | Method 5 |
| A lane's legitimacy is unclear | Score it in the platform-rule risk register; keep or drop | Method 6 |
| Operating on someone's machine or accounts | Apply personal-space etiquette; the user drives logins | Method 7 |
| The run will be long | Check in asynchronously at safe boundaries | Method 8 |
| Anything is about to be published | Run publication discipline: scans, abstraction, review | Method 9 |

## Golden rules

1. **Authorization comes first; availability is not permission.** A reachable
   system, a weak gate, or a silent protection is not consent. When the basis
   is unclear, stop and write down what is unclear — the question costs
   minutes, the alternative costs the engagement.
2. **Classify before automating.** None, silent, or interactive, recorded with
   a date and the probe that produced it. Blurring silent into interactive, or
   the reverse, is how an authorized workflow drifts out of bounds.
3. **Irreversible actions wait for a human, by construction.** The gate is a
   distinct refusal state, not a warning: no code path executes the action
   without approval, and no retry turns a refusal into a send. A gate that can
   be skipped is a wish.
4. **Stop on defensive posture.** When a system shows it is guarding itself,
   stop, cool down, and probe once. Pushing is how authorized work becomes
   unauthorized work — and trust is the resource the whole engagement runs on.
5. **Honest walls are designed steps.** An interactive human-verification step
   is routed to a human as part of the workflow and documented as such. There
   is no deeper engineering answer; the wall marks where the method ends.
6. **The user's space is not the workspace.** Scope to the named surface,
   read-only unless explicitly authorized, never touch unrelated content, let
   the user drive logins — and leave no hidden side effects. A reader of the
   description should be able to predict everything the work does.
7. **Publication is a gate, not a final step.** Nothing ships until it passes
   scans, an abstraction pass, and independent review. If a text's value
   depends on a particular system remaining unprotected, it does not ship.

## The method

### 1. Write the authorized-scope statement first

One paragraph, in a file, before anything technical: the actual system (not the
goal); the authorization basis (your own system, a written engagement, a
sanctioned exercise, an integration you were asked to build); what is in scope
and explicitly out of scope; and where a human must act or approve. Keep it
with the run log and re-read it at every phase boundary. Every later judgment —
may I automate this step, may I push through this friction, may I publish this
detail — is a scope question wearing a technical costume, and with the
statement written, the answers take seconds. An unresolved ambiguity is a stop
sign: ask, then record the answer as a dated amendment.

### 2. Classify protection posture and apply the class policy

Probe each surface harmlessly and classify honestly:

| Class | What it looks like | Policy |
|---|---|---|
| none | No friction on the paths in scope | Automate within normal budgets and logging |
| silent | Quiet mechanics: throttle windows, caps, entitlement checks, reset schedules | Automate within stated limits, with pacing and backoff |
| interactive | A step that explicitly requires a human to act | Route to a human as a designed step; never automate it |

Record each classification with a date and the probe that produced it, and
re-check before scaling because postures change. If you cannot tell which class
a surface is, treat it as interactive until a dated observation says otherwise.
A silent class does not license its whole surface family; classify at the
granularity where behavior actually changes.

### 3. Gate irreversible, public, and money actions

"Requires a human gate" means sending a message, posting publicly, deleting
anything not reproducible, paying or committing spend, publishing an artifact —
any act that cannot be taken back. Design the gate to survive the two pressures
that erode gates: convenience (the gate becomes a warning) and retries (a
refusal becomes a send on the second attempt).

1. **Preview.** Show exactly what would be sent or executed, to whom, at what
   cost. No preview, no approval.
2. **Wait in a distinct refusal state.** Silence is not approval, and approval
   from an earlier context does not carry forward.
3. **Execute once.** A retry does not re-send without a fresh gate unless the
   operation is provably idempotent and the preview is unchanged.
4. **Record.** The approval, the preview, and the outcome go in the run log.

Enforce the gate by construction: a code path that cannot reach the action
without approval, and a test that attempts to fire without one and is refused.
Batch independent approvals with clear previews so the gate stays usable; the
point is deliberation, not friction for its own sake.

### 4. Stop on defensive posture

Define the signals in advance: a global turning-away, suppression across
unrelated paths, a sudden tightening of a previously quiet surface, refusals
that do not match your behavior. On a signal: stop the campaign entirely (not
just the failing call); cool down for a meaningful window, because waiting is
the action; probe once at low frequency on the quietest path you have; resume
gradually only after the probe succeeds, and re-classify the surface. Never
read a defensive state as a local bug, and never race it — a platform in a
defensive posture produces less for more pressure.

### 5. Treat honest walls as designed steps

An interactive human-verification step is not an error path. Name it in the
workflow: which step, why a human, what they do, and the explicit signal that
resumes the run. The run waits for that signal; it does not poll the wall and
does not grow machinery to avoid it. If a workflow is mostly walls, that is a
design finding to report, not an obstacle to engineer past. A workflow that
names its human handoffs is more trustworthy than one that hides them.

### 6. Keep a platform-rule risk register

For every lane the work depends on, and before building volume on it, write a
row: the capability (named generically); the relevant terms clause quoted
verbatim, not paraphrased; how directly the intended use complies or conflicts;
the blast radius if the lane disappears, including the user's account standing;
the mitigation; and a verdict of keep, keep-with-limits, or drop. Prefer lanes
that perform a service for the project itself — periodic checks, packaging for
the repository — over lanes whose only output is volume. Some lanes are
permanently off-limits; record that verdict so it is not relitigated. "It
worked" is not a verdict.

### 7. Respect personal space

When the work touches someone's machine, browser, or accounts: scope precisely
to the named target surface; read-only unless a write is explicitly authorized
in writing for that surface; never touch, read, or capture unrelated personal
content; never relaunch, reconfigure, or update the user's tools; let the user
drive logins and act only on an explicit signal; persist nothing personal
beyond the agreed session material. The test: the user should never lose a
window, a session, or a piece of context to the agent — and should be able to
predict, from the description alone, everything the agent will do.

### 8. Check in asynchronously

Write a short check-in at safe boundaries: after milestones, before any
irreversible operation, on budget stops, and whenever judgment is needed. It
states what was done, decisions taken, what is next, and what is being asked.
Park the decision; keep moving on everything that does not depend on it. Hard
gates are the only thing that blocks the loop — a run that stops for every
question never finishes, and a run that never asks takes irreversible actions
unobserved.

### 9. Run publication discipline before anything ships

1. **Scan.** A banned-token pass (names, domains, addresses, paths) and a
   secret-pattern pass over every file, example, and artifact.
2. **Abstract.** Replace every specific with its class — deployments become
   "a hosted environment"; examples use reserved names and test ranges only.
3. **Apply the value test.** If a text is valuable only because a particular
   system is left unprotected, it does not ship; the transferable lesson
   ships, the specific cannot.
4. **Review independently.** One security and ethics review, one method and
   clarity review, by readers who did not write the material. Fix findings;
   clean scans do not replace review.
5. **Record a verdict.** Per item: ship, cut, or parked with a ruling. No
   silent discards.

**Exit gate.** The scope statement is on file; every surface has a dated
classification and a routing decision; every irreversible action sits behind a
gate demonstrated by a refusal test; the risk register holds quoted clauses and
explicit verdicts; publication items carry scans, two independent reviews, and
a written verdict.

## When NOT to use

- Decoding requests, streams, or dialects — `protocol-cartography`; it
  inherits this skill's scope statement.
- State machines, retries, leases, run state — `flow-modeling` and
  `durable-goals`.
- Evidence and artifacts for a claim — `evidence-protocol`.
- Adversarial review before ship — `adversarial-review`, with this skill
  providing the ethics lens; run learning — `self-evolving-skills`.

## References

- `references/gates-and-boundaries.md` — the full field manual: scope template,
  class policy, gate design and refusal drill, cooldown protocol, wall
  worksheet, risk register, personal-space rules, check-in template, and
  publication checklist. Read it at engagement start and before anything
  ships.
- `docs/ETHICS.md` — the governing charter; this skill is its operational
  method.
- `recon` — the perception pass that produces dated classifications;
  `deep-reverse-engineering` — the parent loop this boundary governs.
