# MonkeySnow

Ski resort weather forecasts with snow-quality estimates, fetched from Open-Meteo directly in the visitor's browser.

## Language

### Resorts

**Resort**:
A ski area with a fixed location, identified by a slug ID such as `Big-White`.
_Avoid_: location, mountain, spot

**Elevation band**:
One of a **Resort**'s three forecast heights: base (`bot`), mid or top.
_Avoid_: level, elevation (when meaning the band rather than a height in metres)

### Selection and limits

**Selection**:
The set of **Resorts** a visitor has chosen to see on the main page.
_Avoid_: favourites, watchlist

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
