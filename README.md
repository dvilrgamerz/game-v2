# Nebula Survivors

Nebula Survivors is an original browser arena-survival game built with HTML, CSS, Canvas 2D, and vanilla JavaScript. It has no runtime framework, login, analytics, or gameplay network requirement.

## Current shared build

The same core build is maintained on `main`, `game-v2`, and `game-v3`.

- Endless escalating waves with grunts, runners, tanks, elites, and Void Warden bosses
- Automatic nearest-target combat
- Pulse Blaster, Orbit Shards, and Nova Ring weapon families
- Weapon levels, passive skills, build synergy, and original evolutions
- Random three-card level-up choices
- XP, score, kills, waves, health, armor, pickup range, haste, multi-shot, and movement upgrades
- Procedural neon arena visuals, particles, hit flashes, enemy health bars, projectiles, arena rings, and boss presentation
- Low / Medium / High / Ultra graphics presets
- Particle, glow, grid, damage-number, screen-shake, high-contrast, and reduced-motion settings
- Master volume with lightweight Web Audio effects started from user interaction
- Keyboard, mobile virtual joystick, and gamepad movement
- Pause, resume, settings-from-pause, quit, restart, and game-over flows
- Local top-10 high-score leaderboard
- Guarded and normalized localStorage settings/scores
- Built-in player themes and client-only PNG/JPEG custom skin validation (2 MB, 16–1024 px)
- Runtime error overlay, clamped animation delta, HiDPI canvas rendering, and input reset on focus loss

## Controls

Desktop: **WASD / Arrow Keys** move, **P / Esc** pause. Gamepad: left stick moves. Mobile: drag the virtual joystick. Mouse/touch controls menus and upgrades.

## Run locally

Serve the repository root with any static server, or deploy the root to a static host such as Netlify. There is no build step required.

## Quality checks

```bash
npm install
npm run check
```

CI runs syntax checks, ESLint, gameplay validation tests, and a zero-dependency UI smoke test that boots the game logic and verifies Start, Settings, High Scores, Pause, and Back flows.

## Privacy

Gameplay, settings, scores, and custom player images stay local to the browser. Custom image skins are session-only in this implementation.

## Original-content note

The project follows the broad arena-survival genre pattern while using original names, mechanics, procedural visuals, UI, and audio. It does not copy another game's proprietary code, branding, artwork, audio, characters, or exact content.
