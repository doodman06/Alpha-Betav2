const {Dex} = require('pokemon-showdown');
const {calculate, Pokemon, Move, Generations} = require('@smogon/calc');

class PokemonManager {
    constructor(jsonData, gen) {
        this.pokemonList = [];
        this.data = jsonData;
        this.enemyList = [];
        this.activeEnemy = null;
        this.gameState = new gameState(this.pokemonList, this.enemyList, this.activeEnemy);

        this.parseData(jsonData);
        this.gen = Generations.get(gen);
    }

    initializeEnemy(enemyList){
        enemyList.forEach(pokemon => {
            this.enemyList.push(new enemyPokemon(pokemon));
        });
        //console.log(this.enemyList);
    }

    parseData(jsonData) {
        jsonData.side.pokemon.forEach(pokemon => {
            this.pokemonList.push(new myPokemon(pokemon.details, pokemon.condition, pokemon.moves, pokemon.stats));
        });
        //console.log(this.pokemonList);
    }
    updateData(jsonData) {
        this.pokemonList = [];
        this.data = jsonData;
        this.parseData(jsonData);
        this.updateGameState();
    }

    updateEnemy(pokemon, newHP) {
        this.enemyList.forEach(enemy => {
            if(enemy.name == pokemon) {
                enemy.hp = parseInt(newHP);
            }
        });
        this.updateGameState();
        this.gameState.printState();
    }
    updateActiveEnemy(pokemon) {
        this.enemyList.forEach(enemy => {
            if(enemy.name == pokemon) {
                this.activeEnemy = enemy.name;
            }
        });
        this.updateGameState();
        this.gameState.printState();

    }



    updateGameState() {
        this.gameState = new gameState(this.pokemonList, this.enemyList, this.activeEnemy);
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
    chooseMove() {
        var currentMoves = [];
        console.log(this.activeEnemy);
        var index = this.alphaBeta(this.gameState, 2, 2, -100000, 100000, false);
        console.log(index);
            


        var randomMoveList = [];
        for (let i = 0; i < 4; i++) {
            randomMoveList.push('|/choose move ' + (i + 1));
        }
        for(let i = 2; i < 7; i++) {
            if(this.pokemonList[i - 1].alive) {
                randomMoveList.push('|/choose switch ' + i);

            }
        }
        //truncate index to bounds
        if(index >= randomMoveList.length) {
            index = randomMoveList.length - 1;
        }
        if(index < 0) {
            index = 0;
        }
        let randomMove = randomMoveList[index];
        randomMove = '|/choose switch Serperior'

        return randomMove;

    }

    forceSwitch() {
        var i = this.alphaBeta(this.gameState, 2, 2, -100000, 100000, true);
        console.log(i);
        i++;
        i++;
        return '|/choose switch ' + i;
    }

    alphaBeta(gameState, initialDepth, depth, alpha, beta, switchBool) {
        if(depth == 0 || gameState.myPokemonList.length == 0 || gameState.enemyPokemonList.length == 0) {
           // console.log("evaluate state");
            //console.log(gameState.evaluateState());
            //console.log(gameState);
           
            return gameState.evaluateState();
        } 
        
        var v = -100000;
        var moves = [];
        var moveScores = [];
        if(!switchBool){
            gameState.myPokemonList[0].moves.forEach(move => {
                moves.push(move);
            });
        }
    
        for(let i = 1; i < gameState.myPokemonList.length; i++) {
            if(gameState.myPokemonList[i].alive && gameState.myPokemonList[i].name != gameState.getMyActive().name && gameState.myPokemonList[i].hp > 0) {
                moves.push('$SWITCH$ ' + i);
            }
        }
        for(let i = 0; i < moves.length; i++) {
            var newGameState = gameState;
            var simGameState = this.simulate(newGameState, moves[i]);
            if(simGameState.isMyActiveAlive()) {
                v = Math.max(v, this.alphaBeta(simGameState, initialDepth, depth - 1, alpha, beta, false));
            } else {
                v = Math.max(v, this.alphaBeta(simGameState, initialDepth, depth - 1, alpha, beta, true));
            }
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
            var maxIndex;
            for(let i = 0; i < moveScores.length; i++) {
                if(moveScores[i] > max) {
                    max = moveScores[i];
                    maxIndex = i;
                }
            }
            return maxIndex;
        }

        return v;
    }
    

    simulate(initialGameState, move) {
        var myPokemon = initialGameState.myPokemonList[0];
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
            if(move.includes('$SWITCH$')) { 
                var learnsetData = Dex.species.getLearnsetData(Dex.toID(enemyPokemon.name));  
                var moveList = [];
                moveList = Object.keys(learnsetData.learnset);
                for(let i = 0; i < moveList.length; i++) {
                    var newGameState = new gameState(initialGameState.myPokemonList, initialGameState.enemyPokemonList, initialGameState.activeEnemy);
                    newGameState.switchMyActiveTo(newGameState.myPokemonList[parseInt(move.split('$SWITCH$ ')[1]) - 1].name);
                    const result = calculate(
                        this.gen,
                        new Pokemon(this.gen, enemyPokemon.name),
                        new Pokemon(this.gen, newGameState.getMyActive().name),
                        new Move(this.gen, moveList[i])
                    )
                    var damage;
                    if(Array.isArray(result.damage)) {
                        damage = result.damage[Math.floor(result.damage.length / 2)];
                    }  else {
                        damage = result.damage;
                    }
                
                    newGameState.updateMyPokemon(newGameState.getMyActive().name, myPokemon.hp - damage);
                    if(newGameState.myPokemonList[0].hp <= 0) {
                        newGameState.myPokemonList[0].alive = false;
                        newGameState.switchMyActive();
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
                    damage = result.damage[Math.floor(result.damage.length / 2)];
                }  else {
                    damage = result.damage;
                }
                var newGameState = new gameState(initialGameState.myPokemonList, initialGameState.enemyPokemonList, initialGameState.activeEnemy);
                //console.log(damage);
                //console.log(myPokemon.hp);
                newGameState.updateMyPokemon(myPokemon.name, myPokemon.hp - damage);
                if(newGameState.myPokemonList[0].hp <= 0) {
                    newGameState.myPokemonList[0].alive = false;
                    newGameState.switchMyActive();
                }
                const result2 = calculate(  
                    this.gen,
                    new Pokemon(this.gen, newGameState.getMyActive().name),
                    new Pokemon(this.gen, enemyPokemon.name),
                    new Move(this.gen, move)
                )
                var damage2;
                if(Array.isArray(result2.damage)) {
                    damage2 = result2.damage[Math.floor(result2.damage.length / 2)];
                }  else {
                    damage2 = result2.damage;
                }
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
        
    };
}

class gameState {
    constructor(myPokemonList, enemyPokemonList, activeEnemy) {
        //need to create new objects withour reference to old ones


        this.myPokemonList = JSON.parse(JSON.stringify(myPokemonList));
        this.enemyPokemonList = JSON.parse(JSON.stringify(enemyPokemonList));
        this.activeEnemy = JSON.parse(JSON.stringify(activeEnemy));

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