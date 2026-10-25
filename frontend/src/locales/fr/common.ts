import type { common as en } from '../en/common';
import type { Translated } from '../../types/i18n';

export const common: Translated<typeof en> = {
    'common.loading': 'Chargement…',
    'common.on': 'Activé',
    'common.off': 'Désactivé',
    'common.show': 'Afficher',
    'common.hide': 'Masquer',

    'term.snowQuality': 'Qualité de neige',
    'term.freezingLevel': 'Isotherme 0 °C',
    'term.snowfallEstimate': 'Estimation de la neige',
    'term.snowCaution': 'Prudence neige',

    'snowQuality.powder': 'Poudreuse',
    'snowQuality.drySnow': 'Neige sèche',
    'snowQuality.wetSnow': 'Neige humide',
    'snowQuality.sleetMix': 'Pluie et neige',
    'snowQuality.rain': 'Pluie',

    'snowCaution.extraCautious': 'Très prudent',
    'snowCaution.cautious': 'Prudent',
    'snowCaution.realistic': 'Réaliste',

    'snowfall.model': 'Estimation du modèle',
    'snowfall.monkeysnow': 'Estimation monkeysnow',

    'band.base': 'Bas',
    'band.mid': 'Milieu',
    'band.top': 'Haut',

    'period.am': 'Matin',
    'period.pm': 'Après-midi',
    'period.night': 'Nuit',

    'unit.cm': 'cm',
    'unit.mm': 'mm',
    'unit.m': 'm',
    'unit.ft': 'ft',
    'unit.in': 'in',
    'unit.kmh': 'km/h',
    'unit.mph': 'mph',
    'unit.ms': 'm/s',
    'unit.hPa': 'hPa',
    'unit.kPa': 'kPa',
    'unit.inHg': 'inHg',
    'unit.psi': 'psi',
    'unit.min': 'min',
    'unit.Jkg': 'J/kg',
    'unit.Wm2': 'W/m²',
    'unit.kgm2': 'kg/m²',
    'unit.kgm3': 'kg/m³',
    'unit.m3m3': 'm³/m³',

    'key.esc': 'échap',

    'language.title': 'Langue',
    'font.missingLetters': 'pas de lettres pour cette langue',

    'footer.privacy': 'confidentialité',
    'footer.donate': 'faire un don',
    'footer.language': 'Changer de langue',
};
