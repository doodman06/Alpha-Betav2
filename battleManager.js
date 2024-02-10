const {Dex} = require('pokemon-showdown');
const {calculate, Pokemon, Move, Generations} = require('@smogon/calc');

class PokemonManager {
    /**
     * Initializes the Pokemon Manager and game state
     * @param {JSON} jsonData  JSON data received from the server
     * @param {number} gen The Generation of Pokemon of the current battle
     */
    constructor(jsonData, gen) {
        this.pokemonList = [];
        this.pp  = new ppTracker();
        this.data = jsonData;
        this.enemyList = [];
        this.activeEnemy = null;
        this.gameState = new gameState(this.pokemonList, this.enemyList, this.activeEnemy, this.pp);

        this.parseData(jsonData);
        this.gen = Generations.get(gen);
    }
    /**
     * Initializes the enemy pokemon list
     * @param {string[]} enemyList List of enemy pokemon
     */
    initializeEnemy(enemyList){
        enemyList.forEach(pokemon => {
            this.enemyList.push(new enemyPokemon(pokemon));
        });
        //console.log(this.enemyList);
    }
    /**
     * Parses the JSON data received from the server
     * @param {JSON} jsonData JSON Data received from the server
     */
    parseData(jsonData) {
        jsonData.side.pokemon.forEach(pokemon => {
            this.pokemonList.push(new myPokemon(pokemon.details, pokemon.condition, pokemon.moves, pokemon.stats));
        });
        this.pp = new ppTracker();
        if('active' in jsonData) {
            console.log(jsonData.active[0])
            jsonData.active[0].moves.forEach( moves => {
                this.pp.addMove(moves.id, moves.pp);
            });
        }
        //console.log(this.pokemonList);
    }
    /**
     * Updates the game state with new data
     * @param {JSON} jsonData JSON Data received from the server
     */
    updateData(jsonData) {
        this.pokemonList = [];
        this.data = jsonData;
        this.parseData(jsonData);
        this.updateGameState();
    }

    /**
     * Updates the HP of the enemy pokemon
     * @param {string} pokemon Name of the enemy pokemon
     * @param {int} newHP New HP of the enemy pokemon
     */
    updateEnemy(pokemon, newHP) {
        this.enemyList.forEach(enemy => {
            if(enemy.name == pokemon) {
                enemy.hp = parseInt(newHP);
            }
        });
        this.updateGameState();
        this.gameState.printState();
    }
    /**
     * Switches the active enemy pokemon
     * @param {string} pokemon Name of the new active enemy pokemon
     */
    updateActiveEnemy(pokemon) {
        this.enemyList.forEach(enemy => {
            if(enemy.name == pokemon) {
                this.activeEnemy = enemy.name;
            }
        });
        this.updateGameState();
        this.gameState.printState();

    }

    /**
     * Updates the stat boost of the enemy pokemon
     * @param {string} pokemon Name of the enemy pokemon
     * @param {string} stat Stat to be updated
     * @param {int} newBoost Number of boost stages to be added
     */
    updateEnemyBoost(pokemon, stat, newBoost) {
        this.enemyList.forEach(enemy => {
            if(enemy.name == pokemon) {
                enemy.addStatBoost(stat, parseInt(newBoost));
                console.log(enemy.statBoosts[stat]);
            }
        });

        this.updateGameState();
    }



    /**
     * Updates the game state with the currentnly stored data
     */
    updateGameState() {
        this.gameState = new gameState(this.pokemonList, this.enemyList, this.activeEnemy, this.pp);
    }
    chooseRandomMove() {
        //if in a teampreview use default loudout
        if(this.data.teamPreview) {
            return '|/choose team 123456';
        }


        //console.log(this.data);
        //if no active pokemon, switch
        if(!this.data.active) {
            console.log("no active pokemon");
            return this.forceSwitch();
        }

    
    }
    /**
     * Selects the move to be used
     * @returns {string} move to be used
     */
    chooseMove() {
        console.log(this.activeEnemy);
        var bestMove = this.alphaBeta(this.gameState, 2, 2, -100000, 100000, false);
        console.log(bestMove);

        return bestMove;

    }

