# Bo Kata!

A Basant kite-fighting game over a low-poly 3D Lahore, playable in the browser
at **[bo-kata.vercel.app](https://bo-kata.vercel.app)**.

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

The sun sets as a round goes on: by the time you've been flying a couple
of minutes it's a starry Basant night, with string lights on the rooftops and
fireworks across the city. Every cut gets fireworks, kite-paper confetti and a
beat of slow motion.

## Soundtrack

Music lives in `public/music/`: add the files and list them in
`public/music/tracks.json` (see [`public/music/README.md`](public/music/README.md)).
It plays once you hit **Fly**, sounds muffled (like the neighbour's roof) on
the menus, and shows a "Now playing" credit linking to the artist. Only add
music the artists have given permission for.

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

## Contributing

Bug fixes, balance tweaks and new ideas are welcome:

1. Fork the repo and create a branch.
2. Run `npm run check` before opening a pull request. CI runs the same checks.
3. Open a pull request describing what you changed and why.

By opening a pull request, you agree that your contribution can be used as part
of Bo Kata! under the terms in [`LICENSE`](LICENSE).

## Licence

Bo Kata! is source-available, not open source. You're welcome to read the code,
run it locally and send pull requests, but please don't host the game or a copy
of it anywhere else, or reuse the code in your own projects. The full terms are
in [`LICENSE`](LICENSE).
