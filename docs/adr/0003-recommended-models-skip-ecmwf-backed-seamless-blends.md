# Recommended models skip ECMWF-backed Seamless models, and Preferred models are filtered by Coverage

> The choice of Recommended models below is superseded by [ADR 0005](./0005-recommended-models-are-ifs-hres-and-gfs-seamless.md). The Coverage filter and Clone check still stand.

The detail view used to start every visitor on all eleven **Seamless models**, everywhere. Outside their home areas several of them are **Clones** of ECMWF IFS. At Whistler, Jackson Hole and Niseko, KNMI, DMI and MET Norway all returned ECMWF's exact numbers, so the median and mean counted ECMWF three times.

We now keep one **Preferred models** list per visitor and draw only the models whose **Coverage** includes the point being forecast. NOAA, DWD, ECCC, Météo-France, UKMO, JMA and MeteoSwiss stay in the **Recommended models** as Seamless models. For KNMI, DMI, MET Norway, GeoSphere and CHMI we recommend their own high-resolution model instead, because their Seamless versions fill in with ECMWF. At Chamonix, KNMI, DMI, GeoSphere and CHMI Seamless all match ECMWF IFS exactly at every hour from day 4 to day 15. Recommending them would count ECMWF five times there, even though the Clone check keeps them for their own first three days.

## Considered options

- **Keep the Seamless models and drop copied stretches.** Hide any run of hours where a model exactly matches another one. Rejected because single values such as 0 mm of rain match by chance, so the rule would have to compare several variables over many hours. That is fragile, and the result looks almost the same as recommending the high-resolution model.
- **A separate list for each part of the world.** Rejected because visitors would wonder why a change at Whistler didn't apply at Chamonix.

## Consequences

- **Short high-resolution lines.** The KNMI, DMI, MET Nordic, GeoSphere and CHMI lines end after 2.5–3 days, so the median is taken over fewer models after that. That is deliberate.
- **The one-time wipe.** Moving to this scheme cleared every visitor's stored model list once. A later change to the Recommended models reaches only visitors who never chose their own, unless someone wipes stored lists again.
- **Coverage is checked twice.** A static Coverage table decides what to fetch. A runtime check then drops models that come back with no data (HTTP 400 "No data is available for this location"), all nulls, or as a Clone, which catches Coverage boxes drawn too loosely. A Coverage box drawn too tightly can't be caught that way, so draw boxes generously.
