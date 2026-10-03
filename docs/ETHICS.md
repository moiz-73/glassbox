# The Glassbox Ethics Charter

Glassbox teaches agents to perceive and engineer systems. Perception is
power, and this project exists because we believe that power belongs behind a
clear charter. Everything in this repository — skills, tools, examples — is
governed by the rules below. Contributions that conflict with them are
rejected, and usage that conflicts with them is not what this project is for.

## 1. Authorization first

Work only on systems you own or are explicitly authorized to work with: your
infrastructure, a client's system under an engagement, a public bug bounty
scope, an integration you were asked to build, your own accounts on services
whose terms permit your use.

Availability is not permission. A weak gate is not consent. If the basis is
unclear, stop and ask before proceeding — write down what is unclear.

## 2. Respect protection surfaces

- Classify protection honestly: none, silent, interactive.
- Automate the quiet classes within stated limits; respect them with rate
  budgets and backoff.
- Route interactive human-verification steps to a human as a designed step.
  Never engineer around them, and never build or ship material whose purpose
  is to defeat them.
- When a system shows defensive posture, stop. Cool down, probe once, resume
  slowly. Waiting is the correct move.

## 3. Human gates on irreversible acts

Sending, posting, deleting, paying, publishing — anything that cannot be taken
back — requires a preview and an explicit human approval. Gates are enforced by
construction: no code path executes the action without the approval, and no
retry turns a refusal into a send.

## 4. Personal space

When operating on someone's machine, browser, or accounts: scope to exactly
the target surface, read-only unless explicitly authorized, never touch
unrelated personal content, never capture what you were not asked to capture.
The human drives logins; the agent acts on an explicit signal.

## 5. Secret hygiene

Credentials, tokens, and personal data are toxic waste: they stay out of logs,
out of commits, out of shared channels, and out of this project entirely. No
real credentials appear in the repository, not even as examples. Data that
crosses an untrusted boundary is encrypted before it leaves.

## 6. Evidence and honesty

- No claim without an artifact. If it was not run, it cannot be claimed.
- Label inference as inference. Date every number.
- Report failures, blocks, and partial results with the same care as
  successes.
- Prefer reproducible commands over narrative.

## 7. Responsible disclosure

If you discover a vulnerability or a serious defect in a system while using
these methods: report it privately to the operator, follow their disclosure
process, and give them time to fix it. Do not publish exploitable detail, do
not sell it, do not use it beyond proving it exists.

## 8. Publication discipline

Before anything ships from this project: scan for secret-shaped and
person-identifying content, scan for target-specific detail, replace every
specific with its class, and get an independent review. If a technique's only
value depends on a specific target remaining unprotected, it does not ship.

## 9. No dual-use material

This project does not ship: identity-provisioning playbooks, protection
defeat techniques, quota circumvention doctrine, identity masking, visibility
manipulation, or anything whose primary value is extraction or evasion rather
than engineering. When a technique has both a legitimate and an abusive use,
we ship the abstract engineering lesson and leave the specific out.

## 10. Enforcement

Violations in contributions: rejected in review, with the reasoning public in
the PR. Violations in usage: outside the project's purpose; see the license
for the legal position and this charter for the ethical one.

---

*These rules are not decorations. They are the reason this project can exist
in public: it teaches power with a boundary, and the boundary is the method.*
