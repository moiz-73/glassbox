# Verification Playbooks

Companion to `evidence-protocol/SKILL.md`. Each playbook states when to use
it, the procedure, the quality bar, and the failure it prevents.

Contents:

1. Gate function worksheet
2. Claim-to-evidence map, expanded
3. Falsification and red-green
4. Airtight probes and end-to-end verification
5. Independent verification of delegated work
6. Negative verification
7. Back-to-back benchmarking
8. Stress validation
9. Sampling audits
10. Deliverable verification
11. Failure forensics
12. Evidence journal and honest reporting
13. Stop conditions

---

## 1. Gate function worksheet

**Use when** any successful status is about to be stated.

Record one row per claim before speaking:

| Claim | Proving command | Run when | Output summary | Failures counted | Verdict |
|---|---|---|---|---|---|
| e.g. the export job is complete | the job status read plus the consumer's read-back | same turn | status completed; consumer returned the row | 0 | confirmed |

Procedure: identify the command; run it fresh; read the entire output and exit
status; count failures; judge whether the output confirms the claim; state the
claim with the evidence attached. Skipping a step is not verifying.

**Quality bar.** Anyone can re-run the exact command and see the same evidence.

**Prevents.** Partial commands; extrapolation from an earlier run; reading only
the word that looks reassuring.

## 2. Claim-to-evidence map, expanded

**Use when** choosing the instrument for a claim.

| Claim | Required evidence | Substitution that must not pass |
|---|---|---|
| Unit tests pass | Runner output, zero failures counted | "mostly green", truncated output |
| Integration tests pass | Runner output over the integrated result | isolated branch results |
| Linter or formatter clean | Tool output | an editor that formats on save |
| Type check clean | Checker output | the build that skipped the checker |
| Build succeeds | Exit status zero plus the artifact produced | exit status alone |
| Bug fixed | The original reproduction command now passes | a new test that avoided the bug |
| Regression covered | Red-green cycle on the new check | a check added after the fix |
| Config change applied | Effective config read back from the running system | the edited file |
| Deployment live | A request to the deployed surface returns the expected shape | the deploy pipeline status |
| Data migrated | Before and after counts reconciled | the migration script's log line |
| Performance improved | Same-window benchmark, medians and tails | a single fast request |
| Artifact produced | Bytes, shape, hash, content markers | the producer's success line |
| Documentation updated | The doc's own example executed | rendering without errors |
| Delegated work done | Diff inspected and check re-run by the receiver | the worker's summary |
| Requirement met | Line-by-line checklist against the plan | the implementation list |
| Nothing was sent | Before/after captures with a freshness discriminator | absence of an error |

**Quality bar.** The evidence type matches the claim type, every time.

**Prevents.** The convenience substitution — the single most common way a
verification step becomes theater.

## 3. Falsification and red-green

**Use when** a check, test, or guard is new or changed.

1. Write the check.
2. Watch it pass.
3. Remove or revert the behavior it protects.
4. Watch it fail — and confirm it fails for the expected reason, not a typo,
   a broken invocation, or an unrelated crash.
5. Restore the behavior.
6. Watch it pass again.

For expected-failure cases, invert the expectation explicitly: assert the
error class, not merely that something failed.

**Quality bar.** Every check has been observed failing for the right reason
before it was observed passing.

**Prevents.** Checks that assert on mocks rather than behavior; checks written
after the code, which pass immediately and prove nothing; weakening a check to
make it pass.

## 4. Airtight probes and end-to-end verification

**Use when** proving whether a path works end to end.

1. Write down terminal success for the whole chain in one sentence: the
   downstream consumer read the row, the final state changed, the recipient
   can use the result.
2. Build the smallest probe that reaches that state from a clean baseline.
3. Run it, and keep the output as the artifact.
4. Re-run it after any outage or change before resuming scale.

Terminal versus intermediate, as a habit:

| Intermediate (not enough) | Terminal (what counts) |
|---|---|
| The job reported success | The consumer read the produced data |
| The message was accepted | The destination state changed |
| The link was created | Fetching the link returns the payload |
| The endpoint returned a status | The response body has the expected shape |

**Quality bar.** Probe success equals the terminal state, verified from a
clean baseline, with the output stored.

**Prevents.** Proving a step and calling it the chain; trusting recycled
resources that carry stale success artifacts.

## 5. Independent verification of delegated work

**Use when** integrating any worker's or subagent's result.

1. Read the completion status, but treat it as a pointer.
2. Confirm the deliverable exists at the expected location.
3. Inspect the diff or content with your own eyes.
4. Run the task's own verification check yourself.
5. Record the per-worker outcome as artifact plus check output.
6. Retry a failed worker a bounded number of times, each time feeding back
   what broke; after the bound, mark it blocked with evidence.

**Quality bar.** No delegated deliverable is integrated without direct
inspection by the receiver.

