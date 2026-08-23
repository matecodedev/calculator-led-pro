# Critique ignore list

Findings verified as false positives on this project. Drop them silently on future runs.

## `border-accent-on-rounded` on `App.tsx` nav buttons

Rule matches the token `rounded-none` (which is `border-radius: 0`) as if it were a
rounded corner, then flags the adjacent `border-t-2`. Confirmed twice, in the
2026-08-18 and 2026-08-19 runs: the nav buttons compute `border-radius: 0px` in the
DOM, so there is no corner for the accent border to clash with.

## `overused-font` — Inter at ~83% of rendered text

The product register explicitly permits one type family carrying headings, buttons,
labels, body and data. A single well-tuned sans is the intended state here, not a
defect. (This does not excuse loading it from a CDN — see the offline finding, which
is a separate, real issue.)
