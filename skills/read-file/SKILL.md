---
schema_version: "0.1"
id: "read-file"
version: "1.0.0"
title: "Read a file's content"
description: "Reads the contents of a file from the local filesystem and writes it to stdout. Optionally limits to the first N lines."
use_when: "the user wants to inspect the content of a specific file by path — source code, config, log excerpt, etc."

# Single placeholder in argument position. The bank's single-quoting handles
# paths with spaces, special chars, etc. — no shell pipeline needed.
command_template: "head --lines={max_lines} {path}"

args:
  path:
    type: string
    description: "absolute or relative path to the file"
    pattern: "^[^\\n\\r;|&$`]+$"
  max_lines:
    type: integer
    description: "maximum number of lines to read (use a large value for whole file)"
    range: [1, 1000000]
    default: 5000

license: "MIT"
author:
  name: "Mauricio Perera"
  url: "https://github.com/MauricioPerera"
homepage: "https://github.com/MauricioPerera/agent-skills-pack"

category: "filesystem"
tags: ["read", "file", "cat", "inspect", "head"]

shell: "bash"
idempotent: true
required_commands: ["head"]
required_env: []

applicable_when:
  shell_commands_present: ["head"]

examples:
  - intent: "show me the contents of package.json"
    command: "head --lines=5000 'package.json'"
  - intent: "read the first 100 lines of src/main.rs"
    command: "head --lines=100 'src/main.rs'"
  - intent: "open ~/.bashrc and show everything"
    command: "head --lines=5000 '/Users/me/.bashrc'"
  - intent: "show the first 10 lines of a log file"
    command: "head --lines=10 '/var/log/system.log'"
---

# Read a file's content

The simplest possible agent skill: read a file from disk.

## Why `head` instead of `cat`

`cat <path>` reads the entire file regardless of size. For an LLM agent, an unbounded read can:

- Burn context on a giant log file.
- Trigger out-of-memory in the bank's audit recording.
- Produce stdout that exceeds reasonable buffering.

`head --lines=N` provides a natural cap. The default `5000` covers most source files entirely; logs, datasets, and other large files require an explicit higher value or pagination.

For huge files, the agent should use a separate skill (e.g., a future `read-file-range` with `tail | head`) rather than raising `max_lines` to absurd values.

## Output

- **stdout**: the file's content, up to `max_lines` lines.
- **stderr**: `head: cannot open '<path>' for reading: No such file or directory` on missing files.
- **exit code**: 0 on success; 1 on any read failure.

## Caveats

- **Binary files**: `head` doesn't refuse them, but the output may include null bytes / unprintable chars that confuse the agent. Banks SHOULD detect binary content via `file` or magic-byte sniffing and refuse to feed binary into an LLM context.
- **Symlinks**: followed by default. The actual file's content is returned, not the symlink target.
- **Permissions**: standard file-permission rules apply. `head /etc/shadow` fails for non-root users.
- **No path-traversal sandbox**: this skill does NOT restrict where it reads from. A bank operating in sandbox mode SHOULD wrap the `path` value to confine to a project root or scratch directory before resolving.
- **Encoding**: assumes UTF-8. Non-UTF-8 files (e.g., Latin-1) appear as mojibake but don't fail.

## Why no `wc -l` companion in this skill

A common pattern is "tell me how big the file is, then read it". Better as separate skills (`file-info`, `read-file`) than to bundle. Composability via chains > monolithic.
