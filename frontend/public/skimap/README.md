# Ski map data

The Runs and Lifts the Ski map draws, generated from [OpenSkiData](https://openskidata.org/), the dataset behind [OpenSkiMap.org](https://openskimap.org/), by `npm run import-ski-map` (see [ADR 0010](https://github.com/kcluit/monkeysnow/blob/main/docs/adr/0010-ski-map-built-from-openskidata-into-static-squares.md)). OpenStreetMap data as of 2026-10-10.

Data from OpenSkiData / OpenSkiMap.org, © OpenStreetMap contributors (ODbL).

These files form a derivative database and are licensed under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). They are not covered by MonkeySnow's code license (AGPL-3.0).

`12/<x>/<y>.json` holds every Run and Lift that crosses zoom-12 map tile x/y, one per line: an `id` named after its OpenStreetMap way (`w`) or relation (`r`), its `kind`, `name`, `difficulty` or `liftType`, `area` for one mapped as an area, and its `coords` as [lat, lon]. A square with nothing in it has no file.
