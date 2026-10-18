# History is the Card model's own early hours, from the Historical Forecast API

**History** shows a card's past days from Open-Meteo's Historical Forecast API (`historical-forecast-api.open-meteo.com`): each **Card model**'s runs, the first hours of each one stitched into a continuous series. So a card's past comes from the same model, at the same three **Elevation bands**, with the same **Snow quality** and **monkeysnow estimate**, as its forecast, and it runs right up to the current hour.

The past is what the model said, not what happened. Two other sources would be closer to measured weather, and both were turned down:

- **A reanalysis such as ERA5 (Open-Meteo's Historical Weather API).** It is one coarse model for the whole world, about 25 km (9 km for ERA5-Land), not the card's own, and it is about five days behind, so the days a visitor most wants to see would be missing.
- **Station observations.** There is no keyless, openly licensed source with stations at Resorts' heights worldwide, and a station measures one point, not an **Elevation band**.

The Forecast API's `past_days` gives the same numbers as the Historical Forecast API for recent days (checked against ICON Seamless at Chamonix, October 2026: all 72 hours identical) and would have let one request carry both the past and the forecast. It stops about three months back, though, while the Historical Forecast API reaches back to 2022 or earlier for most models, so a longer **History length** costs only calls, not a change of source.

## Consequences

- **Every Forecast model in the catalogue is served.** All 52 were checked in October 2026, so History's cards use the same Card model as the forecast and need no fallback of their own.
- **History is fetched and cached apart from the forecast.** Only the one on show is fetched; both share the **Fetch budget** and the **Freshness window**. Every request covers at least 14 days, which Open-Meteo counts as one call, so the shorter History lengths cost no less and switching between them needs no fetch. Thirty days count as about 2.1 calls, which is why the History length stops there: a 300-resort **Selection** at 90 days would pass the hourly **Rate limit**.
