# Both maps draw every Overlay, and terrain Overlays come from Mapterhorn

The 3D map now shows the visitor's own **Base map** and **Overlays**, the same ones as the flat map, and the layers button stays while it is on. This reverses ADR 0008's choice to show only Standard in 3D. The terrain **Overlays** added with it (**Gradient**, **Aspect**, **Flats** and **Height tint**, beside **Slope angle**) are much of what a 3D map of a mountain is for. A separate set for 3D alone would also have put a second copy of Slope angle under another name.

Every terrain Overlay, on both maps, is now worked out in the browser from Mapterhorn's terrain tiles, not the AWS Terrain Tiles of ADR 0007. A steep band drawn in 3D then sits on the ridge the 3D terrain shows, and both maps and the **Height lines** agree. Mapterhorn is also sharper in most ski countries, so Slope angle no longer understates short steep pitches there. Heights are read at zoom 13 at most (about 10 m; 7 m in the Alps). Finer data than that picks out rock steps rather than slopes a slab could run on.

## Considered options

- **Skimomap's own terrain tiles.** skimomap.com, the site these Overlays were modelled on, serves heights with slope and aspect already worked out, so drawing would be cheap. Rejected under ADR 0007: they are another site's tiles, with no licence that lets this one use them.
- **Each map keeps its own terrain.** The flat map on AWS, the 3D map on Mapterhorn. Rejected because the same Overlay would look different on the two maps, and in 3D it would be draped on terrain it wasn't worked out from.
- **MapLibre's own hillshade and colour-relief layers for 3D.** These would only cover the 3D map. The flat map is Leaflet and needs the canvas drawing anyway, and one drawing for both keeps them identical.

## Consequences

- **Steepness is shown only from terrain about 30 m or finer.** Steepness worked out from coarser terrain reads too shallow. So Slope angle, Gradient, Aspect and Flats need zoom 12: the flat map says "Zoom in" below it, and in 3D they stop toward the horizon, where MapLibre draws from coarser tiles. Height tint doesn't depend on steepness and is drawn at every zoom.
- **Missing sharp tiles fall back.** Outside the countries where Mapterhorn has more than 30 m data, its zoom-13 tiles answer 404, and the Overlays stretch the zoom-12 tile instead, as the 3D terrain does.
- **Only one Terrain colouring at a time.** Slope angle, Gradient, Aspect and Height tint each colour the ground, and two over each other can't be read.
- **The 3D map always shades its terrain.** MapLibre doesn't light the 3D surface, so without Hillshade the shape can't be read. Hillshade is therefore always on in 3D, whatever the visitor has ticked for the flat map.
