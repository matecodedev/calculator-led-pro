---
target: src/features/calculator (Calculator screen)
total_score: 22
p0_count: 2
p1_count: 3
timestamp: 2026-08-19T21-30-28Z
slug: src-features-calculator-calculatorscreen-tsx
---
Method: dual-agent, run sequentially rather than in parallel so the two agents could not fight over one browser (a documented failure mode on this project). A: design review with exclusive browser. B: deterministic detector + measured evidence, isolated from A and barred from reading prior critique snapshots. Synthesized by the parent with four independent verification passes against source.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Fabricated telemetry is gone; `useOnlineStatus()`, the autosave stamp, `Legend (40/40)` and the overload banner are all true. Gaps: PDF export shows exactly one button state through the whole operation (`aria-busy` absent from the entire codebase), and the danger state has no persistent presence — from the electrical panel it is 1369px off-screen. |
| 2 | Match System / Real World | 3 | `PowerCON True1`, `Sending Box`, `Three-phase 32A (3×32A) — typical`, `12.8 A usable (16 A × 80%)`, `100 V (Japan)`. Deductions: "Vertical Snake" is still invented; the resize notice says "Go back to 8×5" when the user typed metres; Guides is Spanish inside `lang="en"`. |
| 3 | User Control and Freedom | 2 | `clampRoutesToGrid` + stash is a real undo for the single-resize case. But the stash is one slot, so a second resize is unrecoverable *and silent*; `Delete` and `Clear All` have no confirmation; Escape does not close the fullscreen overlay because the app contains zero keyboard handlers. |
| 4 | Consistency and Standards | 2 | `shared/ui/` is genuinely enforced inside the calculator — 26/26 real controls at ≥44px, one focus ring. Outside it: an emerald `#10b981` button that appears nowhere else, two icon systems, two alert treatments, two focus systems, 6 of 27 focusable elements with no designed focus ring, and four ad-hoc z-index values with a collision. |
| 5 | Error Prevention | 2 | A typed domain and `validateProject` block the Infinity class. But `max=` does not appear anywhere in `src/`: Width = 120 m renders 1200 cabinets, 10,200 kg and 872.7 A as a valid, exportable work order. |
| 6 | Recognition Rather Than Recall | 2 | Two aids added are excellent and work: the inline derating and the voltage stamped on the reading. Three are broken at the size they ship: cabinet order numbers render at 6.0–8.95 CSS px *and* are painted underneath their own cable strokes; the run-start circle shows run length where `#1` belongs; cable colour is never mapped to a port number. |
| 7 | Flexibility and Efficiency | 2 | Autosave, saved screens, Auto-Path and PDF are real accelerators. But there are **zero keydown handlers in the entire application** — the only listeners in `src/` are `online`/`offline`. A 40-cabinet run is 40 taps with no drag; the cabinet select is flat and unsearchable at 20 options while the Library screen has search and no click handlers. |
| 8 | Aesthetic and Minimalist Design | 3 | Chrome is honest, grouping is disciplined, borders carry structure instead of shadow. Deduction: the largest, brightest element on the mobile first screen is `DOWNLOAD PDF EXPORT` at y=49 — the last step of the workflow — and the first real input is at y=714. |
| 9 | Error Recovery | 2 | The banner copy names limit *and* actual. But `aria-invalid` and `aria-describedby` appear **zero times** in the codebase; the offending input's border is unchanged at `rgb(68,68,68)`; the message sits 496px from the field it describes; and clearing a numeric field lands it on `0`, not empty. |
| 10 | Help and Documentation | 1 | Unchanged. Five Spanish entries, no search, no link from any error to a guide, one `title` attribute in the whole app, and no explanation of "Vertical Snake" or the cable-colour mapping. |
| **Total** | | **22/40** | **Acceptable — significant improvements needed before users are happy** |

Up 2 from 20/40. I scored one point below Assessment A. A gave Recognition a 3 for the aids that were added; B's measurements show three of them do not render legibly or show the wrong value. Credit belongs to what reaches the technician's eye, not to what reaches the DOM.

