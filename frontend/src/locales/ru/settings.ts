import type { settings as en } from '../en/settings';
import type { Translated } from '../../types/i18n';

export const settings: Translated<typeof en, 'few' | 'many'> = {
    'settings.title': 'Настройки',
    'settings.tip': 'Совет: все эти настройки можно быстро менять и через командную палитру (Esc, Tab или Ctrl+Shift+P)',
    'settings.groupsLabel': 'Группы настроек',

    'settings.group.general': 'Общие',
    'settings.group.mainPage': 'Главная страница',
    'settings.group.detailedView': 'Подробный вид',
    'settings.group.appearance': 'Оформление',
    'settings.group.advanced': 'Дополнительно',

    'settings.section.resorts': 'Курорты',
    'settings.section.cards': 'Карточки',
    'settings.section.sorting': 'Сортировка',
    'settings.section.forecast': 'Прогноз',
    'settings.section.charts': 'Графики',
    'settings.section.map': 'Карта',
    'settings.section.interface': 'Интерфейс',
    'settings.section.performance': 'Производительность',

    'settings.choose': 'Выбрать…',
    'settings.edit': 'Изменить…',
    'settings.apply': 'Применить',
    'settings.cancel': 'Отмена',

    'settings.searchThemes': 'Поиск тем…',
    'settings.searchThemesLabel': 'Поиск тем',
    'settings.noThemesMatch': 'Нет тем по запросу «{query}»',

    'settings.historyHint': 'прошедшие дни вместо прогноза, до конца визита',

    'settings.viewMode': 'Вид',
    'settings.elevation': 'Высота',
    'settings.temperature.max': 'Максимум',
    'settings.temperature.min': 'Минимум',
    'settings.temperature.avg': 'Среднее',
    'settings.temperature.median': 'Медиана',

    'settings.sortBy.temperature': 'Температура',
    'settings.sortBy.snowfall': 'Снегопад',
    'settings.sortBy.wind': 'Ветер',
    'settings.sortOrder.normal': 'Обычный',
    'settings.sortOrder.reverse': 'Обратный',

    'settings.customElevation': 'Своя…',
    'settings.customElevationValue': 'Своя: {elevation}',
    'settings.customElevationInFeet': 'Своя высота в футах',
    'settings.customElevationInMetres': 'Своя высота в метрах',
    'settings.savedLocationsOwnHeight': 'Прогноз для сохранённых мест всегда на их собственной высоте',

    'settings.chartsShown': 'Показанные графики',
    'settings.charts.one': '{count} график',
    'settings.charts.few': '{count} графика',
    'settings.charts.many': '{count} графиков',
    'settings.charts.other': '{count} графика',
    'settings.modelStylesHint': 'Цвет, жирность и непрозрачность линий каждой модели на графиках',
    'settings.lockChartsHint': 'без масштабирования и ползунка диапазона',

    'settings.overlays': 'Слои',
    'settings.hillshadeHint': 'в 3D всегда включена',
    'settings.slopeBandsHint': 'Диапазоны крутизны, которые закрашивает раскраска «Крутизна склона», и их цвета',
    'settings.mapRotation.linear': 'Перетаскивание правой кнопкой вбок поворачивает вид в ту же сторону, где бы ни был указатель',
    'settings.mapRotation.linearReversed': 'Перетаскивание правой кнопкой вбок поворачивает вид в обратную сторону, так что дальние горы следуют за указателем, где бы он ни был',
    'settings.mapRotation.orbital': 'Перетаскивание правой кнопкой вращает карту, как глобус, поэтому выше и ниже её середины — в разные стороны',
    'settings.mapTilt.dragUp': 'Перетаскивание правой кнопкой вверх наклоняет вид к горизонту',
    'settings.mapTilt.dragDown': 'Перетаскивание правой кнопкой вниз наклоняет вид к горизонту',
    'settings.cursorReadoutHint': 'Высота, крутизна склона и экспозиция местности под мышью, в углу любой карты; только там, где есть мышь',

    'settings.showUtilityBar': 'Показывать панель инструментов',
};
