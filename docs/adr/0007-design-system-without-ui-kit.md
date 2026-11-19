# 0007. Own design system: tokens + Base components, no UI kit

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The brief asks for component-based design (T2) and clean, large-scale-ready code (R7). The example
screenshot is functional but plain. We want a distinctive "night broadcast" look, a light theme, full
keyboard and screen-reader support, and a small bundle (< 120 kB gzip JS).

## Decision

- **Tokens** (`src/styles/tokens.scss`) as CSS custom properties: colours, type scale with `clamp()`,
  spacing, radii, motion. Dark is the default; light follows the system or `[data-theme]`. Components use
  tokens only — no hard-coded colours.
- **Base components** in `src/shared/ui`, each following the matching WAI-ARIA pattern:
  `BaseButton` (`aria-keyshortcuts`), `BasePanel` (labelled region), `BaseTable` (caption, scoped
  headers, `aria-current` row), `BaseTabs` (roving tabindex, arrow/Home/End), `BaseSegmentedControl`
  (radio group), `BaseBadge`, `BaseDialog` (native `<dialog>` for focus trap and Escape), `BaseIcon`.
- Base components take text through props/slots and never import i18n, so they stay reusable.
- One display face (Barlow Condensed, self-hosted via Fontsource) for the broadcast feel; body text uses
  the system stack for speed.
- Quality gate: axe (WCAG 2.2 AA) runs in the E2E job for dark, light and mobile layouts.

## Alternatives considered

- **UI kit (Vuetify, PrimeVue, Element Plus)** — fast to start, but heavy, generic-looking, and the
  review would assess the kit rather than our component design.
- **Tailwind** — good for speed, but scoped SCSS + tokens keeps templates readable and matches the
  brief's "component-based" emphasis.

## Consequences

Every visual decision lives in one tokens file; a theme is a set of variable overrides. We own the
accessibility of each component, so each one has unit tests for its ARIA contract.
