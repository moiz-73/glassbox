# Credential Playbooks

Companion to `credential-hygiene/SKILL.md`. Read the playbook that matches the
moment; each is independent, and each closes with the failure it prevents.

Contents:

1. Credential class inventory
2. Portability and cold-start testing
3. The refresh treadmill
4. Unit pools
5. Consent and device authorization
6. Human-driven login collection
7. Recovery drills
8. Secret hygiene checklist
9. Envelope encryption across untrusted transport
10. Personal-space etiquette checklist
11. Stop conditions

---

## 1. Credential class inventory

**Use when** the integration can use more than one credential class and the
choice keeps being re-litigated.

Record one row per class:

| Class | Carries | Lifetime | Scope control | Revocation | Storage |
|---|---|---|---|---|---|
| Live session | Material minted when the context was created | Short, renewable | The creating context | Revoke the session | Where the next authorized step consumes it |
| Scoped static key | A standing secret | Until revoked | The key's own scope | Revoke the key | Encrypted at rest, never logged |
| Short-lived token with refresh pair | Access plus renewal material | Minutes to hours | The grant's scope | Revoke the refresh pair | Encrypted at rest, refresh in process |
| Delegated consent grant | A user's explicit approval | Until expired or revoked | The requested scopes | User or operator revocation | Token store at the trusted end |

**Quality bar.** Every class has a written exposure and revocation story, so
"which credential should this use?" is a lookup, not a debate.

**Prevents.** Choosing a class by habit, then discovering at incident time
that nobody knows how to revoke it.

## 2. Portability and cold-start testing

**Use when** a credential must move between contexts, machines, or processes.

1. Export in the format the import path expects; name the format in the
   inventory.
2. Import into a clean context with no leftover transport state.
3. Exercise exactly one authenticated call from that clean state.
4. Record the result with a date; repeat once to distinguish portability from
   luck.
5. Establish what actually travels. Often a token is portable while the fresh
   context mints its own surrounding state; never ship more material than the
   test proves necessary.
6. Keep the export out of shared logs, and delete any plaintext copy that is
   no longer needed.

**Quality bar.** A clean-context cold start succeeds from the export alone,
twice, with the export never entering a shared log.

**Prevents.** Shipping an entire stored context where a single token would do;
building on portability that was assumed and never tested.

## 3. The refresh treadmill

**Use when** credentials expire mid-run.

Model the clocks first:

| Clock | Question | Record |
|---|---|---|
| Lifetime | When does this credential stop working? | Expiry moment from the response, not from memory |
| Refresh trigger | What renews it, and when? | Proactive margin before expiry |
| Retry policy | What happens on one authorization failure? | Refresh once, retry once |
| Disable policy | What happens on the second failure? | Disable the unit; do not retry it |
| Refresh storm | Do many workers refresh at once? | Stagger refreshes across units |

Refresh proactively, and count refreshes so the treadmill is visible in the
run report. A soak test should show zero mid-run expiry failures; manual
one-off refreshes under pressure are how runs die at the worst moment.

**Quality bar.** No mid-run expiry failures across a soak test; refresh counts
visible in the log.

**Prevents.** Refresh storms from many workers hitting the renewal path at the
same instant; expiry discovered hours later in a failed batch.

## 4. Unit pools

**Use when** multiple credentials serve one workload, or one credential must
not be used concurrently.

Selection rule: pick the least-busy unit by a latency score with a recency
tiebreak. Naive rotation sends work to a unit that happens to be slow because
it ignores the only signal that matters.

Cooldown classes — one behavior per class:

| Failure class | Meaning | Reaction |
|---|---|---|
| Authorization failure | The unit's credential may be stale | Refresh once and retry; if it still fails, disable the unit |
| Rate-window failure | A window is closed | Timed cooldown until the reset moment, plus jitter |
| Busy or race | The unit is in use | Switch units immediately; no penalty |
| Platform degraded | The upstream is unwell | Pause the lane; keep one low-frequency probe |

Load the registry once, refresh it periodically, and preserve live cooldown
and score state across refreshes; re-reading the registry per request throws
away the pool's memory. Never exceed the per-unit in-flight limit upstream
enforces. Parallelism comes from distinct units, not from parallel calls on
one unit.

**Quality bar.** A health view showing each unit's state and the workload
distribution; no unit disabled by an error that belonged to a shared gate.

**Prevents.** Disabling the whole workload on one shared error; blind
rotation; registry refreshes that lose cooldown state.

## 5. Consent and device authorization

**Use when** authorization follows a standard consent or device-authorization
flow (for example the OAuth 2.0 device flow).

State machine, derived from the standard rather than from imagination:

```
request -> present -> pending -> {approved | denied | expired}
approved -> exchange -> tokens -> stored
pending -> poll or callback (nonce intact) -> pending ...
```

- Present the code or consent request exactly as the standard specifies.
- The explicit approval step is part of the contract: a flow that is never
  approved keeps polling pending, and that is correct behavior.
