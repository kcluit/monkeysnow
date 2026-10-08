# Resort data

The Resort list MonkeySnow bundles, generated from [OpenSkiData](https://openskidata.org/), the dataset behind [OpenSkiMap.org](https://openskimap.org/).

Data from OpenSkiData / OpenSkiMap.org, © OpenStreetMap contributors (ODbL), Skimap.org, Who's On First, © Mapterhorn.

The files in this folder (`resorts.json`, `registry.json`, `overrides.json`) form a derivative database and are licensed under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). They are not covered by MonkeySnow's code license (AGPL-3.0). See [ADR 0004](../../../../docs/adr/0004-resort-list-from-openskidata.md) for why the list is built this way.

## Files

| File | Edited by | What it is |
|---|---|---|
| `resorts.json` | script | The Resorts the app bundles, one per line, plus countries and aliases. Also the previous run's state: a Resort that vanishes upstream keeps its last-known data from here. |
| `registry.json` | script (and `--rename`) | Each slug's upstream source IDs (OpenStreetMap, Skimap.org, Wikidata) and aliases. It keeps slugs stable between runs, because OpenSkiData's own feature IDs change every build. |
| `overrides.json` | you | Hand fixes, keyed by slug. |
| `report.md` | script | Everything the last run needs a human to decide. |
| `legacy-id-migration.md` | one-off | How the hand-curated IDs from the old `locations.json` were matched to slugs. |

## Refreshing

```bash
npm run import-resorts -w frontend
```

The script downloads OpenSkiData at most once a day (their limit) into `frontend/.cache/openskidata/`. Review the git diff and `report.md` before committing.

A Resort is a named, operating downhill ski area with at least one lift and a known elevation range. Elevations are OpenSkiData's lift-served range; mid is the midpoint.

## Overrides

```json
{
  "resorts": {
    "dolomiti-superski": { "exclude": true, "note": "Lift-pass network" },
    "tai-wu-hua-xue-chang": { "name": "Thaiwoo" },
    "whistler-blackcomb": { "bot": 675, "mid": 1580, "top": 2284 },
    "fortress-mountain": { "include": "openstreetmap:way/123456", "bot": 1600, "top": 2100 },
    "some-unplaced-area": { "country": "GE", "region": "Mtskheta-Mtianeti" }
  },
  "reviewedPairs": ["les-trois-vallees > meribel", "ski-arlberg > *", "alpensia = alpensia-2"]
}
```

- `exclude`: leave the Resort out. This is also how you confirm that a vanished Resort is really gone.
- `name`, `bot`, `mid`, `top`, `country`, `region`: replace OpenSkiData's value. `mid` defaults to the midpoint.
- `include`: force in a ski area the filter drops, by its upstream source ID (`openstreetmap:way/…`, `openstreetmap:relation/…` or `skimap.org:…`). The key becomes its slug.
- `reviewedPairs`: nesting (`parent > child`, or `parent > *`) and duplicate (`a = b`) pairs you have looked at and want to keep.
- `note`: free text, ignored by the script.

Fix factual errors (missing lifts, wrong names) upstream in OpenStreetMap where you can, so everyone benefits. Use overrides for display choices and filter exceptions. The script warns about overrides that point at nothing.

## Renaming a slug

```bash
npm run import-resorts -w frontend -- --rename tai-wu-hua-xue-chang thaiwoo
```

The old slug becomes an alias, so saved Selections and links keep working. `webcamUrls` in `src/utils/constants.ts` is keyed by slug, so update it if you rename one listed there.
