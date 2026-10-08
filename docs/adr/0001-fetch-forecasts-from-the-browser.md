# Fetch forecasts from Open-Meteo in the browser, with no backend

We removed the Express backend that pre-fetched forecasts for every Resort once a day and served them from a shared cache. Each visitor's browser now calls Open-Meteo directly for its own **Selection**. That puts every visitor on their own per-IP **Rate limit** (600 calls/min, 5,000/hr, 10,000/day on the free non-commercial tier) instead of one shared server allowance, and leaves no server to host. A shared cache would be cheaper per visitor, but it means running a server. Its single allowance also forced a daily refresh that took hours in 30-second-spaced batches.

## Consequences

Each Resort costs 3–4 calls: one per **Elevation band**, plus a separate freezing-level call everywhere except GFS regions. That is what drives the **Selection cap** of 300, the per-tab **Fetch budget**, the three-hour **Freshness window**, and pausing until the window resets when a **Rate limit** is hit. Anyone tempted to raise the cap or shorten the window should redo that arithmetic against the daily limit first.
