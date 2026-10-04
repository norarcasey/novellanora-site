# Novella Nora

The public site at novellanora.com. It renders writing that the Noratives studio publishes, and
reads it from Supabase on every request. `README.md` explains how it works, and why.

Work items live in Linora under app `NOVA` (`.linora-app`). Every commit carries a `Runway:`
trailer.

## Ship it

Every ticket ends the same way, before `complete_run`. `~/src/linora/docs/ship-it.md` is the
standard. This section is only this repo's commands.

1. **Merge to main.** From the ticket's worktree, rebase onto `main` and fast-forward `main` to
   it. Never open a pull request or make a merge commit.
2. **Verify.** `npm run gate`: formatting, lint, typecheck, unit tests, build. That is the whole
   check, because this repo has no end-to-end suite. A red gate stops here. One known trap
   (5 Oct 2026): a worktree under `.claude/worktrees/` fails `astro build` with
   `Tsconfig not found astro/tsconfigs/strict`, though the same files build cleanly outside the
   main checkout.
   Until `NOVA-2` fixes that, run the gate on a fresh copy (`rsync` without `.git` and
   `node_modules`, then `npm ci`), and say in the summary that you did.
3. **Push.** `git push origin HEAD:main`. If it is refused because `main` moved, rebase, verify
   again and push again.
4. **Deploy.** CI deploys on push and nothing else does: `vercel.json` turns off Vercel's own
   Git deploys for `main`. Watch the run to the end with `gh run watch <id> --exit-status`.
   The ticket is shipped only when the `deploy` job succeeds on your commit. A green `gate`
   with `deploy` skipped is not shipped.

Then `complete_run` with `shipped: true`, saying which commit went out and which run deployed
it.

Ask Nora for a **Shipit** first (`AskUserQuestion`, **Shipit** / **Hold**), and do not push,
when the change:

- touches the Supabase side: what this site reads (`public_posts`) or how. The schema and its
  RLS belong to Noratives and are shared with noracasey.com.
- touches Vercel settings, environment variables or the deploy job itself (`vercel.json`, the
  `deploy` job in `.github/workflows/ci.yml`, its secrets or `ENABLE_VERCEL_DEPLOY`).
- touches DNS or mail for novellanora.com.
- was held by its ticket or by Nora, or you are not sure it is right.

On **Hold**, stop merged and verified but unpushed. End the run `shipped: false`, with a summary
that starts with `Not shipped:`.
