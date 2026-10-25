import type { common as en } from '../en/common';
import type { Translated } from '../../types/i18n';

export const common: Translated<typeof en> = {
    'common.loading': 'Cargando…',
    'common.on': 'Activado',
    'common.off': 'Desactivado',
    'common.show': 'Mostrar',
    'common.hide': 'Ocultar',

    'term.snowQuality': 'Calidad de la nieve',
    'term.freezingLevel': 'Isoterma 0 °C',
    'term.snowfallEstimate': 'Estimación de la nieve',
    'term.snowCaution': 'Prudencia con la nieve',

    'snowQuality.powder': 'Nieve polvo',
    'snowQuality.drySnow': 'Nieve seca',
    'snowQuality.wetSnow': 'Nieve húmeda',
    'snowQuality.sleetMix': 'Aguanieve',
    'snowQuality.rain': 'Lluvia',

    'snowCaution.extraCautious': 'Muy prudente',
    'snowCaution.cautious': 'Prudente',
    'snowCaution.realistic': 'Realista',

    'snowfall.model': 'Estimación del modelo',
    'snowfall.monkeysnow': 'Estimación monkeysnow',

    'band.base': 'Baja',
    'band.mid': 'Media',
    'band.top': 'Alta',

    'period.am': 'Mañana',
    'period.pm': 'Tarde',
    'period.night': 'Noche',

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

    'key.esc': 'esc',

    'language.title': 'Idioma',
    'font.missingLetters': 'sin letras para este idioma',

    'footer.privacy': 'privacidad',
    'footer.donate': 'donar',
    'footer.language': 'Cambiar el idioma',
};
