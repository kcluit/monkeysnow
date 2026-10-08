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
An administrative area inside a country, such as a state, province, canton or prefecture, used to group **Resorts** for picking. Only countries with many **Resorts** are split into Regions.
_Avoid_: province, state (as the general term)

**Elevation band**:
One of a **Resort**'s three forecast heights: base (`bot`), mid or top.
_Avoid_: level, elevation (when meaning the band rather than a height in metres)

**Custom location**:
A point a visitor picks on a **Resort**'s map, forecast at its own ground elevation in place of the **Resort** and its **Elevation band**. It is never saved.
_Avoid_: pin, spot, point, location (on its own)

### Selection and limits

**Selection**:
The set of **Resorts** a visitor has chosen to see on the main page.
_Avoid_: favourites, watchlist

**Starter resort**:
The one **Resort** a first-time visitor's **Selection** begins with. It is the **Resort** whose page they arrived on, otherwise the one nearest to where they appear to be, otherwise a random one. From then on it is an ordinary member of the **Selection**.
_Avoid_: default resort, home resort, local resort

**Selection cap**:
The most **Resorts** a **Selection** may contain.
_Avoid_: resort limit, max resorts

**Display limit**:
How many **Resorts** in the **Selection** are rendered as cards; it never affects what is fetched.
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
A **Resort** in the **Selection** whose forecast is waiting for **Fetch budget** to free up.
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

**Seamless model**:
A **Forecast model** that blends a **Provider**'s high-resolution models, which each cover part of the world, with a coarser global model (its own or ECMWF's), switching by location and forecast hour.
_Avoid_: combined model, blend

**Clone**:
A **Forecast model** whose numbers at the point being forecast are identical to another model's, because the point is outside its **Coverage** and it falls back to that model.
_Avoid_: duplicate

**Card model**:
The single **Forecast model** behind a **Resort**'s card on the main page, chosen by the **Resort**'s country.
_Avoid_: default model, primary model

**Preferred models**:
A visitor's own list of **Forecast models**, one list for every **Resort**. Every visitor starts with the **Recommended models**.
_Avoid_: selected models, default models, **Selection** (that is **Resorts**)

**Recommended models**:
The **Preferred models** a visitor starts with, covering every part of the world at once and chosen so that no model repeats another **Provider**'s numbers for part of its forecast.
_Avoid_: default models, defaults

**Comparison models**:
The **Preferred models** whose **Coverage** includes the point being forecast (a **Resort** or a **Custom location**), minus **Clones**. These are the models drawn side by side in the detail view.
_Avoid_: selected models, model selection

**Aggregation**:
A line computed hour by hour across the **Comparison models**: median, mean, min, max, or the 25th or 75th percentile.
_Avoid_: ensemble, consensus
