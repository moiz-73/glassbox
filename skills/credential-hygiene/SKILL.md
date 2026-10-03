---
name: credential-hygiene
description: >-
  Design and operate the credential path for systems you are authorized to
  integrate with: session-over-key choice, portability and cold-start testing,
  mid-run refresh, units pooled with health and cooldowns, standard consent
  and device authorization flows, human-driven logins, recovery drills, secret
  hygiene, and envelope encryption across untrusted transport. Use when
  sessions, tokens, or keys are involved and the path must survive expiry,
  loss, or exposure. Not for classifying protection surfaces (`recon`) or
  modeling flow state machines (`flow-modeling`).
license: MIT
metadata:
  version: 1.0.0
---

# Credential Hygiene

Credentials are the most fragile and most sensitive part of any integration:
they expire, they leak through logs, and their exposure is effectively total
the moment it is suspected. This skill is the operating method for the
credential path of systems you own or are authorized to work with —
credentials the user owns, logins the user performs, consent-based
authorization flows — and the material that path carries.

The governing idea:

> **Choose the least durable exposure that does the job, and build the path
> so the credential can die without killing the work.**

Least durable means a live session is preferred over a stored key, and a
narrowly scoped key over a full-privilege one, because a credential that is
harder to copy, easier to revoke, and shorter-lived limits the blast radius of
the one event you cannot undo: a leak.

## Decision table

| Situation | Action | Load |
|---|---|---|
| Sessions, keys, or both are available | Inventory the classes; choose the least durable that serves the job | Method 1-2 |
| Moving a session to a new context or machine | Run the cold-start portability test first | Method 3 |
| Credentials expire mid-run | Model the refresh treadmill; refresh proactively | Method 4 |
| Several credentials serve one workload | Design the pool: health, cooldowns, per-unit in-flight | Method 5 |
| Authorization is a standard consent or device flow | Follow the standard; test approval, denial, expiry | Method 6 |
| A step requires a human to log in | Treat the human as the login surface; read only the target | Method 7 |
| The primary credential path died | Drill the recovery lane with a freshness discriminator | Method 8 |
| A secret could reach a log, artifact, or channel | Apply secret hygiene and envelope encryption | Method 9 |
| Operating on a user's machine or accounts | Follow personal-space etiquette | Method 10 |
| About to claim the credential path works | Gate the claim with `evidence-protocol` | `evidence-protocol` |

## Golden rules

1. **Exposure is total.** Once a credential is suspected of exposure, treat it
   as disclosed: rotate or revoke first, investigate second. Partial trust in
   a possibly-leaked secret is how a small incident becomes a large one.
2. **The human drives the login.** When authorization requires a person, the
   correct design is a human step with an explicit signal — not an engineering
   problem to route around. A system that requires a person has told you where
   its boundary is.
3. **Least durable exposure wins.** Live session over stored key; scoped key
   over full-privilege key. The class you choose decides your revocation story
   years before you need it.
4. **Keep secrets out by construction.** A rule that depends on remembering to
   redact fails eventually. Design the path so values never enter a log,
   artifact, or channel in the first place; reports carry lengths and labels.
5. **One unit failing is not the workload failing.** A pool disables the unit,
   applies the cooldown class for the failure, and continues. Disabling the
   whole workload on one shared error turns a local event into an outage.
6. **Encrypt before the boundary.** Anything crossing a shared or public
   channel leaves encrypted: a fresh per-payload data key wrapped to a public
   key whose private half stays at the trusted end.
7. **Drill recovery before you need it.** A fallback that has never been
   exercised is a hope. Prove it independently, and prove freshness, because a
   stale success signal and a live one look identical in a report.

## The method

### 1. Inventory the credential classes

List every credential the integration can use, and for each record: what it
carries, how it is obtained, how long it lives, what it can do, how it is
revoked, and where it is stored. Two classes usually dominate — a long-lived
static key and a live session minted through an interactive context — and they
fail in different ways. The inventory turns every later choice into a lookup
instead of a debate.

### 2. Choose the least durable exposure

Prefer the class with the smallest blast radius: a live session over a stored
key where policy allows, a scoped key over a full-privilege one. Understand
what each class carries before relying on it: material minted when a session
was created behaves differently from a static secret, and not every context
accepts it. Write the choice down with its revocation story.

### 3. Prove portability with a cold-start test

