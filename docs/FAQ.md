# Frequently Asked Questions

Short, concrete answers. Where this file and the rest of the repository
disagree, the repository wins; the validator and the charter are the
authorities.

## What is a skill, exactly?

A skill is a directory under `skills/` whose entry point is `SKILL.md`: a
small frontmatter block (name, description, license) followed by the manual
itself. The description is the only text an agent sees before deciding whether
to load the skill, so it is written as triggers, not as a summary.

Skills are loaded on trigger: the agent matches the current situation against
the descriptions and pulls in only what it needs. Nothing is preloaded
wholesale. Deep material lives in each skill's `references/` directory and is
read only when the body says to.

## Is this for coding agents only?

No. The format is plain markdown in plain directories; anything that reads the
format is the intended audience — an agent harness that loads skills, a script
that parses frontmatter, or a human who wants a field manual. The methods
(perception, contracts, evidence, gates) apply to any system with unknown
behavior, whether the work is written in code or run by hand.

## Do I need a specific model or harness?

No. There are no tool calls, binaries, or runtime requirements inside the
skills. Works with Claude Code, Codex, Cursor, opencode, Gemini CLI, Copilot,
Windsurf, Cline, Goose, Zed, Droid, Antigravity, and anything else that reads
`SKILL.md`. The installers copy files to the location your harness expects; if
your tool does not read the format, you can read the skills yourself and
follow them.

## Is this a toolkit for defeating protections?

No. The pack deliberately teaches the respectful path: classify every
protection surface honestly, automate only the quiet classes within stated
limits, route human-verification steps to a human as a designed step, stop
when a system shows defensive posture, and disclose defects privately. There
is no material whose value depends on a protection not being respected. Read
[docs/ETHICS.md](ETHICS.md) — the boundary is the method, not a constraint on
it.

## What does "authorized" mean in practice?

Work only on systems you own or are explicitly authorized to work with: your
own infrastructure; a client's system under a written engagement; a public
scope with published rules; an integration you were asked to build; your own
accounts where the provider's terms permit the intended use. Availability is
not permission, a reachable system is not an invitation, and a weak gate is
not consent. If the basis is unclear, stop; write down what is unclear and
ask. The scope-statement template is in
[`honest-fences`](../skills/honest-fences/SKILL.md).

## Why twelve skills instead of one giant one?

Progressive disclosure and token economy. An agent pays for every line it
loads, and it decides what to load from descriptions alone. One book would be
either too large to load (so it never loads) or too small to cover the loop.
Twelve sharp manuals each describe exactly when they apply, route to each
other at phase boundaries, and keep the loaded surface proportional to the
task. Add a field note when a skill needs an example, not another chapter.

## How do the skills trigger?

By description. Each `SKILL.md` frontmatter description names the situations
that should load it and the near-miss situations that should route elsewhere,
using the phrases a user would actually type. Descriptions are intentionally a
little pushy: agents under-trigger on ambiguous requests far more often than
they over-trigger. Each skill's "When NOT to use" section is the honest
counterweight, naming where the neighbor skill is the better choice.

## Can I use this commercially?

Yes. Everything is MIT-licensed (see [LICENSE](../LICENSE)). Fork it, embed
it, ship it inside a team or a product, modify it freely. Keeping the license
notice is the requirement; sending improvements back is welcome but not
required.

## How do I add my own skill or field note?

Read [CONTRIBUTING.md](../CONTRIBUTING.md): it defines the frontmatter
contract, the body shape, the size budgets, and what this project never
accepts. Field notes follow the same voice — anonymized context, a dated
timeline across the five phases, an evidence trail, and the patterns used.
Run `node tools/validate.mjs` before opening a pull request; the validator and
two independent reviews are the gate.

## Do the skills phone home or execute anything?

No. Skills are instructions, not programs: no network calls, no telemetry, no
auto-execution when a skill loads. Skills may ship optional deterministic
helpers under their `scripts/` directory; none currently do, and nothing ever
runs them automatically — a human or an agent chooses to. The repository
validator only reads files and reports issues; it makes no external requests.

## Why "glassbox"?

The opposite of a black box. A black box is a system whose behavior you cannot
see and must guess at; a glass box is the same system with its contract,
limits, state, and failure modes visible — because someone did the perception
work. The name is the thesis: perception is the core engineering skill, and
everything else in the pack exists to support it.

## What is the evidence grade system?

Every fact carried forward is labeled with how it was learned and when:
`[OBS]` observed live with a capture attached, `[REP]` reported or configured
secondhand, `[INF]` inferred and still untested. Numbers decay, so every
measurement carries a date and is re-verified before it influences a decision.
See [AGENTS.md](../AGENTS.md) and
[`evidence-protocol`](../skills/evidence-protocol/SKILL.md).

## What happens when a task hits a human-verification step?

It is treated as an honest wall, not an error. The workflow names the step,
explains why a human is required, states what the human does, and defines the
explicit signal that resumes the run. It is never automated around and never
polled in a loop. A workflow that names its human handoffs is more trustworthy
than one that hides them.

## What is NOT in this repo?

No protection-defeat material, no identity-provisioning playbooks, no
target-specific recipes, and no credentials. The full boundary and its
reasoning are in [docs/ETHICS.md](ETHICS.md); contributions that conflict with
it are rejected in review.