    /**
     * Selects the Pokemon to switch to when a switch is mandatory
     * @returns {string} move to be used 
     */
    forceSwitch() {
        this.gameState.setForceSwitch(true);

        var bestMove = this.alphaBeta(this.gameState, 2, 2, -100000, 100000, this.gameState.isForceSwitch());
        console.log(bestMove);
        
        return bestMove;
    }

    alphaBeta(gameState, initialDepth, depth, alpha, beta) {
        if(depth == 0 || gameState.myPokemonList.length == 0 || gameState.enemyPokemonList.length == 0) {
           // console.log("evaluate state");
            //console.log(gameState.evaluateState());
            //console.log(gameState);
           
            return gameState.evaluateState();
        } 
        
        var v = -100000;
        var moves = [];
        var moveScores = [];
        if(!gameState.isForceSwitch()) {
            gameState.myPokemonList[0].moves.forEach(move => {
                //add the move as an option if there is enough pp
                if(gameState.isMoveUsable(move)) {
                    console.log(move + " is added ")
                    moves.push('|/choose move ' + move);
                }
            });
        }
    
        for(let i = 1; i < gameState.myPokemonList.length; i++) {
            if(gameState.myPokemonList[i].alive && gameState.myPokemonList[i].name != gameState.getMyActive().name && gameState.myPokemonList[i].hp > 0 ) {
                moves.push('|/choose switch ' + gameState.myPokemonList[i].name);
            }
        }
        for(let i = 0; i < moves.length; i++) {
            var newGameState = gameState;
            var simGameState = this.simulate(newGameState, moves[i]);
            v = Math.max(v, this.alphaBeta(simGameState, initialDepth, depth - 1, alpha, beta));
            if(depth == initialDepth) {
                moveScores.push(v);
            }
            alpha = Math.max(alpha, v);
            if(beta <= alpha) {
                break;
            }
        }
        if(depth == initialDepth) {
            var max = -100000;
            var bestMove;
            for(let i = 0; i < moveScores.length; i++) {
                if(moveScores[i] > max) {
                    max = moveScores[i];
                    bestMove = moves[i];
                }
            }
            return bestMove;
        }

        return v;
    }
    

