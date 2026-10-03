# Gates and Boundaries — full field manual

Companion to `honest-fences/SKILL.md`. Read it when an engagement starts, when
a protection surface has to be classified, when an irreversible action is
approaching, and before anything is published. The governing charter is
`docs/ETHICS.md`; everything below is how that charter is executed in practice.

Contents:

1. The scope statement template
2. Protection classes and the policy for each
3. Human-gate design and the refusal drill
4. The defensive-posture cooldown protocol
5. Honest walls: putting the human step in the workflow
6. The platform-rule risk register
7. Personal-space operating rules
8. The async check-in template
9. Publication checklist
10. Fences exit-gate checklist

---

## 1. The scope statement template

Write this before touching anything technical. One paragraph, dated, kept with
the run log. It is deliberately short; a scope statement nobody rereads is
useless.

```
Scope statement — <date>

System:        <the actual system, not the goal>
Basis:         <own system | written engagement | sanctioned exercise |
                integration we were asked to build>
In scope:      <surfaces, operations, accounts>
Out of scope:  <explicitly excluded, including tempting adjacents>
Human points:  <where a human must act or approve, by step>
Ambiguities:   <anything unresolved; each becomes a question, never a guess>
```

Rules:

- An unresolved ambiguity is a stop sign, not a footnote. Ask before
  proceeding; record the answer as an amendment with its own date.
- Re-read the statement at every phase boundary. Scope drifts because the
  interesting part of a system is rarely the part you were asked about.
- Availability is not permission. A reachable surface, a weak gate, or a quiet
  protection says nothing about authorization.
- When in doubt, the smaller scope wins. It is always easier to extend a scope
  with the owner's blessing than to explain an extension after the fact.

## 2. Protection classes and the policy for each

Classify each surface with a harmless probe: observe response behavior, timing,
and the shape of the first refusal; watch what a quiet repeat does. Record the
class, the date, and the probe. Three classes, three policies.

| Class | Typical signals | Policy | Re-check trigger |
|---|---|---|---|
| none | No friction on in-scope paths | Automate; keep normal budgets and logging | Before any scale-up |
| silent | Throttle windows, caps, entitlement checks, quiet suppression, reset schedules | Automate within stated limits, with pacing, backoff, and budgets | Before every scaling decision, and after any global refusal burst |
| interactive | A step that explicitly requires a human to act | Route to a human as a designed step; never automate | Every run, since this never changes class by engineering |

Discipline that keeps classification honest:

- **One probe, one observation, one date.** The classification is only as good
  as the probe behind it.
- **Unknown defaults to interactive.** If the evidence does not clearly show a
  quiet class, the policy is a human handoff until a dated observation says
  otherwise. The cost of a wrong classification in this direction is one human
  step; in the other direction it is the engagement.
- **Classes are per surface and per path.** A silent limit on one endpoint does
  not describe its neighbors. Classify at the granularity where behavior
  actually changes.
- **Postures tighten.** A surface classified silent last month may be
  interactive today. Re-probe before scaling, and treat a changed class as a
  fact about the platform, not an anomaly to route around.
- **The policy is a policy, not a suggestion.** Silent-class limits are
  respected with pacing and backoff; interactive steps end the automation
  question. If the work needs an interactive step performed, the answer is a
  human, not a deeper engineering effort.

## 3. Human-gate design and the refusal drill

A human gate exists for actions that cannot be taken back: sending, posting,
deleting, paying, publishing — anything whose reversal requires someone else's
cooperation. Gates must survive the two failure modes that erode every gate:
convenience pressure (the gate becomes a warning) and retry pressure (a refusal
becomes a send on the second attempt).

Design rules:

1. **Preview first.** The gate displays exactly what would be sent or executed:
   content, target, size, cost, and the time it would take effect. If the
   preview cannot be produced, the action cannot be approved.
2. **Distinct refusal state.** "Not approved" is a terminal state for that
   action, separate from "error" and separate from "pending". Code that catches
   the state cannot fall through to execution.
3. **Approval is explicit, scoped, and current.** An approval names the action
   and the preview revision it applies to. Approval for one action does not
   transfer to another; approval from ten minutes ago does not survive a
   content change.
4. **One execution per approval.** Re-running after a transient failure needs a
   fresh gate unless the operation is provably idempotent and the preview is
   unchanged.
