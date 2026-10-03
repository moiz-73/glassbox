# Launch Kit

Everything needed to launch this repository publicly, in order, with the
reasoning attached. Nothing here posts itself — every action below requires a
human to press the button.

## 0. Pre-flight (launch-day checklist)

- [x] Validator clean: `node tools/validate.mjs` → zero errors (re-run on
      launch day).
- [x] Private scan complete: zero banned-token and zero secret hits.
- [x] Commit identity decision recorded: all commits are authored as the
      project handle (`glassbox`) with the account's GitHub noreply address,
      via per-command `-c` flags; no personal identity enters the history.
- [x] Two independent reviews complete; findings fixed or parked with rulings.
- [ ] Repository pushed to the public remote.
- [ ] skills.sh indexing visible after the push (`npx skills add` works).
- [ ] GitHub description + topics set (see section 4).
- [ ] Social preview uploaded (export `assets/social-preview.svg` to a 1280×640
      PNG and upload in repository settings — GitHub accepts PNG/JPG).

## 1. The hook (why anyone clicks)

The one-line promise: **"Turn black boxes into glass boxes."**

The situation line: **"Your agent guesses paths, ports, and response shapes
from memory. Glassbox gives it a method."**

The proof line: **"12 skills. One loop: perceive, model, execute, verify,
evolve. No vendor lock, no dependencies, MIT."**

Keep those three lines consistent everywhere — title, description, posts.

## 2. Launch channels and drafts

### Hacker News (Show HN)

Title: `Show HN: Glassbox – agent skills that teach reverse-engineering method`

First comment draft:

> Author here. I kept watching capable agents do confident, wrong things on
> systems they'd never seen — guessed endpoints, invented statuses, trusted
> stale docs. The fix wasn't a smarter model; it was a method. Glassbox
> packages the loop working engineers actually run (perceive → model → execute
> → verify → evolve) into 12 skills any harness can load: ground-truth
> discipline, capture-to-contract protocol decoding, flow state machines,
> evidence gates, durable autonomy, adversarial review. Deliberately
> vendor-neutral and boundary-first: authorized scope, human gates on
> irreversible actions, and honest handling of protection surfaces. MIT.
> Happy to talk about the skill format and what didn't make the cut.

Post timing: Tuesday–Thursday, 8–10am US Eastern. Reply to every substantive
comment for the first 4 hours; that window decides the thread.

### X / Twitter thread

1. Hook: "Your agent guesses. This fixes that." + banner.
2. The problem: one screenshot-style example of a confident wrong guess.
3. The loop: loop.svg + one line per phase.
4. The skills: the table, typed out readably — pick the 4 best.
5. The boundary: "It deliberately ships no protection-defeat material — the
   boundary is the method." (This earns the trust of the people who matter.)
6. Install: `npx skills add f2025408135-cyber/glassbox` + repo link.
7. Field notes: "Here's a sanitized case study of decoding an undocumented API."

### Reddit

- r/programming: technical framing, emphasize evidence discipline.
- r/netsec: emphasize authorized-scope framing, adversarial review, ethics
  charter; do NOT oversell; answer hard questions directly.
- r/devops and r/SRE: emphasize legacy systems, durable autonomy, verification.
- r/LLMDevs and r/AI_Agents: emphasize the skills format and trigger design.

Each subreddit gets a tailored opening paragraph; never copy-paste the same
text across subreddits in the same week.

### Directories and ecosystems

- skills.sh indexes public repos; confirm the badge count starts moving.
- Submit to agent-skill newsletters and awesome-lists (PRs welcome upstream;
  follow each list's contribution format).
- The repo's `AGENTS.md` makes it usable the moment it lands in any agent's
  context — mention that.

## 3. First-week response playbook

- Reply to issues within 24h; label `new-skill`, `field-note`, `question`.
- Convert the best questions into FAQ entries (documentation is a growth loop).
- Invite the first three field-note PRs; review them fast and publicly.
- Publish a short "What we learned from launch week" discussion post; link it
  from the README.

## 4. Repository settings checklist

Description (350 char limit): "Turn black boxes into glass boxes — 12 agent
skills for reverse-engineering the systems you're authorized to work with.
Ground truth, protocol cartography, evidence discipline, durable autonomy, and
adversarial review. Vendor-neutral, MIT."

Topics (20 max, use all): agent-skills, ai-agents, reverse-engineering,
methodology, claude-code, codex, cursor, opencode, protocols, evidence,
verification, automation, skills, developer-tools, llm, agents, durable-work,
orchestration, security-research, mit-license.

Settings: Issues on, Discussions on, Wiki off, Projects off. Social preview
uploaded. Squash-merge allowed; delete head branches on.

## 5. What NOT to do

- Do not launch in multiple big channels on the same day; stagger by 2–3 days
  and let each thread breathe.
- Do not argue with hostile comments; answer once with facts, then move on.
- Do not add growth-hack badges to the README; the skills.sh badge and CI
  badge are the only ones.
- Do not name or compare specific systems in any launch material — the pack is
  deliberately target-neutral, and the comments will be much better for it.
