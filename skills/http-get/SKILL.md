---
schema_version: "0.1"
id: "http-get"
version: "1.0.0"
title: "HTTP GET request"
description: "Performs an HTTP GET request against a URL and returns the response body. Follows redirects by default. Fails on non-2xx status."
use_when: "the user wants to fetch the contents of a URL — a webpage, API response, or remote text file"

command_template: "curl -fsSL --max-time {timeout} {url}"

args:
  url:
    type: string
    description: "the URL to GET. Must be HTTPS unless network allowlist permits HTTP."
    pattern: "^https?://[a-zA-Z0-9._/?=&%:#-]+$"
  timeout:
    type: integer
    description: "max seconds before timeout"
    range: [1, 300]
    default: 30

license: "MIT"
author:
  name: "Mauricio Perera"
  url: "https://github.com/MauricioPerera"
homepage: "https://github.com/MauricioPerera/agent-skills-pack"

category: "network"
tags: ["http", "curl", "fetch", "get", "download"]

shell: "bash"
idempotent: true   # GET is idempotent by HTTP semantics
required_commands: ["curl"]
required_env: []
network:
  - "https://*"
  - "http://*"

applicable_when:
  shell_commands_present: ["curl"]

examples:
  - intent: "fetch the content of https://example.com"
    command: "curl -fsSL --max-time 30 'https://example.com'"
  - intent: "get the JSON from a public API endpoint"
    command: "curl -fsSL --max-time 30 'https://api.github.com/repos/torvalds/linux'"
  - intent: "download a raw file from GitHub with a 10 second timeout"
    command: "curl -fsSL --max-time 10 'https://raw.githubusercontent.com/user/repo/main/file.txt'"
---

# HTTP GET request

Performs a simple HTTP GET against a URL.

## Behavior

- `-f` (`--fail`): exits non-zero on HTTP 4xx/5xx without writing the body to stdout.
- `-s` (`--silent`): suppresses the progress bar.
- `-S` (`--show-error`): re-enables error messages even with `-s`.
- `-L` (`--location`): follows redirects.
- `--max-time`: hard timeout per request.

## Output

- **stdout**: the response body verbatim. The agent SHOULD inspect the body's content type via context (a known API endpoint, a `Content-Type` from a prior HEAD, etc.).
- **stderr**: progress (suppressed) or curl error messages (e.g., `curl: (22) The requested URL returned error: 404`).
- **exit code**: 0 on 2xx; non-zero (typically 22) on HTTP errors; 28 on timeout; other curl error codes per `man curl`.

## Caveats

- This skill does NOT parse or validate the response body. If the agent needs JSON, it MAY pipe through `jq` — consider chaining with the [`json-query`](../json-query/SKILL.md) skill instead.
- `--max-time` covers TLS handshake + transfer; large downloads need a generous value.
- Redirect chains: `-L` follows up to curl's default of 50 redirects.
- The `network` allowlist on this skill is intentionally permissive (any `http://` or `https://` URL). Operators in sandbox mode SHOULD restrict via subscription policy or wrap this skill in a more constrained version for their domain.
