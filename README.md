# Darts – score counter

A web app for keeping score in darts games at home or in the pub. It runs entirely in the browser: no account, no backend, and nothing is lost when you refresh or close the page. The UI is in Czech by default and can be switched to English.

## Features

- **Games** (rules in [`rules.md`](rules.md), Czech)
  - **X01**: 180 / 301 / 501 / 701 or a custom start score, Straight/Double In, Straight/Double/Master Out, busts, “first to N legs”, optional round limit (decided by lowest remaining score or a bull-off)
  - **Cricket**: standard, cut-throat or no-points scoring, optional round limit
  - **High Score**, **Shanghai** (optional instant win), **Baseball**
- **Flexible setup**: every option is optional; values from `rules.md` are just the defaults. Save any setup as a named **preset** and pick it from a list next time.
- **Players**: up to 6 per game, each with a nickname and colour; set the throwing order or shuffle it.
- **Input**: a keypad (tap Double/Triple, then the number) or tap-on-dartboard, plus keyboard shortcuts on desktop. Undo works dart by dart.
- **During the game**: checkout suggestions for X01, per-dart and per-round averages, round-by-round table, Cricket marks shown as dots.
- **Responsive layout** for phone, tablet (portrait and landscape) and desktop, with light and dark themes.
- **Saved in the browser**: the game in progress, players, presets, settings and history of finished games.
- **Sharing**: copy a link to a finished game. The whole game is stored *in the link itself*, so anyone who opens it sees a read-only results page; nothing is uploaded anywhere.

## Running locally

Requires **Node.js 22 or newer** (developed on Node 24).

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (game rules, presets) with Vitest
npm run typecheck  # TypeScript check
npm run build      # type check + production build into dist/
npm run preview    # serve the production build locally
```

## Running with Docker

The `Dockerfile` builds the app and serves it with nginx on port **3003**.

Standalone:

```bash
docker build -t darts .
docker run --rm -p 3003:3003 darts   # http://localhost:3003
```

Behind Traefik (as deployed): `docker-compose.yml` expects an existing external Docker network `traefik_net` and routes the host `darts.frigi.me` to the container. Adjust the `Host(...)` rule for your own domain, then:

```bash
docker compose up -d --build
```

## Where data is stored

- **Your data** (players, game in progress, history, presets, settings) is kept in the browser’s `localStorage` under the key `darts-app:v1`. It stays on that device and browser; clearing site data starts from scratch.
- **Shared links** contain the compressed game (settings, nicknames, every dart, date) after `#/r/`. Browsers never send the part after `#` to the server, so shared games are not stored on the server. Anyone with the link can see the game.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS 4, Zustand (state + `localStorage` persistence), lz-string (share links), Vitest.

## Project structure

```
src/
  engine/      game rules: modes, replay of the dart log, checkout hints, stats (+ tests)
  store/       app state persisted in localStorage (+ preset tests)
  screens/     Home, Players, Setup, Game, Results, History
  components/  keypad, dartboard, turn bar, scoreboards, UI primitives
  share/       share-link encoding, results table formatting
  i18n/        Czech and English texts
rules.md       game rules (Czech)
```

A game is stored as its settings, its players and the list of thrown darts. Scores, turns, busts and winners are always recomputed by replaying that list. That makes undo, persistence and share links straightforward.
