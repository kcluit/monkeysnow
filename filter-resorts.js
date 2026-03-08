const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend/locations.json'), 'utf8'));

// Countries to remove entirely
const removeCountries = ['Croatia', 'Cyprus', 'Hungary', 'Portugal', 'Iceland', 'Rep. of N. Macedonia', 'Kosovo'];

// Keep lists by country (displayName values)
const keepLists = {
  'Austria': [
    'Alpbachtal', 'Axamer Lizum', 'Bad Gastein', 'Bad Hofgastein', 'Bad Kleinkirchheim',
    'Brixen im Thale', 'Dachstein Glacier', 'Damüls', 'Diedamskopf', 'Ehrwald',
    'Ellmau', 'Fieberbrunn', 'Filzmoos', 'Finkenberg', 'Fiss',
    'Flachauwinkl-Kleinarl', 'Fulpmes', 'Gargellen', 'Gaschurn', 'Gerlitzen',
    'Gerlos', 'Going', 'Golm', 'Grossarl-Dorfgastein', 'Grossglockner Resort Kals-Matrei',
    'Heiligenblut', 'Hinterstoder', 'Hintertux', 'Hochfügen', 'Hochjoch-Schruns',
    'Hochkönig', 'Hochwurzen', 'Hochzeiger', 'Hochzillertal-Kaltenbach', 'Hopfgarten',
    'Ifen (Kleinwalsertal)', 'Ischgl', 'Kaprun', 'Katschberg-Aineck', 'Kaunertal',
    'Kirchberg', 'Kitzbühel', 'Königsleiten', 'Kühtai', 'Lech',
    'Leogang', 'Lermoos', 'Lienzer Dolomiten', 'Mallnitz', 'Mayrhofen',
    'Montafon', 'Nassfeld', 'Nauders', 'Niederau', 'Oberau',
    'Obergurgl', 'Obertauern', 'Oetz', 'Patscherkofel', 'Rauris',
    'Saalbach Hinterglemm', 'Scheffau', 'Schladming', 'Schmittenhöhe', 'Seefeld',
    'Serfaus', 'Söll', 'Sölden', 'St Gallenkirch', 'St Johann in Tirol',
    'St. Anton am Arlberg', 'Stubai Glacier', 'Stuben am Arlberg', 'Stuhleck', 'Tauplitz',
    'Tschagguns', 'Turracher Höhe', 'Wagrain', 'Walmendingerhorn (Kleinwalsertal)', 'Werfenweng',
    'Westendorf', 'Zauchensee', 'Zell am See', 'Zell am Ziller', 'Zürs',
  ],
  'France': [
    "Alpe d'Huez", 'Argentiere', 'Arêches-Beaufort', 'Auron', 'Aussois',
    'Avoriaz', 'Besse Super Besse', 'Bonneval sur Arc', 'Brévent-Flégère', 'Cauterets',
    'Chamonix', 'Champagny', 'Chamrousse', 'Chatel', 'Combloux',
    'Courchevel', 'Dévoluy', 'Flaine', 'Font Romeu', 'Gourette',
    'Gérardmer', 'Isola 2000', 'La Clusaz', 'La Norma', 'La Plagne',
    'La Rosière', 'La Tania', 'Le Grand Bornand', 'Le Lioran', 'Le Mont-Dore',
    'Le Tour', 'Les 7 Laux', 'Les Angles', 'Les Arcs', 'Les Carroz',
    'Les Coches', 'Les Contamines', 'Les Deux Alpes', 'Les Gets', 'Les Houches',
    'Les Karellis', 'Les Menuires', 'Les Orres', 'Les Saisies', 'Luz Ardiden',
    'Megeve', 'Montalbert', 'Montchavin', 'Morillon', 'Morzine',
    'Mottaret', 'Méribel', 'Métabief', 'Notre Dame de Bellecombe', 'Orcieres',
    'Peisey/Vallandry', 'Peyragudes', 'Piau Engaly', 'Pralognan La Vanoise', 'Praz Sur Arly',
    'Puy St Vincent', 'Risoul', 'Sainte Foy', 'Samoens', 'Serre Chevalier',
    'St Martin de Belleville', 'Superbagneres', 'Tignes', 'Val Cenis', 'Val Thorens',
    "Val d'Allos 1500 Le Seignus", 'Valberg', 'Valfrejus', 'Valloire', 'Valmeinier',
    'Valmorel', 'Vars', 'Vaujany', 'Villard-de-Lans', 'Saint Lary Soulan',
    'Saint François Longchamp', 'Les Rousses', 'Porté Puymorens', 'Oz en Oisans',
  ],
  'Switzerland': [
    'Adelboden', 'Andermatt', 'Anzère', 'Arosa', 'Bellwald / Goms',
    'Champéry', 'Chandolin', 'Crans Montana', 'Corvatsch-Furtschellas', 'Corviglia-Marguns',
    'Davos', 'Diavolezza-Lagalb', 'Disentis', 'Engelberg', 'Evolène',
    'Flumserberg', 'Grimentz', 'Grindelwald', 'Grächen', 'Gstaad',
    'Gstaad Glacier 3000', 'Haute Nendaz', 'Hoch-Ybrig', 'Kandersteg', 'Klosters',
    'Lauterbrunnen', 'Lenk', 'Les Diablerets', 'Leysin', 'Melchsee-Frutt',
    'Morgins', 'Mürren', 'Nendaz', 'Ovronnaz', 'Pontresina',
    'Saas Almagell', 'Saas Fee', 'Saas Grund', 'Samnaun', 'Savognin',
    'Scuol/Engadin', 'Sedrun Oberalp', 'Sils/Engadin', 'Silvaplana/Engadin', 'Sörenberg',
    'Splügen', 'St Moritz', 'St-Luc', 'Stoos', 'Thyon-Printze',
    'Unterbäch', 'Vals', 'Verbier', 'Vercorin', 'Villars',
    'Wengen', 'Zermatt', 'Zinal', 'La Tzoumaz', 'Celerina/Engadin',
    'Braunwald', 'Brigels-Waltensburg-Andiast', 'Airolo', 'Bosco Gurin', 'Champex-Lac',
    'Interlaken', 'Jaun', 'Les Paccots', 'Schwarzsee', 'Zuoz/Engadin',
    'Einsiedeln',
  ],
  'Italy': [
    'Abetone', 'Alagna', 'Alba di Canazei', 'Alleghe', 'Alpe Cermis-Cavalese',
    'Andalo', 'Aprica', 'Arabba', 'Bardonecchia', 'Bormio',
    'Bruneck-Olang-St Vigil', 'Campitello', 'Campo Imperatore', 'Canazei', 'Castelrotto/Kastelruth',
    'Champoluc', 'Cimone', 'Civetta', 'Cogne', 'Cortina',
    'Courmayeur', 'Dobbiaco/Toblach', 'Falcade', 'Folgaria', 'Foppolo',
    'Formazza', 'Forni di Sopra', 'Gitschberg-Jochtal', 'Gressoney-Saint-Jean', 'Klausberg',
    'La Thuile', 'Limone Piemonte', 'Livigno', 'Macugnaga', 'Madesimo',
    'Madonna di Campiglio', 'Meran 2000', 'Moena', 'Montecampione', 'Mottarone',
    'Mount Etna Linguaglossa', 'Nevegal', 'Nova Levante Welschnofen', 'Oropa', 'Ortisei',
    'Ovindoli', 'Passo Dello Stelvio Stilfserjoch', 'Passo Rolle', 'Passo Stelvio', 'Passo Tonale',
    'Pejo', 'Pera di Fassa', 'Piancavallo', 'Pila', 'Pinzolo',
    'Pozza di Fassa', 'Racines', 'Ravascletto', 'Roccaraso', 'San Candido/Innichen',
    'San Martino Di Castrozza', 'San Vigilio Di Marebbe', 'Santa Cristina', 'Sappada', 'Scopello Alpe di Mera',
    'Sella Nevea', 'Selva di Cadore', 'Sestrière', 'Ski Center Latemar', 'Speikboden',
    'Sulden', 'Tarvisio', 'Terminillo', 'Tesero Pampeago', 'Torgnon',
    'Trafoi', 'Valdaora/Olang', 'Valli Di Tures E Aurina Ahrntal', 'Vigo di Fassa', 'Camigliatello Silano',
    'Gambarie in Aspromonte', 'La Magdeleine', 'Ladurns', 'Lavarone', 'Levico Terme Panarotta',
    'Maseben', 'Misurina', 'Molveno', 'Monte Bondone', 'Nova Pontente-Deutschnofen',
    'Passo Lavaze', 'Pescasseroli', 'Pescocostanzo', 'Pfelders', 'Predazzo',
    'Prali', 'Reinswald', 'Rein in Taufers', 'Rhemes-Notre-Dame', 'San Domenico',
    'San Vito Di Cadore', 'Santo Stefano Di Cadore', 'Sarentino', 'Temù', 'Valdidentro',
    'Valgrisenche', 'Valles', 'Vipiteno', 'Antagnod', 'Asiago',
    'Brusson', 'Campitello Matese', 'Champorcher', 'Chiesa', 'Colle Isarco Gossensass',
    'Entracque', 'Haider Alm', 'Laces', 'Predaia', 'Rio di Pusteria Muhlbach',
    'Alpe Devero', 'Auronzo Di Cadore', 'Brentonico', 'Caspoggio', 'Comelico Superiore',
    'Crissolo', 'Fondo', 'Pieve Di Cadore',
  ],
  'Germany': [
    'Arber', 'Aschau im Chiemgau', 'Balderschwang', 'Bolsterlang', 'Feldberg',
    'Fichtelberg', 'Garmisch-Classic', 'Grainau', 'Halblech', 'Immenstadt',
    'Jenner', 'Jungholz', 'Lenggries', 'Muggenbrunn', 'Nesselwang',
    'Oberaudorf', 'Oberhof', 'Oberjoch', 'Obermaiselstein', 'Obersalzberg',
    'Oberstaufen', 'Oberstdorf-Nebelhorn', 'Oberstdorf-Söllereck', 'Oberwiesenthal', 'Ochsenkopf',
    'Ofterschwang-Gunzesried', 'Pfronten', 'Reit im Winkl', 'Schliersee', 'Schluchsee',
    'Schmallenberg-Schanze', 'Schwangau', 'Tegernsee', 'Todtnauberg', 'Wasserkuppe',
    'Willingen-Upland', 'Winterberg', 'Inzell-Kessel Lifte', 'Maiergschwendt Ruhpolding',
    'Unternberg Ruhpolding', 'Sachrang', 'Scheidegg', 'Weiler-Simmerberg', 'Wertach',
    'Oy-Mittelberg', 'Alpsee Bergwelt', 'Kreuth/Hirschberg',
  ],
  'Norway': [
    'Gaustablikk', 'Geilo', 'Hafjell', 'Hemsedal', 'Hovden',
    'Kvitfjell Alpine Centre', 'Lillehammer', 'Myrkdalen', 'Målselv-Bardufoss', 'Narvik',
    'Norefjell', 'Oppdal', 'Røldal', 'Tryvann', 'Voss',
  ],
  'Sweden': [
    'Åre', 'Björkliden', 'Funäsdalen', 'Idre Fjäll', 'Kittelfjall',
    'Kläppen', 'Lofsdalen', 'Riksgränsen', 'Romme Alpin', 'Sälen',
    'Tärnaby', 'Vemdalen',
  ],
  'Spain': [
    'Astún', 'Boi Taull', 'Candanchu', 'Cerler', 'Formigal',
    'La Molina', 'Masella', 'Panticosa', 'Port Del Comte', 'Sierra Nevada',
    'Vall de Núria', 'Vallter 2000',
  ],
  'Czech Republic': [
    'Černý Důl', 'Dolní Morava', 'Harrachov', 'Ještěd', 'Klínovec',
    'Kouty nad Desnou', 'Malá Úpa', 'Pec pod Sněžkou', 'Ramzová', 'Špindlerův Mlýn',
  ],
  'Slovakia': [
    'Donovaly', 'Krpáčovo', 'Kubinska Hola', 'Skalka pri Kremnici', 'Štrbské Pleso',
    'Tále', 'Veľká Rača - Oščadnica', 'Vratna Dolina',
  ],
  'Andorra': [
    'Arinsal', 'Grandvalira El Tarter', 'Grandvalira-Canillo', 'Grandvalira-Encamp',
    'Grandvalira-Grau Roig', 'Grandvalira-Pas de la Casa', 'Ordino-Arcalís', 'Pal',
  ],
  'Slovenia': [
    'Bled', 'Bovec - Kanin', 'Cerkno', 'Kranjska Gora', 'Krvavec',
    'Mariborsko Pohorje', 'Rogla', 'Vogel',
  ],
  'Romania': [
    'Azuga', 'Borşa', 'Buşteni', 'Parang', 'Poiana Brasov',
    'Predeal', 'Sinaia', 'Straja',
  ],
  'Bulgaria': [
    'Bansko', 'Borovets', 'Chepelare', 'Pamporovo', 'Vitosha',
  ],
  'Poland': [
    'Czarna Góra', 'Pilsko', 'Szczyrk', 'Szklarska Poręba', 'Szymoszkowa',
    'Zakopane', 'Zieleniec', 'Świeradów Zdrój',
  ],
  'Finland': [
    'Levi', 'Ruka', 'Saariselkä', 'Salla Ski Resort', 'Ylläs',
  ],
  'United Kingdom': [
    'Cairngorm', 'Glenshee', 'Nevis Range', 'Snowdon', 'The Lecht',
  ],
  'Bosnia Herzegovina': [
    'Bjelašnica', 'Jahorina', 'Vlašić',
  ],
  'Russia': [
    'Arkhyz', 'Dombai', 'Gorny Vozdukh', 'Krasnaya Polyana Resort', 'Mount Elbrus', 'Sheregesh',
  ],
  'Ukraine': [
    'Bukovel', 'Drahobrat', 'Pylypets', 'Slavsko',
  ],
  'Serbia': [
    'Kopaonik', 'Zlatibor',
  ],
  'Liechtenstein': [
    'Malbun',
  ],
};

