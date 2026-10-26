# Live digest

This directory is the only place the data bot writes.

- `digest.json` — the current edition. Replace the whole file. Do not edit it by hand from the page.
- `archive/YYYY-MM-DD.json` — optional frozen copy of an edition. Create `archive/` when you write the first one.

`docs/digest.sample.json` is a fixture. The site reads it only while `data/digest.json` is absent. Once `digest.json` exists, that file is the only input, and an invalid file fails the build instead of falling back to the sample.

The repository README is the contract for what to write and what to leave alone.
