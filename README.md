# `agent-skills-pack`

> A curated pack of practical skills for LLM agents, built on the [agent-skills specification](https://github.com/MauricioPerera/agent-skills) v0.1.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Empirical retrieval benchmark on this corpus** (35 paraphrased intents × 7 skills):
> - **Cloudflare bge-base-en-v1.5**: 97.1 % top-1, 100 % top-3 (cosine baseline). `bge-large-en-v1.5` perfect 35/35.
> - **Local Ollama embeddinggemma**: 97.1 % top-1, 100 % top-3 (live, mean margin +0.175).
> - **Under 50× concentrated-usage stress**: naive global rerank collapses to 34.3 % top-1 (documented failure mode); v0.5.0 intent-conditional rerank holds at 100 %.
>
> **Reproduce with `agent-skills bench bench-truth.jsonl`** — the truth file is right here, [`bench-truth.jsonl`](./bench-truth.jsonl). Full methodology + 5 rerank strategies compared: [agent-skills-cli/BENCHMARK.md](https://github.com/MauricioPerera/agent-skills-cli/blob/main/BENCHMARK.md).

## What's in here

7 production-ready skills, each demonstrating a different pattern from the spec:

| Skill | Demonstrates |
|---|---|
| [`http-get`](skills/http-get/SKILL.md) | basic curl, args validation, network allowlist |
| [`http-post-json`](skills/http-post-json/SKILL.md) | object-typed args, JSON encoding into shell args |
| [`github-issue-create`](skills/github-issue-create/SKILL.md) | **full credential isolation** — no token reference in template |
| [`ripgrep-search`](skills/ripgrep-search/SKILL.md) | applicable_when filter, complex regex args |
| [`read-file`](skills/read-file/SKILL.md) | minimal skill, simplest baseline |
| [`json-query`](skills/json-query/SKILL.md) | string-arg with permissive pattern, idempotent transform |
| [`base64-encode`](skills/base64-encode/SKILL.md) | pure shell, zero-network skill |

Each is a complete, validated `SKILL.md` with frontmatter + human-readable body. Each is hosted at a content-addressable URL via [jsDelivr](https://www.jsdelivr.com/).

## Install into a skill bank

### With [`agent-skills-cli`](https://github.com/MauricioPerera/agent-skills-cli) (v0.7.0+):

Until the CLI is published to npm at v1.0, install from the GitHub release:

```bash
git clone --depth 1 --branch v0.7.0 https://github.com/MauricioPerera/agent-skills-cli
cd agent-skills-cli && npm install && npm run build && npm link

# Then sync this pack
agent-skills sync github.com/MauricioPerera/agent-skills-pack@v1.0.0

# Verify retrieval works on YOUR provider/model with the bundled truth file:
agent-skills bench bench-truth.jsonl
```

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
