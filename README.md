# Golf Go

A Hot Shots–style 3D golf game for phones, played on real courses rebuilt from OpenStreetMap, USGS lidar and aerial photos.
Live at https://hartwigcam98-star.github.io/golf-go/

## Layout

| Where | What |
|---|---|
| `index.html` | The page: markup, styles, three.js, and the loader for the game code |
| `src/` | The game code, one file per section (see `src/README.md`) |
| `data/` | The game code's big data lines (course layouts, textures, golfer motion, pictures, sounds); see `data/README.md` |
| `greens.js`, `ground.js`, `trees.js` | Per-course lidar greens, ground and buildings, and tree crowns |
| `b10/` | The Blender upgrade: baked light, Blender clubhouses and trees |
| `char*.js` | Playable golfer models |
| `clubhouses/`, `landmarks/`, `blender/` | Galleries |
| `next/` | Experimental WebGPU renderer |
| `app/` | iPhone app wrapper (Capacitor, TestFlight) |
| `pipeline/` | Course pipeline: building courses, clubhouses, landmarks, ranges, Blender (start at `pipeline/courses/RUNBOOK.md`) |
| `tools/` | Publish build (`split/`), build stamp, data files, the Same-game check (`check/`) |
| `supabase/` | Daily round, leaderboard and feedback backend |

## Publishing

Every push to `main` runs `.github/workflows/publish.yml`: `tools/split/build.js` packs the page (`tools/datafiles.py pack`:
`index.html` + `src/` + `data/` back into the old all-in-one page, byte for byte), splits that into a small core plus one file
per course, and deploys it to GitHub Pages. Before committing a change to `index.html`, `src/`, `data/` or the data scripts,
run `python3 tools/stamp.py`.

## Changing the game safely

Work on a branch. Every push to a branch runs the Same-game check (`tools/check/README.md`), which plays every course on
`main` and on the branch and lists anything that differs.
