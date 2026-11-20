# 0012. Real racing pace, a true-scale camera and one player bar

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Viewer feedback on the race view:

- Horses looked out of proportion to the track: a 300 m camera window drew a 2.5 m horse as if it were tens of metres long.
- A horse that had finished kept galloping on the line.
- From round 2 on, pausing mid-race showed the previous round's result and podium. The track decided "between rounds" from `completedResults.length === currentRoundIndex`, which is also true in the middle of every round after the first.
- Controls were spread out: speed and auto advance sat in the header, the camera in the panel header, and Next round below the track. The middle column could scroll, and the race map's dot carriers widened the panel, so it could also scroll sideways.

## Decision

- **Real pace.** A speed factor of 1 runs at 16.5 m/s (~59 km/h), so 1200 m takes about 73 s of race time. The field is realistic: condition gives a factor of 0.94–1.0, with ±3 % seeded noise and surges of at most 4 %, so margins are lengths, not hundreds of metres. Commentary gaps scale with this. The playback speeds are 0.5×, 1×, 2×, 4× and 16×, and 2× is the default.
- **True-scale follow camera.** The horse drawing is 2.5 m long, so its pixel width fixes pixels per metre. The window shows what fits, about 20–30 m, and keeps the leader at 80 % of the width. Horses behind the window get a "−23 m" gap at the left of their lane, and the leader's distance to go is shown under the track. Whole track and reduced motion still fit the full distance.
- **Looping turf.** Turf, rails and lane lines are the same everywhere along the track, so they live on a layer one stripe period wider than the screen, moved by `offset mod period`. The metre world, which can be 50 000 px wide at true scale, carries only ticks, poles, stalls, the finish and the horses, and has no background. Before this change the textured world cost about 30 fps under load in the perf test; with the loop it is back to 60 fps.
- **Finished horses stand still.** When a horse's progress reaches 1, the paint loop adds `carrier--finished` to it, which stops the gallop animation.
- **Pause origin in the store.** `pause()` records whether it came from the break. `isBetweenRounds` (intermission, or paused from it) is the only way the track decides to show the finished round. A pause mid-race always shows the "Paused" card.
- **One player bar.** Under the race map, like a video player: play/pause/next, speed, and the Auto next switch (`BaseSwitch`, `role="switch"`). The camera choice and full screen go in the panel header. The header keeps Generate and the primary Start/Pause button the brief asks for. The prediction strip becomes its own card above the track and stays out of the theater.
- **Auto advance on by default.** Start runs the whole program (R4). The break lasts 6 s with a visible countdown and a **Start now** button. Turning the switch off waits for Next round.

## Consequences

- Rounds are longer to watch (about 36 s at the default 2×), but closer to a real race.
- E2E tests run at 16× on Playwright's fake clock (`tests/e2e/clock.ts`) instead of waiting in real time. Unit tests pin 1× so that race time equals timer time.
- Fairness is unchanged in direction (better condition, better placing); seeded results differ from earlier versions.

This supersedes the timing (12–18 s), the 300 m window and the manual default of ADR 0011.