5. **Batch with previews.** Group independent approvals into one review with
   distinct items, so the human gate stays usable and is not routed around for
   convenience.
6. **Record everything.** The preview, the decision, the approver, and the
   outcome are run-log entries.

The refusal drill, run once per gate and repeated after any gate edit:

- Construct the action without an approval and attempt to execute it.
- The attempt must be refused, and the refusal must be observable in the log.
- Approve, then verify the action executes exactly once.
- Replay the approval; verify no second execution occurs.

A gate that has never been drilled is an assumption. The point of enforcement
by construction is that a tired future session, under time pressure, cannot
accidentally succeed at skipping it.

## 4. The defensive-posture cooldown protocol

Defensive posture is a system telling you it is guarding itself: global
turning-away, suppression across unrelated paths, sudden tightening of a quiet
surface, or refusal bursts that do not match your observed behavior. The
correct response is procedural, not improvised.

Signals to define in advance (adapt to the surface, keep it short):

- Refusals appear on paths that never refused before.
- The refusal rate jumps without a corresponding change in your behavior.
- The same operation succeeds from one context and fails everywhere else, with
  no pattern you can name.
- A previously quiet surface starts returning explicit "slow down" responses.

Protocol:

1. **Stop the campaign.** Not the failing call — the whole campaign. A
   defensive state is global until proven otherwise.
2. **Cool down.** Choose a meaningful window and actually wait through it.
   Waiting is the action. Activity during cooldown is the mistake.
3. **Probe once.** One low-frequency request on the quietest, most legitimate
   path available. Record the result verbatim.
4. **Resume gradually.** If the probe succeeds, scale back up in steps, pausing
   between them. A resumed campaign that immediately re-triggers the posture is
   a signal to stop for longer, not to escalate.
5. **Record the drill.** Date, signal, window, probe result, resume path. The
   next session should recognize the same posture faster.

Never read a defensive posture as a local bug, and never treat a cooldown as
lost time. A platform that is guarding itself will produce less for more
pressure; the only move that restores normal behavior is time.

## 5. Honest walls: putting the human step in the workflow

An interactive step — one that explicitly requires a human to act — is not an
exception to the workflow; it is a step in the workflow. Write it in:

```
Step <n>: <what the run needs>
  Wall:    interactive — requires a human to act
  Human:   <who> does <what> on <which surface>
  Signal:  the run resumes when <explicit signal> arrives
  On fail: park the branch; do not retry the wall
```

Rules that make walls honest:

- The run waits for the signal. It does not poll the wall, and it does not
  create parallel attempts while waiting.
- The wall is documented as a designed step, in the same document as the rest
  of the method. Hiding the human step produces a method that looks autonomous
  and is not.
- There is no substitute step. The method's answer to a human-verification wall
  is the human; building anything whose purpose is to avoid the human is out of
  scope for this repository.
- If a workflow is mostly walls, that is a finding: report it and reconsider
  the automation at the design level, rather than at the wall.

The boundary is the method. A workflow that names its human handoffs is more
trustworthy — and more useful — than one that pretends they do not exist.

## 6. The platform-rule risk register

Before building volume on a lane, write its row. The register is a document,
not a feeling.

```
| Lane | Quoted clause | Rule risk | Blast radius | Mitigation | Verdict |
```

Guidance per column:

- **Lane.** Name the capability generically: what it provides to the project,
  not the particular provider.
- **Quoted clause.** The exact relevant text from the terms. Quote, never
  paraphrase; paraphrases drift toward whatever the reader wants them to say.
- **Rule risk.** How directly the intended use complies with, or conflicts
  with, the quoted clause. State it in one sentence.
- **Blast radius.** What the user loses if the lane is withdrawn or the account
  is affected: their work, their data, their standing, their access.
- **Mitigation.** The alternative lane or reduced dependence that keeps the
  project running without this one.
- **Verdict.** `keep`, `keep-with-limits` (with the limits written out), or
  `drop`. A drop is a permanent entry; the next run does not relitigate it.

Scoring habits:

- Prefer lanes that perform a service for the project itself — for example,
  checks or packaging that serve the repository's own needs — over lanes whose
  only output is volume for its own sake.
