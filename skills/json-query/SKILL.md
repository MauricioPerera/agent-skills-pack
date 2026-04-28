---
schema_version: "0.1"
id: "json-query"
version: "1.0.0"
title: "Query JSON with jq"
description: "Applies a jq filter to a JSON input and writes the result to stdout. Input can be a file path or stdin (passed as the {input} arg)."
use_when: "the user wants to extract, transform, or reshape JSON — pull specific fields, filter arrays, compute aggregates, reformat structure"

# Both args are positional to jq. Filter is single-quoted by the bank
# (jq syntax survives intact); input is passed as a single arg (file path
# or '-' for stdin). The bank's quoting handles paths with spaces.
command_template: "jq {filter} {input}"

args:
  filter:
    type: string
    description: "jq filter expression (e.g., '.users[].name', '. | length')"
    pattern: "^.{1,4096}$"   # any non-empty up to 4KB
  input:
    type: string
    description: "input source: file path, or '-' to read from stdin"
    pattern: "^[^\\n\\r;|&$`]+$"

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
  - intent: "extract every 'name' field from a list of users in users.json"
    command: "jq '.[] | .name' 'users.json'"
  - intent: "count items in a JSON array from a file"
    command: "jq '. | length' 'data.json'"
  - intent: "extract only the open issues from a github API response"
    command: "jq '.[] | select(.state == \"open\") | {number, title}' 'issues.json'"
  - intent: "reshape API response to keep only id and email"
    command: "jq '.users | map({id, email})' 'response.json'"
  - intent: "read JSON from stdin and pretty-print indented"
    command: "jq '.' '-'"
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
- **File not found**: `jq: error: Could not open file '<path>': No such file or directory`, exit 2.

The skill does NOT remap jq's exit codes; the agent SHOULD interpret them per jq's man page.

## Caveats

- The `filter` arg's pattern is permissive (any string up to 4KB). jq syntax includes characters like `|`, `(`, `)`, `[`, `]`, `.`, `\`, `"` — all of which the bank's single-quoting handles correctly. Hostile filter values are still potentially problematic if they contain logic like `system("rm -rf /")` (jq has a `--exec` flag, but it's NOT enabled in the default invocation). The agent SHOULD review filter strings before execution.
- Streaming JSON (very large files) is supported via `jq --stream`; not exposed in this skill.
- For non-JSON input, jq fails with a parse error. Combine with `read-file` + manual JSON validation if uncertain.
- For arbitrary computation beyond jq's scope (e.g., regex on field values), pipe through a second tool: `jq '...' file.json | grep pattern`.
