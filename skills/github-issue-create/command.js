// Pack-distributed CustomCommand for github-issue-create (spec v1.1 §3.4).
//
// The v1.x SKILL.md wrapped `gh issue create` (host CLI). v2 banks run
// skills inside a sandboxed runtime where /bin/sh and the host gh
// binary are not reachable, so the command_template must invoke a
// CustomCommand registered by the bank. This file IS that command.
//
// Implementation: a thin wrapper over GitHub's REST API. Auth comes
// from $GH_TOKEN or $GITHUB_TOKEN in the skill's env (declared in
// SKILL.md required_env). Network calls are governed by the skill's
// `network` allowlist; this command only ever hits api.github.com.

export default ({ defineCommand }) =>
  defineCommand("gh", async (args, ctx) => {
    // Expected argv shape (from SKILL.md command_template):
    //   gh issue create --repo OWNER/REPO --title TITLE --body BODY
    if (args[0] !== "issue" || args[1] !== "create") {
      return {
        stdout: "",
        stderr:
          "github-issue-create command.js only implements 'gh issue create'. " +
          "Got: gh " + args.join(" ") + "\n",
        exitCode: 2,
      };
    }

    const flag = (name) => {
      const i = args.indexOf(name);
      return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
    };
    const repo = flag("--repo");
    const title = flag("--title");
    const body = flag("--body");
    if (!repo || !title) {
      return {
        stdout: "",
        stderr: "missing --repo or --title\n",
        exitCode: 2,
      };
    }

    const token =
      (ctx.env && (ctx.env.GH_TOKEN || ctx.env.GITHUB_TOKEN)) || undefined;
    if (!token) {
      return {
        stdout: "",
        stderr:
          "GH_TOKEN (or GITHUB_TOKEN) required in env. Add to your bank " +
          "config and ensure the skill declares required_env appropriately.\n",
        exitCode: 1,
      };
    }

    const url = `https://api.github.com/repos/${repo}/issues`;
    const fetchImpl = ctx.fetch || globalThis.fetch;
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "agent-skills-cli",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body: body ?? "" }),
      });
    } catch (err) {
      return {
        stdout: "",
        stderr: `network error: ${err && err.message ? err.message : String(err)}\n`,
        exitCode: 1,
      };
    }

    const text = await res.text();
    if (!res.ok) {
      return {
        stdout: "",
        stderr: `GitHub API ${res.status} ${res.statusText}: ${text.slice(0, 500)}\n`,
        exitCode: 1,
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        stdout: text + "\n",
        stderr: "",
        exitCode: 0,
      };
    }
    return {
      stdout: (parsed.html_url || JSON.stringify(parsed)) + "\n",
      stderr: "",
      exitCode: 0,
    };
  });
