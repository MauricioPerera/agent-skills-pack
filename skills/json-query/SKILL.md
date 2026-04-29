---
schema_version: "0.1"
id: "json-query"
version: "2.0.0"
title: "Query JSON with jq"
description: "Applies a jq filter to a literal JSON value and writes the result to stdout. Pass the JSON as a string in the {input} arg — no file paths."
use_when: "the user wants to extract, transform, or reshape literal JSON — pull specific fields, filter arrays, compute aggregates, reformat structure"

# v2: input is the JSON CONTENT (string), not a file path. Piped through
# stdin so the agent can pass JSON that the LLM produced inline without
# first writing it to a file. v1's "jq {filter} {input}" treated input as
# a filename which the agent rarely has — a v2 sandbox doesn't expose
# host paths anyway. Filter is single-quoted by the bank's substitution
# (jq syntax survives intact); input is shell-quoted and piped.
command_template: "printf '%s' {input} | jq {filter}"

args:
  filter:
    type: string
    description: "jq filter expression (e.g., '.users[].name', '. | length')"
    pattern: "^.{1,4096}$"   # any non-empty up to 4KB
  input:
    type: string
    description: "the JSON value to query, as a literal string (e.g., '{\"id\":42}', '[1,2,3]'). Up to 1MB."
    pattern: "^[\\s\\S]{1,1048576}$"   # any chars including newlines, up to 1MB

license: "MIT"
author:
  name: "Mauricio Perera"
  url: "https://github.com/MauricioPerera"
homepage: "https://github.com/MauricioPerera/agent-skills-pack"

category: "data-processing"
tags: ["jq", "json", "query", "filter", "transform"]

shell: "bash"
idempotent: true
required_commands: ["jq"]
required_env: []

applicable_when:
  shell_commands_present: ["jq"]

examples:
  - intent: "extract every 'name' field from this list of users [{\"name\":\"Alice\"},{\"name\":\"Bob\"}]"
    command: "printf '%s' '[{\"name\":\"Alice\"},{\"name\":\"Bob\"}]' | jq '.[] | .name'"
  - intent: "count items in the JSON array [1,2,3,4,5]"
    command: "printf '%s' '[1,2,3,4,5]' | jq '. | length'"
  - intent: "extract just the .id field from {\"id\":42,\"name\":\"alpha\"}"
    command: "printf '%s' '{\"id\":42,\"name\":\"alpha\"}' | jq '.id'"
  - intent: "reshape {\"users\":[{\"id\":1,\"email\":\"a@x\"}]} to keep only id and email"
    command: "printf '%s' '{\"users\":[{\"id\":1,\"email\":\"a@x\"}]}' | jq '.users | map({id, email})'"
  - intent: "pretty-print compact JSON {\"a\":1,\"b\":[2,3]}"
    command: "printf '%s' '{\"a\":1,\"b\":[2,3]}' | jq '.'"
---

# Query JSON with jq

Wraps [`jq`](https://jqlang.github.io/jq/) — the canonical command-line JSON processor — as an agent skill.

## Common patterns

| Goal | Filter |
|---|---|
| Pretty-print | `'.'` |
| Get a single field | `'.field'` |
| Get nested field | `'.user.profile.email'` |
| Iterate array | `'.[] \| .name'` |
| Filter array | `'.[] \| select(.active == true)'` |
| Map / reshape | `'.users \| map({id, email})'` |
| Count | `'. \| length'` |
| Aggregate | `'.items \| map(.amount) \| add'` |
| Pipe through chain | `'.data \| .[].user.name'` |

## Why jq is the agent's friend

- Deterministic: same input + same filter always = same output.
- Readable: jq filters are essentially a domain-specific query language.
- Composable: pipes between jq invocations work as expected.
- Stable: jq's behavior has been remarkably consistent for a decade+.

## Output format

By default, jq output is pretty-printed with 2-space indentation. Use `-c` (compact) or `-r` (raw, no JSON quotes) for different forms — extend this skill or pipe through a second jq invocation if needed.

## Errors

- **Parse error in input**: `jq: error: Cannot iterate over null` etc. — jq diagnostic on stderr, exit 5.
- **Invalid filter syntax**: `jq: error: ...` at compile time, exit 3.

The skill does NOT remap jq's exit codes; the agent SHOULD interpret them per jq's man page.

## Migration from v1

v1 took `input` as a file path (`jq {filter} {input}`); v2 takes `input` as the literal JSON value piped via stdin. The change makes the skill work for the dominant agent use case — passing JSON the LLM produced or received from another skill, without needing host filesystem access (which the v2 sandbox doesn't expose anyway). If you need to query a JSON file on disk, read it with `read-file` first and pass the result here.

## Caveats

- The `filter` arg's pattern is permissive (any string up to 4KB). jq syntax includes characters like `|`, `(`, `)`, `[`, `]`, `.`, `\`, `"` — all of which the bank's single-quoting handles correctly. Hostile filter values are still potentially problematic if they contain logic like `system("rm -rf /")` (jq has a `--exec` flag, but it's NOT enabled in the default invocation). The agent SHOULD review filter strings before execution.
- The `input` arg is capped at 1MB. For multi-megabyte JSON, query upstream (file → jq stream) instead of materialising the full string in the bank.
- For non-JSON input, jq fails with a parse error.
- For arbitrary computation beyond jq's scope (e.g., regex on field values), chain skills: this one's stdout is parseable as JSON for the next.
