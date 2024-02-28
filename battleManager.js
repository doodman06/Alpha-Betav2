const {Dex} = require('pokemon-showdown');
const {calculate, Pokemon, Move, Generations} = require('@smogon/calc');
const pokemon = require('pokemon-showdown/dist/sim/pokemon');

/**
 * Manages the state of the battle and the AI
 */

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
        //console.log("Active Enemy");
        //console.log(this.gameState.activeEnemy);
        console.log(this.gameState.enemyPokemonList);
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
                    //console.log(move + " is added ")
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
        //if force switching like is a Pokemon died the enemy does not take a turn
        if(initialGameState.isForceSwitch()) {
            var newGameState = initialGameState.clone();
            newGameState.switchMyActiveTo(moveName);
            gameStates.push(newGameState);
            return gameStates[0];
        }
        if(initialGameState.isEnemyForceSwitch()) {
            for(let i = 1; i < initialGameState.enemyPokemonList.length; i++) {
                if(initialGameState.enemyPokemonList[i].alive && initialGameState.enemyPokemonList[i].name != initialGameState.activeEnemy && initialGameState.enemyPokemonList[i].hp > 0) {
                    var newGameState = initialGameState.clone();
                    newGameState.switchEnemyActiveTo(initialGameState.enemyPokemonList[i].name);
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
        for(let i = 0; i < initialGameState.enemyPokemonList.length; i++) {
            if(initialGameState.enemyPokemonList[i].name == initialGameState.activeEnemy) {
                enemyPokemon = initialGameState.enemyPokemonList[i];
            }
        }
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




module.exports = BattleManager;