- "It worked" is not evidence of legitimacy. Many things work right up until
  they do not, and the register exists to answer the question before that
  moment.
- Treat the user's account standing as part of the blast radius. A lane that
  endangers the user's accounts carries a cost no throughput number can offset.
- Rows are dated. Terms change; a verdict belongs to a date.

## 7. Personal-space operating rules

Operating on someone's machine, browser, or accounts is a privilege with a
narrow shape.

- **Scope.** One named target surface at a time: one window, one account, one
  session. If the target is ambiguous, stop and confirm which surface.
- **Read-only default.** A write happens only when it is explicitly authorized,
  in writing, for that surface. Everything else is read.
- **No unrelated content.** Never open, read, or capture anything the task did
  not name. Discovered private material is not data; it is a boundary.
- **No environment changes.** Never relaunch, reconfigure, update, or close the
  user's tools. The agent is a guest.
- **User-driven logins.** The human logs in; the agent acts only on an explicit
  signal and then works only inside the sanctioned surface.
- **Minimum persistence.** Keep only the agreed session material, in the agreed
  format, and delete plaintext traces when finished.
- **No surprise.** From the description alone, the user should be able to
  predict everything the agent does. A hidden side effect is a defect even when
  the result is welcome.

Test before finishing: did the user lose a window, a session, or a piece of
context? Did anything get read that was not asked for? A single yes resets the
work, and repeat offenses end the collaboration.

## 8. The async check-in template

Written at safe boundaries: after milestones, before irreversible operations,
on budget stops, and whenever judgment is needed. It parks decisions instead of
blocking the loop.

```
Check-in — <date> — <run id>
Done:       <milestones since last check-in, with receipts>
Decisions:  <what was decided, and why>
Next:       <the next action, and what follows it>
Asks:       <what needs human judgment, each with a default if none arrives>
Gates:      <any irreversible action waiting for approval, with preview>
Blocked:    <obstacles, evidence, and the precise resume path>
```

Only the **Gates** line blocks the run; everything else keeps moving on its
default. Interactive questions mid-run are how long work stalls; a milestone
check-in is how long work stays reviewable. A human reading only the check-ins
should be able to reconstruct the run.

## 9. Publication checklist

Run this per item before anything ships, and record the verdict.

1. **Banned-token scan.** Names, domains, addresses, paths, ports — the
   maintained list, every file, case-insensitive.
2. **Secret-pattern scan.** Key shapes, token shapes, address shapes, across
   every file, example, and artifact.
3. **Abstraction pass (manual).** Replace each specific with its class: a
   deployment becomes "a hosted environment"; a schedule becomes "a recurring
   window"; a real domain becomes a reserved example domain. Examples must run
   against generic or reserved values only.
4. **Value test.** If a passage's value depends on a particular system being
   left unprotected, cut it. The transferable engineering lesson ships; the
   target-specific instantiation does not.
5. **Independent review.** One security and ethics review, one method and
   clarity review, by readers who did not write the item. Findings are fixed
   before shipping; clean scans do not replace review.
6. **Verdict.** Write the per-item outcome: ship, cut, or parked with a ruling.
   No silent discards. Record the scans and reviews alongside the verdict.

Publication is a gate like any other: it has a preview (the reviewed item), an
approval (the written verdict), and a refusal state (parked, not shipped). The
same discipline that protects the engagement protects the user.

## 10. Fences exit-gate checklist

- [ ] Scope statement written, dated, and kept with the run log; ambiguities
      asked, not guessed.
- [ ] Every surface classified none, silent, or interactive, with the probe and
      date recorded; unknown treated as interactive.
- [ ] Every irreversible, public, or money action behind a gate that was
      verified by the refusal drill.
- [ ] Defensive-posture signals defined, and the cooldown protocol exercised
      when one appeared.
- [ ] Every interactive step in the workflow diagram as a human handoff with a
      resume signal; no substitute machinery exists.
- [ ] Risk register rows carry quoted clauses, blast radius, mitigation, and
      dated keep/drop verdicts.
- [ ] Personal-space rules observed: scoped, read-only unless authorized, user
      driven logins, minimum persistence.
- [ ] Check-ins written at boundaries and before every gate.
- [ ] Publication items passed scans, abstraction, independent review, and a
      written verdict.
