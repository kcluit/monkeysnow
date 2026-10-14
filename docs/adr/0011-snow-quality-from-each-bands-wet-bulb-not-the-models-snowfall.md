# Snow quality and the monkeysnow estimate come from each Elevation band's wet bulb, not the model's snowfall

Open-Meteo adjusts the temperature it returns to the elevation asked for (not the humidity), but its `snowfall` and `rain` are the grid cell's own, the same for every elevation on that cell. Zermatt from ECMWF IFS on 14 October 2026, seven days, at three requested heights:

| Requested height | Precipitation | Model snowfall | Model rain | Mean temperature |
|---|---|---|---|---|
| 1600 m | 16.8 mm | 0.0 cm | 16.8 mm | +8.6 °C |
| 2500 m | 54.6 mm | 37.6 cm | 0.9 mm | +1.7 °C |
| 3800 m | 54.6 mm | 37.6 cm | 0.9 mm | −6.8 °C |

The 2500 m and 3800 m requests share a cell and get one rain-snow split across 8.5 °C of difference; the 1600 m request landed in a neighbouring cell with a third of the precipitation. A card's three **Elevation bands** exist to tell the base from the top, and the model's split cannot.

So **Snow quality** and the **monkeysnow estimate** take each band's own wet-bulb temperature (the psychrometric wet bulb from the band's temperature and humidity at the hour's surface pressure), split each hour's total precipitation into snow and rain by it, and turn the snow's water into depth with a snow-to-liquid ratio that is one line of the wet bulb. The model's own snowfall is shown only as the **Model estimate**. Until October 2026 the estimate re-densified the model's snowfall while labelling the hour by the wet bulb, so the top band inherited the base's split, a label could come with zero of both amounts, and rain lost Open-Meteo's showers.

The trade-off: the model knows its whole air column, and a warm layer aloft can bring rain to a sub-zero surface, which a surface wet bulb cannot see. In mountain storms the surface is almost always the warmest point of the column, so the band's wet bulb is right far more often than the cell's split is right for that band.

## Considered options

- **Keep re-densifying the model's snowfall.** Rejected for the reasons above.
- **Take the model's weather code as the precipitation type.** Rejected: it is the cell's too, and it says nothing about density.
- **Fetch Open-Meteo's own `wet_bulb_temperature_2m`.** Rejected: one more variable in every request, and it is a sea-level approximation (it matched Stull's formula to 0.03 °C over 12,600 hours), so it carries the pressure error described below.

## Consequences

- **Snow quality leans cautious.** Rain is called from a wet bulb of +0.5 °C and Sleet/Mix from −0.5 °C. That is a product choice, "don't get your hopes up", recorded in the glossary, and it is two numbers to change. What it costs was measured on 14 October 2026 at 75 high Resorts' grid cells (`elevation=nan`, so the model's split and its temperature describe the same place), 2,423 hours with precipitation from ECMWF IFS: the model's own share of the water falling as snow was 91% at a wet bulb of −1 to −0.5 °C, 84% at −0.5 to 0, 77% at 0 to +0.5, 57% at +0.5 to +1, 45% at +1 to +1.5, 22% at +1.5 to +2 and 8% at +2.5 to +3. So the model's 50/50 point is near +1.2 °C, as in the rain-snow studies; our line calls Rain where the model still makes snow of half the water, and over that October week our snow water came to half the model's. In midwinter, with most hours well below −0.5 °C, the gap is small. GFS Seamless gave the same shape on 904 hours.
- **The wet bulb is the exact psychrometric one, at the hour's surface pressure**, which every card request already fetches. Stull's (2011) sea-level fit, used until 14 October 2026, was checked against it over 12,600 hours at the mid bands (surface pressures 664 to 859 hPa): within 0.2 °C in the humid air of a snowfall, but up to 1.9 °C too warm in dry air, because the same air has a colder wet bulb the lower the pressure. Precipitation into dry air is how storms begin in continental ranges, and those hours would have read as Rain. Where a model gives no surface pressure, the standard atmosphere's at the band's height stands in.
- **A forecast records the estimate it was made under** (`estimateVersion`). When the rules change, cached forecasts count as stale and are refetched in the background, their cards staying on show meanwhile.
- **Model estimate bands on one cell show the same split.** That is the model's answer, shown as given.
- **The estimate is tested** (`utils/snowQuality.test.ts`): the two lines, the ratio's corners, and the rule that a Period's or a day's label is the one under which most of its precipitation fell.
