/**
 * Words more than one part of the site shows: the glossary's own terms, the names of
 * choices that the Settings page, the command palette and the utility bars all offer,
 * and the language picker and footer. Reuse these rather than adding a second key for
 * the same words, so a term reads the same everywhere.
 */
export const common = {
    'common.loading': 'Loading...',
    'common.on': 'On',
    'common.off': 'Off',
    'common.show': 'Show',
    'common.hide': 'Hide',

    // Glossary terms, as labels
    'term.snowQuality': 'Snow quality',
    'term.freezingLevel': 'Freezing level',
    'term.snowfallEstimate': 'Snowfall estimate',
    'term.snowCaution': 'Snow caution',

    // Snow quality, best to worst
    'snowQuality.powder': 'Powder',
    'snowQuality.drySnow': 'Dry snow',
    'snowQuality.wetSnow': 'Wet snow',
    'snowQuality.sleetMix': 'Sleet/Mix',
    'snowQuality.rain': 'Rain',

    // Snow caution
    'snowCaution.extraCautious': 'Extra cautious',
    'snowCaution.cautious': 'Cautious',
    'snowCaution.realistic': 'Realistic',

    // Snowfall estimate
    'snowfall.model': 'Model estimate',
    'snowfall.monkeysnow': 'monkeysnow estimate',

    // Elevation bands, as short labels
    'band.base': 'Base',
    'band.mid': 'Mid',
    'band.top': 'Top',

    // Periods
    'period.am': 'AM',
    'period.pm': 'PM',
    'period.night': 'Night',

    // The Escape key, as the footer hints of the palette and pickers show it
    'key.esc': 'esc',

    // Language (the command palette finds it by every language's word for it)
    'language.title': 'Language',

    // Footer
    'footer.privacy': 'privacy',
    'footer.donate': 'donate',
    'footer.language': 'Change the language',
};
