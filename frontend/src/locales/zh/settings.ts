import type { settings as en } from '../en/settings';
import type { Translated } from '../../types/i18n';

export const settings: Translated<typeof en> = {
    'settings.title': '设置',
    'settings.tip': '提示：你也可以用命令面板（Esc、Tab 或 Ctrl+Shift+P）快速更改所有这些设置',
    'settings.groupsLabel': '设置分组',

    'settings.group.general': '通用',
    'settings.group.mainPage': '主页面',
    'settings.group.detailedView': '详细视图',
    'settings.group.appearance': '外观',
    'settings.group.advanced': '高级',

    'settings.section.resorts': '滑雪场',
    'settings.section.cards': '卡片',
    'settings.section.sorting': '排序',
    'settings.section.forecast': '预报',
    'settings.section.charts': '图表',
    'settings.section.map': '地图',
    'settings.section.interface': '界面',
    'settings.section.performance': '性能',

    'settings.choose': '选择…',
    'settings.edit': '编辑…',
    'settings.apply': '应用',
    'settings.cancel': '取消',

    'settings.searchThemes': '搜索主题…',
    'settings.searchThemesLabel': '搜索主题',
    'settings.noThemesMatch': '没有与“{query}”匹配的主题',

    'settings.historyHint': '显示过去几天而不是预报，直到你离开页面',

    'settings.viewMode': '视图模式',
    'settings.elevation': '海拔',
    'settings.temperature.max': '最高',
    'settings.temperature.min': '最低',
    'settings.temperature.avg': '平均',
    'settings.temperature.median': '中位数',

    'settings.sortBy.temperature': '气温',
    'settings.sortBy.snowfall': '降雪',
    'settings.sortBy.wind': '风速',
    'settings.sortOrder.normal': '正常',
    'settings.sortOrder.reverse': '反向',

    'settings.customElevation': '自定义…',
    'settings.customElevationValue': '自定义：{elevation}',
    'settings.customElevationInFeet': '自定义海拔（英尺）',
    'settings.customElevationInMetres': '自定义海拔（米）',
    'settings.savedLocationsOwnHeight': '已保存地点始终按其自身的高度预报',

    'settings.chartsShown': '显示的图表',
    'settings.charts.one': '{count} 个图表',
    'settings.charts.other': '{count} 个图表',
    'settings.modelStylesHint': '每个模型图表线条的颜色、加粗和不透明度',
    'settings.lockChartsHint': '不可缩放，没有范围滑块',

    'settings.overlays': '叠加层',
    'settings.hillshadeHint': '3D 中始终开启',
    'settings.slopeBandsHint': '坡度着色所涂的陡度范围及其颜色',
    'settings.mapRotation.linear': '右键左右拖动，视角朝同一方向转动，与指针位置无关',
    'settings.mapRotation.linearReversed': '右键左右拖动，视角朝相反方向转动，让远处的山跟随指针，与指针位置无关',
    'settings.mapRotation.orbital': '右键拖动会像转地球仪一样转动地图，因此在地图中线上下方向相反',
    'settings.mapTilt.dragUp': '右键向上拖动，视角向地平线倾斜',
    'settings.mapTilt.dragDown': '右键向下拖动，视角向地平线倾斜',
    'settings.cursorReadoutHint': '鼠标下方地形的高度、坡度和坡向，显示在任一地图的角落；仅在有鼠标时显示',

    'settings.showUtilityBar': '显示工具栏',
};
