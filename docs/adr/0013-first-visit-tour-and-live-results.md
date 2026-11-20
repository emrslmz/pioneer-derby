# 0013. First-visit tour, light default and live results

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

A new visitor saw an empty screen and had to work out the flow alone. The brief gives no onboarding, but the product goal is a game people understand in seconds. Review feedback also asked for a calmer first screen, the horses drawn as horses (not dots), and results that arrive horse by horse.

## Decision

- **Guided tour with driver.js.** It is loaded on demand (library and stylesheet are a dynamic import), so returning visitors never download it. Six steps: welcome, program, prediction, start, player, results. Steps whose target is not on screen (a closed tab on a phone) are skipped. Texts come from the locale files; the popover is styled with the design tokens; reduced motion turns the animated highlight and smooth scrolling off.
- **Language first.** The first popover asks the language. Choosing switches the page behind the overlay, and **Continue** starts the tour. It is the one text outside the locale files, because it is shown before a language is chosen. Closing it skips the tour.
- **Resumes after a reload.** The step being shown is stored (`progress:N`), so F5 mid-tour continues at that step without asking the language again. Finishing or closing stores `1`. `?tour=1` starts over, and the help dialog has "Take the tour again". `onDestroyed` does not fire for a step without an element, so the tour uses `onDestroyStarted`; navigation saves the step it is moving to, because driver.js hooks run before its own state changes.
- **Light by default.** A first visit opens in the light theme; the toggle (system, light, dark) remembers any other choice. E2E tests run as a returning visitor (tour done, theme `system`) through Playwright's `storageState`, and the tour tests opt out of it.
- **Horse list folds into a rail.** On wide screens the list folds into a slim rail of horses (fixed size, number on the saddle cloth); the track takes the space. The column width is a registered custom property (`@property --col-horses`) so it glides; the choice is remembered. `BaseTooltip` gained `side="right"` for the rail.
- **Horses, not dots.** The prediction strip, the leaderboard, the tables, the result board and the statistics drawer draw the horse in its own colour through `HorseRunner`, now in `shared/components` so features can reuse it.
- **Live results.** While a round runs, the Results panel shows that round's block from the start: a pulsing "Race in progress" line, then each horse as it crosses the line, in finishing order. When the last horse finishes, the official result replaces it. The count is read from the race clock a frame at a time, but state changes (and Vue re-renders) only when a horse finishes, about ten times a round, so X10 holds. The official result (`result-round`, `completedResults`) is still published only after the last horse, so R5 and A14 stand.
- **Loading and fixed sizes.** Generating a program shows a CSS-only "Drawing the program" veil over both the Program panel and the track. It never blocks the pointer, and reduced motion skips it. The standings strip and the race map row are always laid out, so Generate and Start never resize the track.

## Consequences

- The tour adds about 6 kB gzip, loaded only on a first visit or a restart.
- Tests that cover a first visit have to ask for it (`storageState`); everything else behaves as a returning visitor.
- The visitor sees results earlier, but an unofficial row can still change position only until the round is over; positions in the live block are final, because a horse's finish time is fixed.
