---
target: src/features/calculator (Calculator screen)
total_score: 20
p0_count: 2
p1_count: 3
timestamp: 2026-08-18T03-35-11Z
slug: src-features-calculator-calculatorscreen-tsx
---
Method: dual-agent (A: design review · B: detector + measured browser evidence), synthesized by the parent with three verification passes of my own.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `LEGEND (0/40)` sits 20px from `TOTAL CABLES: 2` — the counter reads `manualRoutesForActiveLayer`, always empty in Auto mode. PDF export has no pending or success state. Three header/footer status readouts are hardcoded constants. |
| 2 | Match System / Real World | 3 | Genuinely fluent domain language (PowerCON True1, sending box, PDU, RCFG). `Three-phase 32A (3×32A) — typical` teaches the default inside the control. Deductions: "Vertical Snake" is invented; Troubleshoot is Spanish inside an English app. |
| 3 | User Control and Freedom | 2 | Undo exists in one place and pops one cabinet. `Delete` and `Clear All` have no confirmation. Changing screen size destroys all hand-drawn routing silently. |
| 4 | Consistency and Standards | 2 | Two focus systems; two alert treatments for two risk classes; two languages; an emerald `#10b981` button that appears nowhere else. Eight distinct near-black surfaces and two parallel colour sources (hardcoded hex + Tailwind oklch defaults). |
| 5 | Error Prevention | 2 | Number inputs have `min` but no `max`. 300 columns yields a 150m × 2m screen at 872 A and the app renders it as a valid work order. The only ceiling, `MAX_CABINETS`, is justified in code as an SVG rendering limit, not a physical one. |
| 6 | Recognition Rather Than Recall | 2 | Everything visible, no hidden menus. But Manual mode shows a blank grid with no hint cells are tappable; the run-start number is unexplained; `~23 cab / cable` has no derivation. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts. Manual routing is `<rect onClick>` with no tabIndex/role/key handler — 40 taps for a 40-panel run, no drag. Autosave, saved screens and PDF are real accelerators. |
| 8 | Aesthetic and Minimalist Design | 2 | Grouping and borders are disciplined. But the largest, brightest element on the mobile calculator is Total Resolution — the least consequential number — and three chrome elements are fiction. |
| 9 | Error Recovery | 2 | The copy is excellent ("plans up to 4,000 cabinets; that grid needs 5,200" names limit AND actual). But it wipes three panels into three identical cross-references, and the offending field gets no red border, no `aria-invalid`, no scroll-to. |
| 10 | Help and Documentation | 1 | Troubleshoot is 5 entries, Spanish-only, no search, no link from any error to a guide, no tooltips, and the 80% derating that turns a 16A circuit into `12.8A cap` is never explained. |
| **Total** | | **20/40** | **Poor — major UX overhaul required** |

I raised Error Prevention from A's 1 to 2: a validated domain layer with typed boundaries does exist and does block the Infinity class of failure. What is missing is *physical* plausibility bounds, not validation itself.

## Anti-Patterns Verdict

**LLM assessment:** the aesthetic is earned, the telemetry is costume. Lime-on-near-black is justified by the physical scene — a white app in a dark arena destroys night vision — and `#CCFF00` on `#0F0F0F` measures 16.3:1. The Inter-labels / JetBrains-Mono-values split with `tabular-nums` is functional, not decorative. What would make someone say "AI made this" is `GEO: EVENT-SITE-04 | RACK-ID: B-02` (App.tsx:154), `SYS: ONLINE` (App.tsx:37), `System Ready / Offline Active`, and the `animate-pulse` heart. The status bar has three readouts and zero of them are true, while the genuinely urgent state — overload — has no status-bar presence at all.

**Deterministic scan:** CLI detector returned 3 findings, one rule (`border-accent-on-rounded`, App.tsx:95/106/117), and all 3 are false positives — the regex matches `rounded-none`, which is `border-radius: 0`. The in-page detector returned 6: two `clipped-overflow-container` (App.tsx:12, :37), one `overused-font` (Inter at 82–84% — a false positive under the product register, which explicitly permits one family), and three `nested-cards` (TotalOutputPanel.tsx:36; StatTile.tsx:30 rendered by ElectricalPanel.tsx:92 and ProcessingPanel.tsx:81). The nested-cards finding is legitimate and matches the "cards are the lazy answer" guidance.

**Where the two assessments disagreed, and who was right:** B reported 0 contrast failures; A reported the mobile nav at 3.95:1. I verified directly. A is right. B's sweep used an RGB regex that cannot parse `oklch()`, so it silently skipped all 59 elements using Tailwind default greys. My own first verification also failed — its transparency check `,\s*0\)$` matched `rgb(204, 255, 0)`, flagging black-on-lime as a failure. Corrected measurement at 390×844: **exactly 2 real failures**, the inactive bottom-nav labels `Lib` and `Guides`, `oklch(0.556 0 0)` on `rgb(18,18,18)` at 9px = **3.95:1**, need 4.5:1. Everything else passes; the lowest passing value is 5.54:1.

