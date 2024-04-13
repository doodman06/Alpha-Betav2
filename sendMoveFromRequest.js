const {parentPort, workerData} = require('worker_threads');
const {Dex} = require('pokemon-showdown');
const {calculate, Pokemon, Move, Generations} = require('@smogon/calc');
const pokemon = require('pokemon-showdown/dist/sim/pokemon');
global.BattleManager = require('./battleManager.js');
global.gameState = require('./gameState.js');
global.myPokemon = require('./myPokemon.js');
global.enemyPokemon = require('./enemyPokemon.js');
global.TranspositionTable = require('./transpositionTable.js');
global.generation = Generations.get(workerData.genNumber);

var battleManager = new BattleManager(workerData.data, workerData.genNumber, workerData.useTranspositionTable, workerData.useMoveOrdering, workerData.maxDepth, workerData.deterministic, workerData.heuristic, workerData.logging);
battleManager.gameState = new gameState();
battleManager.gameState.setAll(workerData.gameState.forceSwitch, workerData.gameState.enemyForceSwitch,
   workerData.gameState.myPokemonList, workerData.gameState.enemyPokemonList, workerData.gameState.activeEnemy, workerData.gameState.gen);
var tempList = battleManager.gameState.myPokemonList;
battleManager.gameState.myPokemonList = [];
tempList.forEach(pokemon => {
    var statBoosts = pokemon.statBoosts;
    var pp = pokemon.pp;
    
    pokemon = new myPokemon(pokemon.name, pokemon.hp + '/' + pokemon.maxHP, pokemon.moves, [pokemon.atk, pokemon.def, pokemon.spa, pokemon.spd, pokemon.spe], pokemon.pos);
    pokemon.setStatBoost(statBoosts);
    pokemon.setPPList(pp);
    battleManager.gameState.myPokemonList.push(pokemon);
}
);

var tempList = battleManager.gameState.enemyPokemonList;
battleManager.gameState.enemyPokemonList = [];
tempList.forEach(pokemon => {
    var statBoosts = pokemon.statBoosts;
    pokemon = new enemyPokemon(pokemon.name);
    pokemon.setStatBoost(statBoosts);
    battleManager.gameState.enemyPokemonList.push(pokemon);
}
);

var move = battleManager.chooseMoveFromRequest();

parentPort.postMessage(move);