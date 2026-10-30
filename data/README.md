# data/

The game's big data lines: course layouts (`COURSE_*`), their surroundings (`SURR_*`, `*_POLYS`, `*_PATHS`), terrain grids
(`DEM_*`), textures (`R3TEX`), the golfer's motion (`R3BOSS`), the leaf atlas (`R3LEAF`), character and course pictures
(`CHAR_PIC`, `COURSE_IMG`) and sounds (`REAL_*`).

Each file is exactly one line, cut verbatim from the game script in `index.html`, which keeps a `/*@data NAME*/` marker
where the line was and loads these files with plain `<script>` tags just before the game script.

Don't edit these by hand. `tools/datafiles.py` moves the lines in and out:

- `python3 tools/datafiles.py pack OUT` rebuilds the old all-in-one page byte for byte (the publish build and the course
  pipeline work from it).
- `python3 tools/datafiles.py unpack` splits a page again. `tools/stamp.py` runs it, so a tool that writes an all-in-one page
  back into the repo is split on the next stamp.
- `python3 tools/datafiles.py check` is the round-trip test.
