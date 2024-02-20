const {Dex} = require('pokemon-showdown');
const {calculate, Pokemon, Move, Generations} = require('@smogon/calc');
const pokemon = require('pokemon-showdown/dist/sim/pokemon');

/**
 * Manages the state of the battle and the AI
 */

//declare gen as a global variable
var generation;

class BattleManager {
    /**
     * Initializes the Pokemon Manager and game state
     * @param {JSON} jsonData  JSON data received from the server
     * @param {number} gen The Generation of Pokemon of the current battle
     */
    constructor(jsonData, gen) {
        this.data = jsonData;
        this.gameState = new gameState();
        this.parseData(jsonData);
        generation = Generations.get(gen);
        this.gen = generation;
        
    }
    /**
     * Initializes the enemy pokemon list
     * @param {string[]} enemyList List of enemy pokemon
     */
    initializeEnemy(enemyList){
        enemyList.forEach(pokemon => {
            this.gameState.addEnemyPokemon(new enemyPokemon(pokemon));
        });
    }
    /**
     * Parses the JSON data received from the server
     * @param {JSON} jsonData JSON Data received from the server
     */
    parseData(jsonData) {
        this.gameState.updateFromJSON(jsonData);
        this.gameState.updateMyPP(jsonData);
    }
    /**
     * Updates the game state with new data
     * @param {JSON} jsonData JSON Data received from the server
     */
    updateData(jsonData) {
        this.data = jsonData;
        this.parseData(jsonData);
        console.log(this.gameState.myPokemonList);
    }

    /**
     * Apply the effect of the turn to the game state
     * @param {string} effect the effect of the turn
     * @param {string} pokemon the name of the pokemon 
     * @param {string|number|undefined} details the details of the effect, either the damage or stat, can be undefined
     * @param {number|undefined} extra the stage of boost, can be undefined
     */
    updateFromTurn(effect, pokemon, details, extra) {
        if(effect == '-damage') {
           this.gameState.updateEnemy(pokemon, details);
        } else if(effect == '-boost') {
            this.gameState.updateEnemyBoost(pokemon, details, extra);
        } else if(effect == 'switch') {
            this.gameState.switchEnemyActiveTo(pokemon);
        }

    }

    /**
     * Apply the effect of the turn to the game state
     * @param {string} effect the effect of the turn
     * @param {string} pokemon the name of the pokemon 
     * @param {string|number|undefined} details the stat to be boosted
     * @param {number|undefined} extra the stage of boost
     */
    updateMyPokemonFromTurn(effect, pokemon, details, extra) {
        if(effect == "-boost"){
            this.gameState.updateMyBoost(pokemon, details, extra);
        }
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
        this.gameState.setForceSwitch(false);
        console.log("Active Enemy");
        console.log(this.gameState.activeEnemy);
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

        //TODO: think i can remove the last parameter
        var bestMove = this.alphaBeta(this.gameState, 2, 2, -100000, 100000, this.gameState.isForceSwitch());
        console.log(bestMove);
        
        return bestMove;
    }

    /**
     * Recusively calculates the best move to be used based on the current and possible game states
     * @param {gameState} gameState the current game state 
     * @param {number} initialDepth the initial depth of the search tree
     * @param {number} depth the current depth of the search tree
     * @param {number} alpha the minimum score the maximizing player (AI) is guaranteed
     * @param {number} beta  the maximum score the minimizing player (opponent) is guaranteed
     * @returns the best move to be used at the initial depth or the score of the current game state otherwise
     */
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
            var max = moveScores[0];
            var bestMove = moves[0];
            console.log(moves);
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
    

    /**
     * Simulate the game state after a move is used using the worst case scenario
     * @param {gameState} initialGameState the current game state to be simulated
     * @param {string} move the move to be simulated
     * @returns {number} the score of the game state after the move is used
     */
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

        var learnsetData = Dex.species.getLearnsetData(Dex.toID(enemyPokemon.name));  
        var moveList = [];
        moveList = Object.keys(learnsetData.learnset);
        