## Anti-Patterns Verdict

**LLM assessment: the costume came off, and nothing fake replaced it.** `GEO: EVENT-SITE-04 | RACK-ID: B-02`, `SYS: ONLINE`, `System Ready` and the pulsing heart are all gone. What remains in the status positions is true: `useOnlineStatus()`, `Autosaved 06:19 p.m.`, `Legend (40/40)`, `Within capacity · 70% headroom`, `12.8 A usable (16 A × 80%)`. An app that shows its own arithmetic next to its answer is the opposite of slop. That is the single biggest change since the last run.

What remains is not strangeness, it is **inconsistent vocabulary across screens** — which the product register bans explicitly. The calculator is one product; Troubleshoot and Library read as a demo bolted to its side: text glyphs `!`/`?` as icons where the calculator uses lucide, a left-stripe alert where the calculator uses full-bleed tinted grounds, a bespoke `focus:ring-1` search input where `shared/ui` defines `focus-visible:outline-2`, and a `focus:outline-none` with no replacement on the only help surface.

**Deterministic scan.** CLI detector: exit 2, 4 findings, 2 rules. Three `border-accent-on-rounded` hits at `App.tsx:96/107/118` are **false positives** — the radius regex matches the token `rounded-none`, which is `border-radius: 0`; confirmed in the DOM, the nav buttons compute `border-radius: 0px`. This is the same false positive the previous run recorded, and it has now cost two runs of analysis; it belongs in `.impeccable/critique/ignore.md`. The fourth, `overused-font` (Inter at 83%), is a **false positive under the product register**, which explicitly permits one family — but it pointed at something real, see P1 below.

In-page detector: 6 findings at 390×844, 7 at 1440×900. Two `clipped-overflow-container` are **false positives** — B enumerated the positioned descendants and found only a `position: fixed` nav whose containing block is the viewport (root has `transform: none`, `filter: none`, `contain: none`) plus six 1×1 `.sr-only` elements. Three `nested-cards` are **structurally accurate**: `div.p-6.bg-[#0A0A0A].border-t` directly containing `div.bg-[#111].border.p-4`, twice more for the data-cable tiles. One `extreme-negative-tracking` is a **true positive**: `App.tsx:22` applies `tracking-tighter` (-0.05em) to `uppercase` text, and uppercase needs positive tracking, not negative.

**Visual overlays.** Injection succeeded; the live server ran on port 8400 and was stopped and verified down. Note for future runs: while `detect.js` was loaded the page reported `innerWidth 392` and a 2px horizontal overflow that **does not exist on a clean page** (`scrollWidth 390 === clientWidth 390` after reload). The overlay perturbs the measurement it is there to take.

## Overall Impression

Last run the verdict was that the app's real competence was invisible. That is now half-fixed, and the half that got fixed is the important one: the electrical path. Voltage is selectable and stamped on the reading, the derating shows its own arithmetic, overload has a properly designed alarm tier that cannot be confused with a validation message, and — the quiet win — the safe state is *stated* rather than implied by the absence of red.

The half that did not move is the drawing. The schematic is still the artifact the crew actually builds from, and it is still the least trustworthy thing in the app: its numbers are 6px and struck through by their own cable lines, its run labels show the wrong value, its "Fullscreen" gains 16% of width, its grid strokes render sub-pixel, and on the power layer — the only layer that can start a fire — the over-capacity colour is 16 RGB points away from the colour of cable #1.

And there is a new class of problem the fix commits introduced: **half-fixes that teach the user to trust a recovery that isn't there.** The resize stash is the clearest case. The biggest opportunity is not adding anything; it is finishing the three fixes that are 80% done.

## What's Working

1. **The electrical panel makes its own reasoning auditable.** `ElectricalPanel.tsx:143-147` prints `12.8 A usable (16 A × 80%)` beside `Max 17 cabs/cable`, and `:159-163` prints `29.1 A / 96 A @ 220 V`. This is how expert tools earn trust: not by being right, but by letting the expert check that they are right without trusting them first. It is the only place in the app where an assumption is shown next to the number it produced, and it should be the template for everything else.