    simulate(initialGameState, move) {
        var myPokemon = initialGameState.myPokemonList[0];
        var moveName = move.split(' ')[2];
        var enemyPokemon;
        var gameStates = [];
        for(let i = 0; i < initialGameState.enemyPokemonList.length; i++) {
            if(initialGameState.enemyPokemonList[i].name == initialGameState.activeEnemy) {
                enemyPokemon = initialGameState.enemyPokemonList[i];
            }
        }
        Dex.species.get(enemyPokemon.name).baseStats.spd > myPokemon.spd
        
        if(true) { 
            //we go first
            if(move.includes('|/choose switch')) { 
                var learnsetData = Dex.species.getLearnsetData(Dex.toID(enemyPokemon.name));  
                var moveList = [];
                moveList = Object.keys(learnsetData.learnset);
                for(let i = 0; i < moveList.length; i++) {
                    var newGameState = new gameState(initialGameState.myPokemonList, initialGameState.enemyPokemonList, initialGameState.activeEnemy, initialGameState.pp);
                    newGameState.switchMyActiveTo(moveName);
                    const result = calculate(
                        this.gen,
                        new Pokemon(this.gen, enemyPokemon.name, {
                            boosts: enemyPokemon.statBoosts
                        }),
                        new Pokemon(this.gen, newGameState.getMyActive().name),
                        new Move(this.gen, moveList[i])
                    )
                    var damage;
                    if(Array.isArray(result.damage)) {
                        damage = result.damage[result.damage.length - 1];
                    }  else {
                        damage = result.damage;
                    }
                
                    newGameState.updateMyPokemon(newGameState.getMyActive().name, myPokemon.hp - damage);
                    if(newGameState.myPokemonList[0].hp <= 0) {
                        newGameState.myPokemonList[0].alive = false;
                        newGameState.setForceSwitch(true);
                    }  
                    gameStates.push(newGameState);
                }

            } else {

            var learnsetData = Dex.species.getLearnsetData(Dex.toID(enemyPokemon.name));  
            var moveList = [];
            moveList = Object.keys(learnsetData.learnset);
            for(let i = 0; i < moveList.length; i++) {
                const result = calculate(
                    this.gen,
                    new Pokemon(this.gen, enemyPokemon.name),
                    new Pokemon(this.gen, myPokemon.name),
                    new Move(this.gen, moveList[i])
                )
                var damage;
                if(Array.isArray(result.damage)) {
                    damage = result.damage[result.damage.length - 1];
                }  else {
                    damage = result.damage;
                }
                var newGameState = new gameState(initialGameState.myPokemonList, initialGameState.enemyPokemonList, initialGameState.activeEnemy, initialGameState.pp);
                //console.log(damage);
                //console.log(myPokemon.hp);
                newGameState.updateMyPokemon(myPokemon.name, myPokemon.hp - damage);
                if(newGameState.myPokemonList[0].hp <= 0) {
                    newGameState.myPokemonList[0].alive = false;
                    newGameState.setForceSwitch(true);
                }
                const result2 = calculate(  
                    this.gen,
                    new Pokemon(this.gen, newGameState.getMyActive().name),
                    new Pokemon(this.gen, enemyPokemon.name),
                    new Move(this.gen, moveName)
                )
                var damage2;
                if(Array.isArray(result2.damage)) {
                    damage2 = result2.damage[0];
                }  else {
                    damage2 = result2.damage;
                }
                newGameState.decrementPP(moveName);
                newGameState.updateEnemy(enemyPokemon.name, enemyPokemon.hp - (damage2 / Dex.species.get(enemyPokemon.name).baseStats.hp));
                if(newGameState.enemyPokemonList[0].hp <= 0) {
                    newGameState.enemyPokemonList[0].alive = false;
                    newGameState.switchEnemyActive();
                }   
                gameStates.push(newGameState);
            }
        }
        }
        
        //return gameState with lowest score
        var min = 100000;   
        var minState;
        gameStates.forEach(state => {
            if(state.evaluateState() < min) {
                min = state.evaluateState();
                minState = state;
            }
        });
        if(!minState) {
            return initialGameState;
        }
        return minState;

    
        
    

    }
    
}

class myPokemon {

    constructor(name, condition, moveList, statsList) {
        let namespl = name.split(',');
        this.name = namespl[0];
        this.types = Dex.species.get(this.name).types;
        var spl = condition.split('/');
        var maxHP = parseInt(spl[1]);
        var currenthp = parseInt(spl[0]);
        this.atk = statsList.atk;
        this.def = statsList.def;
        this.spa = statsList.spa;
        this.spd = statsList.spd;
        this.spe = statsList.spe;
        this.maxHP = maxHP;
        this.hp = currenthp;
        this.moves = moveList;
        if(!condition){
            this.alive = false;
        } else {
            this.alive = true;
        }
        if(this.hp == 0){
            this.alive = false;
        }
    };
};

class enemyPokemon {
    constructor(name) {
        let namespl = name.split(',');
        this.name = namespl[0];
        this.types = Dex.species.get(this.name).types;
        this.maxHP = 100;
        this.hp = 100;
        this.statBoosts = {atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
        
    };

    addStatBoost(stat, boost) {
        this.statBoosts[stat] += boost;
        if(this.statBoosts[stat] > 6) {
            this.statBoosts[stat] = 6;
        }
        if(this.statBoosts[stat] < -6) {
            this.statBoosts[stat] = -6;
        }
    }
}
class ppTracker {
    constructor() {
        this.moves = [];
        this.Mypp = [];
    }

