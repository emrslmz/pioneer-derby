# 0004. GitHub Flow: short-lived branches and one PR per phase

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The project is built by one developer, phase by phase (docs/PLAN.md), and will be reviewed by Insider One.
Reviewers read the git history and pull requests, so every change should be small, explained and green in CI.
The question was whether a long-lived `development` branch (Git Flow) is worth it.

## Decision

Use **GitHub Flow**:

- `main` is always releasable and is the deploy branch. No direct commits to `main`.
- Each phase (or a coherent slice of a large phase) gets a short-lived branch from `main`:
  `<type>/phase-<n>-<topic>`, e.g. `chore/phase-0-scaffold`, `feat/phase-1-domain`.
  Non-phase work uses `<type>/<topic>`, e.g. `docs/git-workflow`.
- Inside a branch: several small Conventional Commits (X15).
- One PR per branch, using `.github/pull_request_template.md`: summary, requirement IDs covered, test evidence.
- A PR is merged only when CI is green, with **rebase and merge** so the granular commits stay on a linear `main`.
- The branch is deleted after merge.

## Alternatives considered

- **Git Flow (`development` + `release/*` branches)** — built for parallel teams and versioned releases.
  For a single developer with one deployable target it only adds an extra merge hop and a branch that
  drifts from what is deployed. Rejected as over-engineering.
- **Squash merge** — hides the small Conventional Commits we want reviewers to see.
- **Commit straight to `main`** — no PR descriptions, no CI gate before code lands.

## Consequences

Every phase has a reviewable PR that links its requirement IDs. History stays linear and readable.
If the team ever grows or needs release trains, a `development` branch can be introduced in a new ADR.
