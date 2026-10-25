import type { common as en } from '../en/common';
import type { Translated } from '../../types/i18n';

export const common: Translated<typeof en> = {
    'common.loading': '加载中…',
    'common.on': '开',
    'common.off': '关',
    'common.show': '显示',
    'common.hide': '隐藏',

    'term.snowQuality': '雪质',
    'term.freezingLevel': '零度层高度',
    'term.snowfallEstimate': '降雪估算',
    'term.snowCaution': '降雪保守度',

    'snowQuality.powder': '粉雪',
    'snowQuality.drySnow': '干雪',
    'snowQuality.wetSnow': '湿雪',
    'snowQuality.sleetMix': '雨夹雪',
    'snowQuality.rain': '雨',

    'snowCaution.extraCautious': '非常保守',
    'snowCaution.cautious': '保守',
    'snowCaution.realistic': '贴近实际',

    'snowfall.model': '模型估算',
    'snowfall.monkeysnow': 'monkeysnow 估算',

    'band.base': '底部',
    'band.mid': '中部',
    'band.top': '顶部',

    'period.am': '上午',
    'period.pm': '下午',
    'period.night': '晚上',

    // Symbols, as in English, but minutes as a word, as Chinese writes them beside a number
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
    'unit.min': '分钟',
    'unit.Jkg': 'J/kg',
    'unit.Wm2': 'W/m²',
    'unit.kgm2': 'kg/m²',
    'unit.kgm3': 'kg/m³',
    'unit.m3m3': 'm³/m³',

    'key.esc': 'esc',

    'language.title': '语言',
    // Never shown: no font has Chinese characters, so none is marked (lacksLettersFor())
    'font.missingLetters': '没有这种语言的字符',

    'footer.privacy': '隐私',
    'footer.donate': '捐助',
    'footer.language': '更改语言',
};