## Overall Impression

This is engineered by someone who has actually pulled power — 80% continuous-load derating, connector-versus-breaker minimums, serpentine capacity balancing — and almost none of that knowledge is visible on the surface where decisions get made. The derating is invisible. The line voltage is invisible *and* hardcoded. The safe state is invisible. The overload is visible only as an 11px footnote two screens down. The routing counter lies. The single biggest opportunity is not hierarchy: it is making the app's real competence legible at a glance.

## What's Working

1. **It arrives already working.** No empty state, no wizard. `useProjectDraft` seeds real hardware, `loadAutosave()` restores the last session before first paint, autosave debounces at 500ms with an honest timestamp. For someone at a road case with 90 seconds, this beats any feature.
2. **The domain layer, and one control proves it.** `effectiveAmpsPerLine` returns `Math.min(breakerAmps * 0.8, cableLoopAmps)` — derating *and* the connector ceiling, whichever bites first. The PDU label `Three-phase 32A (3×32A) — typical` teaches the correct default inside the control. That "— typical" is the best copy in the app.
3. **The `shared/ui/` focus and labelling system.** One shared focus-visible ring, `SegmentedControl` on real radios with `has-[:focus-visible]`, `Field` generating ids and wiring `htmlFor`. More rigor than most shipped product UI — which is why the two gaps below read as oversights, not house style.

## Priority Issues

### [P0] Line voltage is hardcoded, invisible, and uneditable
`useProjectDraft.ts:8` — `LINE_VOLTAGE = 220`. Every amperage derives from it. It appears nowhere in the UI and surfaces only in the PDF as a fait accompli. This is a touring tool: the catalog is European, so 220–230V is defensible at home and wrong the moment the crew lands in North America or Japan. At 120V every amp figure is understated by ~1.83×. The app says 23.3A of a 96A supply; it is actually 42.7A. It says 17 cabinets fit one 16A powerCON loop; at 120V it is 9. That is exactly the failure the product exists to prevent.
**Fix:** Mains Voltage select as the first field in `ElectricalPanel` (110/120/208/220/230/240). Print the assumption on the reading itself — `23.3 A @ 230 V`. An amperage without its voltage is a guess. Persist it and stamp it on the PDF header.
**Command:** `/impeccable harden`

### [P0] The only alarm channel never carries the only real alarm, and there is no safe state
Three defects compounding. (a) `ProjectAlerts` is a full-bleed pinned banner — the app's one global attention surface — and it carries only field validation; electrical overload never reaches it. (b) "Load exceeds the circuit / PDU capacity" (fire, blackout) renders as an 11px footnote inside a StatTile, in the identical red, size and border as "Capacity exceeded" directly above it, which means "rent another sending box". One alarm level spent on two risk classes three orders of magnitude apart. (c) Under capacity there is no affirmation at all — the only evidence of safety is the absence of red, which is the weakest possible signal in a dark venue at arm's length.
**Fix:** escalate overload into `ProjectAlerts` on both breakpoints; split the vocabulary into DANGER and WARNING tiers that do not share a colour; add the safe state — `23.3 A / 96 A · 76% headroom` in lime, legible as *good*, not merely as *not red*.
**Command:** `/impeccable clarify` then `/impeccable colorize`

### [P1] The schematic is unreadable on the device it is used on, and its counter contradicts itself
At 390px the SVG letterboxes to roughly 300×160 inside a 350px container — a quarter of its own box, ringed by black, no pinch-zoom. `markerWidth="6"` in stroke units on a 2.5px stroke plus `shrink()` pulling 25% off each end renders two cables as ~40 disconnected arrows. `LEGEND (0/40)` sits beside `TOTAL CABLES: 2`. The grid strokes are `#333` on `#111` = **1.49:1**, below the 3:1 non-text minimum — verified directly. No panel numbering, so there is no way to know which physical cabinet is #17 on run 2.
**Fix:** a full-screen schematic view on mobile; aspect-driven sizing instead of `minHeight`; `markerUnits="userSpaceOnUse"` so runs read as polylines with periodic direction marks; number every cell with its order-in-run; grid stroke to at least `#4A4A4A`; fix `routedCabinets` to count `routesFor(plan.layer)`.
**Command:** `/impeccable layout` then `/impeccable audit`

