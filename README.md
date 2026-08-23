# Calculator Led Pro

**A field calculator for LED screen technicians working live events.** Built for a phone, in a dark venue, at arm's length, in a hurry.

![React 19](https://img.shields.io/badge/React-19-1f1f1f?logo=react)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-1f1f1f?logo=typescript)
![Vite 6](https://img.shields.io/badge/Vite-6-1f1f1f?logo=vite)
![Tailwind 4](https://img.shields.io/badge/Tailwind-4-1f1f1f?logo=tailwindcss)
![Offline first](https://img.shields.io/badge/offline-first-CCFF00?labelColor=1f1f1f)
![MIT licence](https://img.shields.io/badge/licence-MIT-1f1f1f)

Pick a cabinet model, state the screen in metres or in panels, and the app returns the array geometry, resolution, weight, peak electrical load, the cables and processors the build needs, and a cable routing schematic over the panel grid — then exports the whole thing as a PDF work order.

No accounts, no backend, no network. It installs as a PWA and works with the radio off, because a venue has no usable signal and a cache miss is a dead tool rather than a slow one.

**Use it at [matecode.dev](https://matecode.dev)** — open it once with signal, then add it to your home screen and it keeps working without one.

---

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
```

That is the whole setup. Your work is autosaved to local storage and restored before first paint.

---

## What it gives you

| Area            | Output                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| **Geometry**    | Grid (cols × rows), physical size, total cabinets, resolution, pixel count, weight                              |
| **Electrical**  | Peak and average draw, current at your mains voltage, cabinets per circuit, cables needed, headroom or overload |
| **Data**        | Cabinets per processor port, data cables needed, processors needed                                              |
| **Routing**     | Serpentine cable plan over the grid — automatic or hand-drawn cell by cell, for data and power layers           |
| **Deliverable** | A PDF work order with every table and both routing schematics                                                   |

---

## Decisions worth knowing before you extend it

### Mains start at the floor

The processor and the PDU sit on the ground, so every automatically routed cable begins on the start corner's edge and its main is drawn down to the floor. Runs take whole columns to make that possible, which costs more cables than the arithmetic minimum — and that is the correct trade, because a cable that begins halfway up the screen is not one a crew can pull.

Switch `Mains` to _One continuous snake_ for the older behaviour, where one serpentine is sliced by capacity wherever the count falls.

### The drawing is the number

Cable and processor counts are counted off the plan that gets drawn, never divided out of the cabinet count. Dividing assumes a cable can be cut anywhere; it cannot. The two must agree, so there is only one source: `domain/routing/demand.ts`.

The same rule governs colour. The on-screen schematic and the PDF read `domain/routing/palette.ts`; neither keeps its own copy.

### The domain throws, the validator collects

`calculateProject` throws a `RangeError` on impossible input — a cabinet cannot have zero pixels, and that is a programmer error. `validateProject` returns a list of issues instead, because a half-typed form is not a bug: clearing a number field yields `NaN` while someone is mid-thought.

The UI calls the validator first. Anything the calculator would throw on, the validator must catch first — there is a test asserting exactly that.

### Labelled controls go through `Field`

It generates an id with `useId` and wires `htmlFor`, so tapping a label focuses its control. The app once had 25 labels and zero associations.

---

## Electrical assumptions

> The numbers this app produces are **planning figures, not a substitute for an electrician.**

- **Mains voltage is a setting, not a constant.** It defaults to 220 V and every amperage derives from it. Change it before you plan a show in another region — at 120 V the same screen draws almost twice the current.
- **Breakers are derated to 80%** for continuous load, and the connector's own rating applies on top. A 16 A circuit on a 16 A powerCON gives 12.8 A usable.
- **Three-phase supplies are summed** and compared against a single-phase current figure. That holds for a balanced load; it does not tell you whether your phases are balanced.
- **Peak power is used for circuit planning**, average power only for the total draw figure.

---

## How the code is laid out

```
src/
  domain/           pure calculation — no React, no DOM, fully tested
    led-array/      grid sizing, resolution, weight, port capacity
    electrical/     breaker derating, circuit distribution, peak draw
    routing/        the serpentine walk, run balancing, demand, cable colours
    project/        the saved document and its parser
    catalog/        cabinets, processors, troubleshooting guides
    validation.ts   field-level checks for half-typed input
    calculate.ts    composes the above into one project calculation
  infrastructure/   the outside world
    pdf/            renders a domain calculation to a PDF blob
    storage/        autosave and the named project library
  features/         one folder per module, container + presentational
    calculator/     the main screen
    library/        cabinet spec table
    troubleshooting/ field guide
  shared/ui/        Field, StatTile, SegmentedControl, SectionHeading
```

The domain is pure and carries the test suite. React never reaches into it, and it never reaches into React.

---

## Scripts

| Script               | What it does                                                             |
| -------------------- | ------------------------------------------------------------------------ |
| `npm run dev`        | Dev server on port 3000                                                  |
| `npm run build`      | Production build into `dist/`                                            |
| `npm run preview`    | Serve the production build                                               |
| `npm run typecheck`  | `tsc --noEmit`, strict                                                   |
| `npm run lint`       | ESLint with type-aware rules                                             |
| `npm run test`       | Vitest, once                                                             |
| `npm run test:watch` | Vitest, watching                                                         |
| `npm run format`     | Prettier, writing                                                        |
| `npm run check`      | **Typecheck + lint + format check + tests. Run this before committing.** |

---

## Contributing

1. Branch off `master`.
2. Write the test first — the domain is test-driven, and a green suite is not the same as a correct one. Cover the input space, not the case you had in mind.
3. Run `npm run check`. It must pass with no warnings.
4. Keep behaviour changes out of refactors, and keep the commit message about _why_.

---

## Licence

[MIT](LICENSE). Use it, fork it, ship it, sell it — a contribution to the event technicians who do this maths on a road case at 2am.

The software comes with no warranty, and the figures it produces are planning figures. See _Electrical assumptions_ above.

---

Built by [MateCode](https://github.com/matecodedev).
