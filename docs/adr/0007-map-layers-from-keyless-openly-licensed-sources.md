# Map layers come only from keyless, openly licensed sources

Every **Base map** and **Overlay** on the map of a **Resort** or **Saved location** loads straight from a public source that needs no account, no API key and no server of ours, and whose licence allows a site like this one to use it. That follows from ADR 0001, which removed the backend, so a key would ship in the page for anyone to copy. It also follows from the earlier decision not to use OpenSkiMap's tiles because its terms forbid other sites using them.

So the Satellite **Base map** is assembled from national aerial photos where they are open: USGS in the US, swisstopo in Switzerland, IGN in France, basemap.at in Austria and GSI in Japan. Under them, EOX Sentinel-2 cloudless covers the rest of the world at 10 m. Contours, hillshade and slope angle are drawn in the browser from AWS Terrain Tiles (an AWS Open Data dataset, served with open CORS). The **Ski map** is drawn from OpenStreetMap data that each visitor's browser fetches from the public Overpass API for the area on screen.

## Considered options

- **Esri World Imagery for Satellite.** It is sharp everywhere and is one URL, and it loads without a key. Rejected because Esri's own Leaflet guidance requires an API key or ArcGIS login, and getting a key means creating an account. Using it keyless works today but goes against its terms, and Esri could block it.
- **OpenTopoMap as a Topo base map** with contours and hillshade baked in. Rejected because a base map can't be stacked, so contours would never show over Satellite. Drawing them ourselves from terrain data makes every Overlay work over either Base map.
- **Runs and lifts from an OpenSkiData snapshot**, split per Resort when `npm run import-resorts` runs, as ADR 0004 does for the Resort list. Rejected because the worldwide runs file is 253 MB gzipped, and a snapshot would only cover Resorts, not points a visitor pans to. ADR 0004's reason for avoiding runtime OpenSkiData doesn't apply: bad upstream edits would move Resorts in visitors' **Selections**, but runs and lifts aren't identities anyone keeps.
- **OpenSnowMap's run overlay and snow base map.** The run overlay was tried and dropped for how it looked; the base map refuses other sites (it redirects to an "access denied" tile).

## Consequences

- **Satellite is uneven.** It is sub-metre in five countries and blurry at Resort zoom elsewhere, including Canada, Italy, Scandinavia, New Zealand and Chile. Add a country's open orthophoto service when one is found; don't reach for a keyed provider.
- **The Ski map depends on a volunteer server.** In October 2026 only `overpass-api.de` answered; the public mirrors returned errors. Each visitor counts against Overpass's fair-use limits on their own IP, so the Ski map asks for nothing below zoom 12 and caches what it gets for about a week.
- **EOX's licence is non-commercial** (CC BY-NC-SA). If monkeysnow ever turns commercial, that layer needs replacing or a licence from EOX.
- **Every source must be credited** in the map's attribution while it is on screen, including OpenStreetMap (ODbL) for the Ski map.
