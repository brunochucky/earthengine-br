// Plota a disparidade mínima e máxima de temperatura nos estados brasileiros

// Importa os limites dos estados do Brasil do conjunto de dados FAO GAUL
var estados = ee.FeatureCollection('FAO/GAUL/2015/level1')
    .filter(ee.Filter.eq('ADM0_NAME', 'Brazil'));

// Define variáveis de intervalo de datas para clareza
var dataInicio = '2014-01-01';
var dataFim = '2024-12-31';
var intervaloData = dataInicio.slice(0, 4) + '-' + dataFim.slice(0, 4); // Cria "2000-2020"

// Importa o conjunto de dados TerraClimate para dados de temperatura
var dadosClimaticos = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
    .filterDate(dataInicio, dataFim)
    .select(['tmmn', 'tmmx'])
    .map(function (imagem) {
        return imagem
            .multiply(0.1) // Aplica fator de escala para converter para Celsius
            .copyProperties(imagem, ['system:time_start']);
    });

// Calcula as temperaturas médias anuais
var mediaAnual = dadosClimaticos.mean();

// Calcula a temperatura média máxima e mínima por estado
estados = mediaAnual.reduceRegions({
    collection: estados,
    reducer: ee.Reducer.mean(),
    scale: 50000  // Escala de 50km para agregação
}).filter(ee.Filter.notNull(['tmmx', 'tmmn']));

// Calcula a diferença de temperatura por estado
estados = estados.map(function (estado) {
    var dif = estado.getNumber('tmmx').subtract(estado.getNumber('tmmn'));
    return estado.set('tdif', dif);
}).filter(ee.Filter.notNull(['tdif']));

// Obtém os estados com a maior disparidade de temperatura
var maiorDif = estados.limit(6, 'tdif', false);

// Estilo do gráfico
var cor = { high: 'ff0000', low: '0000ff' };

// Gráfico de comparação de temperatura com intervalo de tempo
var graficoMaiorDif = ui.Chart.feature.byFeature(maiorDif, 'ADM1_NAME', ['tmmx', 'tmmn'])
    .setChartType('LineChart')
    .setOptions({
        title: 'Estados Brasileiros com Maior Disparidade de Temperatura (' + intervaloData + ')',
        vAxis: { title: 'Temperatura (°C)' },
        lineWidth: 1,
        pointSize: 4,
        series: { 0: { color: cor.high }, 1: { color: cor.low } }
    });

// Gráfico de dispersão das disparidades de temperatura
var temperaturasIndividuais = function (rotulo) {
    return estados.map(function (feature) {
        return feature.set({ temp: feature.get(rotulo), series: rotulo });
    });
};

var altas = temperaturasIndividuais('tmmx');
var baixas = temperaturasIndividuais('tmmn');

print(graficoMaiorDif);

// Visualização do Mapa
var visualizacaoDisparidade = {
    min: estados.aggregate_min('tdif').getInfo(),
    max: estados.aggregate_max('tdif').getInfo(),
    palette: ['blue', 'yellow', 'red']
};

var imagemDisparidade = estados.map(function (feature) {
    return feature.set('tdif', feature.getNumber('tdif'))
}).reduceToImage({
    properties: ['tdif'],
    reducer: ee.Reducer.first()
});

Map.addLayer(imagemDisparidade, visualizacaoDisparidade, 'Disparidade de Temperatura (' + intervaloData + ')');

// Cria um painel de legenda.
var legenda = ui.Panel({
    style: {
        position: 'bottom-right',
        padding: '8px 15px'
    }
});

// Cria o título da legenda.
var tituloLegenda = ui.Label({
    value: 'Disparidade de Temperatura (°C)',
    style: { fontWeight: 'bold', fontSize: '12px', margin: '0 0 4px 0', padding: '0' }
});

// Adiciona o título ao painel da legenda.
legenda.add(tituloLegenda);

// Cria a paleta de cores.
var paleta = visualizacaoDisparidade.palette;
var min = visualizacaoDisparidade.min;
var max = visualizacaoDisparidade.max;

// Cria os rótulos da legenda.
var rotulosLegenda = [];
for (var i = 0; i < paleta.length; i++) {
    rotulosLegenda.push(ui.Label({ value: '', style: { backgroundColor: paleta[i], padding: '8px', margin: '0 0 4px 0' } }));
}

// Cria os valores da legenda.
var valoresLegenda = [min, (min + max) / 2, max];
var rotulosValoresLegenda = [];
for (var i = 0; i < valoresLegenda.length; i++) {
    rotulosValoresLegenda.push(ui.Label({ value: valoresLegenda[i].toFixed(2), style: { margin: '0 0 4px 6px' } }));
}

// Adiciona os rótulos e valores da legenda ao painel da legenda.
for (var i = 0; i < rotulosLegenda.length; i++) {
    legenda.add(ui.Panel({
        widgets: [rotulosLegenda[i], rotulosValoresLegenda[i]],
        layout: ui.Panel.Layout.Flow('horizontal')
    }));
}

// Adiciona a legenda ao mapa.
Map.add(legenda);