Moving a credential between contexts is a hypothesis until tested. Build the
cold-start test: import the credential into a clean context and exercise one
authenticated call from a clean state. Often only a token is portable and the
fresh context mints its own surrounding state; never assume the whole store
must travel. Persist the export format the import expects, keep it out of
shared logs, and re-read fresh state rather than caching it.

### 4. Keep the refresh treadmill honest

Model the credential's lifetime before the run starts: what expires, when, and
what renews it. Refresh proactively before expiry and count the refreshes so
the treadmill is visible. When a call fails with an authorization error,
refresh once and retry; if the retry also fails, disable that unit and move on.
Manual one-off refreshes under pressure are how mid-run expiry walls are
discovered at the worst moment.

### 5. Run credential pools as stateful units

When several credentials serve one workload, pick the least-busy unit by a
latency score with a recency tiebreak; naive rotation ignores which unit is
currently fast. Give every failure class a cooldown rule: an authorization
failure disables the unit; a rate-window failure gets a timed cooldown; a busy
or race condition switches units immediately with no penalty. Load the
registry once and refresh it periodically, preserving live cooldown and score
state. Never exceed the per-unit in-flight limit upstream enforces;
parallelism comes from distinct units, not from parallel calls on one.

### 6. Walk standard consent flows completely

For standard consent and device-authorization flows: request the consent or
device code, present it, then poll or await the callback with the nonce intact.
The explicit approval step is part of the contract — a flow that is never
approved will keep polling pending, and that is correct behavior, not a defect
to route around. Exchange the approved code for tokens, store them by the
secret rules, and test the full loop including denial and expiry. The denial
path is where implementations are usually wrong.

### 7. Treat the human as the login surface

When authorization requires an interactive login, the person performs it and
the agent waits for an explicit signal. Scope strictly to the target surface:
one place, one read, nothing else; never touch unrelated personal content;
never relaunch or reconfigure the person's tools. Record lengths, never
values. Re-read fresh every time rather than caching, persist only the agreed
session material, and confirm exactly one session per identity. The reference
playbook carries the full collection etiquette.

### 8. Drill the recovery lane

Verify the recovery path independently of the primary: a different token
format, a different delivery class, a different endpoint. Probe the recovery
path's own limits and add pacing. Establish a baseline before trusting any
"recovered" signal, because recycled or stale resources produce convincing
false positives. Record the exact discriminator that proved freshness — that
discriminator is the deliverable of the drill, not the success message.

### 9. Apply secret hygiene and envelope encryption

Secrets are toxic waste: out of logs, out of commits, out of shared channels.
Redact at the source with quiet modes and lengths-only reporting, keep tokens
only where the next authorized step consumes them, delete plaintext
temporaries after transfer, and exclude secret-shaped patterns from version
control by default. When results must cross an untrusted boundary,
envelope-encrypt first: a fresh per-payload data key encrypts with
AES-256-GCM; the data key is wrapped with RSA-OAEP to a public key whose
private half stays local; only ciphertext and the wrapped key travel; decrypt
and merge at the trusted end. Respect the key-wrap size limit, and verify a
full round-trip before relying on it.

### 10. Keep personal space personal

When operating on a user's machine or accounts: scope to exactly the target
surface, stay read-only unless explicitly authorized, never read or capture
unrelated content, and persist nothing personal beyond the agreed session
material. The user never loses a tab, a window, or a session to the agent.
Zero scope violations is the quality bar, and repeated collections that meet
it are what make the workflow trustworthy.

**Exit gate.** Every credential in use has a written class, scope, storage
location, revocation story, refresh story, and a proven path from a clean
start. Nothing secret appears in any log or artifact.

## When NOT to use

- Classifying protection posture or mapping surfaces — use `recon`; this
  skill consumes its classification, it does not produce it.
- Designing the state machine for a multi-step flow — use `flow-modeling`;
  credential handling is one transition inside that model.
- Proving that a path works — use `evidence-protocol`; this skill designs the
  path, that skill gates the claim.
- Anything outside your authorization. Work with credentials you own or are
  explicitly authorized to use; when the basis is unclear, stop and ask.

## References

- `references/credential-playbooks.md` — detailed playbooks for class
  inventory, portability, refresh, pools, consent flows, human-driven login
  collection, recovery drills, secret hygiene, envelope encryption, and
  personal-space etiquette. Read it when designing or debugging a credential
  path end to end.
- `deep-reverse-engineering` — the parent loop; credential design is Execute
  phase work.
- `evidence-protocol` — how to prove the credential path works.
- `honest-fences` — authorization and boundary doctrine.