- Poll with the standard's minimum interval and backoff; treat pending as
  non-terminal.
- Bind the nonce and carry it through the approval step.
- Test the full loop including denial and expiry — the denial path is where
  implementations are usually wrong.
- Store exchanged tokens by the rules in playbook 8.

**Quality bar.** An end-to-end test exercising approval, denial, and expiry,
with each state mapped to a persisted field and a log line.

**Prevents.** Treating a pending poll as terminal; losing the nonce binding;
testing only the happy path.

## 6. Human-driven login collection

**Use when** a login must be performed by a person, and the agent's job is to
collect the resulting session material.

1. The person drives the login; the agent waits for an explicit signal that it
   is complete.
2. Scope to exactly the target surface: one place, one read, nothing else.
3. Read-only, always. Never modify, never navigate away, never relaunch or
   reconfigure the person's tools.
4. Record lengths and counts, never values, in any log or report.
5. Re-read fresh every time; do not cache what can be re-read.
6. Persist only the agreed session material, in the agreed format, and confirm
   the count.
7. Confirm exactly one session per identity; duplicates are a hygiene defect.

**Quality bar.** Repeated collections with zero scope violations; the person
never loses a tab, window, or session to the agent.

**Prevents.** Reading unrelated personal content; stale caches; duplicate
sessions; logs that would embarrass everyone if pasted into a shared channel.

## 7. Recovery drills

**Use when** a primary credential path breaks and a fallback must be proven
before it is needed.

1. Verify the recovery path independently: a different token format, a
   different delivery class, a different endpoint.
2. Probe the recovery path's own limits and pace accordingly.
3. Capture a baseline before trusting any "recovered" signal — recycled or
   stale resources produce convincing false positives.
4. Determine a freshness discriminator: the field that would differ if the
   recovered material were stale.
5. Record the drill: path, baseline, discriminator, result, date.

| Signal | Could be stale? | Discriminator |
|---|---|---|
| A resource appears | Yes, recycled from earlier work | A sequence, timestamp, or count that must be newer than the baseline |
| An operation reports success | Yes, cached or echoed | A downstream effect read back independently |
| A value matches | Possibly a leftover | A nonce known to be unique to this attempt |

**Quality bar.** A recovery drill with an explicit freshness discriminator,
not just a success message.

**Prevents.** Trusting stale artifacts; confusing an acknowledgment with a
completed state change.

## 8. Secret hygiene checklist

- Secret values never enter logs; reports carry lengths, labels, and counts.
- A credential lives only where the next authorized step consumes it.
- Plaintext temporaries are deleted after transfer, not "later".
- Secret-shaped file patterns are excluded from version control by default.
- Error handling never echoes the credential back in a message.
- A pattern scan over logs and artifacts returns zero hits before any handoff.

**Quality bar.** The scan is clean, and cheap enough to run often.

**Prevents.** Keys printed in run logs; plaintext temporaries left on disk;
secrets committed even briefly.

## 9. Envelope encryption across untrusted transport

**Use when** results must cross a shared, public, or otherwise untrusted
channel.

1. Generate a fresh data key per payload.
2. Encrypt the payload with AES-256-GCM, keeping the initialization vector and
   the authentication tag with the ciphertext.
3. Wrap the data key with RSA-OAEP using a public key whose private half stays
   at the trusted end.
4. Publish only the ciphertext plus the wrapped key; commit nothing else.
5. Respect the key-wrap payload overhead limit: keep payloads under it, or
   chunk deliberately with a planned reassembly.
6. Decrypt and merge at the trusted end; delete plaintext temporaries after
   transfer.
7. Verify a full round-trip, then scan the channel to confirm it contains
   ciphertext only.

**Quality bar.** Round-trip proof, and a channel scan showing no plaintext.

**Prevents.** Plaintext crossing a boundary "just once"; a private key stored
near the channel it protects.

## 10. Personal-space etiquette checklist

- Exactly one target surface is touched; nothing else is read.
- Read-only unless explicitly authorized, and the authorization is written
  down.
- No captures of unrelated content; nothing off-target is photographed or
  copied.
- The person's tools are never relaunched, reconfigured, or updated by the
  agent.
- Nothing personal is persisted beyond the agreed session material.
- The person never loses a tab, a window, or a session to the agent.

**Quality bar.** Zero scope violations across repeated sessions; the person
would not be surprised to watch a recording of the entire run.

**Prevents.** The trust-destroying incident that ends this collaboration and
every future one like it.

## 11. Stop conditions

- **Rotate first on suspicion.** A possibly-exposed credential is treated as
  disclosed; investigation happens after rotation, not instead of it.
- **Human boundary.** When a step requires a person, hand it to the person;
  when authorization is unclear, stop and ask.
- **Blocked with evidence.** After three distinct failures on a credential
  path, write the blocker with what was tried, what happened, and what would
  unblock it — then move on to the next workable item.

"Keep trying" is not a stop condition, and neither is continuing on a secret
that may already be gone.
