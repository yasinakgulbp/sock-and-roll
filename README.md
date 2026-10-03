# 🧦 Sock & Roll

**A little laundry. A satisfying match.**

A cozy sock-matching game with soft, draggable fabric, patterned socks, and a little celebration whenever two lost socks find each other.

Grab a sock anywhere along its body, drag it onto its matching partner, and watch the pair roll up together.

**Status:** playable web prototype · **Controls:** touch, mouse, or selection buttons · **Interface:** Turkish

> This repository contains the optimized HTML Canvas prototype. The proposed native mobile game, ads, purchases, and notifications are a future development phase; they are not implemented here.

## Play locally

No npm install, bundler, framework, or game-engine installation is needed.

With Python 3 installed, run this command from the repository root:

```sh
python3 -m http.server 8000 --directory dist
```

Open **http://localhost:8000** in a modern browser. On Windows, `py -m http.server 8000 --directory dist` is an alternative.

Any static web server can serve the contents of `dist/`. Google Fonts is the only external presentation dependency; fallback fonts are available if it cannot load. There is no gameplay backend.

## What is included

| Feature | Current implementation |
| --- | --- |
| Flexible socks | A nine-point fabric spine with local stretch and bend constraints |
| Matching | Same color-and-pattern design; proximity checked when the sock is released |
| Collection | Matched pairs roll together and move into the collection tray |
| Progression | 30 unlockable levels; 3–14 pairs per level |
| Variety | 14 color/pattern combinations, including stripes, dots, flowers, waves, stars, and hearts |
| Scoring | 1–3 stars, with mistakes and hints affecting the score |
| Assistance | Three hints per level, shuffle, and restart |
| Feedback | Confetti, synthesized sound effects, and vibration where supported |
| Saving | Unlocked levels, best star results, and sound preference saved on this browser/device |
| Alternative input | Select two socks using the buttons beneath the board; buttons also support keyboard operation |

## How to play

1. Press and hold a sock, then drag it across the board.
2. Drop it onto a sock with the **same color and pattern**.
3. Find every pair to finish the level and unlock the next one.
4. Open the level map from the level label or the sidebar.

There is no countdown or time-based failure. The timer records how long you play.

### Stars

The star score uses:

```text
score = pairs / (pairs + mistakes + hintsUsed × 0.5)

3 stars: score ≥ 90%
2 stars: score ≥ 65%
1 star:  score < 65%
```

The completion screen's displayed accuracy counts mistakes only; hint use additionally affects the star score. Best stars are retained when replaying a level.

## Under the hood

The game uses **plain JavaScript, HTML Canvas 2D, CSS, and Web Audio**. Its fabric is a lightweight 2D approximation, not a full 3D cloth simulation.

Each sock is a small chain of points. Distance constraints resist stretching and bending, while the dragged point follows the player's hand. Pattern details follow the local direction of the fabric.

### Mobile performance work

The second iteration specifically addresses excessive work on phones:

- Resting socks sleep instead of continuously solving their physics.
- Stationary artwork is cached on a separate canvas.
- The main canvas is not redrawn while the scene remains unchanged.
- Local constraints replace all-to-all constraints, with four solver passes.
- Frame painting is capped to approximately 60 Hz on high-refresh displays.
- Canvas pixel density is capped at 1.25 on narrow screens and 1.5 elsewhere.
- Moving drop shadows use inexpensive strokes instead of blurred shadows.
- Timer text changes only when the displayed second changes.
- Hidden-tab simulation is paused, and confetti counts are bounded.

These are implementation choices, not a guarantee of a particular frame rate. Release builds must still be measured on physical target devices.

## Project layout

```text
README.md                 Project overview and local setup
dist/index.html           Game interface and dialogs
dist/style.css            Responsive presentation
dist/game.js              Physics, input, rendering, progression, audio, saving
docs/MOBILE_ROADMAP.md     Proposed Android product and launch plan
```

`dist/` contains the editable source in this buildless project; it is not generated output.

## Development checks

If Node.js is available, check JavaScript syntax with:

```sh
node --check dist/game.js
```

Before shipping a change, manually verify dragging, incorrect matches, hints, shuffle, completion, level unlocking, replay, page reload, and background/resume behavior on both desktop and a physical Android phone.

## Current boundaries

- Progress is local to this browser and origin. Clearing site data can remove it; there is no account or cloud save.
- Level layouts are randomized. Difficulty currently scales mainly through pair count and the available design pool, capped at 14 pairs.
- There is no native Android build, Play Billing, ad SDK, analytics service, or notification system yet.
- This prototype does not include a service worker or a guaranteed offline installation flow.
- Optional vibration and audio behavior depend on browser/device support.
- Rendering and physics share the main browser thread.

## Mobile direction

The proposed next phase is a **Unity + C# Android game**, preserving the art direction and matching feel while rebuilding the runtime for a native mobile release.

The first milestone is a small, polished Android build with real-device performance measurements. A data-driven level system, monetization, notifications, and a measured soft launch follow after that foundation is validated.

See [the mobile roadmap](docs/MOBILE_ROADMAP.md). It describes proposed work, not existing features or guaranteed business results.

## Rights

No open-source license has been selected for this project. Public visibility alone does not grant a license to redistribute or commercially reuse the project. External services and fonts retain their respective terms.

---

**Türkçe:** Çorabı tut, eşinin üzerine bırak, çiftini yuvarla. Bu depo, mobil performans iyileştirmeleri yapılmış oynanabilir web prototipini içerir. Yerel çalıştırmak için yukarıdaki Python komutunu kullanabilirsin; mobil ürün planı `docs/MOBILE_ROADMAP.md` dosyasındadır.