2. **The danger tier is a designed alarm, not a louder warning.** `ProjectAlerts.tsx:27-36` inverts the entire app's contrast — black text on saturated `#FF4444` — so it cannot be mistaken for anything else at arm's length in a dark venue. The copy states the draw, the voltage it was computed at, the supply, and three ways out. This works because it treats "you will trip the feed" as a different *kind* of event from "check this value", not a more urgent instance of the same kind. That was exactly the split the prior run asked for, and it landed.

3. **`clampRoutesToGrid` is the right model, even undersized.** `useRoutingPlan.ts:56-76` survives what it can, reports what it lost by count, names the grid to return to, and actually restores on return. It treats hand-drawn routing as user-authored data with a recovery contract rather than as derived state. The single-slot stash is the flaw; the model underneath it is correct, which is why the fix is small.

## Priority Issues

### [P0] Two consecutive resizes destroy hand-drawn routing silently — and the first resize taught the user it was safe

`useRoutingPlan.ts:49-53` holds exactly one stash slot, overwritten at `:70` on every resize that loses cabinets. Verified in source and reproduced in the browser at 390×844: draw 4 cabinets on 8×5 → set height 1 m (grid 8×2, notice fires, stash = 8×5) → set height 0.5 m (grid 8×1, stash **overwritten** to 8×2) → set height back to 2.5 m (8×5). `stash.signature` is now `8x2`, so `returningToStash` is false; the code falls to the clamp branch, and because growing a grid drops nothing, `lost = 0` → `setDropped(0)` → **no notice at all**. Result: `Legend (1/40)` and an empty `[role=alert]`. Three cabinets gone, in silence, and the 500 ms autosave commits it.

**Why it matters.** This is worse than the bug it replaced. The old behaviour lost everything, every time — brutal, but learnable. The new behaviour shows a recovery promise on the first resize, so the technician learns the app has their back, and then breaks that promise on the second with no message. "Make it 9×5… actually 9×4… no, back to 8×5" is one conversation with a lighting designer, not three separate sessions.

**Fix.** Replace the single slot with a bounded history keyed by grid signature (`Map<signature, {data, power}>`, cap ~8 entries) so any previously-drawn grid restores. Show the notice when `lost > 0` **or** when the current drawing is smaller than a stashed version for this signature. Never `setDropped(0)` on a partial restore — say `Restored 1 of 4 hand-drawn cabinets.`

**Suggested command:** `/impeccable harden`

### [P0] On the Power layer, "overloaded" and "cable #1" are the same red

`palette.ts:21` sets `POWER_CABLE_COLORS[0] = '#FF4444'`; `palette.ts:24` sets `OVER_CAPACITY_COLOR = '#ef4444'`. That is `rgb(255,68,68)` versus `rgb(239,68,68)` — a distance of 16 in one channel, a luminance ratio of 1.10:1. `RoutingSchematic.tsx:201-203` swaps to `OVER_CAPACITY_COLOR` as the **sole** indication that a run carries more cabinets than its cable is rated for. On the power layer that swap is a visual no-op. Runs 2 and 3 (`#f97316` / `#f59e0b`) are only 44.5 apart and are also hard to separate.

**Why it matters.** The power layer is the one where exceeding a rating means a melted True1 connector or a breaker tripping mid-show. The file's own header comment says "the colour *is* the cable's identifier" — so the fault state is competing for the exact channel that carries identity, on the only layer that can burn. A signal that is invisible where it matters is worse than no signal, because the drawing looks complete.

**Fix.** Make over-capacity a **shape and label** change, not a hue change: dashed stroke plus an inline `⚠ 24/17` badge at the run start, applied identically on both layers. Separately rebuild `POWER_CABLE_COLORS` for perceptual separation (distinct hue families, not five reds and yellows) and reserve red exclusively for the fault state.

**Suggested command:** `/impeccable colorize`

### [P1] The schematic's own numbers are unreadable, and "Fullscreen" doesn't fix it

Four compounding defects in `RoutingSchematic.tsx`:

- **Paint order.** The order-number `<text>` elements (`:230-247`) are emitted *before* the link `<line>` elements (`:249+`) inside the same `<g>`, so every digit is bisected by a 2.5px stroke.
- **Size.** Measured at 390×844: the SVG user-space→CSS scale is 0.5133, so `fontSize={10 * scale}` renders at **6.0 CSS px** and the run-start label at 6.5px. On the 8×5 default they reach 8.95px. Grid strokes render at **0.51 CSS px** and cable links at 1.28 — the 3.29:1 grid contrast is an upper bound, not the painted value, because a sub-pixel stroke is anti-aliased below its nominal colour.
- **Wrong value.** `:225` renders `{run.length}` inside the start circle where `1` is expected, so a 20-cabinet run reads `20, 2, 3, 4…` and two runs of equal length both label themselves with the same number.
- **Fullscreen isn't.** The painted content goes from 308×192.5 to 358×223.8 in an 844px viewport — 16% wider, with ~588px of black above and below. No pinch-zoom, no pan, no rotate hint.

**Why it matters.** This drawing exists to answer exactly one question on a dark stage: *which cabinet is #17, on which cable, at which port?* The answer is currently 6 pixels tall, crossed out by a line, in a colour never mapped to a port, on a postage stamp behind a button that promises to enlarge it and doesn't.

**Fix.** Emit links first and numbers last, with `paint-order: stroke` and a 2px halo in the cell fill. Label the run start `1` and move the count into a run label beside it (`Run 2 · 20 cab · Port 2`). Make fullscreen actually fill the viewport — rotate the viewBox for portrait, or add pinch-zoom and pan.

**Suggested command:** `/impeccable layout`

### [P1] Manual routing is invisible to assistive tech, unreachable by keyboard, and 10px wide on a dense grid

`RoutingSchematic.tsx:181-196` renders each cell as a bare `<rect onClick>` — no `tabIndex`, no `role`, no `aria-label`, no key handler. Measured: **0 focusable elements** inside the SVG, and the document's 23 tab stops include none of it. `rg` over all of `src/` confirms **zero keydown handlers in the entire application**.

The compounding defect neither the DOM sweep nor the tab-order count reveals: `RoutingSchematic.tsx:158` sets `role="img"` on the `<svg>`. That does not merely leave the cells unfocusable — it removes the **entire subtree** from the accessibility tree. The app is placing its primary interactive surface inside a role that tells assistive technology "this is a picture, don't look inside."

Hit area measured at 390×844: 51.3px at the 6×4 panel-count default, **38.5px** at the 8×5 dimensions default, and **10.27px at 30×12**. Every other control in the app now clears 44px via `controls.ts:16`; this one — the most-repeated interaction in the product — clears none. There is no drag, no fill, no rubber-band, and mis-tapping an already-routed cell returns `previous` with no feedback, so a missed tap and an ignored tap look identical.

**Why it matters.** For Sam this is not slow, it is impossible, and it is the only feature with no alternative path. For everyone else it is 40 discrete taps on sub-44px targets with cold hands in the dark.

**Fix.** Drop `role="img"` when `mode === 'manual'` and switch the `<svg>` to `role="grid"` with `role="gridcell"`, `tabIndex`, and a real `aria-label` per cell (`Cabinet column 3 row 2, position 17 on run 2` / `…, unrouted`). Add arrow-key navigation and Space/Enter to toggle. Add pointer-drag (`pointerdown` + `pointerenter` under capture) so a run is one gesture. Overlay transparent hit rects sized `max(cellSize, 44/scale)` where they do not overlap.

**Suggested command:** `/impeccable harden`

### [P1] The app that was made to "work offline, for real" loads both its typefaces from Google's CDN

`index.html:16-21` fetches Inter and JetBrains Mono from `fonts.googleapis.com`. Verified: **there are no local font files anywhere** — `public/`, `src/` and `dist/` contain zero `.woff2`/`.woff`/`.ttf`/`.otf`. The precache `globPatterns` at `vite.config.ts:41` includes `woff2` and therefore matches nothing. Both families are covered only by opportunistic `runtimeCaching` (`StaleWhileRevalidate` for the stylesheet, `CacheFirst` for the files), which by definition can only populate **after a first successful online load**.