### [P1] Changing the screen size silently destroys hand-drawn routing, and autosave commits the loss
`useRoutingPlan.ts` wipes `manualData`/`manualPower` when `gridSignature` changes — no confirmation, no undo, no notice — and the 500ms autosave then writes the empty state over the saved project. The realistic sequence: 40 taps of hand-drawn routing, the LD says "make it 9×5", one number changes, 40 taps gone and persisted. `Undo` pops one cabinet and cannot recover it. This is the app's most valuable artifact destroyed by its most common edit.
**Fix:** clamp surviving routes to the new bounds instead of wiping, and surface a dismissable line: "Grid changed to 9×5. 3 hand-drawn cabinets fell outside and were dropped. Undo." At minimum keep one pre-wipe snapshot behind a real Undo. Never let autosave commit an unacknowledged destructive change.
**Command:** `/impeccable harden`

### [P1] 21 of 24 touch targets are under 44px, and the worst one silently reinterprets the calculation
Measured at 390×844: segmented controls 28.5px tall, the three electrical selects 34px, Save/Delete 34.5px, the primary Download PDF Export 40.5px. Nothing reaches 44. The Manual Controls row also clips its own buttons — they wrap to two lines inside a fixed `h-[34px]` and the second line is cut mid-word. Gloved hands, cold, dark, one-handed. The 29px target easiest to mis-tap is `By Metres` / `By Panel Count`, and hitting it reinterprets `4` from metres to panels with no announcement.
**Fix:** floor every interactive element at 44px on touch; drop the fixed `h-[34px]`; have the results heading name the mode — `Total Output · by panel count`.
**Command:** `/impeccable adapt`

## Persona Red Flags

**Casey (distracted mobile user — the actual user, on the actual device):** the first thing on screen is a dimmed lime DOWNLOAD PDF EXPORT — the last step of the workflow rendered as the loudest element, disabled. The peak amperage is at scroll ~1300 of 2617; the schematic at ~1750, where it is a 300×160 postage stamp. Every mode toggle is 29px, and the one under her thumb's resting arc silently changes what `4` means. Autosave is the one thing that goes right for her.

**Alex (touring power user, 40 shows a season):** no keyboard shortcuts anywhere. The cabinet picker is a flat unsearchable 17-item select, while the Cabinet Lib tab *has* search and no way to act on a result — `LibraryScreen` contains zero click handlers, a read-only dead end. Drawing a 40-panel run is 40 taps with no drag or fill. Mis-tapping an already-routed cell returns `previous` with no feedback: he cannot tell whether he missed or the app ignored him. Then one width change deletes all 40.

**Sam (accessibility-dependent — and everyone at 2am):** manual routing is unreachable by keyboard (`<rect onClick>`, no tabIndex/role/key handler). `TroubleshootingScreen.tsx:36` sets `focus:outline-none` with no replacement — focus vanishes on the only help surface. `<html lang="en">` while Troubleshoot content is entirely Spanish, so a screen reader applies English phonemes to the field guide. Overload is conveyed by colour alone, no icon, no word in the heading. The two failing nav labels at 3.95:1 and the SVG grid at 1.49:1 are the same failure on the drawing itself.

## Minor Observations

- `TroubleshootingScreen.tsx:14` uses `border-l-2 border-[#FF4444]` — a literal match on the side-stripe absolute ban. Rewrite as a full 1px border with a tinted ground, matching `ProjectAlerts`, which already does it correctly.
- The ACTION PLAN is a run-on paragraph (`1. Verifica… 2. Comprueba…`) at ~160 characters per line. It is a procedure followed on a ladder; it needs discrete numbered lines.
- `12.8A cap` appears with no explanation next to a `16A circuit`. Print it: `12.8 A usable (16 A × 80% continuous)`.
- Two `<h1>` elements on one screen; no h3–h6 anywhere.
- Six nav buttons in `App.tsx` have no designed focus indicator — they fall back to the UA default.
- PDF export has no pending state; `Delete` and `Clear All` have no confirmation; the error banner never marks the offending field.
- `Total Cabinets: 8 × 5 = 40` is in the smallest text on screen — arguably the first number a crew chief calls out when unloading.
- Cabinet Lib table scrolls horizontally inside a vertically-scrolling page on mobile. Card layout below `sm`.

## Questions to Consider

1. What is the one number this screen exists to deliver? It currently answers "all nine, equally". If it is the amperage, why is it eleventh — and what is Total Resolution doing as the biggest element on the phone?
2. What would this look like if the safe state were as loud as the danger state?
3. Total weight of 340 kg is a fact. Does a rigger need the total, or kilos per hanging point? The app computes what a spreadsheet computes, not what a decision requires.
4. If the schematic is the artifact the crew builds from, why is it a section of the calculator rather than a destination — with the calculator as its input?
5. What breaks if the three fake status readouts are deleted tonight? Nothing — and the status bar could then carry something true, like the overload that currently has nowhere to go.
