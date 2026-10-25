import type { settings as en } from '../en/settings';
import type { Translated } from '../../types/i18n';

export const settings: Translated<typeof en> = {
    'settings.title': 'Configuración',
    'settings.tip': 'Consejo: también puedes cambiar todos estos ajustes rápidamente con la paleta de comandos (Esc, Tab o Ctrl+Mayús+P)',
    'settings.groupsLabel': 'Grupos de ajustes',

    'settings.group.general': 'General',
    'settings.group.mainPage': 'Página principal',
    'settings.group.detailedView': 'Vista detallada',
    'settings.group.appearance': 'Apariencia',
    'settings.group.advanced': 'Avanzado',

    'settings.section.resorts': 'Estaciones',
    'settings.section.cards': 'Tarjetas',
    'settings.section.sorting': 'Orden',
    'settings.section.forecast': 'Pronóstico',
    'settings.section.charts': 'Gráficos',
    'settings.section.map': 'Mapa',
    'settings.section.interface': 'Interfaz',
    'settings.section.performance': 'Rendimiento',

    'settings.choose': 'Elegir…',
    'settings.edit': 'Editar…',
    'settings.apply': 'Aplicar',
    'settings.cancel': 'Cancelar',

    'settings.searchThemes': 'Buscar temas…',
    'settings.searchThemesLabel': 'Buscar temas',
    'settings.noThemesMatch': 'Ningún tema coincide con «{query}»',

    'settings.historyHint': 'los días pasados en lugar del pronóstico, hasta que salgas',

    'settings.viewMode': 'Vista',
    'settings.elevation': 'Cota',
    'settings.temperature.max': 'Máx',
    'settings.temperature.min': 'Mín',
    'settings.temperature.avg': 'Promedio',
    'settings.temperature.median': 'Mediana',

    'settings.sortBy.temperature': 'Temperatura',
    'settings.sortBy.snowfall': 'Nevadas',
    'settings.sortBy.wind': 'Viento',
    'settings.sortOrder.normal': 'Normal',
    'settings.sortOrder.reverse': 'Inverso',

    'settings.customElevation': 'Personalizada…',
    'settings.customElevationValue': 'Personalizada: {elevation}',
    'settings.customElevationInFeet': 'Altitud personalizada en pies',
    'settings.customElevationInMetres': 'Altitud personalizada en metros',
    'settings.savedLocationsOwnHeight': 'Los lugares guardados siempre se pronostican a su propia altitud',

    'settings.chartsShown': 'Gráficos mostrados',
    'settings.charts.one': '{count} gráfico',
    'settings.charts.other': '{count} gráficos',
    'settings.modelStylesHint': 'Colores, negrita y opacidad de las líneas de cada modelo en los gráficos',
    'settings.lockChartsHint': 'sin zoom ni control deslizante de rango',

    'settings.overlays': 'Capas',
    'settings.hillshadeHint': 'siempre activo en 3D',
    'settings.slopeBandsHint': 'Los rangos de inclinación que pinta la coloración Ángulo de pendiente, y sus colores',
    'settings.mapRotation.linear': 'Arrastrar hacia un lado con el botón derecho gira la vista en ese sentido, esté donde esté el puntero',
    'settings.mapRotation.linearReversed': 'Arrastrar hacia un lado con el botón derecho gira la vista en sentido contrario, de modo que las montañas lejanas siguen al puntero, esté donde esté',
    'settings.mapRotation.orbital': 'Arrastrar con el botón derecho gira el mapa como un globo terráqueo, así que en sentidos opuestos por encima y por debajo de su centro',
    'settings.mapTilt.dragUp': 'Arrastrar hacia arriba con el botón derecho inclina la vista hacia el horizonte',
    'settings.mapTilt.dragDown': 'Arrastrar hacia abajo con el botón derecho inclina la vista hacia el horizonte',
    'settings.cursorReadoutHint': 'La altitud, el ángulo de pendiente y la orientación del terreno bajo el ratón, en una esquina de cada mapa; solo donde hay ratón',

    'settings.showUtilityBar': 'Mostrar la barra de herramientas',
};