**Why it matters.** The technician who installs the PWA on hotel wifi is fine. The technician who first opens it in a venue with no signal — which is the exact scenario `9dd801f` was written for — gets neither family. Losing Inter is cosmetic. Losing JetBrains Mono loses `tabular-nums`, which is the entire reason mono was chosen for the values: amperages and cabinet counts stop aligning in the columns a technician scans down. This is also the app's only remaining network dependency, so it is the only thing standing between the product and a truthful offline claim.

**Fix.** Self-host both families as `woff2` in `public/fonts/`, subset to Latin, and `@font-face` them from `index.css` with `font-display: swap`. The existing `globPatterns` already precaches `woff2` — it will start matching the moment the files exist. Then delete the two `preconnect` hints, the stylesheet `<link>`, and both `runtimeCaching` entries.

**Suggested command:** `/impeccable harden`

## Persona Red Flags

**Alex (touring power user, 40 shows a season).** `CabinetPanel.tsx:47-60` is a flat 20-option `<select>` with no search, while `LibraryScreen.tsx:16-24` has a search box and zero click handlers — he can find the panel and cannot select it. `RoutingSchematic.tsx:181-196` gives him 40 taps per run with no drag and no fill, and `:78` silently returns `previous` on an already-routed cell so a mis-tap is indistinguishable from a no-op. There is not one keyboard shortcut in the codebase — not `⌘S` on Save, not `⌘E` on export, not `Esc` on the overlay he just opened. His third grid change of the day quietly discards the drawing he made after the second. And `RoutingToolbar.tsx:88-115` keeps `Priority` and `Starting Corner` live and identical-looking in Manual mode, where they do nothing until a subsequent Auto-Path.

**Sam (accessibility-dependent).** The routing SVG is `role="img"` with 0 focusable children — manual routing does not exist for her, with no alternative path. All six nav buttons (`App.tsx:44,58,72,99,111,125`) have no focus classes and no `aria-current`/`aria-selected`, so the active module is conveyed by lime fill alone. `Lib` and `Guides` measure **3.95:1** at 9px/700 (`oklch(0.556 0 0)` on `#121212`) — unchanged from the last run — and the footer credit measures **4.43:1** on pure black at 1440. `TroubleshootingScreen.tsx:36` sets `focus:outline-none` with no replacement on the only help surface. The fullscreen overlay has no `role`, no `aria-modal`, no focus trap, no scroll lock, and leaves 23 background controls focusable underneath it. `aria-invalid` and `aria-describedby` appear zero times in the codebase, so the validation message at 496px distance has no programmatic link to its field. `index.html:2` declares `lang="en"` over five entirely Spanish Guides entries with no `lang="es"` subtree. And `index.css` defines four animations with **no `prefers-reduced-motion` block anywhere in the project** — verified three ways, including a regex over the full 35,014-character generated stylesheet.

**Casey (distracted mobile, one-handed, interrupted).** The loudest thing on her first screen is `DOWNLOAD PDF EXPORT` — 358×44 of lime at y=49 — which is the last step of the workflow; her first actual input is at y=714. `Within capacity · 70% headroom`, the one line she needs before saying "we're good to plug in", is at y=1763 of 2720. When she *is* overloaded the banner is at the top and 1369px off-screen from the panel she is reading, with nothing in the nav or header carrying the state. She taps `Fullscreen`, gets 16% more width, and the bottom nav still sits at the same `z-50` and wins on DOM order — a thumb resting at the bottom of the phone swaps the whole screen out from under her. She backspaces the Columns field to retype it and the drawing vanishes (`CalculatorScreen.tsx:239` gates the schematic on `results`) — the data survives, but nothing tells her that, and the field lands on `0` rather than empty. And `ProjectBar.tsx:87-95` renders `Save Screen` disabled at an effective **1.9:1**; WCAG exempts disabled controls, but she genuinely cannot read the primary save action, and the only explanation is a `title` attribute that touch never fires.

