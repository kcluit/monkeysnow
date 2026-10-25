/** The About page, and the note on Terms and Privacy that only the English is binding */
export const pages = {
    // Section titles, lower case like the rest of the page
    'about.title.about': 'about',
    'about.title.snowEstimation': 'snow estimation',
    'about.title.qualityWhenCautious': 'snow quality, when cautious',
    'about.title.snowCaution': 'snow caution',
    'about.title.keybinds': 'keybinds',
    'about.title.contributors': 'contributors',
    'about.title.dataSources': 'data sources',
    'about.title.credits': 'credits',
    'about.title.contact': 'contact',

    // About
    'about.intro': 'monkeysnow is a minimalistic and customizable ski resort/snow forecast app. It displays weather data from multiple weather models for ski resorts around the world, with snow accumulation estimates based on wet bulb temperature and precipitation.',
    'about.features': 'The app features multiple view modes, customizable themes, and multi-model comparison charts.',
    'about.track': 'Track conditions at your favorite resorts and compare forecasts across weather models.',

    // Snow estimation: how the estimate works, which must agree with utils/snowQuality.ts and CONTEXT.md
    'about.snow.intro': "monkeysnow estimates what falls from each hour's temperature and humidity at the height being forecast, through the wet-bulb temperature: how cold the air would get if its moisture evaporated into it, which tells rain from snow better than the air temperature alone. How far it leans toward the worse label when an hour is close is your snow caution, set on the settings page: cautious unless you pick another.",
    'about.quality.powder': 'powder',
    'about.quality.powderText': 'light, fluffy snow, 15 cm or more for every centimetre of water. Wet bulb from about −11 °C down to about −21 °C.',
    'about.quality.drySnow': 'dry snow',
    'about.quality.drySnowText': 'good snow of ordinary density, 10 to 15 cm for every centimetre of water. Wet bulb from about −3.5 °C down to −11 °C, and again below −21 °C, where crystals go small.',
    'about.quality.wetSnow': 'wet snow',
    'about.quality.wetSnowText': 'heavy snow, under 10 cm for every centimetre of water. Wet bulb from −0.5 °C down to about −3.5 °C.',
    'about.quality.sleetMix': 'sleet/mix',
    'about.quality.sleetMixText': 'snow and rain together, counted partly as each. Wet bulb between −0.5 °C and +0.5 °C, where snow is still the likelier but not near-certain.',
    'about.quality.rain': 'rain',
    'about.quality.rainText': 'wet bulb of +0.5 °C and above.',
    'about.caution.extraCautious': 'extra cautious',
    'about.caution.extraCautiousText': "rain from a wet bulb of −0.3 °C and sleet/mix from −1.5 °C, so rain wherever there's even a 1 in 10 chance of it. Its snow is denser too, as LaChapelle measured it at Alta, so down to a wet bulb of about −6 °C the same water makes 10 to 15% less of it.",
    'about.caution.cautious': 'cautious',
    'about.caution.cautiousText': 'the labels above: rain from +0.5 °C, where snow is still about 2 in 3 likely.',
    'about.caution.realistic': 'realistic',
    'about.caution.realisticText': 'rain from +1.35 °C and sleet/mix from +0.25 °C, so half snow at +0.8 °C, where the rain–snow studies put it in the mountains.',
    'about.snow.estimates': 'The "monkeysnow estimate" on a card, shown unless you pick the "Model estimate", splits each hour\'s total precipitation into snow and rain this way, for each elevation on its own, and turns the snow\'s water into centimetres with a snow-to-liquid ratio that rises from 8 near freezing to 17 at −14 °C and falls again in the bitter cold. The "Model estimate" shows the weather model\'s own snowfall and rain instead, which it works out for its grid cell rather than for each elevation.',
    'about.snow.tie': "A period's or a day's snow quality is the one under which most of its precipitation fell; on a tie, the worse one.",
    'about.snow.note': 'Note: These estimates are approximations. Actual snow conditions depend on many factors including wind, elevation and local terrain effects, and on the weather model being right.',

    // Keybinds: {placeholders} are keys, drawn as keys
    'about.keys.palette': 'You can use {esc} or {tab} or {ctrl}+{shift}+{p} to open the command palette. From there you can access all settings and controls without touching your mouse.',
    'about.keys.search': 'The command palette supports fuzzy search - just start typing to filter commands. Use arrow keys to navigate and {enter} to select.',
    'about.key.esc': 'Esc',
    'about.key.tab': 'Tab',
    'about.key.ctrl': 'Ctrl',
    'about.key.shift': 'Shift',
    'about.key.enter': 'Enter',

    // Contributors
    'about.contributors.loading': 'loading contributors...',
    'about.contributors.failed': 'failed to load contributors.',

    // Data sources: {placeholders} are links
    'about.data.openMeteo': 'Weather data is provided by {openMeteo}, an open-source weather API that aggregates data from multiple national weather services and weather models worldwide.',
    'about.data.models': 'Available weather models include ECMWF, GFS, ICON, and regional models. Each model has different strengths - compare them to get a better picture of expected conditions.',
    'about.data.updates': 'Forecasts are updated automatically every few hours to provide the latest predictions.',

    // Credits: {placeholders} are links, the few with words of their own just below
    'about.credits.inspired': 'Inspired by {monkeytype} - the minimalistic typing test.',
    'about.credits.weather': 'Weather data by {openMeteo}',
    'about.credits.skiData': "Ski resort, run and lift data from {openSkiData} / OpenSkiMap.org, © {osmContributors} (ODbL), Skimap.org, Who's On First, © Mapterhorn. Our {resortList} and {skiMapData} are available under the {odbl}.",
    'about.credits.osmContributors': 'OpenStreetMap contributors',
    'about.credits.resortList': 'resort list',
    'about.credits.skiMapData': 'ski map data',
    // {sources} is a list of the satellite photos' sources, the last two joined by 'about.credits.and' and the rest by 'about.credits.comma'
    'about.credits.photos': 'Map satellite photos from {sources}; terrain from {mapzen} and, on the 3D map, {mapterhorn}.',
    'about.credits.comma': ', ',
    'about.credits.and': 'and',
    'about.credits.icons': 'Icons by {fontAwesome}',

    // Contact
    'about.contact.prompt': 'Found a bug? Have a feature request? Want to contribute?',
    'about.contact.terms': 'Terms',
    'about.contact.privacy': 'Privacy',
    'about.contact.donate': 'Donate',
    'about.madeIn': 'Made in Burnaby with love.',
    'about.launched': 'Launched on 30th Jan 2026.',

    // Atop Terms and Privacy in any other language: they stay in English, which is binding
    'legal.termsEnglishOnly': 'These terms of use are only available in English; the English version is binding.',
    'legal.privacyEnglishOnly': 'This privacy policy is only available in English; the English version is binding.',
};