// Also keep Greece and Ireland as-is since they're not mentioned in the plan
// Actually, let's check: the plan doesn't mention Greece or Ireland
// Greece has 17 resorts, Ireland has 0. Since not in the plan, let's keep as-is?
// Actually the plan says to keep only the listed countries. Let me check what countries
// are NOT in the removeCountries list and NOT in the keepLists.
const europe = data['Europe'];
const allCountries = Object.keys(europe);
const handledCountries = [...removeCountries, ...Object.keys(keepLists)];
const unhandled = allCountries.filter(c => !handledCountries.includes(c));
if (unhandled.length > 0) {
  console.log('WARNING: Unhandled countries:', unhandled);
  // The plan doesn't mention Greece or Ireland - Greece has resorts, Ireland has none
  // Let's remove them since they're not in the KEEP list
}

// Step 1: Remove entire countries
for (const country of removeCountries) {
  if (europe[country]) {
    const count = Object.keys(europe[country]).length;
    console.log(`Removing country: ${country} (${count} resorts)`);
    delete europe[country];
  }
}

// Remove unhandled countries too (Greece has small resorts, Ireland has 0)
for (const country of unhandled) {
  const count = Object.keys(europe[country]).length;
  console.log(`Removing unhandled country: ${country} (${count} resorts)`);
  delete europe[country];
}

