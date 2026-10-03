# Memory Systems — full playbook

Companion to `self-evolving-skills/SKILL.md`. Read this when you are building a
skill's memory for the first time, when a lesson needs promoting into a rule,
when the state file needs a schema migration, or when memory has to be
recovered from a loss.

Contents:

1. The triad: roles and boundaries
2. Run-log shape and redaction
3. The lesson schema in detail
4. Dedupe by symptom
5. Promotion: lesson to rule
6. Guarded parameter adaptation
7. Versioned state, changelog, backup-before-patch
8. Drift watch protocol
9. Supersession and the canonical-source rule
10. Recovery and clobber resistance
11. Fresh-session readiness checklist

---

## 1. The triad: roles and boundaries

Three files, three jobs. The most common failure is mixing them: a run log used
as the only history, or a state file carrying narrative. Keep the boundaries
sharp.

| File | Answers | Grows by | Edited? |
|---|---|---|---|
| lessons | "What has already gone wrong, and what fixes it?" | One entry per distinct symptom | Rewritten only to increment evidence or revise visibly |
| state | "What is true right now?" | Verified facts replace stale ones | Yes — atomically, with dates |
| run log | "What happened, run by run?" | One append per run | Never |

Placement: beside the skill, in plain text or line-delimited JSON, small enough
to read in one sitting. Zero infrastructure is deliberate — memory that needs a
service to read is memory that does not get read.

What belongs where:

- A changed interface limit goes in **state** (dated); the story of discovering
  it goes in the **run log**; the trap it caused goes in **lessons**.
- A one-time environment hiccup goes in the **run log** only. Lessons are for
  patterns, not for every event.
- An unresolved unknown goes in **lessons** with `status: open` and no fix —
  an honest unknown is more useful than a fabricated cause.

Retention: run logs are trimmed to a bounded tail (keep enough for
reconstruction, not every line forever). Lessons and state are never deleted;
they accumulate value.

## 2. Run-log shape and redaction

One line per run, append-only:

```
<date> | <run id> | consult: <what was checked> | outcome: <landed | failed | blocked> | receipt: <artifact or check> | notes: <one clause>
```

Rules:

- The consult field exists to prove the memory was read. A run with no consult
  is itself a recorded observation.
- The outcome uses landed/failed/blocked vocabulary so it is greppable. Never
  invent a fourth word for the same state.
- The receipt names where the proof lives (an artifact, a check output, a
  counter), not a feeling.
- Redaction is a property of the writer, not a cleanup step: secrets, personal
  data, and raw identifiers never enter the log. If a field cannot be written
  safely, write its length or a hash, never its value.
- On a later incident, the run log is the flight recorder: it should be enough
  to reconstruct what ran, when, with what outcome, without reading anything
  else.

## 3. The lesson schema in detail

One entry per distinct symptom, one screen tall, machine-readable:

```
- id: <stable key, e.g. stage + short slug>
  stage: <pipeline stage or workflow moment>
  symptom: <what is observed, normalized: stable words, no timestamps>
  root_cause: <known cause | unknown>
  fix: <the exact change or action that resolves it>
  verified_by: <the check that proved the fix works>
  evidence_count: <integer>
  first_seen: <date>
  last_seen: <date>
  status: open | patched | promoted
  links: <optional: artifacts and related lesson ids>
```

Field discipline:

