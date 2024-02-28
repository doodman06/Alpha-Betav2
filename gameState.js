const {Dex} = require('pokemon-showdown');
const {calculate, Pokemon, Move, Generations} = require('@smogon/calc');
const pokemon = require('pokemon-showdown/dist/sim/pokemon');
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
         * @type {boolean} whether the enemy must be switched to a different pokemon
         */
        this.enemyForceSwitch = false;

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
        this.gen = Generations.get(6);


    }

    setAll(forceSwitch, enemyForceSwitch, myPokemonList, enemyPokemonList, activeEnemy, gen) {
        this.forceSwitch = forceSwitch;
        this.enemyForceSwitch = enemyForceSwitch;
        this.myPokemonList = myPokemonList;
        this.enemyPokemonList = enemyPokemonList;
        this.activeEnemy = activeEnemy;
        this.gen = gen;
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

        var dexMove = Dex.moves.get(enemyMove);
        if(dexMove.boosts) {
            for(var key in dexMove.boosts) {
                this.updateEnemyBoost(enemyPokemon.name, key, dexMove.boosts[key]);
            }
        }
        if(Object.hasOwn(dexMove, 'self')){
            if(Object.hasOwn(dexMove.self, 'boosts')) {
                for(var key in dexMove.self.boosts) {
                    this.updateEnemyBoost(enemyPokemon.name, key, dexMove.self.boosts[key]);
                }
            }
        }
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
        var dexMove = Dex.moves.get(myMove);
        if(dexMove.boosts) {
            for(var key in dexMove.boosts) {
                this.updateMyBoost(this.getMyActive().name, key, dexMove.boosts[key]);
            }
        }
        if(Object.hasOwn(dexMove, 'self')){
            if(Object.hasOwn(dexMove.self, 'boosts')) {
                for(var key in dexMove.self.boosts) {
                    this.updateMyBoost(this.getMyActive().name, key, dexMove.self.boosts[key]);
                }
            }
        }
        if(this.enemyPokemonList[0].hp <= 0) {
            this.enemyPokemonList[0].alive = false;
            this.setEnemyForceSwitch(true);
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
        for(let i = 0; i < this.enemyPokemonList.length; i++) {
            newGameState.enemyPokemonList.push(this.enemyPokemonList[i].clone());
        }
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
     * sets the enemyForceSwitch variable
     * @param {boolean} bool the value to set enemyForceSwitch to
     */
    setEnemyForceSwitch(bool) {
        this.enemyForceSwitch = bool;
    }

    /**
     * gets the a Boolean value of whether a Pokemon must be switched to
     * @returns {boolean} whether a Pokemon must be switched to
     */
    isForceSwitch() {
        return this.forceSwitch;
    }

    /**
     * gets the a Boolean value of whether the enemy must switch to a different pokemon
     * @returns {boolean} whether the enemy must switch to a different pokemon
     */
    isEnemyForceSwitch() {
        return this.enemyForceSwitch;
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
            //console.log("move usable");
            return true;
        } else {
            //console.log("move not usable");
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

module.exports = gameState;