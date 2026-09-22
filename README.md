# Bo Kata!

A Basant kite-fighting game over a low-poly 3D Lahore, playable in the browser.

You're on a rooftop in the Walled City at golden hour, with Badshahi Mosque and
Minar-e-Pakistan on the skyline. Fly your patang, hook a rival's dor in a pecha,
and cut their kite before they cut yours.

## Play

| Input                         | Action                                                  |
| ----------------------------- | ------------------------------------------------------- |
| Move mouse / finger           | Steer your kite                                         |
| Hold (click, touch, or Space) | **Khainch**: pull the dor in, the kite climbs fast      |
| Let go                        | **Dheel**: let the dor out, the kite drifts on the wind |

**The pecha.** When your dor crosses a rival's, the lines hook together. The
line that's moving faster across the contact saws through the other. Letting
line out (dheel) saws hardest, but you only have 150 m of dor. Run out and
you have to khainch to recover, and that's when they get you.

Each kite you cut makes the sky busier: more rivals at once, sharper manjha,
and meaner flyers (cautious → aggressive → trickster). If your kite sits on the
rooftops for too long, it crashes.

## Develop

Requires Node 22.12+.

```sh
npm install
npm run dev        # http://localhost:5173
```

| Script            | What it does                                       |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                         |
| `npm run build`   | Type-check, then build to `dist/`                  |
| `npm run preview` | Serve the production build                         |
| `npm test`        | Unit tests (Vitest)                                |
| `npm run lint`    | ESLint (strict, type-aware)                        |
| `npm run format`  | Prettier                                           |
| `npm run check`   | Everything CI runs: types, lint, formatting, tests |

The `dist/` folder is a static site, so you can host it anywhere (GitHub Pages,
Netlify, Vercel, or any file server).

## How it's built

TypeScript + [three.js](https://threejs.org/), bundled with Vite. There are no
image or audio assets: the city is generated procedurally and every sound is
synthesised with the Web Audio API.

```
src/
  config.ts            Every tuning number: physics, pecha, rivals, colours
  main.ts              Boots the game and wires up the UI
  core/                RNG, segment/polyline geometry, disposal helpers
  kite/                Kite physics (pure), mesh, string, and the Kite object
  fight/               Pecha rules, difficulty curve, rival AI
  world/               Sky, procedural city, landmarks, rooftop, pigeons
  game/                Game loop and state machine, local storage
  ui/                  DOM overlay: HUD, pecha meter, rival name tags
  audio/               Web Audio synth: wind, string zip, dhol, crowd
  input/               Mouse, touch and keyboard controls
```

Game logic is kept separate from rendering. Physics (`kite/physics.ts`),
pecha rules (`fight/pecha.ts`), rival AI (`fight/rivalBrain.ts`), the
difficulty curve and the city layout are plain functions and classes with no
WebGL, so they are unit tested directly. To rebalance the game, start with
`src/config.ts`.
