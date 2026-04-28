---
schema_version: "0.1"
id: "http-post-json"
version: "1.0.0"
title: "HTTP POST with JSON body"
description: "Performs an HTTP POST request with a JSON body. Sets Content-Type and Accept headers. Body is composed via jq from a structured object passed as args."
use_when: "the user wants to send structured data to a JSON-accepting HTTP endpoint — most modern REST APIs, GraphQL endpoints, webhooks"

# Demonstrates the §2.6 composition pattern: jq builds the JSON body
# from {body} (an object arg, JSON-encoded by the bank's substitution),
# the result is wrapped by $(...) and passed as -d's argument. Every
# {placeholder} sits in argument position to either curl or jq.
command_template: "curl -fsSL --max-time {timeout} --request POST --header 'Content-Type: application/json' --header 'Accept: application/json' --data {body} {url}"

args:
  url:
    type: string
    description: "the endpoint URL. Must be HTTPS unless network allowlist permits HTTP."
    pattern: "^https?://[a-zA-Z0-9._/?=&%:#-]+$"
  body:
    type: object
    description: "the JSON request body. Encoded as a JSON string and passed to curl --data."
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
tags: ["http", "curl", "post", "json", "api", "webhook"]

shell: "bash"
idempotent: false   # POST is generally non-idempotent (depends on endpoint)
required_commands: ["curl"]
required_env: []
network:
  - "https://*"
  - "http://*"

applicable_when:
  shell_commands_present: ["curl"]

examples:
  - intent: "send a JSON webhook payload to a Slack webhook URL"
    command: "curl -fsSL --max-time 30 --request POST --header 'Content-Type: application/json' --header 'Accept: application/json' --data '{\"text\":\"Deploy completed\"}' 'https://hooks.slack.com/services/XXX/YYY/ZZZ'"
  - intent: "POST a small JSON object to an API endpoint that expects {name, age}"
    command: "curl -fsSL --max-time 30 --request POST --header 'Content-Type: application/json' --header 'Accept: application/json' --data '{\"name\":\"Alice\",\"age\":30}' 'https://api.example.com/users'"
  - intent: "trigger a GraphQL query against a public GraphQL API"
    command: "curl -fsSL --max-time 30 --request POST --header 'Content-Type: application/json' --header 'Accept: application/json' --data '{\"query\":\"{ user(id: 1) { name } }\"}' 'https://api.github.com/graphql'"
---

# HTTP POST with JSON body

Demonstrates the agent-skills composition pattern from SPEC §2.6: a JSON object arg becomes a properly-quoted shell argument that the bank inserts after curl's `--data`.

## How the substitution works

The `{body}` arg is declared as `type: object`. At resolve time, the bank:

1. Validates that `body` is a JSON object.
2. Encodes it as a JSON string (using `JSON.stringify`).
3. Single-quotes the result for shell-safe insertion.

For an arg like `{"name":"Alice","age":30}`, the resolved command is:

```bash
curl -fsSL ... --data '{"name":"Alice","age":30}' 'https://...'
```

The single quotes are at the SHELL level — once bash parses, curl receives the literal JSON string as one argument. No quoting trickery needed in the template.

## Behavior

- Sets `Content-Type: application/json` and `Accept: application/json` headers (most JSON APIs require both).
- Uses `-f` so HTTP 4xx/5xx exit non-zero with the body suppressed.
- `-L` for redirect following; `--max-time` for hard timeout.

## Output

- **stdout**: the response body (typically JSON; agent should parse if needed).
- **stderr**: curl errors.
- **exit code**: 0 on 2xx; 22 on HTTP error; 28 on timeout.

## Pairing with credential isolation

For authenticated APIs, **do not put credentials in args**. Either:

1. Use a domain-specific skill that reads `$STRIPE_KEY` etc. from env (see [`charge-customer`](https://github.com/MauricioPerera/agent-skills/blob/main/examples/skills/charge-customer/SKILL.md) for the pattern).
2. Wrap this skill in a derived skill that adds `--header 'Authorization: Bearer $TOKEN'` to the template and declares `required_env: ["TOKEN"]`.

This generic skill leaves auth out of scope on purpose; mixing auth into a generic POST is a footgun.

## Caveats

- The `body` arg is JSON-encoded with `JSON.stringify`, which produces compact JSON (no indentation). If the API requires human-readable formatting, the agent must format upstream.
- File uploads (`multipart/form-data`) are NOT covered; use `curl -F` directly or a dedicated skill.
- Streaming bodies (e.g., NDJSON over a long-lived connection) are NOT covered.
