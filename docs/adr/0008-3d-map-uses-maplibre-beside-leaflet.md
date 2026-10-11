# The 3D map uses MapLibre beside Leaflet, with OpenStreetMap over Mapterhorn terrain

The detail view's map can be switched to a 3D map that shows the shape of the mountain, with a **Height line** at each forecast height. The flat map stays on Leaflet, and the 3D map is a separate MapLibre GL map loaded only the first time a visitor switches to it. The 3D map always opens flat, so most visits never use it. Moving the flat map to MapLibre would make every detail-view visitor download about 450 KB of compressed map library (about 300 KB, plus 150 KB for its worker, which bundlers have to build separately) to save writing the markers, the click delay and the Custom location popup a second time. It would also mean rewriting a map whose zoom, double-tap and layers behaviour already work.

Following ADR 0007, both of the 3D map's sources need no key. It drapes the Standard **Base map**'s OpenStreetMap tiles, shaded from the terrain, over Mapterhorn's open terrain tiles. Mapterhorn rather than the AWS Terrain Tiles behind the flat map's **Overlays**, because a 3D map lives on terrain detail: Mapterhorn is about 30 m everywhere and much sharper in most ski countries (the Alps, the US, Canada, Japan, Scandinavia), and the Resort list's elevations already come from it.

## Consequences

- **Two map components share one job.** Behaviour added to one map, such as a new marker or a change to what a click does, has to be added to the other.
- **The 3D map ignores the visitor's Base map and Overlays.** It shows Standard with no Ski map, contours or slope angle, so the layers button is hidden while it is on. Carrying them over means re-drawing each in MapLibre.
- **Missing terrain tiles show up as 404s.** Mapterhorn has sharper tiles than z12 only in some countries, and says so by answering 404 elsewhere, so the 3D map falls back to the coarser tile and the browser console logs each miss.
- **Raster labels turn with the map.** The OpenStreetMap tiles have their text baked in, so the 3D map opens facing north, and labels are upside down whenever a visitor turns it to face south.
