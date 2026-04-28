---
schema_version: "0.1"
id: "ripgrep-search"
version: "1.0.0"
title: "Search code with ripgrep"
description: "Recursively searches files in a directory for a regex pattern using ripgrep. Returns matching lines with file:line:column prefixes. Respects .gitignore by default."
use_when: "the user wants to find a string, regex, or symbol across multiple files in a codebase or directory tree"

command_template: "rg --hidden --line-number --column --max-count={max_per_file} {pattern} {path}"

args:
  pattern:
    type: string
    description: "ripgrep regex pattern (PCRE2 if --pcre2 set, else default Rust regex)"
    pattern: "^.{1,1024}$"   # any non-empty up to 1024 chars (rg handles its own regex syntax)
  path:
    type: string
    description: "directory or file to search (relative or absolute)"
    pattern: "^[^\\n\\r;|&$`]+$"   # reject shell metacharacters; rg handles paths with spaces if quoted (we single-quote)
  max_per_file:
    type: integer
    description: "max matches per file (avoids drowning in spam from a noisy match)"
    range: [1, 10000]
    default: 100

license: "MIT"
author:
  name: "Mauricio Perera"
  url: "https://github.com/MauricioPerera"
homepage: "https://github.com/MauricioPerera/agent-skills-pack"

category: "search"
tags: ["search", "ripgrep", "rg", "grep", "code-search", "regex"]

shell: "bash"
idempotent: true
required_commands: ["rg"]
required_env: []

applicable_when:
  shell_commands_present: ["rg"]

examples:
  - intent: "find all uses of 'TODO' in src/"
    command: "rg --hidden --line-number --column --max-count=100 'TODO' 'src/'"
  - intent: "search for the regex 'function\\s+(\\w+)' in the lib directory"
    command: "rg --hidden --line-number --column --max-count=100 'function\\s+(\\w+)' 'lib/'"
  - intent: "find email addresses anywhere under the current directory"
    command: "rg --hidden --line-number --column --max-count=100 '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' '.'"
  - intent: "search for 'panic!' in the entire workspace, but limit to 10 hits per file"
    command: "rg --hidden --line-number --column --max-count=10 'panic!' '.'"
---

# Search code with ripgrep

Wraps [ripgrep (`rg`)](https://github.com/BurntSushi/ripgrep) as a deterministic, agent-friendly search tool.

## Why ripgrep over grep

- Faster on large codebases (parallelism + SIMD).
- Respects `.gitignore` automatically (use `-uuu` to disable; intentionally not exposed here to keep the skill focused).
- Default UTF-8 handling.
- Cleaner output format (`file:line:col:match`).

## Output format

```
src/handler.ts:42:3:    handleRequest(req);
src/router.ts:18:5:    routeHandler.dispatch(...)
```

Each line is `<file>:<line>:<column>:<matching content>`. The agent can parse this with `awk -F:` or pipe through `jq` after `rg --json`.

## Safety: pattern position vs path position

- The `pattern` arg is single-quoted by the bank — regex special characters survive intact.
- The `path` arg's regex strictly forbids `;`, `|`, `&`, `$`, backticks, newlines — defense in depth even though single-quoting would already neutralize most injection attempts.
- The `--max-count` flag prevents unbounded output from pathological matches.

## Caveats

- `--hidden` is enabled by default — searches dotfiles (`.gitignore`, `.env`, etc.). Be careful in directories that may contain secrets.
- `.gitignore` is respected; files in `node_modules` / `dist` / `.git` are skipped automatically. Use `-uuu` if you genuinely need to search them.
- Very long lines (>10MB) are skipped by ripgrep's defaults.
- The pattern uses ripgrep's default regex flavor (Rust `regex` crate). For PCRE2 features (lookarounds, backreferences), the skill could be extended with a `--pcre2` flag.
- If the pattern is potentially shell-metacharacter-heavy (e.g., contains `*`, `[`, `(`, `)`), the bank's single-quoting protects it; no manual escaping needed by the agent.

## Pairing with `read-file`

A common agent flow:

1. `ripgrep-search` to find candidate files.
2. Parse the output to extract file paths.
3. `read-file` to load full content of each match for context.

This avoids loading every file in the repo into context — only the relevant ones, after the regex narrows them down.
