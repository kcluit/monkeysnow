# Visitors choose Card models per country, falling back to the Recommended card model

A visitor can replace a country's **Recommended card model** with a **Country model** of their own, one country at a time. ADRs 0003 and 0005 rejected lists that depend on location for the detail view, because a change made at Whistler would not apply at Chamonix. Cards are different. The detail view compares models, so one **Preferred models** list everywhere keeps comparisons consistent. A card shows a single model, and which single model is best depends on where the **Resort** is: HRRR over the US, MET Nordic in Scandinavia. Visitors already think of our own picks country by country, so their choices follow the same lines.

A Country model may cover only part of its country: HRRR covers 504 of the 514 US Resorts, and ICON-D2 covers 205 of Italy's 242. Every point outside the Country model's **Coverage**, or where it comes back with no data, uses the Recommended card model instead. Open-Meteo rejects a whole request when any one point in it is outside the model's Coverage, so the fetch code has to work out which Resorts the Country model can't serve and send them to the Recommended card model. The Coverage boxes are drawn generously, so that check can't rely on them alone.

## Considered options

- **Tiers: a model for a continent or for everywhere, overridden per country.** Rejected because it adds rules about which tier wins. For example, Norway would stay on MET Norway after Europe was set to ECMWF, and the UI would have to explain why. The modal offers "Use one model everywhere…" (global models only) and "Reset all to Auto", which write into every country instead.
- **Offer a model only if it covers every Resort in the country.** Rejected because it hides the obvious choices: HRRR for the US (Alaska is outside it), ICON-D2 for Italy, AROME for Spain. The fallback is needed anyway, because the Coverage boxes are drawn loosely.
- **Treat choosing the model Auto already uses as choosing Auto.** Rejected: a visitor who picks GFS Seamless by name keeps it if the Recommended card model later changes.

## Consequences

- **One country can show two models.** The cards a Country model doesn't cover use the Recommended card model. Every card in the default and full views names its Card model, with no special marking for a fallback. The modal shows partial Coverage, for example "covers 205 of 242".
- **A forecast records the model that produced it.** When a Card model changes, forecasts from the previous model count as stale: their cards stay on show while new forecasts arrive under the **Fetch budget**, which can take about 90 seconds for a few hundred Resorts.
- **Models that can't fill a card are never offered.** Models missing a variable a card shows or the snow estimate needs, such as AIGFS and HGEFS Mean (no humidity) or AROME France HD (no snowfall, rain or weather code), are not offered. Short-Range models are offered with their Range shown, and their cards show fewer days.
