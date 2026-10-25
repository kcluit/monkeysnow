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

    'key.esc': 'esc',

    'language.title': 'Idioma',

    'footer.privacy': 'privacidad',
    'footer.donate': 'donar',
    'footer.language': 'Cambiar el idioma',
};
