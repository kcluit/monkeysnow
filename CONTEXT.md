# MonkeySnow

Ski resort weather forecasts with snow-quality estimates, fetched from Open-Meteo directly in the visitor's browser.

## Language

### Resorts

**Ski area**:
Any entry in OpenSkiData, the open dataset behind OpenSkiMap, whether operating, abandoned, nordic-only or unnamed. Most are not **Resorts**.
_Avoid_: resort (for one that hasn't passed the filter)

**Resort**:
A named, operating downhill **Ski area** with at least one lift and a known elevation range, identified by a slug such as `big-white`. The slug never changes by accident, even if the area is renamed; when it is changed deliberately, every earlier slug keeps working.
_Avoid_: location, mountain, spot

**Region**:
An administrative area inside a country, such as a state, province, canton or prefecture, used to group **Resorts** for picking. A country is split into Regions only when it has many **Resorts** and its Regions each hold several; the rest list their **Resorts** directly.
_Avoid_: province, state (as the general term)

**Elevation band**:
One of a **Resort**'s three forecast heights: base (`bot`), mid or top.
_Avoid_: level, elevation (when meaning the band rather than a height in metres)

**Ground elevation**:
The height of the terrain at a point, as Open-Meteo knows it. A **Custom location** is forecast at its Ground elevation unless the visitor types a **Custom elevation**.
_Avoid_: default elevation, terrain height

**Custom elevation**:
A height the visitor types to be forecast at, in place of an **Elevation band** on a **Resort** or the **Ground elevation** of a **Custom location**. On a **Custom location** it belongs to that one point: picking another point, or leaving it, goes back to the **Ground elevation**.
_Avoid_: manual elevation, override

**Custom location**:
A point a visitor picks on the map of a **Resort** or a **Saved location**, forecast at its **Ground elevation** (or a **Custom elevation**) in place of the one they picked it from. It is not kept unless the visitor saves it as a new **Saved location**; an existing **Saved location** never moves.
_Avoid_: pin, spot, point, location (on its own)

**Saved location**:
A **Custom location** that a visitor has named and kept. Only the browser it was saved in knows about it. It is not a **Resort**: it has one elevation, the one it was saved with, and no **Elevation bands**.
_Avoid_: custom resort, favourite, pin

### Selection and limits

**Selection**:
The set of **Resorts** and **Saved locations** a visitor has chosen to see on the main page.
_Avoid_: favourites, watchlist

**Starter resort**:
The one **Resort** a first-time visitor's **Selection** begins with. It is the **Resort** whose page they arrived on, otherwise the one nearest to where they appear to be, otherwise a random one. From then on it is an ordinary member of the **Selection**.
_Avoid_: default resort, home resort, local resort

**Selection cap**:
The most **Resorts** and **Saved locations**, counted together, that a **Selection** may contain.
_Avoid_: resort limit, max resorts

**Display limit**:
How many members of the **Selection** are rendered as cards; it never affects what is fetched.
_Avoid_: resort limit

**Fetch budget**:
How many Open-Meteo calls one browser tab allows itself per minute, shared by the main page and the detail view.
_Avoid_: **Rate limit** (that is Open-Meteo's cap, not ours), throttle

**Rate limit**:
Open-Meteo's own cap on calls per IP address, counted per minute, hour and day. Hitting it pauses all fetching until that window resets.
_Avoid_: quota, Fetch budget

**Freshness window**:
How long a fetched forecast is trusted before it becomes **stale** and is refetched in the background — three hours.
_Avoid_: TTL, cache expiry, refresh interval

**Queued resort**:
A **Resort** or **Saved location** in the **Selection** that has no forecast yet and is waiting for, or in the middle of, its fetch. A **Resort** whose **stale** forecast is being refreshed is not queued; its card stays on show.
_Avoid_: pending resort, loading resort

### Forecast models

**Forecast model**:
One numerical weather model that Open-Meteo serves forecasts from, such as ECMWF IFS or HRRR.
_Avoid_: weather model (in prose), source

**Provider**:
The forecasting agency that runs one or more **Forecast models**, such as ECMWF, NOAA or DWD.
_Avoid_: vendor, agency

**Coverage**:
The area a **Forecast model** produces its own forecasts for. Outside it, a model returns nothing, nulls, or another model's numbers.
_Avoid_: domain, region (when meaning a model's area)

**Range**:
How far ahead a **Forecast model** produces forecasts. Past it, the model returns nothing.
_Avoid_: horizon (that is what we ask for), lead time

**Seamless model**:
A **Forecast model** that blends a **Provider**'s high-resolution models, which each cover part of the world, with a coarser global model (its own or ECMWF's), switching by location and forecast hour.
_Avoid_: combined model, blend

**Clone**:
A **Forecast model** whose numbers at the point being forecast are identical to another model's, because the point is outside its **Coverage** and it falls back to that model.
_Avoid_: duplicate

**Card model**:
The single **Forecast model** behind a card on the main page, chosen by the country of the **Resort**, or for a **Saved location**, of the **Resort** nearest to it.
_Avoid_: default model, primary model

**Forecast horizon**:
How many days ahead a forecast is asked for: fourteen on the main page, and whatever the visitor picks in the detail view. A card shows fewer days when its **Card model**'s **Range** ends sooner.
_Avoid_: forecast days, forecast length

**Preferred models**:
A visitor's own list of **Forecast models**, one list for every **Resort**. Every visitor starts with the **Recommended models**.
_Avoid_: selected models, default models, **Selection** (that is **Resorts**)

**Recommended models**:
The **Preferred models** a visitor starts with: two global **Forecast models** from different **Providers**, so every **Resort** and **Custom location** opens on two forecasts that never copy each other.
_Avoid_: default models, defaults

**Comparison models**:
The **Preferred models** whose **Coverage** includes the point being forecast (a **Resort**, a **Saved location** or a **Custom location**), minus **Clones**. These are the models drawn side by side in the detail view.
_Avoid_: selected models, model selection

**Aggregation**:
A line computed hour by hour across the **Comparison models**: median, mean, min, max, or the 25th or 75th percentile.
_Avoid_: ensemble, consensus
