# Same-game check

Proves that a change to how the game is organised (files moved, code split, data pulled out of `index.html`) leaves the game
playing and looking exactly as it did. It is the safety net for the restructure: every step has to pass it before it reaches `main`.

## What it records

`snapshot.js` opens the game in headless Chromium on a frozen clock, with seeded dice and no network, and for every course:

- **Hole fingerprints**: each hole as the game builds it (layout, pins, lie grid, heights, trees, buildings, ...), field by field.
- **A scripted round**: the game's own club, aim and short-game choices, every swing struck with a fixed seed; after each shot the
  ball's resting spot, lie, shot type, strokes and wind are written down.
- **A picture** of hole 1 from the tee.
- **Data blocks**: a fingerprint of every big data block (course layouts, lidar greens and ground, trees, textures, golfer rigs).
- **Errors** the page threw.

Two runs of the same code give identical files. `compare.js` lists every difference between two runs (pictures are allowed tiny
rendering noise; anything over 0.2% of pixels fails and a side-by-side image is saved).

## In GitHub

`.github/workflows/check.yml` runs on every push to a branch other than `main` (and by hand from the Actions tab). It builds the
published game (`tools/split/build.js`) from both `main` and the branch, checks both across 8 machines, and compares. Green means
same game. Red lists what changed, with pictures attached to the run.

## By hand

```
cd tools/check && npm install && npx playwright install chromium && cd ../..
node tools/check/snapshot.js <siteA> /tmp/a [--courses troy,stoneridge] [--shard 1/8] [--no-img] [--no-play]
node tools/check/snapshot.js <siteB> /tmp/b  (same options)
node tools/check/compare.js /tmp/a /tmp/b
```

A site is a folder with the game's `index.html`: the repo itself, or a build from `node tools/split/build.js <dir>`.
One course takes about a minute.
