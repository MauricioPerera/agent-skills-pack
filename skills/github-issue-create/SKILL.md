---
schema_version: "0.1"
id: "github-issue-create"
version: "1.0.0"
title: "Create a GitHub issue"
description: "Creates a new GitHub issue in a specified repository using the gh CLI. Authentication is delegated to gh's own credential system — the agent never sees the token."
use_when: "the user wants to file a bug, feature request, or task as a GitHub issue in a repository they have write access to"

# The gh CLI reads $GH_TOKEN (or its keyring config) at exec time.
# The bank only substitutes {placeholders} — it does NOT touch $GH_TOKEN.
# The agent emits this command without ever seeing the credential.
command_template: "gh issue create --repo {repo} --title {title} --body {body}"

args:
  repo:
    type: string
    description: "GitHub repo in 'owner/name' format"
    pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*/[a-zA-Z0-9._-]+$"
  title:
    type: string
    description: "issue title (≤ 256 chars, no newlines)"
    pattern: "^[^\\n\\r]{1,256}$"
  body:
    type: string
    description: "issue body in markdown. Can be empty."
    default: ""

license: "MIT"
author:
  name: "Mauricio Perera"
  url: "https://github.com/MauricioPerera"
homepage: "https://github.com/MauricioPerera/agent-skills-pack"

category: "github"
tags: ["github", "gh", "issue", "tracker", "bug-report"]

shell: "bash"
idempotent: false   # creating an issue is not idempotent
required_commands: ["gh"]
required_env: []    # gh reads its own credentials; no env var visible to the skill
network:
  - "https://api.github.com/"
  - "https://github.com/"

applicable_when:
  shell_commands_present: ["gh"]

examples:
  - intent: "open an issue in MauricioPerera/agent-skills called 'Add Korean translation'"
    command: "gh issue create --repo MauricioPerera/agent-skills --title 'Add Korean translation' --body ''"
  - intent: "report a bug in some/repo about authentication failing on Tuesdays"
    command: "gh issue create --repo some/repo --title 'Auth fails on Tuesdays' --body 'Steps to reproduce: ...'"
  - intent: "file a feature request titled 'Dark mode' against acme/dashboard"
    command: "gh issue create --repo acme/dashboard --title 'Dark mode' --body 'Would love a dark mode toggle in user settings.'"
---

# Create a GitHub issue

Creates a new GitHub issue using the [GitHub CLI (`gh`)](https://cli.github.com/).

## Privacy invariant — credential isolation

This skill demonstrates the [SPEC §8 P1](https://github.com/MauricioPerera/agent-skills/blob/main/SPEC.md#8-privacy-invariants) invariant in its strongest form:

- The `command_template` does NOT reference `$GH_TOKEN` or any credential variable explicitly.
- `gh` itself reads credentials from:
  1. The environment variable `$GH_TOKEN` (or `$GITHUB_TOKEN`), OR
  2. Its own keyring config at `~/.config/gh/hosts.yml`.
- Whichever source `gh` finds, **the credential never appears in the resolved command**.
- The agent emits `gh issue create --repo X --title Y --body Z` — no token, no auth header, no secret.
- The shell hands the literal command to `gh`, which performs auth internally.

This is **stronger** than the explicit-`$VAR` pattern (e.g., `--header 'Bearer $TOKEN'`): even the variable name doesn't appear in the resolved command. The skill is **completely credential-agnostic** at the LLM-context level.

## Setup (operator-side, before the agent runs)

```bash
# Option A: keychain-backed (recommended)
gh auth login

# Option B: env-based (for CI, ephemeral shells)
export GH_TOKEN=ghp_your_token_here
```

If neither is configured, the skill exits with `gh: error: authentication required` — a clear signal to the agent that credentials are missing, without leaking what credentials would look like.

## Output

- **stdout**: a URL to the newly-created issue, like `https://github.com/owner/repo/issues/123`.
- **stderr**: `gh` progress messages or auth errors.
- **exit code**: 0 on success; 1 on auth failure or API error.

## Caveats

- The `gh` CLI must be installed (declared in `required_commands`). On CI, `gh` is preinstalled on GitHub Actions runners; on local dev, install via `brew install gh` / `apt install gh` / etc.
- The repository must exist and the authenticated user must have **issue creation** permission. For org repos, this typically means the user is a member or has been invited.
- This skill creates an issue with **no labels, assignees, or milestones**. To add those, use `--label`, `--assignee`, `--milestone` flags directly or extend this skill.
- The `body` arg supports full GitHub-flavored markdown including code fences, tables, mentions (`@username`), and issue/PR references (`#123`).
