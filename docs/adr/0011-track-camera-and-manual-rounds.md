# 0011. Distance-based camera and viewer-controlled rounds

- **Status:** Accepted, partly superseded by [ADR 0012](0012-real-pace-true-scale-broadcast.md) (timing, camera scale, default advance)
- **Date:** 2026-11-20

## Context

The prediction grid dominated the race view, and the automatic 2.5-second break left little time to pick a horse. The brief requires sequential rounds, without specifying their playback speed or automatic advancement.

## Decision

- Default to manual advancement. `intermission` has no timer until `autoAdvance` is explicitly enabled; the primary action becomes **Next round**. Changing the preference during a break schedules or cancels that timer. The preference is session-only and initially off.
- Keep results from the completed round on the track while predictions refer to the upcoming round. Publish results only when all horses have finished.
- Extend base race time to 12–18 seconds for an average horse. At 0.5× this is 24–36 seconds, with slower horses taking longer. Scale the photo-finish threshold proportionally to preserve its classification for shared seeds.
- Draw track coordinates in metres. A 300 m camera window follows the leader; the turf, rails and distance poles share the world's transform. An overview and a small race map preserve the context of the full distance. Reduced motion always uses a stationary overview.
- Use a native modal dialog and Teleport to move the same live panel, including its prediction slot, without resetting the clock. The theater has its own playback controls; Escape closes it and restores focus.
- Put paused/ready messages in a banner outside the track image, and results below the track. Keep the compact prediction strip stable between states.

## Consequences

Every round has an unrestricted prediction window by default. Automatic playback remains available. Camera and horse transforms are painted directly from the checkpoint clock; no per-frame state is stored in Pinia.

This supersedes the automatic-default part of A4/A28 and the overlay presentation in A35/A41.
