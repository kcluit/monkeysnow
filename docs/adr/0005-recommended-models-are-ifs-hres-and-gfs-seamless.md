# Recommended models are just ECMWF IFS HRES and GFS Seamless

The detail view used to start every visitor on twenty **Recommended models**. After the **Coverage** filter, its single Open-Meteo request cost about 17 calls at Chamonix and 13 at Whistler. It was repeated on every elevation change and **Custom location** click, out of the same **Fetch budget** the main page fetches from. We now recommend two models: ECMWF IFS HRES and GFS Seamless. Both are global, so every point gets both lines. They come from different **Providers**, so neither can be a **Clone** of the other. Both run the detail view's full 14 days, and GFS Seamless switches to HRRR over the US.

This supersedes ADR 0003's choice of Recommended models. Its Coverage filter and Clone check still apply to any models a visitor adds.

## Considered options

- **Keep the twenty.** Rejected because of the Fetch budget and load time.
- **A pair chosen by location**, such as the **Resort**'s **Card model** plus ECMWF. Rejected for the same reason ADR 0003 rejected per-region lists: a change made at Whistler would not apply at Chamonix.
- **ICON Seamless instead of GFS Seamless.** It has 2 km detail over the Alps, but its line stops after 7.5 days, leaving one line for days 8–14.
- **Leave saved model lists alone.** Rejected because every saved list began as the twenty, so most visitors would keep paying for them.

## Consequences

- **No Aggregations by default.** The median of two models is their mean, and any Aggregation fades the model lines to 35%. So the detail view opens on two lines at full opacity. A median means something again once a visitor adds models.
- **A second one-time wipe.** Moving to the pair clears every visitor's saved **Preferred models** and **Aggregations** once (the first wipe was ADR 0003's). Aggregation colours and the hide-members setting are kept.
- **No regional detail by default outside the US.** High-resolution models such as AROME, ICON-D2 or JMA MSM appear only when a visitor adds them.
