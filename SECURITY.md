# Security policy

## Reporting a problem

Open a private security advisory on this repository — use GitHub's private
vulnerability reporting rather than a public issue. Include:

- what you found and where (file, skill, or tool),
- a minimal reproduction,
- the impact you believe it has,
- how you would like to be credited, or whether you prefer to stay anonymous.

Do not include live credentials, personal data, or details from a real
engagement in the report. Redact first; describe classes, not values.

## Scope

This repository ships instructions and read-only tooling:

- **Skills** are markdown instructions. They do not execute on their own; what
  an agent does with them is governed by `docs/ETHICS.md`.
- **The validator** (`tools/validate.mjs`) is read-only: it walks the
  repository and prints findings. It makes no network calls.
- **Installers** copy files into a chosen skills directory; they do not run
  skill content.

## What we promise

- No network calls, no telemetry, no analytics.
- No auto-execution: nothing here runs until a human or agent invokes it, and
  the validator never executes repository content.
- No secrets in the repository, not even as examples.
- Findings are acknowledged and, when valid, fixed with a note in the
  changelog.

## What must never ship

Secrets, credentials, tokens, personal data, and target-specific detail must
never appear here. The rule is stated in full in `docs/ETHICS.md` (secret
hygiene, publication discipline); everything in this repository, including
issues and pull requests, is bound by it.