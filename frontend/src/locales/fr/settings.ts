import type { settings as en } from '../en/settings';
import type { Translated } from '../../types/i18n';

export const settings: Translated<typeof en> = {
    'settings.title': 'Paramètres',
    'settings.tip': 'Astuce : vous pouvez aussi changer tous ces paramètres rapidement avec la palette de commandes (Échap, Tab ou Ctrl+Maj+P)',
    'settings.groupsLabel': 'Groupes de paramètres',

    'settings.group.general': 'Général',
    'settings.group.mainPage': 'Page principale',
    'settings.group.detailedView': 'Vue détaillée',
    'settings.group.appearance': 'Apparence',
    'settings.group.advanced': 'Avancé',

    'settings.section.resorts': 'Stations',
    'settings.section.cards': 'Cartes',
    'settings.section.sorting': 'Tri',
    'settings.section.forecast': 'Prévision',
    'settings.section.charts': 'Graphiques',
    'settings.section.map': 'Carte',
    'settings.section.interface': 'Interface',
    'settings.section.performance': 'Performances',

    'settings.choose': 'Choisir…',
    'settings.edit': 'Modifier…',
    'settings.apply': 'Appliquer',
    'settings.cancel': 'Annuler',

    'settings.searchThemes': 'Rechercher un thème…',
    'settings.searchThemesLabel': 'Rechercher un thème',
    'settings.noThemesMatch': 'Aucun thème ne correspond à « {query} »',

    'settings.historyHint': 'les jours passés au lieu de la prévision, jusqu’à ce que vous quittiez le site',

    'settings.viewMode': 'Vue',
    'settings.elevation': 'Altitude',
    'settings.temperature.max': 'Max',
    'settings.temperature.min': 'Min',
    'settings.temperature.avg': 'Moyenne',
    'settings.temperature.median': 'Médiane',

    'settings.sortBy.temperature': 'Température',
    'settings.sortBy.snowfall': 'Chutes de neige',
    'settings.sortBy.wind': 'Vent',
    'settings.sortOrder.normal': 'Normal',
    'settings.sortOrder.reverse': 'Inversé',

    'settings.customElevation': 'Personnalisée…',
    'settings.customElevationValue': 'Personnalisée : {elevation}',
    'settings.customElevationInFeet': 'Altitude personnalisée en pieds',
    'settings.customElevationInMetres': 'Altitude personnalisée en mètres',
    'settings.savedLocationsOwnHeight': 'Les prévisions des lieux enregistrés sont toujours faites à leur propre altitude',

    'settings.chartsShown': 'Graphiques affichés',
    'settings.charts.one': '{count} graphique',
    'settings.charts.other': '{count} graphiques',
    'settings.modelStylesHint': 'Couleur, gras et opacité des lignes de chaque modèle dans les graphiques',
    'settings.lockChartsHint': 'ni zoom ni curseur de plage',

    'settings.overlays': 'Calques',
    'settings.hillshadeHint': 'toujours actif en 3D',
    'settings.slopeBandsHint': 'Les plages d’inclinaison que peint la coloration Angle de pente, et leurs couleurs',
    'settings.mapRotation.linear': 'Un glissement latéral avec le bouton droit fait pivoter la vue dans ce sens, où que soit le pointeur',
    'settings.mapRotation.linearReversed': 'Un glissement latéral avec le bouton droit fait pivoter la vue dans l’autre sens, si bien que les montagnes au loin suivent le pointeur, où qu’il soit',
    'settings.mapRotation.orbital': 'Un glissement avec le bouton droit fait tourner la carte comme un globe, donc en sens contraires au-dessus et au-dessous de son centre',
    'settings.mapTilt.dragUp': 'Un glissement vers le haut avec le bouton droit incline la vue vers l’horizon',
    'settings.mapTilt.dragDown': 'Un glissement vers le bas avec le bouton droit incline la vue vers l’horizon',
    'settings.cursorReadoutHint': 'L’altitude, l’angle de pente et l’orientation du terrain sous la souris, dans un coin de chaque carte ; seulement là où il y a une souris',

    'settings.showUtilityBar': 'Afficher la barre d’outils',
};
