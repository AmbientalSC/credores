#!/usr/bin/env node
// Pequeno script para testar lookup de CEP + correspondência com cities_all.json
// Uso: node scripts/cep_lookup.js [CEP]

const path = require('path');
const fs = require('fs');

const cepArg = process.argv[2] || '89212340';
const cep = cepArg.toString().replace(/\D/g, '');

if (cep.length !== 8) {
    console.error('CEP inválido:', cepArg);
    process.exit(1);
}

const citiesPath = path.resolve(__dirname, '..', 'cities_all.json');
const citiesJson = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
const citiesList = citiesJson.results || citiesJson;

const normalize = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

(async () => {
    try {
        const url = `https://viacep.com.br/ws/${cep}/json/`;
        console.log('Consultando ViaCEP:', url);
        const res = await fetch(url);
        const data = await res.json();
        console.log('ViaCEP result:', JSON.stringify(data, null, 2));

        if (data.erro) {
            console.log('CEP não encontrado pelo ViaCEP');
            process.exit(0);
        }

        const cityName = data.localidade || '';
        const uf = data.uf || '';
        console.log('Cidade retornada pelo ViaCEP:', cityName, '-', uf);

        let match = citiesList.find(c => normalize(c.name) === normalize(cityName) && normalize((c.state?.code || c.state?.name || '')) === normalize(uf));
        if (!match) {
            match = citiesList.find(c => normalize(c.name).startsWith(normalize(cityName)) && normalize((c.state?.code || c.state?.name || '')) === normalize(uf));
        }
        if (!match) {
            match = citiesList.find(c => normalize(c.name).includes(normalize(cityName)) && normalize((c.state?.code || c.state?.name || '')) === normalize(uf));
        }

        if (match) {
            console.log('Encontrou correspondência no cities_all.json:');
            console.log('  id:', match.id);
            console.log('  name:', match.name);
            console.log('  state:', match.state && match.state.name, '(', match.state && match.state.code, ')');
        } else {
            console.log('Nenhuma correspondência encontrada em cities_all.json para', cityName, uf);
        }
    } catch (err) {
        console.error('Erro:', err);
        process.exit(1);
    }
})();
