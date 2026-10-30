# src/

The game code, one file per section, in the order the loader in `index.html` lists them. Each file is a run of lines cut
verbatim from the game script at its section headings (`/* ---------- name ---------- */` and `/* ---- name ---- */`).

They are not modules: the loader joins them, in order, into one script, so the game still runs as one closure from exactly the
same text as before the split. A name defined in one file is visible in every other. Data lines too big to read live in
`data/` (a `/*@data NAME*/` line marks each one's place).

Edit the game here, then run `python3 tools/stamp.py`: it re-splits the page (a new or renamed section heading gives a new
file, and the loader is rewritten), refreshes the `?v=` versions and stamps the build. `python3 tools/datafiles.py pack OUT`
gives the all-in-one page (what the publish build ships), and `python3 tools/datafiles.py check` is the round-trip test.
