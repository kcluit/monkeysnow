# Snow caution: three ways to call snow, Cautious by default

ADR 0011's cut-offs, Sleet/Mix from a wet bulb of −0.5 °C and Rain from +0.5 °C, lean cautious on purpose, and the published curves show how far: on Wang et al.'s (2019) wet-bulb curve, now in Noah-MP v5, snow is still 93% likely where they start Sleet/Mix and 65% likely where they start Rain. So how far to lean is the visitor's **Snow caution**, Cautious unless they pick another, and the **monkeysnow estimate** is now what "Snowfall estimate" shows unless a visitor picks the Model estimate, which cannot tell a Resort's base from its top.

| Snow caution | Sleet/Mix from | Rain from | Snow-to-liquid ratio |
|---|---|---|---|
| Extra cautious | −1.5 °C (99%) | −0.3 °C (90%) | the lower of the ratio line and LaChapelle's (1962) Alta curve |
| Cautious | −0.5 °C (93%) | +0.5 °C (65%) | the ratio line |
| Realistic | +0.25 °C (75%) | +1.35 °C (25%) | the ratio line |

Wet bulbs, each with how likely snow is there on Wang's curve, `1 / (1 + 6.99e-5 · e^(2(Tw + 3.97)))`. Between its two cut-offs each caution's share of snow falls in a straight line, as before.

**Realistic** is centred on the studies. Wang's curve is half snow at +0.8 °C. Jennings et al. (2025, doi:10.1038/s41467-025-58234-2) found the most accurate simple rule to be a wet-bulb threshold of 0.5 °C over 17 million Northern Hemisphere weather reports and 1.0 °C over about 40,000 crowdsourced reports from US mountains, with machine learning barely better; ECMWF's own split at our Resorts is half snow near +1.2 °C (ADR 0011). Realistic's cut-offs are Wang's 75% and 25% points, which put its 50/50 point at +0.8 °C. No method does much better from the weather at the surface: Jennings found every one misclassifies a quarter or more of the precipitation between 0.5 and 2.0 °C.

**The ratio line is already a middle estimate**, not the low one ADR 0011's code comments call it. From 0 to −14 °C it is within 0.5 of the average of the two classic new-snow curves, Hedstrom & Pomeroy (1998) and LaChapelle (1962, measured at Alta), and it sits among the 24-hour board climatologies: a median of 12.1 and mean of 13.5 across the US (Baxter et al. 2005), medians of 12.3 to 13.3 in the Wasatch, means of 15 to 18 in the Rockies, 9 to 11 on the West Coast, and about 10 a day usually assumed in the Alps. Only below −18 °C does it part from both curves, falling off where they stay flat. So Realistic keeps it, and only Extra cautious goes denser, near freezing, where the two curves disagree most (9.6 against 13.3 at −5 °C). Colder than about −10 °C the ratio line is the lower of the two, so its peak of 17 survives and cold snow can still be Powder.

## Considered options

- **Realistic as the default.** Rejected: the product stays "don't get your hopes up" unless a visitor asks otherwise.
- **Wang's curve itself for the amounts.** Rejected: a Wet snow hour would show some rain and a Rain hour some snow. A straight line between two cut-offs keeps the label and the amount agreeing, with the same 50/50 point.
- **Realistic centred on Jennings' mountain threshold** (+0.45 / +1.55 °C). Not taken: 0.2 °C away, well inside the noise, and Jennings tried only 0, 0.5 and 1.0 °C.
- **A lower ratio line for Extra cautious**, such as the climatologies' 25th percentile or the lower of the two classic curves. Rejected: neither reaches 15, and Snow quality labels are cut by the ratio, so Extra cautious would never say Powder.
- **Splitting every Period when the page is drawn**, from each hour's cached wet bulb, as a Graph does. Rejected for now: one source of truth, but every Period's totals would move from fetch time to drawing, with each hour's Period (local time, clock changes) carried along.

## Consequences

- **Snow caution sets Snow quality under either Snowfall estimate**, labels and Graph colours alike. Under the Model estimate the amounts stay the model's, and a Period the caution calls Rain that the model gives snow is still Sleet/Mix, which Extra cautious makes more common.
- **Switching is instant and never fetches.** Every Period carries all three cautions' estimates, worked out when it is fetched, and every hour its band's wet bulb, which a Graph splits under the visitor's caution as it draws. The Periods' estimates are about 46 KB more per Resort in IndexedDB, so about 14 MB at the Selection cap, and about 30 MB more if every one also has 30 days of History cached; the hours keep one array where they kept two. `SNOW_ESTIMATE_VERSION` 4 refetches the forecasts cached without them, which show Cautious's meanwhile.
- **Visitors who never picked a Snowfall estimate move from the Model estimate to the monkeysnow estimate**, and see lower totals than sites that show model snowfall: in ADR 0011's October test, Cautious made half the model's snow water.
- **It is Realistic, not Optimistic**: the other two are the ones that lean.
