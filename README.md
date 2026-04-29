# `agent-skills-pack`

> A curated pack of practical skills for LLM agents, built on the [agent-skills specification](https://github.com/MauricioPerera/agent-skills) (spec v1.2, schema_version "0.1" / "0.2").

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![validate](https://github.com/MauricioPerera/agent-skills-pack/actions/workflows/validate.yml/badge.svg)](https://github.com/MauricioPerera/agent-skills-pack/actions/workflows/validate.yml)

## What's new in v2.2.0

- **`read-file` v2.0.0** and **`ripgrep-search` v2.0.0** adopt SPEC v1.2 §2.11 — the new `filesystem` allowlist. Both declare `filesystem: ["/etc", "/var", "/home", "/tmp", "/usr"]` so v2 sandboxed banks can finally execute them against real host paths without breaking the spec's read/write split (writes still go exclusively to `$AGENT_SCRATCH`).
- Pre-v2.2 these two skills were architecturally broken under `@rckflr/agent-skills-cli` v2.0+ — the v1.1 sandbox restricted FS to scratch-only and there was no opt-in mechanism. Closes that gap.

## What's new in v2.1.0

- **`github-issue-create` v2.0.0** ships a pack-distributed CustomCommand (`command.js`) per SPEC v1.1 §3.4. The skill no longer requires a host `gh` binary — the CustomCommand wraps the GitHub REST API directly and reads the token from `$GH_TOKEN` / `$GITHUB_TOKEN` at exec time. Compatible with the v2 sandbox runtime.
- **`json-query` v2.0.0** takes literal JSON via stdin (`printf '%s' {input} | jq {filter}`) instead of a file path — better fit for the LLM-in-the-loop use case where the agent passes the JSON value inline.

> **Empirical retrieval benchmark on this corpus** (35 paraphrased intents × 7 skills):
> - **Cloudflare bge-base-en-v1.5**: 97.1 % top-1, 100 % top-3 (cosine baseline). `bge-large-en-v1.5` perfect 35/35.
> - **Local Ollama embeddinggemma**: 97.1 % top-1, 100 % top-3 (live, mean margin +0.175).
> - **Under 50× concentrated-usage stress**: naive global rerank collapses to 34.3 % top-1 (documented failure mode); v0.5.0 intent-conditional rerank holds at 100 %.
>
> **Reproduce with `agent-skills bench bench-truth.jsonl`** — the truth file is right here, [`bench-truth.jsonl`](./bench-truth.jsonl). Full methodology + 5 rerank strategies compared: [agent-skills-cli/BENCHMARK.md](https://github.com/MauricioPerera/agent-skills-cli/blob/main/BENCHMARK.md).

## What's in here

7 production-ready skills, each demonstrating a different pattern from the spec:

| Skill | Version | schema | Demonstrates |
|---|---|---|---|
| [`http-get`](skills/http-get/SKILL.md) | 1.0.0 | 0.1 | basic curl, args validation, network allowlist (`https://*` wildcard) |
| [`http-post-json`](skills/http-post-json/SKILL.md) | 1.0.0 | 0.1 | object-typed args, JSON encoding into shell args |
| [`github-issue-create`](skills/github-issue-create/SKILL.md) | **2.0.0** | 0.1 | **pack-distributed CustomCommand** (SPEC v1.1 §3.4) + full credential isolation |
| [`ripgrep-search`](skills/ripgrep-search/SKILL.md) | **2.0.0** | **0.2** | **filesystem allowlist** (SPEC v1.2 §2.11) — host-FS read sandbox |
| [`read-file`](skills/read-file/SKILL.md) | **2.0.0** | **0.2** | **filesystem allowlist** (SPEC v1.2 §2.11) — minimal skill, host-FS read |
| [`json-query`](skills/json-query/SKILL.md) | **2.0.0** | 0.1 | literal JSON via stdin (LLM-in-the-loop friendly) |
| [`base64-encode`](skills/base64-encode/SKILL.md) | 1.0.0 | 0.1 | pure shell, zero-network skill |

Each is a complete, validated `SKILL.md` with frontmatter + human-readable body. Each is hosted at a content-addressable URL via [jsDelivr](https://www.jsdelivr.com/).

## Install into a skill bank

### With [`@rckflr/agent-skills-cli`](https://www.npmjs.com/package/@rckflr/agent-skills-cli) v2.2.0+ (npm-published):

```bash
npm install -g @rckflr/agent-skills-cli

# Sync the latest release (resolves v2.2.0 → commit SHA → fetches from jsdelivr)
agent-skills sync github.com/MauricioPerera/agent-skills-pack@v2.2.0

# Verify retrieval works on YOUR provider/model with the bundled truth file:
agent-skills bench bench-truth.jsonl
```

> **Why v2.2.0+ of the CLI?** The pack at v2.2 declares `schema_version: "0.2"` on two skills (read-file, ripgrep-search) for the new `filesystem` allowlist (SPEC §2.11). v2.1 banks reject `0.2` skills as "unknown schema". v2.2 banks accept both `0.1` and `0.2`.

> **Want the pre-v2.2 set?** `git clone --branch v2.1.0` and use CLI v2.1+. v1.0.0 of the pack is also still on jsdelivr but predates `command.js` and `filesystem` — only useful for v0.x banks.

### Manually today (any skill-bank-conformant runtime):

```bash
# 1. Subscribe via your bank
db skill_subscriptions insert '{
  "_id": "agent-skills-pack",
  "source_type": "git",
  "repo": "github.com/MauricioPerera/agent-skills-pack",
  "ref_requested": "v1.0.0",
  "auto_update": false
}'

# 2. Run your sync daemon (per IMPLEMENTATION.md in the spec repo)

# 3. Query
agent_query "I need to fetch a URL" → returns http-get skill
```

### Validate any single skill before adopting

```bash
# Fetch the skill, then validate locally with the CLI installed above
curl -fsSL https://cdn.jsdelivr.net/gh/MauricioPerera/agent-skills-pack@v1.0.0/skills/http-get/SKILL.md \
  > /tmp/skill.md
agent-skills validate /tmp/skill.md
```

## Discovery

This pack is published with the standard agent-skills discovery layout:

- [`/llms.txt`](./llms.txt) — top-level index (human-readable + LLM-friendly).
- [`/skills-index.json`](./skills-index.json) — machine-readable manifest with explicit `url_template` for sub-skill URLs.
- GitHub topic [`agent-skills`](https://github.com/topics/agent-skills) — discoverable in the broader skill ecosystem.

## Versioning

Each skill follows semver per [SPEC.md §6.1](https://github.com/MauricioPerera/agent-skills/blob/main/SPEC.md#61-skill-version-semantics). The pack itself is also semver-tagged at the repo level — pinning to `v1.0.0` gives a bit-immutable snapshot of all 7 skills.

## Continuous validation

Every push and every PR (including from forks) runs [`.github/workflows/validate.yml`](./.github/workflows/validate.yml) — `agent-skills publish --check-only` against the pinned CLI v0.13.1. It enforces:

1. Every `skills/<id>/SKILL.md` parses + conforms to the v0.1 schema.
2. `skills-index.json` is byte-identical to what `agent-skills publish` would generate (catches forgotten regenerations after edits).

A complementary cross-repo workflow in [`agent-skills-cli`](https://github.com/MauricioPerera/agent-skills-cli/actions/workflows/e2e.yml) runs weekly and adds Ollama-backed retrieval bench parity between TS and Python implementations against this pack's [`bench-truth.jsonl`](./bench-truth.jsonl). Two layers, complementary timing: pack-CI catches structural breakage at PR time; CLI-e2e catches retrieval-quality drift over weeks.

## Patterns demonstrated

This pack is intentionally a **catalog of patterns** as much as it is a useful set of skills. If you're authoring your own skill pack, copy the structure of the closest match:

- **Generic shell wrapper** (`read-file`, `base64-encode`): minimal command_template, tight arg patterns, no network.
- **Network with allowlist** (`http-get`, `http-post-json`): explicit `network` field, `applicable_when` for required commands.
- **CLI delegating auth** (`github-issue-create`): no env_var in template; CLI handles credentials internally — strongest credential isolation possible.
- **Object-typed args** (`http-post-json`): JSON body as `type: object`, bank serializes + quotes for shell.
- **Permissive regex args** (`ripgrep-search`, `json-query`): pattern allows ripgrep/jq syntax intact; bank's single-quoting protects.
- **Idempotency declaration** (`http-get`: true; `http-post-json`, `github-issue-create`: false): chain executors will retry the first, abort the second.

## Forking

This pack is MIT-licensed and intended to be forked. To make it yours:

1. Fork the repo.
2. Edit / add / remove skills in `skills/`.
3. Update `llms.txt`. (Skip `skills-index.json` — `agent-skills publish` rebuilds it for you.)
4. **Validate + regenerate `skills-index.json` + tag** in one go (v0.8.0+):

   ```bash
   # Dry-run first
   agent-skills publish --check-only

   # Apply: regenerates skills-index.json and creates a signed git tag
   agent-skills publish --tag v1.0.0 --sign
   git push --follow-tags
   ```

   `publish` validates every `SKILL.md` against the spec, **preserves any hand-crafted summaries** in your existing index, and is **idempotent** (a no-op if nothing changed).

5. Add the GitHub topic `agent-skills` to your fork.

Your fork is now a discoverable skill pack on its own. No registry needed.

This pack itself is published with `agent-skills publish` — running it on a fresh checkout is a no-op (`0 added, 0 updated, 7 unchanged`).

## Sister projects

- [`agent-skills`](https://github.com/MauricioPerera/agent-skills) — the **specification**.
- [`agent-skills-cli`](https://github.com/MauricioPerera/agent-skills-cli) — the **reference CLI** (validates these skills against the spec).
- [`just-bash-data`](https://github.com/MauricioPerera/just-bash-data) — the **storage runtime** for hosting a local skill bank.

## License

[MIT](./LICENSE) — both the SKILL.md files and the rest of the pack.
