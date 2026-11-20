# 0014. Netlify delivery with CI as the gate

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

The case is judged by people who open a link. They need a live build that always matches `main`, and a way to see a proposed change before it is merged. GitHub Pages can publish `main` but has no per-pull-request preview.

## Decision

- **Netlify publishes, GitHub Actions decides.** Netlify is connected to the repository and builds `main` and every pull request (deploy previews). A change reaches `main` only through a pull request whose checks have passed, so what Netlify publishes has already been through lint, types, unit and property tests, end to end, visual, axe, the bundle budget and Lighthouse.
- **`netlify.toml` holds the delivery settings as code:** build command and publish directory, Node 24, one-year immutable caching of hashed assets (`/assets/*`), and security headers (`nosniff`, a strict referrer policy, `X-Frame-Options: DENY`, a locked-down permissions policy). The page itself is revalidated on every load, so a new deploy reaches visitors at once.
- **Two measured gates beyond the tests:** a gzip size budget (`scripts/check-bundle.ts`: JavaScript 120 KiB, CSS 30 KiB, everything 650 KiB) and Lighthouse CI (`lighthouserc.json`: three runs of the production build, median performance at least 90, accessibility and best practices at least 95). The first Lighthouse run found a real accessibility fault, an `aria-expanded` attribute that driver.js puts on an invisible helper element, which is now removed and covered by an axe test.
- **Not done on purpose:** a Content-Security-Policy. The page has an inline theme script and an inline splash style, so a policy needs hashes that change with every edit; it is a follow-up, not a quick win.

## Consequences

- Reviewers get a live link per pull request without any setup on their side.
- If Netlify is down, nothing else is: the checks still run, and the build is reproducible with `npm run build`.
- The Lighthouse job needs Chrome and takes about a minute, so it runs in parallel with the end-to-end job, not before it.
