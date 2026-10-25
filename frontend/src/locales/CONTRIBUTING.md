# Contributing Translations

Thank you for helping translate monkeysnow! This guide explains how the translations are laid out, how to add a language, and the words each language uses for monkeysnow's own terms.

## How it fits together

- `en/` is English, the source of every string. It is split into one file per part of the site: `common.ts` (words several parts share, such as Snow quality names and the Elevation bands), `main.ts` (the Main page), `settings.ts`, `commands.ts` (the command palette and App's own words), `detail.ts`, `charts.ts`, `map.ts` and `pages.ts` (About, and the note on Terms and Privacy).
- Every other language has a folder with the same files: `fr/` is French, `es/` Spanish. Each of its files has exactly the keys of the English one; TypeScript reports any key missing or extra.
- `index.ts` lists the languages and picks one: the visitor's pick, kept in this browser, else the first of their browser's languages that monkeysnow has, else English. A first visit saves nothing, so a visitor follows their browser until they pick.
- Components get `t()` and `tPlural()` from `useLanguage()`, which redraws them when the language changes. Code outside React uses `translate()` and `translatePlural()`, called when the words are needed, never once as a module loads.
- `{placeholders}` are filled by `t(key, { name: value })`. Plurals are two keys, `<key>.one` and `<key>.other`, picked by the language's own rule (`tPlural(key, count)`, which fills `{count}`): French says "0 station", English "0 resorts".
- Dates, times and numbers follow the language too: `formatLocale()` is the tag to give `Intl` formatters (English stays `en-US`), and `formatDecimal()` writes 1.5 or 1,5. An hour on its own or ending a date goes through `hourFormat()`, which adds the "h" that `Intl` leaves off a Spanish "14 h" (`hourSymbols` in `index.ts`). Countries are named by `countryName()`.
- Terms and Privacy are not translated: the English is the binding version, and other languages show a short note saying so.

## Adding a language

1. Copy the `en/` folder to a folder named by the language's [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (`de/` for German), and type each file as `fr/` does (`Translated<typeof en>`), so TypeScript checks it.
2. Translate every value, never the keys. Keep `{placeholders}` as they are, moving them where your grammar needs them.
3. Add a glossary for your language below, before translating the strings, so a term reads the same everywhere.
4. Register the language in `index.ts`, with the `locale` its dates and numbers are formatted in.
5. Run `npm run dev`, pick the language on the Settings page, and look at every page, on a phone width too: translations run longer than English.

## Guidelines

- Translate for meaning, not word for word.
- Resort names, Regions, Forecast model and Provider names, theme and font names, and what visitors type (Saved location names) are never translated.
- A term in `CONTEXT.md` is translated the same way everywhere, as your language's glossary says. The English glossary's "_Avoid_" words are about English; each language below lists its own.
- Never shorten a term to fit, even on phones (no "Isoth." for "Isotherme 0 °C"). Let it wrap.

## French glossary

French says *vous*, and picks words that read naturally in both France and Quebec, falling back to France's usage where they can't. Write ordinary spaces before `: ; ! ?` and in `0 °C`: `index.ts` makes them no-break spaces. Use the typographic apostrophe (’).

| Term (`CONTEXT.md`) | French | Avoid |
|---|---|---|
| Main page | Page principale | accueil, tableau de bord |
| Graph view | Vue météogramme | vue graphique |
| Graph | Météogramme | graphique (that is a Chart) |
| Chart | Graphique | météogramme, courbe |
| Locked charts | Graphiques verrouillés | |
| Detailed view | Vue détaillée | page de la station |
| History | Historique | archives, observations |
| History length | Durée de l’historique | |
| Resort | Station | domaine, lieu |
| Ski area | Domaine skiable | station (for one that isn't a Resort) |
| Region | Région | |
| Elevation band | Altitude de prévision | niveau, étage |
| Base / Mid / Top | Bas / Milieu / Haut | pied, mi-station, sommet |
| Ground elevation | Altitude du terrain | |
| Custom elevation | Altitude personnalisée | |
| Custom location | Point personnalisé | épingle, lieu |
| Saved location | Lieu enregistré | favori |
| Selection | Sélection | favoris |
| Starter resort | Station de départ | |
| Selection cap | Plafond de la Sélection | |
| Display limit | Limite d’affichage | |
| Fetch budget | Budget de requêtes | |
| Rate limit | Limite d’Open-Meteo | quota |
| Queued resort | Station en attente | |
| Period: AM / PM / Night | Matin / Après-midi / Nuit | AM, PM, aprèm |
| Snow quality | Qualité de neige | type de neige |
| Powder / Dry snow / Wet snow / Sleet/Mix / Rain | Poudreuse / Neige sèche / Neige humide / Pluie et neige / Pluie | neige fondue, grésil, neige mouillée |
| Snow caution | Prudence neige | |
| Extra cautious / Cautious / Realistic | Très prudent / Prudent / Réaliste | |
| Snowfall estimate | Estimation de la neige | |
| Model estimate | Estimation du modèle | |
| monkeysnow estimate | Estimation monkeysnow | notre estimation |
| Freezing level | Isotherme 0 °C | limite pluie-neige (that is the snow line, lower, and the name of Open-Meteo's Snowfall height Chart), Isoth. |
| Wet bulb | Thermomètre mouillé | température humide |
| Forecast model | Modèle de prévision | source |
| Provider | Fournisseur | |
| Coverage | Couverture | |
| Range | Portée | |
| Seamless model | Modèle seamless | |
| Card model | Modèle des cartes | modèle par défaut |
| Recommended card model | Auto | |
| Country model | Modèle du pays | |
| Main page models | Modèles de la page principale | |
| Forecast horizon | Horizon de prévision | |
| Selected models | Modèles choisis | |
| Recommended models | Modèles recommandés | |
| Detailed view models | Modèles de la vue détaillée | |
| Comparison models | Modèles comparés | |
| Aggregation | Agrégat | ensemble, consensus |
| Median / Mean / Min / Max / 25th / 75th percentile | Médiane / Moyenne / Min / Max / 25e centile / 75e centile | |
| Selected Aggregations | Agrégats choisis | |
| Spread fill | Zone de dispersion | |
| Accumulation | Cumul | total, somme |
| Model style | Style de modèle | |
| Focused line / Held line | Ligne en avant / Ligne retenue | |
| Base map | Fond de carte | |
| Standard / Satellite | Standard / Satellite | |
| Overlay | Calque | couche, mode |
| Terrain colouring | Coloration du terrain | |
| Slope angle | Angle de pente | carte avalanche |
| Slope band | Tranche de pente | seuil |
| Gradient | Dégradé de pente | |
| Aspect | Orientation | exposition |
| N, NE, E, SE, S, SW, W, NW | N, NE, E, SE, S, SO, O, NO | W |
| Flats | Replats | |
| Height tint | Teinte d’altitude | |
| Contours / Hillshade | Courbes de niveau / Ombrage du relief | |
| Ski map | Plan des pistes | |
| Run | Piste | |
| Lift | Remontée | |
| Difficulty colours | Couleurs de difficulté | |
| Height line | Ligne d’altitude | courbe de niveau (that is a Contour) |
| Cursor readout | Relevé sous le curseur | infobulle |
| Exaggeration | Exagération | |

## Spanish glossary

Spanish says *tú* (never *vos*), and picks words that read naturally in both Spain and Latin America, falling back to Spain's usage where they can't: one Spanish for every `es-*` browser. Dates and numbers follow Spain's conventions (`es`: 1,5 cm, a 24-hour clock), which Chile and Argentina share; an hour is written "14 h". Write ordinary spaces in `0 °C`: `index.ts` makes them no-break spaces. Open questions and exclamations with `¿` and `¡`.

| Term (`CONTEXT.md`) | Spanish | Avoid |
|---|---|---|
| Main page | Página principal | inicio, panel |
| Graph view | Vista de meteogramas | vista gráfica |
| Graph | Meteograma | gráfico (that is a Chart) |
| Chart | Gráfico | meteograma, curva |
| Locked charts | Gráficos bloqueados | |
| Detailed view | Vista detallada | página de la estación |
| History | Historial | historia, archivo, observaciones |
| History length | Duración del historial | |
| Resort | Estación | centro de esquí, dominio, lugar |
| Ski area | Área esquiable | estación (for one that isn't a Resort) |
| Region | Región | |
| Elevation band | Cota | banda, nivel, altura |
| Base / Mid / Top | Cota baja / Cota media / Cota alta (Baja / Media / Alta as short labels) | pie, cima, cumbre |
| Ground elevation | Altitud del terreno | |
| Custom elevation | Altitud personalizada | |
| Custom location | Punto personalizado | chincheta, pin, lugar |
| Saved location | Lugar guardado | favorito |
| Selection | Selección | favoritos |
| Starter resort | Estación inicial | |
| Selection cap | Tope de la Selección | |
| Display limit | Límite de visualización | |
| Fetch budget | Presupuesto de solicitudes | |
| Rate limit | Límite de Open-Meteo | cuota |
| Queued resort | Estación en espera | |
| Period: AM / PM / Night | Mañana / Tarde / Noche | a. m., p. m. |
| Snow quality | Calidad de la nieve | tipo de nieve |
| Powder / Dry snow / Wet snow / Sleet/Mix / Rain | Nieve polvo / Nieve seca / Nieve húmeda / Aguanieve / Lluvia | polvo (alone), nieve mojada, granizo |
| Snow caution | Prudencia con la nieve | |
| Extra cautious / Cautious / Realistic | Muy prudente / Prudente / Realista | |
| Snowfall estimate | Estimación de la nieve | |
| Model estimate | Estimación del modelo | |
| monkeysnow estimate | Estimación monkeysnow | nuestra estimación |
| Freezing level | Isoterma 0 °C | cota de nieve (that is the snow line, lower, and the name of Open-Meteo's Snowfall height Chart), nivel de congelación, Isot. |
| Wet bulb | Bulbo húmedo | temperatura húmeda |
| Forecast model | Modelo de pronóstico | fuente, previsión |
| Provider | Proveedor | |
| Coverage | Cobertura | |
| Range | Alcance | |
| Seamless model | Modelo seamless | |
| Card model | Modelo de las tarjetas | modelo por defecto |
| Recommended card model | Auto | |
| Country model | Modelo del país | |
| Main page models | Modelos de la página principal | |
| Forecast horizon | Horizonte de pronóstico | |
| Selected models | Modelos elegidos | |
| Recommended models | Modelos recomendados | |
| Detailed view models | Modelos de la vista detallada | |
| Comparison models | Modelos comparados | |
| Aggregation | Agregado | conjunto, consenso, ensemble |
| Median / Mean / Min / Max / 25th / 75th percentile | Mediana / Promedio / Mín / Máx / Percentil 25 / Percentil 75 | media (that is the Mid band) |
| Selected Aggregations | Agregados elegidos | |
| Spread fill | Zona de dispersión | |
| Accumulation | Acumulado | total, suma |
| Model style | Estilo de modelo | |
| Focused line / Held line | Línea destacada / Línea fijada | |
| Base map | Mapa base | |
| Standard / Satellite | Estándar / Satélite | |
| Overlay | Capa | modo |
| Terrain colouring | Coloración del terreno | |
| Slope angle | Ángulo de pendiente | mapa de aludes |
| Slope band | Franja de pendiente | umbral |
| Gradient | Degradado de pendiente | |
| Aspect | Orientación | exposición |
| N, NE, E, SE, S, SW, W, NW | N, NE, E, SE, S, SO, O, NO | W |
| Flats | Rellanos | llanos |
| Height tint | Tinte de altitud | |
| Contours / Hillshade | Curvas de nivel / Sombreado del relieve | |
| Ski map | Mapa de pistas | plano |
| Run | Pista | |
| Lift | Remonte | andarivel, medio de elevación, aerosilla (a chairlift is one kind) |
| Difficulty colours | Colores de dificultad | |
| Height line | Línea de altitud | curva de nivel (that is a Contour) |
| Cursor readout | Lectura bajo el cursor | tooltip |
| Exaggeration | Exageración | |

## Questions?

If you have questions about translating specific strings or need context, please open an issue on GitHub before starting your translation.

Thank you for contributing! 🎿❄️
