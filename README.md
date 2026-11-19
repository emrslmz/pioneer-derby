# Pioneer Derby 🏇

[![CI](https://github.com/emrslmz/pioneer-derby/actions/workflows/ci.yml/badge.svg)](https://github.com/emrslmz/pioneer-derby/actions/workflows/ci.yml)

An interactive horse racing game built with **Vue 3, TypeScript and Pinia** for the Insider One Front-end Developer case study.
Twenty horses — named after computing pioneers — race across six rounds from 1200 m to 2200 m.

> 🚧 Work in progress. The project is built phase by phase; see the [implementation plan](docs/PLAN.md).

## Highlights (planned)

- Deterministic, seeded race engine — every race can be replayed and shared
- Fully responsive (mobile, tablet, desktop), light & dark themes
- Turkish 🇹🇷 and English 🇬🇧 UI
- "Predict the winner" engagement layer with a recommended horse
- Unit, property-based, E2E, accessibility and visual tests
- Fairness simulation proving how condition affects winning chances

## Documentation

| Document                             | Content                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| [Requirements](docs/REQUIREMENTS.md) | Case requirements with traceability IDs, ambiguities and decisions     |
| [Architecture](docs/ARCHITECTURE.md) | Stack, folder structure, race engine, state machine, responsive layout |
| [Plan](docs/PLAN.md)                 | Phased implementation plan and progress                                |
| [ADRs](docs/adr/README.md)           | Architecture Decision Records                                          |

## Getting started

Requires **Node.js 24** (see `.nvmrc`).

```bash
nvm use
npm ci
npm run dev        # http://localhost:5173
```

| Script                            | What it does                                                            |
| --------------------------------- | ----------------------------------------------------------------------- |
| `npm run verify`                  | Lint + format check + type-check + unit tests (run before every commit) |
| `npm run build`                   | Type-check and production build                                         |
| `npm run test:unit`               | Vitest in watch mode                                                    |
| `npm run test:coverage`           | Unit tests with coverage thresholds                                     |
| `npm run test:e2e`                | Playwright end-to-end tests (`npx playwright install chromium` once)    |
| `npm run test:visual`             | Playwright screenshot tests                                             |
| `npm run lint` / `npm run format` | Auto-fix lint and formatting                                            |

## Contributing

GitHub Flow: one short-lived branch and one pull request per phase, merged into `main` when CI is green
([ADR 0004](docs/adr/0004-github-flow-branching.md)).
