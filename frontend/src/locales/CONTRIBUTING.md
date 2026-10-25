# Contributing Translations

Thank you for helping translate monkeysnow! This guide explains how the translations are laid out, how to add a language, and the words each language uses for monkeysnow's own terms.

## How it fits together

- `en/` is English, the source of every string. It is split into one file per part of the site: `common.ts` (words several parts share, such as Snow quality names and the Elevation bands), `main.ts` (the Main page), `settings.ts`, `commands.ts` (the command palette and App's own words), `detail.ts`, `charts.ts`, `map.ts` and `pages.ts` (About, and the note on Terms and Privacy).
- Every other language has a folder with the same files: `fr/` is French, `es/` Spanish, `ru/` Russian, `zh/` Simplified Chinese. Each of its files has exactly the keys of the English one; TypeScript reports any key missing or extra.
- `index.ts` lists the languages and picks one: the visitor's pick, kept in this browser, else the first of their browser's languages that monkeysnow has, else English. Only the part of a browser's tag before the dash counts, so `zh-TW` and `zh-HK` get Simplified Chinese until there is a Traditional one. A first visit saves nothing, so a visitor follows their browser until they pick.
- Components get `t()` and `tPlural()` from `useLanguage()`, which redraws them when the language changes. Code outside React uses `translate()` and `translatePlural()`, called when the words are needed, never once as a module loads.
- `{placeholders}` are filled by `t(key, { name: value })`. Plurals are two keys, `<key>.one` and `<key>.other`, picked by the language's own rule (`tPlural(key, count)`, which fills `{count}`): French says "0 station", English "0 resorts". A language whose rule has more forms gives every plural key those too, and types its files with them (`Translated<typeof en, 'few' | 'many'>`), so TypeScript reports one left out: Russian says 1 курорт, 2 курорта, 5 курортов, 21 курорт.
- Dates, times and numbers follow the language too: `formatLocale()` is the tag to give `Intl` formatters (English stays `en-US`), and `formatDecimal()` writes 1.5 or 1,5. An hour on its own or ending a date goes through `hourFormat()`, which adds the "h" that `Intl` leaves off a Spanish "14 h", and the ":00" of a Russian "14:00" (`hourSymbols` in `index.ts`); a Chinese one is "14时" already. Countries are named by `countryName()`, and Regions by `regionName()` where the language has a table of a country's Region names (`zh/regions.ts`); search finds them by those names too.
- So do unit symbols: code writes `withUnit(value, 'cm')` or `unitSymbol('km/h')`, never the symbol on its own, and each language gives its symbols as `unit.*` keys. Russian's are Cyrillic (1,5 см, 20 км/ч), and always spaced from the number, where English writes heights tight (1500m, 1500 м).
- Each language says which alphabet it is written in (`script` in `index.ts`), and each font which it has letters for (`scripts` in `types/fonts.ts`). The font pickers mark a font with no letters for the language showing, where another font has them; its text falls back to the system font. No font has Chinese characters (`han`), so in Chinese none is marked, and every font stack names a Chinese face instead (`fontFamilyWithChinese()`).
- A language's typesetter in `index.ts` fixes spacing that depends on what fills a placeholder: French's, Spanish's and Russian's no-break spaces, Chinese's spaces beside Latin letters and numbers.
- Terms and Privacy are not translated: the English is the binding version, and other languages show a short note saying so.

## Adding a language

1. Copy the `en/` folder to a folder named by the language's [ISO 639-1 code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (`de/` for German), and type each file as `fr/` does (`Translated<typeof en>`), so TypeScript checks it. If `Intl.PluralRules` gives your language forms beyond one and other, name them as `ru/` does (`Translated<typeof en, 'few' | 'many'>`) and add them to every plural key.
2. Translate every value, never the keys. Keep `{placeholders}` as they are, moving them where your grammar needs them.
3. Add a glossary for your language below, before translating the strings, so a term reads the same everywhere.
4. Register the language in `index.ts`, with the `locale` its dates and numbers are formatted in and the `script` it is written in. A new alphabet also goes in `Script` (`types/i18n.ts`), and in the `scripts` of each font that has it.
5. Run `npm run dev`, pick the language on the Settings page, and look at every page, on a phone width too: translations run longer than English.

## Guidelines

- Translate for meaning, not word for word.
- Resort names, Forecast model and Provider names, theme and font names, and what visitors type (Saved location names) are never translated. Regions stay as OpenSkiData has them, except where a language has a table of a country's Region names, for countries whose names its readers know only in their own script (Chinese names China's and Japan's).
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

## Russian glossary

Russian says *вы*, lowercase. Buttons and commands are infinitives (Сохранить, Выбрать курорты); instructions address the visitor (Выберите курорты). Sentence case everywhere: only the first word and names take a capital. Write ordinary spaces before a dash and in `0 °C`: `index.ts` makes them no-break spaces. Quotes are «ёлочки», with no spaces inside. Write ё where it belongs; search finds it by е anyway.

A `{placeholder}` that is a name or a term can't take Russian's cases, so don't put it where one is needed: lead with a colon (Выбрано: {count} из {max}, Моделей: {count}) or quote the name («{name}»). Units are the `unit.*` keys (см, мм, м, км/ч), never Latin.

| Term (`CONTEXT.md`) | Russian | Avoid |
|---|---|---|
| Main page | Главная страница | домашняя страница, дашборд |
| Graph view | Вид метеограмм | графический вид |
| Graph | Метеограмма | график (that is a Chart) |
| Chart | График | метеограмма, диаграмма |
| Locked charts | Заблокированные графики | закреплённые (a Held line is закреплённая) |
| Detailed view | Подробный вид | страница курорта |
| History | История | архив, наблюдения |
| History length | Глубина истории | длина истории |
| Resort | Курорт | станция, база, локация |
| Ski area | Лыжная зона | курорт (for one that isn't a Resort) |
| Region | Регион | область, штат (as the general term) |
| Elevation band | Высота прогноза | уровень, ярус |
| Base / Mid / Top | Низ / Середина / Верх | подножие, вершина |
| Ground elevation | Высота местности | |
| Custom elevation | Своя высота | ручная высота |
| Custom location | Своя точка | метка, локация |
| Saved location | Сохранённое место | избранное |
| Selection | Подборка | избранное, список |
| Starter resort | Стартовый курорт | |
| Selection cap | Предел подборки | |
| Display limit | Лимит показа | |
| Fetch budget | Бюджет запросов | |
| Rate limit | Лимит Open-Meteo | квота |
| Queued resort | Курорт в очереди | |
| Period: AM / PM / Night | Утро / День / Вечер | Ночь (in Russian that is after midnight, which is Утро here) |
| Snow quality | Качество снега | тип снега |
| Powder / Dry snow / Wet snow / Sleet/Mix / Rain | Пухляк / Сухой снег / Влажный снег / Снег с дождём / Дождь | мокрый снег (Russian forecasts mean sleet by it; it is only ECMWF's precipitation type 6), порошок, целина |
| Snow caution | Осторожность оценки снега | |
| Extra cautious / Cautious / Realistic | Очень осторожно / Осторожно / Реалистично | |
| Snowfall estimate | Оценка снегопада | |
| Model estimate | Оценка модели | |
| monkeysnow estimate | Оценка monkeysnow | наша оценка |
| Freezing level | Нулевая изотерма | снеговая линия, граница снега (that is lower, and Open-Meteo's Snowfall height Chart: Граница снега и дождя), уровень замерзания |
| Wet bulb | Смоченный термометр | влажный термометр |
| Forecast model | Модель прогноза | источник |
| Provider | Поставщик | |
| Coverage | Охват | |
| Range | Дальность | горизонт |
| Seamless model | Модель Seamless | |
| Card model | Модель карточек | модель по умолчанию |
| Recommended card model | Авто | |
| Country model | Модель страны | |
| Main page models | Модели главной страницы | |
| Forecast horizon | Горизонт прогноза | |
| Selected models | Выбранные модели | |
| Recommended models | Рекомендуемые модели | |
| Detailed view models | Модели подробного вида | |
| Comparison models | Сравниваемые модели | |
| Aggregation | Сводная линия | агрегат, ансамбль, консенсус |
| Median / Mean / Min / Max / 25th / 75th percentile | Медиана / Среднее / Минимум / Максимум / 25-й процентиль / 75-й процентиль | |
| Selected Aggregations | Выбранные сводные линии | |
| Spread fill | Заливка разброса | |
| Accumulation | Накопление | сумма, итог |
| Model style | Стиль модели | |
| Focused line / Held line | Выделенная линия / Закреплённая линия | |
| Base map | Подложка | |
| Standard / Satellite | Стандартная / Спутник | |
| Overlay | Слой | режим |
| Terrain colouring | Раскраска рельефа | |
| Slope angle | Крутизна склона | лавинная карта |
| Slope band | Диапазон крутизны | порог |
| Gradient | Градиент крутизны | |
| Aspect | Экспозиция | ориентация |
| N, NE, E, SE, S, SW, W, NW | С, СВ, В, ЮВ, Ю, ЮЗ, З, СЗ | N, E, S, W |
| Flats | Пологие участки | |
| Height tint | Окраска по высоте | гипсометрия |
| Contours / Hillshade | Горизонтали / Отмывка рельефа | |
| Ski map | Схема трасс | |
| Run | Трасса | склон, спуск |
| Lift | Подъёмник | канатка |
| Difficulty colours | Цвета сложности | |
| Height line | Линия высоты | горизонталь (that is a Contour) |
| Cursor readout | Данные под курсором | подсказка |
| Exaggeration | Преувеличение рельефа | |

## Chinese glossary

Simplified Chinese (`zh`), for Chinese speakers anywhere: it is also what Taiwan and Hong Kong browsers get until there is a Traditional Chinese (`zh-Hant`). It says 你, not 您. Use full-width punctuation in Chinese text (`，。：；！？（）` and `“”`), and a half-width space between a Chinese character and a Latin letter or number (`monkeysnow 估算`, `过去 7 天`); `index.ts` adds that space beside what fills a placeholder, but type it everywhere else. Units stay as symbols beside a value (`5 cm`, `−3 °C`, `20 km/h`; `unit.*` keys as English's), except minutes (`5 分钟`), and are words in prose (`离地 2 米处`). Every `.one` plural repeats its `.other`: Chinese has one form.

Chinese text is drawn in the platform's own Chinese sans-serif face, named in every font stack (`types/fonts.ts`), and the page's `lang` is `zh-Hans`, so shared characters take their Simplified Chinese forms. Translating the site doesn't make it work from inside mainland China: Google Fonts is blocked there, and whether Open-Meteo, the map tiles and Netlify are reachable hasn't been tested.

| Term (`CONTEXT.md`) | Chinese | Avoid |
|---|---|---|
| Main page | 主页面 | 首页、主页 (the site's home page), 仪表盘 |
| Graph view | 逐时图视图 | 图表视图 |
| Graph | 逐时图 | 气象图 (a weather map), 图表 (that is a Chart) |
| Chart | 图表 | 逐时图、曲线图 |
| Locked charts | 锁定图表 | 冻结图表 |
| Detailed view | 详细视图 | 详情页、滑雪场页面 |
| History | 历史 | 实况、观测、存档 (it is what models forecast, not what was measured) |
| History length | 历史天数 | 回溯 |
| Resort | 滑雪场 | 雪场 (colloquial), 度假村、地点 |
| Ski area | 滑雪区域 | 滑雪场 (for one that isn't a Resort) |
| Region | 地区 | 省、州 (as the general term) |
| Elevation band | 预报高度 | 海拔层、层级 |
| Base / Mid / Top | 底部 / 中部 / 顶部 | 山脚、山腰、山顶 |
| Ground elevation | 地面海拔 | 默认海拔 |
| Custom elevation | 自定义海拔 | 手动海拔 |
| Custom location | 自定义地点 | 图钉、标记 |
| Saved location | 已保存地点 | 收藏 |
| Selection | 已选列表 | 收藏、关注列表、已选模型 (those are Selected models) |
| Starter resort | 初始滑雪场 | 默认滑雪场、本地滑雪场 |
| Selection cap | 已选上限 | |
| Display limit | 显示上限 | |
| Fetch budget | 请求预算 | 频率限制 (that is the Rate limit) |
| Rate limit | Open-Meteo 频率限制 | 配额 |
| Freshness window | 有效期 | 缓存过期、刷新间隔 |
| Queued resort | 排队中的滑雪场 | 加载中 |
| Period: AM / PM / Night | 上午 / 下午 / 晚上 (上午 takes in the small hours too) | AM、PM |
| Snow quality | 雪质 | 雪况、降水类型 |
| Powder / Dry snow / Wet snow / Sleet/Mix / Rain | 粉雪 / 干雪 / 湿雪 / 雨夹雪 / 雨 | 冻雨、霰、冰粒 |
| Snow quality colours | 雪质颜色 | 雷达颜色 |
| Snow caution | 降雪保守度 | 模式、偏差、乐观、默认 |
| Extra cautious / Cautious / Realistic | 非常保守 / 保守 / 贴近实际 | 谨慎 (for an estimate, 保守 is the word), 现实 |
| Snowfall estimate | 降雪估算 | |
| Model estimate | 模型估算 | 原始降雪、模型降雪 |
| monkeysnow estimate | monkeysnow 估算 | 我们的估算 |
| Freezing level | 零度层高度 | 雪线 (the snow line, lower, and the name of Open-Meteo's Snowfall height Chart, 降雪高度), 冻结高度 |
| Wet bulb | 湿球温度 | |
| Forecast model | 预报模型 | 数据源、天气模型 |
| Provider | 机构 | 供应商、厂商 |
| Coverage | 覆盖范围 | 区域 |
| Range | 预报时效 | 预报天数 (that is the Forecast horizon) |
| Seamless model | 无缝模型 | 混合模型 |
| Clone | 克隆模型 | 重复 |
| Card model | 卡片模型 | 默认模型、主模型 |
| Recommended card model | 自动 | 默认 |
| Country model | 国家模型 | |
| Main page models | 主页面模型 | |
| Forecast horizon | 预报天数 | 预报时效 (that is the Range) |
| Selected models | 已选模型 | 默认模型 |
| Recommended models | 推荐模型 | 默认模型 |
| Detailed view models | 详细视图模型 | |
| Comparison models | 对比模型 | |
| Aggregation | 统计线 | 集合 (that is an ensemble), 共识、聚合 |
| Median / Mean / Min / Max / 25th / 75th percentile | 中位数 / 平均值 / 最小值 / 最大值 / 第 25 百分位 / 第 75 百分位 | |
| Selected Aggregations | 已选统计线 | |
| Spread fill | 离散带 | 包络 |
| Accumulation | 累计 | 总计、合计 |
| Model style | 模型样式 | 线条样式 |
| Focused line / Held line | 聚焦线 / 固定线 | 高亮线、锁定线 |
| Base map | 底图 | 地图样式 |
| Standard / Satellite | 标准 / 卫星 | |
| Overlay | 叠加层 | 图层、模式 |
| Terrain colouring | 地形着色 | 地形图层 |
| Slope angle | 坡度 | 雪崩图层、雪崩地形 |
| Slope band | 坡度区间 | 阈值 |
| Gradient | 坡度渐变 | 坡度 (that is Slope angle) |
| Aspect | 坡向 | 朝向 |
| N, NE, E, SE, S, SW, W, NW | 北、东北、东、东南、南、西南、西、西北 (a wind is named for where it blows from: 西北风) | |
| Flats | 平缓地带 | 平地 |
| Height tint | 高程着色 | 分层设色 |
| Contours / Hillshade | 等高线 / 山体阴影 | |
| Ski map | 雪道图 | |
| Run | 雪道 (by colour, as skiers say: 绿道、蓝道、红道、黑道) | |
| Lift | 缆车 | 索道 (as the general term) |
| Difficulty colours | 难度颜色 | 雪道颜色 |
| Height line | 高度线 | 等高线 (that is a Contour) |
| Cursor readout | 光标读数 | 提示框 |
| Exaggeration | 地形夸张 | 垂直比例 |

## Questions?

If you have questions about translating specific strings or need context, please open an issue on GitHub before starting your translation.

Thank you for contributing! 🎿❄️
