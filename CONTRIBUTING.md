# Contributing to Glassbox

Thank you for helping build the perception layer for agents. This project ships
*executable instructions* — skills are code, and they are reviewed like code.

## What we accept

- **Skills** that teach a transferable engineering method: perception,
  modeling, execution harnesses, verification, review, durable autonomy.
- **Field notes** (`docs/field-notes/`): short, sanitized case studies of a
  method, assembled and rewritten until no system, value, or name survives.
  Useful, reproducible, generic.
- **Tooling** (`tools/`): zero-dependency scripts that support the method
  (validators, journals, installers).
- **Fixes**: typos, broken links, unclear instructions, better examples.

## What we never accept

- Material whose primary value is defeating or evading a protection system:
  challenge-solving recipes, identity-provisioning playbooks, rate-limit or
  quarantine circumvention, masquerading instructions.
- Credentials, tokens, cookies, personal data, or anything from a real
  engagement that could identify a system, a person, or a machine.
- Named targets. Examples use `example.com`, RFC 5737 test addresses
  (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), and reserved names only.
- Marketing with no artifact behind it. Claims need reproducible evidence.

If in doubt, describe the abstract engineering lesson and leave the specific out.

## Skill anatomy

```
skills/<skill-name>/
  SKILL.md            # required — the skill itself
  references/*.md     # optional — deep material, loaded on demand
  scripts/*           # optional — deterministic helpers, never auto-run
```

### Frontmatter contract

```yaml
---
name: skill-name            # kebab-case, must equal the directory name
description: >-              # what it does + exactly when to use it + when not to
  <50–620 chars>
license: MIT
metadata:
  version: 1.0.0
---
```

The description is the API: it is the only text an agent sees before deciding to
load the skill. Write it as triggers, not as a summary of the implementation.
Include the phrases a user would actually type, and name the near-miss cases
that should route elsewhere. Bias it slightly "pushy": agents under-trigger far
more often than they over-trigger.

### Body shape

1. **Decision table** near the top — situation → action → section.
2. **Golden rules** — the few rules that prevent the most common failures,
   each with a one-line *why*.
3. **The method** — steps with exit gates. Explain reasoning, not just orders;
   readers are capable agents, and rules without reasons fail on novel inputs.
4. **When NOT to use** — explicit boundaries and where to go instead.
5. **References** — what to read next and when.

Target under 200 lines for `SKILL.md`; the validator warns above 300. Target
under 350 lines for each reference file; the validator warns above 350. Use
progressive disclosure: the body answers "how", references answer "where is the
detail". Anything a script can do deterministically belongs in `scripts/`.

### Style

- Universal language only. No vendor names, no product specifics, no private
  endpoints, no operational details from any engagement.
- Teach the transferable pattern ("replay the minimal capture"), never a
  target-specific recipe.
- Prefer concrete verbs and short sentences. Explain *why* a rule exists.
- No emojis in skill files.

## Verification before you open a PR

```bash
node tools/validate.mjs
```

The validator is a zero-dependency linter that scans every text file in the
repository. It checks:

- frontmatter schema: `name` matches the skill directory, `license: MIT`, and
  a description of 50-620 characters;
- a warning when a `SKILL.md` exceeds 300 lines or a `references/*.md` file
  exceeds 350 lines;
- every relative markdown link resolves on disk;
- hygiene: secret-shaped strings, email addresses outside `example.com`, IPv4
  addresses outside the RFC 5737 test ranges, and absolute local paths;
- a warning when a URL host is outside the maintained allowlist.

Target-specific and banned-material screening is a review-time step described
under Review process. CI runs the same command. A PR with a red validator is
not reviewed.

## Review process

Every contribution gets two independent reviews:

1. **Security & ethics lens** — does it teach or enable anything outside
   authorized, respectful engineering? Does it leak specifics?
2. **Method & clarity lens** — is the method correct, complete, and testable?
   Does the skill trigger on realistic inputs and stay quiet on near-misses?

Findings are adjudicated in the PR: fixed, or parked with a written ruling.
No silent discards.

## Field notes

A field note is ~100–200 lines: context (anonymized), what was unknown, which
skills were used, the evidence trail (sanitized), what surprised you, what you
would do differently. It must teach a method, not tell a war story.

## License

Contributions are accepted under the MIT license of this repository.