    addMove(move, pp) {
        this.moves.push(move);
        this.Mypp.push(pp);
    }
    getPP(move) {
        console.log("Now")
        console.log(this.moves);
        for(let i = 0; i < this.moves.length; i++) {
            if(this.moves[i] == move) {
                return this.Mypp[i];
            }
        }
        return 10;
    }
    decrementPP(move) {
        for(let i = 0; i < this.moves.length; i++) {
            if(this.moves[i] == move) {
                this.Mypp[i] = this.Mypp[i] - 1;
            }
        }
    }
}

class gameState {
    constructor(myPokemonList, enemyPokemonList, activeEnemy, pp) {
        //need to create new objects withour reference to old ones
        this.forceSwitch = false;


        this.myPokemonList = JSON.parse(JSON.stringify(myPokemonList));
        this.enemyPokemonList = JSON.parse(JSON.stringify(enemyPokemonList));
        this.activeEnemy = JSON.parse(JSON.stringify(activeEnemy));
        this.pp = new ppTracker();
        this.pp.moves = JSON.parse(JSON.stringify(pp.moves));
        this.pp.Mypp = JSON.parse(JSON.stringify(pp.Mypp));

    }

    setForceSwitch(bool) {
        this.forceSwitch = bool;
    }

    isForceSwitch() {
        return this.forceSwitch;
    }

    decrementPP(move) {
        this.pp.decrementPP(move);
    }

    isMoveUsable(move) {
        console.log(this.pp)
        if(this.pp.getPP(move) > 0) {
            console.log("move usable");
            return true;
        } else {
            console.log("move not usable");
            return false;
        }
    }

    printState() {  
        console.log("My Pokemon");
        this.myPokemonList.forEach(pokemon => {
            console.log(pokemon.name + " " + pokemon.hp + "/" + pokemon.maxHP);
        });
        console.log("Enemy Pokemon");
        this.enemyPokemonList.forEach(pokemon => {
            console.log(pokemon.name + " " + pokemon.hp + "/" + pokemon.maxHP);
        });
        console.log("Active Enemy: " + this.activeEnemy.name);
    }

    evaluateState() {
        var myScore = 0;
        var enemyScore = 0;
        this.myPokemonList.forEach(pokemon => {
            if(pokemon.hp <= 0) {
                myScore += 0;
            } else {
                myScore += (pokemon.hp / pokemon.maxHP) * 100
            }
        });
        this.enemyPokemonList.forEach(pokemon => {
            if(pokemon.hp <= 0) {
                enemyScore += 0;

            } else {
                enemyScore += pokemon.hp ;
            }
        });
        return myScore - enemyScore;
    }

    updateEnemy(pokemon, newHP) {
        this.enemyPokemonList.forEach(enemy => {
            if(enemy.name == pokemon) {
                enemy.hp = parseInt(newHP);
            }
        });
    }

    switchMyActive() {
        var newActive;
        newActive = this.myPokemonList.shift();
        this.myPokemonList.push(newActive);
    }

    switchMyActiveTo(pokemon) {
        var newActive;
        this.myPokemonList.forEach(myPokemon => {
            if(myPokemon.name == pokemon) {
                newActive = myPokemon;
            }
        });
        var index = this.myPokemonList.indexOf(newActive);
        this.myPokemonList.splice(index, 1);
        this.myPokemonList.unshift(newActive);
    }

    switchEnemyActiveTo(pokemon) {
        this.activeEnemy = pokemon;

    }

    switchEnemyActive() {
        var newActive;
        newActive = this.enemyPokemonList.shift();
        this.enemyPokemonList.push(newActive);
    }

    updateActiveEnemy(pokemon) {
        this.enemyPokemonList.forEach(enemy => {
            if(enemy.name == pokemon) {
                this.activeEnemy = enemy.name;
            }
        });
    }
    getMyActive() {
        return this.myPokemonList[0];
    }
    isMyActiveAlive() {
        if(this.myPokemonList[0].hp > 0) {
            return true;
        }
    }




    updateMyPokemon(pokemon, newHP) {
        this.myPokemonList.forEach(myPokemon => {
            if(myPokemon.name == pokemon) {
                myPokemon.hp = parseInt(newHP);
            }
        });
    }
}


module.exports = PokemonManager;