**Prevents.** Trusting transcripts; integrating because a status line said
"done"; accepting an empty artifact.

## 6. Negative verification

**Use when** the question is whether something is not happening.

Capture a before state; trigger the behavior; capture the after state; repeat
across several triggers. Record the discriminator that separates fresh from
stale evidence.

| Round | Before | Trigger | After | Freshness discriminator | Verdict |
|---|---|---|---|---|---|
| 1 | counts, bytes, recent items | the action that should have an effect | same fields | the field that would differ | unchanged |
| 2 | ... | ... | ... | ... | unchanged |

**Quality bar.** A before/after table with an explicit discriminator, repeated
across triggers.

**Prevents.** One-sided logging; reading absence of errors as success;
trusting a message whose origin cannot be attributed.

## 7. Back-to-back benchmarking

**Use when** claiming one approach is faster or better.

1. Run both variants in the same window, same task mix, same parameters.
2. Repeat across several windows; capacity varies by time of day.
3. Exclude windows where either system is recovering or degraded.
4. Report medians and tails, not only averages.
5. Label each window and record the method so the comparison is reproducible.

**Quality bar.** Same-window comparisons with window labels and tail latency
included.

**Prevents.** Comparing across days; letting one number tell the whole story;
benchmarking a recovering system.

## 8. Stress validation

**Use when** declaring a system production-ready.

- Full concurrency at the intended peek level.
- Long-session and long-context runs.
- Ugly inputs: empty, oversized, malformed, duplicated, out of order.
- Interrupted and retried operations.
- Health checked after the stress, not only during it.
- A nightly soak at the steady state.
- The safe operating envelope documented: parallel level, expected tails,
  and the conditions that trigger backoff.

**Quality bar.** Stress evidence plus a documented envelope with tail behavior.

**Prevents.** Declaring done after a single request; ignoring tail latency;
skipping the post-stress check.

## 9. Sampling audits

**Use when** a large deliverable needs assurance without full cost.

1. Sample items across the deliverable, not only from the front.
2. Check each with a cheap read-only probe.
3. Record pass, warn, or fail per item with the probe output.
4. Report the sample as advisory and attach it to the deliverable.
5. Escalate failures into the normal fix path; never edit the deliverable
   inside the audit.

**Quality bar.** A sample report with itemized verdicts and the sampling
method stated.

**Prevents.** Zero verification; full-cost exhaustive audits; an audit that
rewrites what it audits.

## 10. Deliverable verification

**Use when** claiming a file or artifact was produced.

- The file exists and has nonzero bytes.
- Its shape is what the consumer expects (parseable, correct type).
- Its content markers are present (the required sections or fields).
- For downloads or transfers, hashes match byte-exactly.
- For rendered output, a headless check shows no undefined or placeholder
  artifacts.
- The path and the verification command are recorded in the report.

**Quality bar.** Artifact plus hash plus check output, all recorded.

**Prevents.** Claiming delivery from a link alone; checking size but not
content; reporting a rendered surface before it finished rendering.

## 11. Failure forensics

**Use when** something breaks and several layers could be responsible.

1. Test the same unit directly against the simplest path; this separates an
   upstream problem from a local bug.
2. Distinguish local stale state from service-side state: compare a fresh
   resource against the one you hold.
3. Classify the failure: contention, shared throttle, hard limit, credential,
   outage, or silent failure — each has a different correct reaction.
4. Write the incident into the failure catalogue: symptom, cause, fix,
   evidence, date.
5. Consult the catalogue before diagnosing the next incident.

**Quality bar.** Every incident yields a catalogue row with an evidence-backed
cause.

**Prevents.** Fixing the bridge when the backend is down; re-diagnosing a
known failure class from scratch.

## 12. Evidence journal and honest reporting

**Use when** a run is long enough that memory will fade.

Journal schema — one append-only line per event:

```
time | milestone | evidence (command + result) | counters | guard state
```

Report template:

- State reached, in one sentence, with its grade.
- Trajectory: what improved, what did not, attempts made.
- Delta table: criterion, status, evidence.
- Unresolved risks and blockers, with the precise resume path.
- Grades on every fact: observed live, reported, or inferred; dates on every
  number.

**Quality bar.** The report can be audited line by line; a reader can tell
verified from unverified.

**Prevents.** Reporting the last attempt instead of the best state; omitting
failures; mixing verified and unverified claims without labels.

## 13. Stop conditions

| Outcome | Requirement | What to hand back |
|---|---|---|
| Done | Every completion criterion has a command and observed output | The evidence log |
| Blocked | Three distinct attempts failed | What was tried, what happened, what would unblock it |
| Budget | Time or capacity is exhausted | Best state, checkpoints, resume path |
| Out of scope | The path requires a boundary you may not cross | The boundary, the decision, and the question for a human |

"Keep trying" is not a stop condition; it is a way to lose the ability to
report honestly.
