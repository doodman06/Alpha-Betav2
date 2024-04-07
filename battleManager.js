const {Dex} = require('pokemon-showdown');
const {calculate, Pokemon, Move, Generations} = require('@smogon/calc');
const pokemon = require('pokemon-showdown/dist/sim/pokemon');
const gameState = require('./gameState');

/**
 * Manages the state of the battle and the AI
 */

class BattleManager {
    /**
     * Initializes the Pokemon Manager and game state
     * @param {JSON} jsonData  JSON data received from the server
     * @param {number} gen The Generation of Pokemon of the current battle
     * @param {boolean} useTranspositionTable if the AI should use a transposition table
     * @param {boolean} useMoveOrdering if the AI should use move ordering
     * @param {number} maxDepth the maximum depth of the search tree
     * @param {boolean} deterministic if the AI should use deterministic simulation of moves
     * @param {number} heuristic the id of the heuristic to be used for evaluation
     * @param {boolean} logging if the AI should log the time taken to make a move
     */
    constructor(jsonData, gen, useTranspositionTable, useMoveOrdering, maxDepth, deterministic, heuristic, logging) {
        /**
         * @type {JSON} JSON data received from the server
         */
        this.data = jsonData;
        /**
         * @type {gameState} the current game state
         */
        this.gameState = new gameState();
        this.parseData(jsonData);

        /**
         * @type {number} the generation of Pokemon of the current battle stored as a number
         */
        this.genNumber = gen;
        generation = Generations.get(gen);
        /**
         * @type {Generations} the generation of Pokemon of the current battle
         */
        this.gen = generation;

        /**
         * @type {boolean} if the AI should use a transposition table
         */
        this.useTranspositionTable = useTranspositionTable;

        /**
         * @type {boolean} if the AI should use move ordering
         */
        this.useMoveOrdering = useMoveOrdering;

        /**
         * @type {number} the maximum depth of the search tree
         */
        this.maxDepth = maxDepth;

        /**
         * @type {boolean} if the AI should use determinsitic simulation of moves
         */
        this.deterministic = deterministic;

        /**
         * @type {number} the id of the heuristic to be used for evaluation
         */
        this.heuristic = heuristic;

        /**
         * @type {boolean} if the AI should log the time taken to make a move
         */
        this.logging = logging;
        
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
        this.gameState.checkStruggleFromJSON(jsonData);
    }
    /**
     * Updates the game state with new data
     * @param {JSON} jsonData JSON Data received from the server
     */
    updateData(jsonData) {
        this.data = jsonData;
        this.parseData(jsonData);
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



    /**
     * Selects the move to be used from a JSON data request
     * @returns {string} the move to be used
     */
    chooseMoveFromRequest() {
        //if in a teampreview use default loudout
        if(this.data.teamPreview) {
            return '|/choose team 123456';
        }

        //if no active pokemon, switch
        if(!this.data.active) {
            return this.forceSwitch();
        }

    }
    /**
     * Selects the move to be used
     * @returns {string} move to be used
     */
    chooseMove() {
        
        //if no active pokemon, switch
        if(!this.data.active) {
            this.gameState.setForceSwitch(true);
        } else {
            this.gameState.setForceSwitch(false);
        }

        var table = new TranspositionTable();
        if(this.logging) {
            var startTime = Date.now();
        }
        var depth = this.maxDepth;
        var bestMove = this.alphaBeta(this.gameState, depth, depth, -100000, 100000, table, true);
        const fs = require('fs');
        //just to record the time taken
        if(this.logging) {
            var filetoWrite;
            if(this.useTranspositionTable && this.useMoveOrdering) {
                filetoWrite = 'Logs/timeTranspositionMoveOrdering';
            } else if(this.useTranspositionTable) {
                filetoWrite = 'Logs/timeTransposition';
            } else if(this.useMoveOrdering) {
                filetoWrite = 'Logs/timeMoveOrdering';
            } else {
                filetoWrite = 'Logs/timeBasic';
            }
            filetoWrite += 'Depth' + this.maxDepth;
            filetoWrite += 'Deterministic' + this.deterministic;
            filetoWrite += '.txt';
            fs.appendFileSync(filetoWrite ,((Date.now() - startTime) / 1000) + ",");
        }

        return bestMove;

    }

    /**
     * Selects the Pokemon to switch to when a switch is mandatory
     * @returns {string} move to be used 
     */
    forceSwitch() {
        this.gameState.setForceSwitch(true);

        var table = new TranspositionTable();
        var depth = this.maxDepth;
        var bestMove = this.alphaBeta(this.gameState, depth, depth, -100000, 100000, table, true);
        
        return bestMove;
    }

    /**
     * Recusively calculates the best move to be used based on the current and possible game states
     * @param {gameState} gameState the current game state 
     * @param {number} initialDepth the initial depth of the search tree
     * @param {number} depth the current depth of the search tree
     * @param {number} alpha the minimum score the maximizing player (AI) is guaranteed
     * @param {number} beta  the maximum score the minimizing player (opponent) is guaranteed
     * @param {TranspositionTable} table the transposition table to be used for memoization
     * @param {boolean} maximizing if the current player is the maximizing player
     * @param {string|null} maximizingMove the move to be used by the maximizing player, is null if the current player is maximizing player
     * @returns {string|number} the best move to be used at the initial depth or the score of the current game state otherwise
     */
    alphaBeta(gameState, initialDepth, depth, alpha, beta, table,  maximizing, maximizingMove) {
        


        if(depth == 0 || gameState.myPokemonList.length == 0 || gameState.enemyPokemonList.length == 0) {
            return gameState.evaluateState(this.heuristic);
        } 

        if(this.useTranspositionTable) {
            if(table.get(gameState, depth) != null) {
                var ttEntry = table.get(gameState, depth);
                if(ttEntry.flag == "VALID") {
                    return ttEntry.evaluationValue;
                }
                if(ttEntry.flag == "LOWERBOUND") {
                    alpha = Math.max(alpha, ttEntry.evaluationValue);
                }
                if(ttEntry.flag == "UPPERBOUND") {
                    beta = Math.min(beta, ttEntry.evaluationValue);
                }
                if(alpha >= beta) {
                    return ttEntry.evaluationValue;
                }
            }
        }   
        
        var v;
        var moves = [];
        var moveScores = [];
        if(maximizing) {
            v = -100000;
            //get list of possible moves
            if(!gameState.isForceSwitch()) {
            gameState.myPokemonList[0].moves.forEach(move => {
                //add the move as an option if there is enough pp
                if(gameState.isMoveUsable(move)) {
                    //check if the json data has a disabled field
                    var moveToCheck = this.data.active[0].moves.find(m => m.id == move);
                    if(moveToCheck == undefined) {
                        moves.push('|/choose move ' + move);
                    }
                    else {
                        var moveCondition = false;
                        if('disabled' in moveToCheck) {
                            moveCondition = moveToCheck.disabled;
                        }
                        if(!moveCondition || !this.gameState.getMyActive().name == this.data.side.pokemon[0].ident.split(':')[1] ){
                            moves.push('|/choose move ' + move);
                        } 
                    }
                   
                }
            });
            }
            for(let i = 1; i < gameState.myPokemonList.length; i++) {
                if(gameState.myPokemonList[i].alive && gameState.myPokemonList[i].name != gameState.getMyActive().name && gameState.myPokemonList[i].hp > 0 ) {
                    moves.push('|/choose switch ' + gameState.myPokemonList[i].name);
                }
            }
            if(this.useMoveOrdering) {
                //start move ordering
                var moveOrderScores = [];
                for(let i = 0; i < moves.length; i++) {
                    var newGameState = gameState.clone();
                    var simGameState = this.simulatemyMove(newGameState, moves[i]);
                    moveOrderScores.push(simGameState.evaluateState(this.heuristic));
                }
                moves.sort((a, b) => moveOrderScores[moves.indexOf(b)] - moveOrderScores[moves.indexOf(a)]);
                //end move ordering
            }
            for(let i = 0; i < moves.length; i++) {
            
                var newGameState = gameState.clone();
                v = Math.max(v, this.alphaBeta(newGameState, initialDepth, depth - 1, alpha, beta, table, false, moves[i]));
                alpha = Math.max(alpha, v);
                moveScores.push(v);
                if(v >= beta) {
                    break;
                }
            }

        } else {
            v = 100000;
            moves = this.gameState.getPossibleEnemyMoves();
            if(this.useMoveOrdering) {
                //start move ordering
                var moveOrderScores = [];
                for(let i = 0; i < moves.length; i++) {
                    var newGameState = gameState.clone();
                    var simGameState = this.simulate(newGameState, maximizingMove, moves[i]);
                    moveOrderScores.push(simGameState.evaluateState(this.heuristic));
                }
                moves.sort((a, b) => moveOrderScores[moves.indexOf(a)] - moveOrderScores[moves.indexOf(b)]);
                //end move ordering
            }
            for(let i = 0; i < moves.length; i++) {
                var newGameState = gameState.clone();
                var simGameState = this.simulate(newGameState, maximizingMove, moves[i]);
                v = Math.min(v, this.alphaBeta(simGameState, initialDepth, depth - 1, alpha, beta, table, true));
                beta = Math.min(beta, v);
                if(v <= alpha) {
                    break;
                }
            }


        }
    

        if(depth == initialDepth) {
            var max = moveScores[0];
            var bestMove = moves[0];
            for(let i = 0; i < moveScores.length; i++) {
                if(moveScores[i] > max) {
                    max = moveScores[i];
                    bestMove = moves[i];
                }
            }
            return bestMove;
        }

        if(this.useTranspositionTable) {
            var flag = "VALID"
            if(v <= alpha) {
                flag = "UPPERBOUND";
            }
            if(v >= beta) {
                flag = "LOWERBOUND";
            }
            table.add(gameState, v, depth, flag);
        }


        return v;
    }


    

    /**
     * Simulate the game state after a move is used using the worst case scenario
     * @param {gameState} initialGameStatepha, beta the current game state to be simulated
     * @param {string} myMove the move to be simulated
     * @param {string} enemyMove the move to be simulated for the enemy
     * @returns {gameState} the game state after the moves are used
     */
    simulate(initialGameState, myMove, enemyMove) {
        var moveName = myMove.split(' ')[2];
        var enemyMoveName = enemyMove.split(' ')[2];
        var gameState;
        //if force switching like is a Pokemon died the other does not take a turn
        if(initialGameState.isForceSwitch()) {
            gameState = initialGameState.clone();
            gameState.switchMyActiveTo(moveName);
            return gameState;
        }
        if(initialGameState.isEnemyForceSwitch()) {
            gameState = initialGameState.clone();
            gameState.switchEnemyActiveTo(enemyMoveName);
            return gameState;
        }

       
        
        //we go first
        if(myMove.includes('|/choose switch')) { 
            gameState = initialGameState.clone();
            gameState.switchMyActiveTo(moveName);
            gameState.enemyMove(enemyMoveName, this.deterministic);
            return gameState;

        } else if(enemyMove.includes('|/choose switch')) {
            gameState = initialGameState.clone();
            gameState.switchEnemyActiveTo(enemyMoveName);
            gameState.myMove(moveName, this.deterministic);
            return gameState;
                
        } else {
            
            var gameState = initialGameState.clone();
            const currentMove = Dex.moves.get(moveName);
            const currentEnemyMove = Dex.moves.get(enemyMoveName); 

            if(currentMove.priority > currentEnemyMove.priority) {
                gameState.myMove(moveName, this.deterministic);
                gameState.enemyMove(enemyMoveName, this.deterministic);
            } else {
                gameState.enemyMove(enemyMoveName, this.deterministic);
                gameState.myMove(moveName, this.deterministic);
            }

            return gameState;
        }

    }

    /**
     * Simulate the game state after the AI uses a move
     * @param {gameState} initialGameState the current game state to be simulated
     * @param {string} myMove the move to be simulated
     * @returns {gamestate} the game state after the move is used
     */
    simulatemyMove(initialGameState, myMove) {
        var moveName = myMove.split(' ')[2];
        var gameState;
        //if force switching like is a Pokemon died the other does not take a turn
        if(myMove.includes('|/choose switch')) { 
            gameState = initialGameState.clone();
            gameState.switchMyActiveTo(moveName);
            return gameState;
        }
        if(initialGameState.isForceSwitch()) {
            gameState = initialGameState.clone();
            gameState.switchMyActiveTo(moveName);
            return gameState;
        }

        gameState = initialGameState.clone();
        gameState.myMove(moveName, this.deterministic);
        return gameState;
    }
    
}




module.exports = BattleManager;