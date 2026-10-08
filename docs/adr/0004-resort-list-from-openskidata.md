# Build the Resort list from OpenSkiData as a committed snapshot with pinned slugs

The hand-curated list of 1,810 resorts (North America, Europe and Japan only) is replaced by every named, operating downhill **Ski area** in OpenSkiData that has a lift and an elevation range: about 4,150 **Resorts** in 70 countries. A script that you run by hand (`npm run import-resorts`) regenerates `frontend/src/data/resorts/resorts.json`. You review the git diff and its report before the new list ships. Fetching OpenSkiData at build time or in the browser was rejected for three reasons. It is rebuilt daily from OpenStreetMap, which anyone can edit. It allows one automated download a day. And a bad upstream edit would silently move, rename or remove Resorts in visitors' **Selections**.

Slugs live in a committed registry keyed on upstream OpenStreetMap, Skimap.org and Wikidata IDs, because OpenSkiData's own feature IDs are content hashes that change between builds. A slug never changes by accident. A deliberate rename (`--rename`) keeps the old slug as an alias, and so do the 1,810 pre-OpenSkiData IDs, so saved Selections and indexed URLs keep working. A Resort that vanishes upstream keeps its last-known data until it is excluded in `overrides.json`, which also holds hand fixes, such as the hand-curated elevations of British Columbia and Alberta resorts.

## Consequences

- The bundled list is a derivative database under the ODbL. It must stay openly available with attribution (About page, `resorts/README.md`), and the code license (AGPL-3.0, see the README) carves it out. Hand overrides become part of it.
- Card models are keyed by ISO country code. Countries without one of their own use ICON in Europe and ECMWF IFS elsewhere.
- About 1% of Resorts contain other Resorts, such as lift-pass networks like Dolomiti Superski, and some upstream duplicates slip through. The report lists them; a human decides.
