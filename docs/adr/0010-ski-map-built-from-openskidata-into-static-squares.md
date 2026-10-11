# The Ski map is built from OpenSkiData into static squares

The **Ski map**'s **Runs** and **Lifts** no longer come from the public Overpass API. `npm run import-ski-map` builds them from OpenSkiData's worldwide runs and lifts into one small JSON file per square (the map's zoom-12 tiles, about 7 km across in the Alps), committed under `frontend/public/skimap/` and served by Netlify like any other file. A visitor's browser fetches only the squares on screen, a few KB each and at most about 95 KB, and keeps them in IndexedDB for a week as before. In October 2026 Overpass took 2.5–6 s for one square when it answered, about half its answers were 504 "too busy", and the app turned each failure into a wait of 30 s or more; no public mirror worked.

This reverses the option ADR 0007 rejected. Its two reasons don't hold for squares: the 253 MB worldwide file becomes 21,000 files of which a visitor needs one to four, and squares cover every Run and Lift, including the 44% in no **Resort**, so panning away or a **Custom location** needs no other source. The squares still come from OpenStreetMap through a keyless, openly licensed dataset, so the rest of ADR 0007 stands.

## Considered options

- **Overpass with retries and leaner queries.** Cheaper, but the Ski map would still wait on a volunteer server's queue, and fail with it.
- **GitHub Pages, rebuilt weekly by a scheduled Action.** Keeps 216 MB of data out of git and every worktree. Rejected for one repo and one host: the files deploy with the app and dev reads them locally.
- **Generating the squares in the Netlify build.** OpenSkiData allows one automated download a day, and the site deploys many times a day; caching between builds needs a plugin and makes refresh builds slow.
- **One file per Resort.** 15 MB in all, but it misses the Runs and Lifts outside any Resort.

## Consequences

- The Ski map is only as fresh as the last refresh, which is run by hand from a worktree, roughly monthly, and committed without review: unlike **Resorts**, Runs and Lifts aren't identities anyone keeps. Unchanged squares are written byte for byte the same, so a refresh only changes the squares where something did.
- The repo holds about 21,000 data files (216 MB), checked out in every worktree. Netlify copes (its forum cites about 54,000 files per directory; the squares are one directory per column), but each deploy should change as few of them as possible.
- A square with no Runs or Lifts has no file; `_redirects` answers 404 for it rather than the app's page.
- The squares are a derivative database under the ODbL, like the Resort list, and the map credits OpenSkiData beside OpenStreetMap.
- OpenSkiData maps funiculars and mountain railways, which Overpass's aerialway query never found, so those inside a **Ski area** are now **Lifts**.