        if(true) { 
            //we go first
            if(move.includes('|/choose switch')) { 
                for(let i = 0; i < moveList.length; i++) {
                    var newGameState = initialGameState.clone();
                    newGameState.switchMyActiveTo(moveName);
                    newGameState.enemyMove(moveList[i]);
                    gameStates.push(newGameState);
                }

            } else {

            for(let i = 0; i < moveList.length; i++) {
                var newGameState = initialGameState.clone();
                const currentMove = Dex.moves.get(moveName);
                const currentEnemyMove = Dex.moves.get(moveList[i]); 

                if(currentMove.priority > currentEnemyMove.priority) {
                    newGameState.myMove(moveName);
                    newGameState.enemyMove(moveList[i]);
                } else {
                    newGameState.enemyMove(moveList[i]);
                    newGameState.myMove(moveName);
                }
                gameStates.push(newGameState);
            }
        }
        }
        //enemy switches
        for(let i = 1; i < initialGameState.enemyPokemonList.length; i++) {
            if(initialGameState.enemyPokemonList[i].alive && initialGameState.enemyPokemonList[i].name != initialGameState.activeEnemy && initialGameState.enemyPokemonList[i].hp > 0) {
                var newGameState = initialGameState.clone();
                newGameState.switchEnemyActiveTo(initialGameState.enemyPokemonList[i].name);
                if(move.includes('|/choose switch')) {
                    newGameState.switchMyActiveTo(moveName);
                } else {
                    newGameState.myMove(moveName);
                }
                gameStates.push(newGameState);
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

/**
 * Stores the AI's Pokemon
 */
class myPokemon {

    /**
     * Initializes a new myPokemon object
     * @param {string} name the name of the pokemon
     * @param {string} condition the condition of the pokemon (hp/maxHP)
     * @param {string[]} moveList the list of moves the pokemon has
     * @param {number[]} statsList the list of stats the pokemon has
     */
    constructor(name, condition, moveList, statsList, pos) {
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
        this.pos = pos;
        if(!condition){
            this.alive = false;
        } else {
            this.alive = true;
        }
        if(this.hp == 0){
            this.alive = false;
        }
        this.statBoosts = {atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
        this.pp = [];
        this.moves.forEach(move => {
            const moveData = Dex.moves.get(move);
            this.pp.push(moveData.pp);
        });
    };

    /**
     * sets the pp of a move
     * @param {number} pp the new pp of the move
     * @param {string} move name of the move
     */
    setPP(pp, move){
        var i = this.moves.indexOf(move);
        this.pp[i] = pp;
    }

    /**
     * updates a pokemon's stats
     * @param {string} name the name of the pokemon
     * @param {string} condition the condition of the pokemon (hp/maxHP)
     * @param {number} pos the position of the pokemon in the team
     */
    update(name, condition, pos) {
        let namespl = name.split(',');
        this.name = namespl[0];
        this.types = Dex.species.get(this.name).types;
        var spl = condition.split('/');
        var maxHP = parseInt(spl[1]);
        var currenthp = parseInt(spl[0]);
        this.maxHP = maxHP;
        this.hp = currenthp;
        this.pos = pos;
        if(!condition){
            this.alive = false;
        } else {
            this.alive = true;
        }
        if(this.hp == 0){
            this.alive = false;
        }
        return this;
    
    }

    /**
     * adds a stat boost to the pokemon
     * @param {string} stat the stat to be boosted
     * @param {number} boost the number of stages to be boosted can be negative or positive
     */
    addStatBoost(stat, boost) {
        this.statBoosts[stat] += boost;
        if(this.statBoosts[stat] > 6) {
            this.statBoosts[stat] = 6;
        }
        if(this.statBoosts[stat] < -6) {
            this.statBoosts[stat] = -6;
        }
    }

    /**
     * sets the stat boosts of the pokemon
     * @param {Json} statBoosts a JSON object containing the stat boosts
     */
    setStatBoost(statBoosts) {
        this.statBoosts = statBoosts;
    }

    /**
     * Searches for a move and decrements its pp by 1
     * @param {string} move the name of the move
     */
    decrementPP(move) {
        for(let i = 0; i < this.moves.length; i++) {
            if(this.moves[i] == move) {
                this.pp[i] = this.pp[i] - 1;
            }
        }
    }
    
    /**
     * gets the pp of a move
     * @param {string} move the name of the move
     * @returns {number} the pp of the move
     */
    getPP(move) {
        for(let i = 0; i < this.moves.length; i++) {
            if(this.moves[i] == move) {
                return this.pp[i];
            }
        }
    }

    /**
     * sets the pp of all moves
     * @param {number[]} pp the new pp of all moves
     */
    setPPList(pp) {
        this.pp = pp;
    }

    /**
     * clones the current myPokemon object without reference
     * @returns {myPokemon} a new myPokemon object with the same values as the current one
     */
    clone() {
        var pokemon = new myPokemon(this.name, this.hp + '/' + this.maxHP, this.moves, [this.atk, this.def, this.spa, this.spd, this.spe], this.pos);
        pokemon.setStatBoost(this.statBoosts);
        pokemon.setPPList(structuredClone(this.pp));
        return pokemon;
    }

};


/**
 * Stores the enemy's Pokemon
 */
class enemyPokemon {
    /**
     * initializes a new enemyPokemon object
     * @param {string} name the name of the pokemon
     */
    constructor(name) {
        let namespl = name.split(',');
        this.name = namespl[0];
        this.types = Dex.species.get(this.name).types;
        this.maxHP = 100;
        this.hp = 100;
        this.statBoosts = {atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
        
    };

    /**
     * Adds a stat boost to the enemy pokemon 
     * @param {string} stat the stat to be boosted
     * @param {number} boost the number of stages to be boosted can be negative or positive
     */
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



/**
 * Stores the game state
 */
class gameState {
    
    /**
     * Initializes a new gameState object
     */
    constructor() {
        //need to create new objects withour reference to old ones
        /**
         * @type {boolean} whether a pokemon must be switched to
         */
        this.forceSwitch = false;

        /**
         * @type {myPokemon[]} the list of the AI's pokemon
         */
        this.myPokemonList = [];
        /**
         * @type {enemyPokemon[]} the list of the enemy's pokemon
         */
        this.enemyPokemonList = [];
        /**
         * @type {string} the name of the currently active enemy pokemon
         */
        this.activeEnemy = null;
        /**
         * @type {Generations} the generation of the current battle
         */
        this.gen = generation;


    }

    //setters and getters for variables

    setMyPokemonList(myPokemonList) {
        this.myPokemonList = myPokemonList;
    }
    
    addMyPokemon(pokemon) {
        this.myPokemonList.push(pokemon);
    }

    addEnemyPokemon(pokemon) {
        this.enemyPokemonList.push(pokemon);
    }

    setEnemyPokemonList(enemyPokemonList) {
        this.enemyPokemonList = enemyPokemonList;
    }

    setActiveEnemy(activeEnemy) {
        this.activeEnemy = activeEnemy;
    }

    /**
     * gets the active enemy pokemon
     * @returns {enemyPokemon} the active enemy pokemon
     */
    getActiveEnemy() {
        for(let i = 0; i < this.enemyPokemonList.length; i++) {
            if(this.enemyPokemonList[i].name == this.activeEnemy) {
                return this.enemyPokemonList[i];
            }
        }
    }

    /**
     * updates the Ai's pokemon list from JSON data
     * @param {Json} Json JSON data received from the server
     */
    updateFromJSON(Json) {
        var i = 0;
        Json.side.pokemon.forEach(pokemon => {
            if(!this.myPokemonExists(pokemon.details.split(',')[0])) {
                this.addMyPokemon(new myPokemon(pokemon.details, pokemon.condition, pokemon.moves, pokemon.stats, i));
            } else {
                this.updateMyPokemonFromJSON(pokemon.details, pokemon.condition, i);
                
            }
            i++;
        });
        this.myPokemonList.sort(this.order);
        
    }

    /**
     * used for sorting the pokemon list
     * @param {number} a the position of the first pokemon
     * @param {number} b the position of the second pokemon
     * @returns {number} the difference between the positions of the two pokemon
     */
    order(a, b){
        return a.pos - b.pos;
    }

    /**
     * updates the Ai's pokemon from JSON its data
     * @param {string} details the details of the pokemon (including name and level)
     * @param {string} condition the condition of the pokemon (hp/maxHP)
     * @param {number} pos the position of the pokemon in the team
     */
    updateMyPokemonFromJSON(details, condition, pos) {
        let namespl = details.split(',');
        var name = namespl[0];
        for(let i = 0; i < this.myPokemonList.length; i++) {
            if(this.myPokemonList[i].name == name) {
                this.myPokemonList[i].update(details, condition, pos);
            }
        }
    }

    //update PP of the active pokemon
    /**
     * updates the PP of the active pokemon from JSON data
     * @param {Json} jsonData the JSON data received from the server
     */
    updateMyPP(jsonData) {
        if('active' in jsonData) {
            console.log(jsonData.active[0])
            jsonData.active[0].moves.forEach( moves => {
                this.myPokemonList[0].setPP(moves.pp, moves.id);
                
            });
        } 
    }

    /**
     * checks if a pokemon is in the AI's pokemon list
     * @param {string} pokemon the name of the pokemon
     * @returns {boolean} whether the pokemon is in the list
     */
    myPokemonExists(pokemon) {  
        for(let i = 0; i < this.myPokemonList.length; i++) {
            if(this.myPokemonList[i].name == pokemon) {
                return true;
            }
        }
    }

    /**
     * sets the pokemon at a certain position in the list
     * @param {number} pos the position of the pokemon in the list
     * @param {string} pokemon the name of the pokemon
     */
    setMyPokemonListPos(pos, pokemon) {
        this.myPokemonList[pos] = pokemon;
    }

    /**
     * simulates the enemy's move.
     * Always uses the worst result for the AI.
     * @param {string} enemyMove the name of the move used by the enemy
     */
    enemyMove(enemyMove) {
        var myPokemon = this.getMyActive();
        var enemyPokemon = this.getActiveEnemy();
        const result = calculate(
            this.gen,
            new Pokemon(this.gen, enemyPokemon.name, {
                boosts: enemyPokemon.statBoosts
            }),
            new Pokemon(this.gen, this.getMyActive().name, {
                boosts: this.getMyActive().statBoosts
            }),
            new Move(this.gen, enemyMove)
        )
        var damage;
        if(Array.isArray(result.damage)) {
            damage = result.damage[result.damage.length - 1];
        }  else {
            damage = result.damage;
        }
    
        this.updateMyPokemon(this.getMyActive().name, myPokemon.hp - damage);
        if(this.myPokemonList[0].hp <= 0) {
            this.myPokemonList[0].alive = false;
            this.setForceSwitch(true);
        } 
    }


    /**
     * simulates the AI's move.
     * Always uses the worst result for the AI.
     * @param {string} myMove the name of the move used by the AI
     */
    myMove(myMove) {
        var enemyPokemon = this.getActiveEnemy();
        const result2 = calculate(  
            this.gen,
            new Pokemon(this.gen, this.getMyActive().name, {
                    boosts: this.getMyActive().statBoosts
            }),
            new Pokemon(this.gen, enemyPokemon.name, {
                boosts: enemyPokemon.statBoosts
            }),
            new Move(this.gen, myMove)
        )
        var damage2;
        if(Array.isArray(result2.damage)) {
            damage2 = result2.damage[0];
        }  else {
            damage2 = result2.damage;
        }
        this.decrementPP(myMove);
        this.updateEnemy(enemyPokemon.name, enemyPokemon.hp - (damage2 / Dex.species.get(enemyPokemon.name).baseStats.hp));
        if(this.enemyPokemonList[0].hp <= 0) {
            this.enemyPokemonList[0].alive = false;
            this.switchEnemyActive();
        }  

    }

   



    /**
     * Clones the current gameState object without reference
     * @returns {gameState} a new gameState object with the same values as the current one
     */
    clone() {
        var newGameState = new gameState();
        newGameState.myPokemonList = [];
        for(let i = 0; i < this.myPokemonList.length; i++) {
            newGameState.myPokemonList.push(this.myPokemonList[i].clone());
        }
        newGameState.enemyPokemonList = JSON.parse(JSON.stringify(this.enemyPokemonList));
        newGameState.activeEnemy = JSON.parse(JSON.stringify(this.activeEnemy));
        return newGameState;
    }

    /**
     * sets the forceSwitch variable
     * @param {boolean} bool the value to set forceSwitch to
     */
    setForceSwitch(bool) {
        this.forceSwitch = bool;
    }

    /**
     * gets the a Boolean value of whether a Pokemon must be switched to
     * @returns {boolean} whether a Pokemon must be switched to
     */
    isForceSwitch() {
        return this.forceSwitch;
    }

    /**
     * decrements the pp of a move by 1
     * @param {string} move the name of the move
     */
    decrementPP(move) {
        this.myPokemonList[0].decrementPP(move);
    }

    /**
     * Checks if a move is usable
     * @param {string} move the name of the move
     * @returns {boolean} whether the move is usable
     */
    isMoveUsable(move) {
        if(this.myPokemonList[0].getPP(move) > 0){
            console.log("move usable");
            return true;
        } else {
            console.log("move not usable");
            return false;
        }
    }

    /**
     * Prints the the details of the game state
     * Used for debugging
     */
    printState() {  
        console.log("My Pokemon");
        this.myPokemonList.forEach(pokemon => {
            console.log(pokemon.name + " " + pokemon.hp + "/" + pokemon.maxHP);
        });
        console.log("Enemy Pokemon");
        this.enemyPokemonList.forEach(pokemon => {
            console.log(pokemon.name + " " + pokemon.hp + "/" + pokemon.maxHP);
        });
        console.log("Active Enemy: " + this.activeEnemy);
    }

    /**
     * Evaluates the current game state for Alpha Beta Pruning
     * @returns {number} the score of the current game state
     */
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

    /**
     * Updates an enemy pokemon's HP
     * @param {string} pokemon the name of the pokemon
     * @param {number} newHP the new HP of the pokemon
     */
    updateEnemy(pokemon, newHP) {
        this.enemyPokemonList.forEach(enemy => {
            if(enemy.name == pokemon) {
                enemy.hp = parseInt(newHP);
            }
        });
    }

    /**
     * Switches the active Pokemon to a random one
     * Used for testing
     */
    switchMyActive() {
        var newActive;
        newActive = this.myPokemonList.shift();
        this.myPokemonList.push(newActive);
    }

    /**
     * Switches the AI's active pokemon
     * @param {string} pokemon the name of the pokemon
     */
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

    /**
     * Switches the enemy's active pokemon
     * @param {string} pokemon the name of the pokemon
     */
    switchEnemyActiveTo(pokemon) {
        this.activeEnemy = pokemon;

    }

    /**
     * Switches the active enemy Pokemon to a random one
     * Used for testing
     */
    switchEnemyActive() {
        var newActive;
        newActive = this.enemyPokemonList.shift();
        this.enemyPokemonList.push(newActive);
    }

     /**
     * Switches the active enemy pokemon
     * @param {string} pokemon Name of the new active enemy pokemon
     */
    updateActiveEnemy(pokemon) {
        this.enemyPokemonList.forEach(enemy => {
            if(enemy.name == pokemon) {
                this.activeEnemy = enemy.name;
            }
        });
    }

    /**
     * gets the active pokemon of the AI
     * @returns {myPokemon} the active pokemon of the AI
     */
    getMyActive() {
        return this.myPokemonList[0];
    }

    /**
     * gets a boolean value of whether the AI's active pokemon is alive
     * @returns {boolean} whether the AI's active pokemon is alive
     */
    isMyActiveAlive() {
        if(this.myPokemonList[0].hp > 0) {
            return true;
        } else
        {
            return false;
        }
    }

    /**
     * updates the HP of the AI's  pokemon
     * @param {string} pokemon the name of the pokemon
     * @param {number} newHP the new HP of the pokemon
     */
    updateMyPokemon(pokemon, newHP) {
        this.myPokemonList.forEach(myPokemon => {
            if(myPokemon.name == pokemon) {
                myPokemon.hp = parseInt(newHP);
            }
        });
    }

    /**
     * Updates the stat boost of the enemy pokemon
     * @param {string} pokemon Name of the enemy pokemon
     * @param {string} stat Stat to be updated
     * @param {int} newBoost Number of boost stages to be added
     */
    updateEnemyBoost(pokemon, stat, newBoost) {
        this.enemyPokemonList.forEach(enemy => {
            if(enemy.name == pokemon) {
                enemy.addStatBoost(stat, parseInt(newBoost));
                console.log(enemy.statBoosts[stat]);
            }
        });
    }

    /**
     * Updates the stat boost of the AI's pokemon
     * @param {string} pokemon Name of the AI's pokemon
     * @param {string} stat Stat to be updated
     * @param {int} newBoost Number of boost stages to be added
     */
    updateMyBoost(pokemon, stat, newBoost) {
        this.myPokemonList.forEach(myPokemon => {
            if(myPokemon.name == pokemon) {
                myPokemon.addStatBoost(stat, parseInt(newBoost));
            }
        });
    }
}


module.exports = BattleManager;