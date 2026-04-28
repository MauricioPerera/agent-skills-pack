---
schema_version: "0.1"
id: "base64-encode"
version: "1.0.0"
title: "Base64 encode a string"
description: "Encodes a string as base64. Useful for embedding binary or special-character data in URLs, JSON tokens, or HTTP headers."
use_when: "the user wants to convert a string to its base64 representation — for embedding in URLs, Authorization headers, JWTs, etc."

# Pure shell. printf with %s avoids surprises with format-string interpretation.
# The pipe to base64 -w0 produces a single line (no automatic line wrapping
# at 76 chars, which would break URL embedding).
command_template: "printf '%s' {value} | base64 -w0"

args:
  value:
    type: string
    description: "the string to encode. Any UTF-8 content, including binary-as-string."
    pattern: "^.{0,65536}$"   # up to 64KB, any chars

license: "MIT"
author:
  name: "Mauricio Perera"
  url: "https://github.com/MauricioPerera"
homepage: "https://github.com/MauricioPerera/agent-skills-pack"

category: "encoding"
tags: ["base64", "encode", "url-safe", "encoding"]

shell: "bash"
idempotent: true
required_commands: ["printf", "base64"]
required_env: []
network: []   # entirely local, no network

applicable_when:
  shell_commands_present: ["printf", "base64"]

examples:
  - intent: "encode 'hello world' as base64"
    command: "printf '%s' 'hello world' | base64 -w0"
  - intent: "create a Basic Auth header value for user:password"
    command: "printf '%s' 'user:password' | base64 -w0"
  - intent: "encode a JSON payload for embedding in a URL fragment"
    command: "printf '%s' '{\"id\":42,\"name\":\"test\"}' | base64 -w0"
  - intent: "base64 encode the empty string (yields empty output)"
    command: "printf '%s' '' | base64 -w0"
---

# Base64 encode a string

Pure-shell utility: convert any string to its base64 representation.

## Why `printf '%s'` instead of `echo`

`echo` adds a trailing newline by default and has shell-specific behavior with backslash escapes. `printf '%s'` is portable, predictable, and produces no trailing newline — so the base64 output represents exactly the input bytes.

## Why `base64 -w0`

GNU `base64` wraps output at 76 chars per line by default. For URL/JSON/header embedding, that's wrong — you need a single contiguous line. `-w0` disables wrapping.

(macOS users: macOS's BSD `base64` does NOT support `-w0`. This skill assumes GNU coreutils. macOS users should use `gbase64` from `brew install coreutils` or omit `-w0` and pipe through `tr -d '\n'` for portability.)

## Output

- **stdout**: the base64-encoded string, single line, no trailing newline.
- **stderr**: empty on success.
- **exit code**: 0 always (base64 doesn't fail on string input).

## Caveats

- This is **standard base64**, not URL-safe (`base64url`). For URL-safe encoding, pipe through `tr '+/' '-_' | tr -d '='` after this skill (or use a dedicated `base64url-encode` skill if added).
- The skill takes a STRING. To base64-encode a binary file, use `base64 -w0 < /path/to/file` directly — wrapping that as a separate skill is straightforward but kept out for now (tighter input validation needed for a path arg).
- The `value` pattern allows any UTF-8 character — newlines, NULs, special chars are preserved through the bank's single-quoting and into the printf invocation.

## Pairing

A common use is building HTTP Basic Auth:

```bash
# Skill 1: build "user:password"
# Skill 2: base64-encode that
# Skill 3: HTTP request with the resulting string in `Authorization: Basic <encoded>` header
```

Each step is small and verifiable. The agent doesn't need to know base64 internals — it knows when to invoke this skill.

## Reverse direction

A future companion skill `base64-decode` would invert this. Same pattern, with `base64 --decode -w0` and a base64-validity pattern on the input.