- **symptom** is the dedupe key. Write it in stable words ("empty result on the
  first request after a cold start"), not with volatile values ("error at
  14:03").
- **fix** is an action a cold reader can execute. "Be careful" is not a fix.
- **verified_by** is the check that demonstrated the fix. A lesson whose fix
  has never been verified stays `open`; that label is a feature.
- **evidence_count** starts at 1 on first occurrence. It is the strongest
  signal available for promotion and adaptation decisions.
- **status**: `open` (unresolved), `patched` (fix applied and verified),
  `promoted` (now a rule — keep the lesson as the rule's evidence trail).

Habits that keep lessons useful:

- Grep-ability over narrative. A future session searches by stage and symptom.
- Never delete history. Resolved lessons remain: removal guarantees the same
  failure is re-learned. If a lesson is wrong, revise it with the correction
  visible, dated; do not silently overwrite.
- When a fix turns out to be partial, revise `fix` and reset `status` to
  `open` — with the revision dated. Silent reversals are the reason a fixed
  failure comes back.

## 4. Dedupe by symptom

Dedupe is what turns a pile of notes into a signal. Procedure, on every new
failure:

1. Normalize the symptom: drop timestamps, counts, and one-off values; keep
   the stage and the observable behavior.
2. Search the lessons for the same stage and a matching normalized symptom.
3. If a match exists: increment `evidence_count`, update `last_seen`, and
   append a dated note only if the new occurrence adds information (a variant,
   a new trigger).
4. If no match exists: create a new entry with `evidence_count: 1`.
5. If two existing entries turn out to describe one symptom: merge them under
   the earlier id, sum the counts, and mark the merged entry's history in its
   links. Merges are dated revisions, not deletions.

Why: an uncounted failure and a failure seen nine times look identical in a
loosely written journal — and only one of them deserves a rule.

## 5. Promotion: lesson to rule

A lesson that recurs is evidence of structure; a rule is a gate the run must
pass. Promote deliberately, using the checklist. A worked example of the
reasoning:

- Recurrence is real (count at least three, or one severe unambiguous case).
  One bad afternoon may be a coincidence; three is a pattern.
- The root cause is known. A rule for an unknown cause turns a symptom into
  permanent superstition.
- The fix is verified by an executed check. An unverified fix promoted to a
  rule spreads unverified behavior.
- The rule is general: it names a condition and an action, applies beyond the
  single incident, and reads as a gate ("before X, do Y; if Z, stop").
- The rule does not weaken a safety gate, a budget floor, a boundary rule, or
  another rule. Self-evolution must never erode the fences (see
  `honest-fences`).
- The rule is written into the skill, versioned, backed up before the patch,
  and its changelog entry cites the lesson id and the evidence.

Promotion is reversible. If a rule stops matching reality, demote it back to a
lesson with a dated revision explaining why: rules that outlive their evidence
are how a skill becomes confidently wrong.

## 6. Guarded parameter adaptation

Parameters (thresholds, retry counts, cadences, sizes) may adapt, but only
inside a guard. Default posture: auto-evolution off.

| Condition | Requirement |
|---|---|
| Opt-in | The parameter is explicitly marked adaptable |
| Evidence | Several consecutive consistent observations, or one clear success for a refinement |
| Direction | The change moves toward observed reality, never away from it |
| Size | Within the parameter's per-step delta cap |
| Protection | The parameter is not on the never-change list |
| Outcome | Failed runs change nothing; they produce lessons |

The **never-change list** includes: safety gates and their thresholds, budget
floors, output conventions other systems consume, cadence contracts, the
guardrails themselves, and anything whose change would alter what the skill is
allowed to do. These are read-only by construction, not by good intentions.

Adaptation record, appended to the memory, one entry per proposal:

```
- date: <date>
  parameter: <name>
  from: <value> -> to: <value>
  evidence: <lesson ids and counts, runs observed>
  state: proposed | applied | reverted
  why: <one clause>
```

Applied entries cite the evidence that cleared the threshold. Reverted entries
cite what reality taught. A silent threshold change is forbidden: it makes
every later comparison invalid.

## 7. Versioned state, changelog, backup-before-patch

State carries a schema version:

```
state:
  schema_version: <n>
  updated: <date>
  facts:
    <key>: { value: <...>, grade: <OBS|REP|INF>, date: <date> }
```

Rules:

- When the shape changes, migrate deliberately and record the migration.
  Readers interpret old files under their own version; they never guess a
  shape.
- Backup before every patch; keep the backup until the change survives at
  least one run.
- One changelog entry per self-edit, in the same place as the skill:

```
## <version> — <date>
- change: <what moved>
- evidence: <lesson ids / run ids>
- revert: <how to go back>
```

Version bumps are cheap; unrecoverable edits are not. The changelog is also
how a reviewer audits evolution without reading the whole history.

## 8. Drift watch protocol

Drift is the distance between the document and reality. Triggers to check for
it:

- A step that worked yesterday errors today.
- An observation contradicts a state fact's value.
- A shape or limit differs from the recorded one.
- A cadence or version floor no longer matches.

Protocol on detection:

1. Re-verify live — one clean observation of the new behavior.
2. Treat the written state as wrong: update it and date the correction.
3. Record a lesson: symptom, cause (or unknown), the fix, evidence.
4. Fix the document in the same session. Deferred drift becomes confident
   wrong actions tomorrow.
5. Mark superseded paths explicitly as history, separated from instructions.

Write documents that can be checked: "verify this with X" beats an assumption.
A document that follows the wire is worth more than one that describes it from
memory.

## 9. Supersession and the canonical-source rule

- One canonical document per capability. Everything else points at it.
- Retire a superseded document with a pointer at the top: "superseded by X,
  dated Y." Never leave two current-looking documents.
- Keep a compatibility alias for one release when an old habit or import
  depends on the old name; aliasing is cheaper than a broken workflow.
- Reference shared doctrine; do not copy it. Copies drift, and the next
  session reads whichever copy it finds first.

## 10. Recovery and clobber resistance

Design memory so any single file can be lost without losing history.

Write discipline:

- Atomic writes: full content to a temp file, flush, rename over the target.
- Encoding discipline: write and read one encoding; strip serialization
  artifacts (for example a leading marker some serializers inject) on load.
- Loaders throw on corruption. Silent empty-default loads are the classic
  clobber: a missing read becomes an empty write, and good data is gone.
- Back up before overwrite; keep the backup until the new state proves itself.

Recovery procedure:

1. Identify the most durable store (run log first; backups second; downstream
   artifacts third).
2. Reconstruct the state by streaming from that store — never from memory of
   what it probably said.
3. Verify every recovered load-bearing fact against live reality; label the
   unverifiable ones `[INF]` until checked.
4. Write the recovered state atomically, bump `updated`, and log the recovery
   as a lesson with the discriminator that proved the recovery real.

Corruption drill: on a scratch copy, truncate one memory file, confirm the
loader throws rather than defaulting, restore from the backup, and confirm the
recovered state matches the live system. A recovery path that has never been
drilled is a plan, not a path.

## 11. Fresh-session readiness checklist

- [ ] The triad exists beside the skill and is readable in one sitting.
- [ ] A cold session can state the current truth and the known traps from the
      files alone, without asking the human.
- [ ] Every lesson has a symptom key, a fix or an honest unknown, a count, and
      two dates.
- [ ] Every rule traces to a promoted lesson with verified evidence.
- [ ] Every parameter change has an adaptation record; the never-change list is
      explicit.
- [ ] The state has a schema version and a migration note if the shape changed.
- [ ] Every self-edit has a changelog entry and a rollback path.
- [ ] The run log is append-only, redacted, and sufficient for reconstruction.
- [ ] The corruption drill passes: one file lost, state recovered, facts
      re-verified against reality.
