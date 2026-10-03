# Bridging Dialects — field manual

Long-form companion to `protocol-cartography/SKILL.md`. Read it when the same
capability exists on several routes, when two dialects must interoperate, when
conversations span multiple turns, or when callers are validated against a
sanctioned client shape.

Contents:

1. Route-variant mapping
2. Bidirectional dialect conversion
3. Action and tool turn structures
4. Multi-turn threading keys
5. Sanctioned-client validation
6. Worked generic examples
7. Checklist

---

## 1. Route-variant mapping

One capability, several routes: streaming and non-streaming variants,
different service tiers, different protocol dialects. They are not
interchangeable, and their error domains differ.

Procedure:

1. Enumerate every route that can serve the capability, using captures rather
   than assumptions.
2. Benchmark each on the same workload in the same window: latency (median
   and tail), throughput, error profile, and feature support.
3. Probe each route's error domain separately. A validation or limit that
   exists on one route may be absent on another; a rejection on the shared
   front door is not proof about a specific route.
4. Write the routing policy: a default route, when to prefer each variant,
   and a fallback order. Re-probe before blaming credentials for a
   route-level failure.

| Route | Strength observed | Error domain | Role in policy |
|---|---|---|---|
| Streaming | Incremental output, interactive feel | Errors appear mid-stream | Default for interactive work |
| Non-streaming | Simpler, sometimes faster to complete | Errors at response time | Default for batch work |
| Alternate dialect | Compatibility with a legacy client | Different field names, same semantics | Fallback and migration target |

Re-probe routes after any incident; route behavior drifts with platform
changes, and yesterday's fast route is tomorrow's gated one.

## 2. Bidirectional dialect conversion

Bridging two dialects means writing an explicit mapping in both directions —
request shape and response shape — and testing the loop end to end.

Mapping categories that must each be accounted for:

| Category | Request direction | Response direction |
|---|---|---|
| Field placement | Where the instruction text lives | Where the answer text lives |
| Action definitions | How callable actions are declared | How action requests are returned |
| Action results | How results are attached to the conversation | How results are acknowledged |
| Stop reasons | Mapping each side's vocabulary | Mapping back without loss |
| Usage fields | Accepting either shape | Reporting both or normalizing one |
| Turn structure | Whether turns must alternate | Merging consecutive action turns |

Rules:

- Convert structurally. Never stringify one side's objects into the other;
  object-to-string artifacts cause loops that never terminate and results
  that cannot be parsed back.
- Normalize stop reason vocabularies explicitly. A bridge that passes an
  unknown stop reason through produces clients that wait forever.
- Handle turns the target dialect forbids — many dialects allow only
  alternating turns, so consecutive action results must be merged in order.
- Keep conversion fixtures for regression. Every fix to the bridge comes with
  a fixture that exercises the failure it fixed.

Exit gate: an end-to-end action loop through the bridge returns the same
final answer as a direct run, and every mapping category has a fixture.

## 3. Action and tool turn structures

Action loops are where dialect bridges fail in practice.

1. Convert an action request from the source dialect into the target
   dialect's declaration, preserving names, argument schemas, and required
   fields.
2. When the target returns an action call, convert it into the source
   dialect's block structure without losing the correlation identifier.
3. Attach the result to the correct turn. A result attached to the wrong
   parent silently changes the conversation's meaning.
4. Announce then provide arguments as separate events where the dialect
   distinguishes them; do not merge them.
5. Test the loop with a task that requires two sequential actions, then a
   final answer. One-action loops hide ordering defects.

Anti-patterns: partial conversion that causes an infinite action loop;
treating an action result as plain text; losing the correlation identifier
between request and result.

## 4. Multi-turn threading keys

Conversational and stateful flows thread turns together with identifiers.

| Field | Meaning | Persistence rule |
|---|---|---|
| Session or conversation id | Names the thread | Persist once, reuse on every turn |
| Parent message id | The message being continued | Set to the previous returned tip |
| Tip id | The newest message | Persist after every turn; it is the next parent |
| Branch marker | Distinguishes branches from one thread | Record when a branch is taken |

Discipline:

- Persist identifiers after every turn; do not hold them only in memory.
- The returned tip is the next turn's parent. After a branch, the old parent
  is no longer the tip — reusing it silently forks or corrupts the thread.
- Do not trust a platform's implied memory across threads. Per-context
  resources may not survive across conversations even when the interface
  suggests otherwise.
- Test a two-turn recall explicitly: turn one states a fact, turn two asks
  for it, and the result is stored as a fixture with the persisted keys that
  produced it.

Exit gate: recall works from persisted state alone; a restart between turns
changes nothing.

## 5. Sanctioned-client validation

Some platforms validate that incoming calls carry the shape of their own
sanctioned client. That validation is an authorization boundary, not an
obstacle: it is the platform separating sanctioned integrations from unknown
callers and saying who may integrate.

Work from the sanctioned path. When the accepted shape or version changes,
use the platform's documented update process; if there is no documented
process, or it is unclear whether the integration is covered, stop and ask.

Operating discipline:

- Keep a canary call whose failure is loud; a tightened validation should
  announce itself, not appear as a mystery outage.
- Track the platform's client version as a dated observation; re-check it
  rather than trusting memory.

This pack never covers presenting an unsanctioned caller as a sanctioned one.
Interactive surfaces route to a human (`honest-fences`).

## 6. Worked generic examples

**Bridging dialects for an authorized integration.** A team integrates two
systems: one speaks a request/response dialect, the other an action-calling
dialect. They write the mapping table from section 2, build a fixture set
from real captures, and run a two-action loop end to end. The first attempt
produces consecutive action turns that the target rejects; the fix merges
them, and a fixture keeps the fix permanent.

**Setting route policy.** A gateway can serve interactive sessions from a
streaming route and batch jobs from a non-streaming route. Benchmarks show
the non-streaming route completes faster but cannot stream. The written
policy routes by workload type, with the streaming route as the interactive
default and the alternate dialect as fallback, and each route's error domain
documented separately.

**Threading across turns.** A conversational flow persists the session id and
tip id after each turn. A restart occurs between turns; the next process
loads the tip from disk and continues without the conversation noticing.
A recall fixture proves it.

## 7. Checklist

- [ ] Route variants enumerated; each benchmarked in the same window.
- [ ] Route error domains probed separately; routing policy written with
      fallbacks.
- [ ] Dialect mapping covers every category in section 2, both directions.
- [ ] Structural conversion only; no stringified objects cross the bridge.
- [ ] Action loop tested with at least two sequential actions.
- [ ] Threading keys persisted after every turn; recall fixture stored.
- [ ] Sanctioned-client validation documented as a contract dimension with a
      canary and a version-tracking note.
- [ ] Every fixture and capture dated; drift re-probed after platform
      changes.
