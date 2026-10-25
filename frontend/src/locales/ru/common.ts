import type { common as en } from '../en/common';
import type { Translated } from '../../types/i18n';

export const common: Translated<typeof en, 'few' | 'many'> = {
    'common.loading': 'Загрузка…',
    'common.on': 'Включено',
    'common.off': 'Выключено',
    'common.show': 'Показать',
    'common.hide': 'Скрыть',

    'term.snowQuality': 'Качество снега',
    'term.freezingLevel': 'Нулевая изотерма',
    'term.snowfallEstimate': 'Оценка снегопада',
    'term.snowCaution': 'Осторожность оценки снега',

    'snowQuality.powder': 'Пухляк',
    'snowQuality.drySnow': 'Сухой снег',
    'snowQuality.wetSnow': 'Влажный снег',
    'snowQuality.sleetMix': 'Снег с дождём',
    'snowQuality.rain': 'Дождь',

    'snowCaution.extraCautious': 'Очень осторожно',
    'snowCaution.cautious': 'Осторожно',
    'snowCaution.realistic': 'Реалистично',

    'snowfall.model': 'Оценка модели',
    'snowfall.monkeysnow': 'Оценка monkeysnow',

    'band.base': 'Низ',
    'band.mid': 'Середина',
    'band.top': 'Верх',

    'period.am': 'Утро',
    'period.pm': 'День',
    'period.night': 'Вечер',

    'unit.cm': 'см',
    'unit.mm': 'мм',
    'unit.m': 'м',
    'unit.ft': 'фут',
    'unit.in': 'дюйм',
    'unit.kmh': 'км/ч',
    'unit.mph': 'миль/ч',
    'unit.ms': 'м/с',
    'unit.hPa': 'гПа',
    'unit.kPa': 'кПа',
    'unit.inHg': 'дюйм рт. ст.',
    'unit.psi': 'psi',
    'unit.min': 'мин',
    'unit.Jkg': 'Дж/кг',
    'unit.Wm2': 'Вт/м²',
    'unit.kgm2': 'кг/м²',
    'unit.kgm3': 'кг/м³',
    'unit.m3m3': 'м³/м³',

    'key.esc': 'esc',

    'language.title': 'Язык',
    'font.missingLetters': 'нет кириллицы',

    'footer.privacy': 'конфиденциальность',
    'footer.donate': 'поддержать',
    'footer.language': 'Сменить язык',
};
