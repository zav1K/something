# Granum

A tiny falling-sand physics playground in the browser — no build step, no dependencies.

Paint sand, water, oil, wood, stone or fire onto a grid and watch a small cellular automaton
take it from there: sand piles up at a natural angle of repose, water finds its level, oil floats
on water, fire eats through wood and oil, and the smoke rises and fades away.

## Run it

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## How it works

`script.js` runs a per-cell rule (`updateSand`, `updateWater`, `updateFire`, ...) over a low-res
grid once per frame, bottom-to-top so falling matter doesn't get processed twice in the same tick.
The grid is rendered to an off-screen 1-pixel-per-cell canvas and scaled up with
`image-rendering: pixelated` for the chunky look.

## Ideas for next steps

- More materials: acid (dissolves things), lava, ice/freezing water
- Erasing with a "vacuum" tool instead of just overwrite
- Save/load a canvas snapshot to `localStorage`
- A "life" material — simple cellular-automaton creatures that eat/avoid other matter
