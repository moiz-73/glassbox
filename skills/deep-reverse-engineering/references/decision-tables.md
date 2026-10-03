# Decision Card — quick lookups

A one-page card for decisions that recur mid-engagement. When a row covers your
situation, act from the row; re-deliberation is how settled questions reopen.

## 1. Resolving a conflicted fact

When two sources disagree, do not choose — run this procedure:

1. Name both claims and their sources (doc version, client version, capture
   date, memory).
2. Re-probe the minimal case that distinguishes them; one live answer outranks
   every secondary source.
3. If the probe can't distinguish them, the fact is not yet needed — mark it
   `[INF]` and move on.
4. Record the resolution as a dated state fact, including which source lost.
5. If the losing source is documentation or a client, note it for drift watch —
   it will mislead the next run too.
6. If the fact is load-bearing and still conflicted, stop and ask; building on
   a coin flip is how days disappear.

## 2. Before you automate a step

| Question | If no |
|---|---|
| Is it inside the written scope? | Stop; resolve scope with the human |
| Is it a quiet class (none/silent)? | Route the step to a human |
| Do you have a rate budget for it? | Define one first |
| Will the probe see terminal success? | Design the probe before the step |
| Can the action be reversed or previewed? | Add an approval gate |

## 3. Failure class → reaction

| Class | Signal | Reaction |
|---|---|---|
| Contention | unit busy / race | Switch unit now; no penalty |
| Shared throttle | a common gate engaged | Global backoff with jitter |
| Hard limit | explicit ceiling reached | Stop until reset; no retry loop |
| Auth stale | authorization failure | Refresh once, retry once; still failing → disable unit |
| Outage | connection failures everywhere | Pause lane; keep one canary |
| Silent failure | success shape, failed payload | Treat as failure; re-probe |

## 4. Evidence grade → allowed claim

| Grade | You may say | You may not say |
|---|---|---|
| `[OBS]` fresh | "It works / it does X" + artifact | "It will always work" |
| `[OBS]` dated | "It worked on <date>" | "It works now" |
| `[REP]` | "Per the docs/client, X" | "X is true" |
| `[INF]` | "Hypothesis: X; untested" | Anything stronger |

## 5. Human handoff triggers

Hand back to a human when: a step is explicitly interactive; an action is
irreversible or public; scope is ambiguous; the system shows defensive
posture; or three distinct attempts on one blocker have failed.

## 6. Stop conditions

| Condition | Artifact left behind |
|---|---|
| Done | Evidence log: commands + observed outputs |
| Blocked | Blocker note: tried, observed, needed, resume path |
| Out of scope | Scope ruling + the point where work stopped |
| Budget exhausted | Checkpoint + partial results + next actions |
