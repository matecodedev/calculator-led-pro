# Calculator Led Pro

A field calculator for LED screen technicians working live events.

Pick a cabinet model, state the screen you need in metres or in panels, and the app returns the array geometry, total resolution, weight, peak electrical load, how many data and power cables the build needs, and how many processors. It then draws the serpentine cable routing over the panel grid — automatically or hand-drawn cell by cell — and exports the whole thing as a PDF work order.

It is built for a phone, in a dark venue, at arm's length, in a hurry.

## Running it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
```

No API keys, no accounts, no backend. Everything runs in the browser and your work is kept in local storage.

## Scripts

| Script               | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `npm run dev`        | Dev server on port 3000                                              |
| `npm run build`      | Production build into `dist/`                                        |
| `npm run preview`    | Serve the production build                                           |
| `npm run typecheck`  | `tsc --noEmit`, strict                                               |
| `npm run lint`       | ESLint with type-aware rules                                         |
| `npm run test`       | Vitest, once                                                         |
| `npm run test:watch` | Vitest, watching                                                     |
| `npm run format`     | Prettier, writing                                                    |
| `npm run check`      | Typecheck + lint + format check + tests. Run this before committing. |

## How the code is laid out

```
src/
  domain/           pure calculation — no React, no DOM, fully tested
    led-array/      grid sizing, resolution, weight, port capacity
    electrical/     breaker derating, circuit distribution, peak draw
    routing/        the serpentine walk, run balancing, cable colours
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

Two rules worth knowing before you extend it:

**The domain throws, the validator collects.** `calculateProject` throws a `RangeError` on impossible input — a cabinet cannot have zero pixels, and that is a programmer error. `validateProject` returns a list of issues instead, because a half-typed form is not a bug: clearing a number field yields `NaN` while someone is mid-thought. The UI calls the validator first. Anything the calculator would throw on, the validator must catch first; there is a test asserting exactly that.

**Labelled controls go through `Field`.** It generates an id with `useId` and wires `htmlFor`, so tapping a label focuses its control. The app once had 25 labels and zero associations.

## Electrical assumptions

The numbers this app produces are planning figures, not a substitute for an electrician.

- **Mains voltage is a setting, not a constant.** It defaults to 220 V and every amperage derives from it. Change it before you plan a show in another region — at 120 V the same screen draws almost twice the current.
- **Breakers are derated to 80%** for continuous load, and the connector's own rating applies on top. A 16 A circuit on a 16 A powerCON gives 12.8 A usable.
- **Three-phase supplies are summed** and compared against a single-phase current figure. That holds for a balanced load; it does not tell you whether your phases are balanced.
- **Peak power is used for circuit planning**, average power only for the total draw figure.

## Licence

Not yet chosen.
