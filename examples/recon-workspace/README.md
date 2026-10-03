# Recon Workspace Example

A worked example of the glassbox loop applied to a fictional partner API at
`api.example.com`. Everything here is invented: host names, identifiers,
measurements, and dates. No real credentials, systems, or people appear
anywhere.

The workspace is the durable state of one short engagement. Each file maps to
one phase of the loop, so a fresh session with zero context can read the
workspace and continue the work correctly.

| File | Phase | Contents |
|---|---|---|
| [journal.md](journal.md) | Perceive, Execute | Dated timeline of captures, probes, and plan changes |
| [protocol-map.md](protocol-map.md) | Model | Derived contract, error census, limits, and state machine |
| [evidence-log.md](evidence-log.md) | Verify | Commands, observed results, and evidence grades |
| [memory/lessons.md](memory/lessons.md) | Evolve | Reusable failure lessons, deduplicated by symptom |
| [memory/state.md](memory/state.md) | Evolve | Verified facts with dates and grades |

## How to read it

1. Start with [journal.md](journal.md): it shows what was observed, when, and
   which observations changed the plan.
2. Read [protocol-map.md](protocol-map.md) as the derived model: the contract,
   the error census, the limits, and the job state machine.
3. Check [evidence-log.md](evidence-log.md) for the commands behind each
   claim. Every entry pairs a generic command with an observed result.
4. Finish with the memory files. [memory/lessons.md](memory/lessons.md) holds
   failure lessons by symptom; [memory/state.md](memory/state.md) holds the
   dated facts the next session should trust first.

## Conventions used

- Grades: `[OBS]` observed live, `[REP]` reported secondhand, `[INF]` inferred
  and untested.
- Placeholders: `$BASE` stands for the fictional host, `$TOKEN` for a
  credential, and `$CURSOR` for a pagination cursor.
- Every volatile number carries a date, because numbers decay.
- The workspace is the only state that survives a session; nothing load-bearing
  lives only in a conversation.