// Step 2: Filter resorts in remaining countries
let totalBefore = 0;
let totalAfter = 0;
let totalRemoved = 0;

for (const [country, keepNames] of Object.entries(keepLists)) {
  if (!europe[country]) {
    console.log(`WARNING: Country ${country} not found in data!`);
    continue;
  }

  const keepSet = new Set(keepNames);
  const resortKeys = Object.keys(europe[country]);
  totalBefore += resortKeys.length;

  let kept = 0;
  let removed = 0;
  const notFound = new Set(keepNames);

  for (const key of resortKeys) {
    const displayName = europe[country][key].displayName;
    if (keepSet.has(displayName)) {
      kept++;
      notFound.delete(displayName);
    } else {
      delete europe[country][key];
      removed++;
    }
  }

  totalAfter += kept;
  totalRemoved += removed;

  console.log(`${country}: ${resortKeys.length} -> ${kept} (removed ${removed})`);
  if (notFound.size > 0) {
    console.log(`  NOT FOUND in data: ${[...notFound].join(', ')}`);
  }
}

console.log(`\nTotal: ${totalBefore} -> ${totalAfter} (removed ${totalRemoved})`);
console.log(`Countries remaining: ${Object.keys(europe).length}`);

// Write the result
fs.writeFileSync(path.join(__dirname, 'backend/locations.json'), JSON.stringify(data, null, 4) + '\n');
console.log('\nWritten to backend/locations.json');