## Minor Observations

- `.impeccable/critique/ignore.md` does not exist. The three `border-accent-on-rounded` false positives on `rounded-none` have now been re-derived in two consecutive runs. Write them down.
- `TroubleshootingScreen.tsx:52` applies `animate-in slide-in-from-top-1`, but the generated stylesheet contains **no `.slide-in-from-top-1` rule** — the class is a no-op. `index.css` also defines `.zoom-in-95` and its keyframes, which no component uses.
- At 1440×900 the `Supply / Main PDU` select clips `Three-phase 32A (3×32A) — typical` to `Three-phase 32A (3×32` — 238px of text in 150px, `appearance-none`, no ellipsis. The best copy in the app is invisible on desktop, and `32` vs `320` is not distinguishable at the cut.
- At 390×844, `29.1 A / 96 A @ 220 V` wraps between `@` and `220 V`, orphaning the voltage away from the amperage it qualifies. `whitespace-nowrap` on the qualifier.
- The resize notice says *"Go back to 8×5"* but in dimensions mode the user never typed `8×5` — they typed `2.5`. Name the field they touched.
- The legend never maps colour to port number: `Total cables: 3`, three coloured runs, no `Port 1 / Port 2 / Port 3` key.
- `Auto-Path` is `#10b981` on `#059669` — the only emerald in the application, sitting next to three neutral buttons.
- `AwaitingInput.tsx` renders three times, each saying "see the note at the top of this screen"; at 390×844 the Electrical instance is ~1100px below the note it references, with no `id` to link to.
- Two unlabelled `<nav>` landmarks — a screen reader's landmark list shows "navigation" twice with nothing to tell them apart. No `<section>` carries an accessible name, so none register as regions.
- Two `<h1>` on the calculator at ≥640px; no h3–h6 on the screen at all.
- Four ad-hoc z-index values (`10`, `40`, `50`, `50`) with a collision between the fullscreen overlay and the mobile nav. No semantic scale.
- `TroubleshootingScreen.tsx:14` still uses `border-l-2 border-[#FF4444]` — a literal side-stripe, while `ProjectAlerts.tsx:44` already demonstrates the correct full-border-plus-tinted-ground pattern three files away.
- The ACTION PLAN runs at 167 characters per line at 1440×900. It is a procedure followed on a ladder; it needs an `<ol>`.
- `LibraryScreen.tsx:36` puts a `min-w-[600px]` table inside a vertically-scrolling 390px page.
- PDF export: 3530 ms on the first cold click (`projectReport.ts:57-60` dynamically imports jsPDF + autotable), 8–49 ms warm. One observed button state throughout, `aria-busy` absent from the codebase, no success confirmation. Add a pending state and prefetch the chunk after the first successful calculation.
- `App.tsx:22` applies `tracking-tighter` (-0.05em) to uppercase text. Uppercase needs positive tracking.

## Questions to Consider

1. **You built a real alarm and gave it one location.** The overload banner is the best thing in this app, and from the panel where the decision is actually made it is 1369px away. What changes if the *state* — not the message — lives permanently where `ONLINE` currently sits, so that "am I safe?" is answered at every scroll position by a glance instead of a swipe?

2. **On the power layer, the fault state and cable #1 are the same red.** The palette file's own comment says the colour *is* the cable's identifier. So what is the fault state's identifier, and why is it borrowing the identity channel instead of using shape, weight, or a label?

3. **"Fullscreen" makes the drawing 16% bigger.** That gap between the promise and the delivery is the tell: the schematic is still a section of a calculator rather than a destination. If the crew builds from the drawing, what does this app look like when the schematic *is* the screen — grid filling the viewport, run and port list in a rail, and the geometry and electrical panels reachable as its parameters?

4. **Three of the four fixes shipped since the last run are 80% done, and the missing 20% is what makes them dangerous.** The resize stash promises recovery and then breaks it. The over-capacity colour signals a fault on one layer and not the other. Fullscreen offers a bigger drawing and delivers 16%. What is the check that would have caught all three before commit — and why did "167 tests green" not catch any of them?
