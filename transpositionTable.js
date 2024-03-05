const hash = require('object-hash');
const gameState = require('./gameState');

/**
 * Stores the transposition table
 */
class TranspositionTable {
    
    /**
     * Initializes a new transposition table
     */
    constructor() {
        this.map = new Map();
    }

    /**
     * hashes the game state
     * @param {gameState} gameState the game state
     * @returns {string} the hash of the game state
     */
    hashGameState(gameState) {
        return hash(gameState);
    }

    /**
     * adds a game state to the table
     * @param {gameState} gameState the game state
     * @param {number} value the value of the game state
     * @param {number} depthSearched the depth the game state was searched to
     */
    add(gameState, value, depthSearched, flag) {
        var myHash = this.hashGameState(gameState);
        
        if(this.map.has(myHash)){
            var tempDepth = this.map.get(myHash).depthSearched;
            if(tempDepth < depthSearched){
                this.map.set(myHash, {evaluationValue: value, depthSearched: depthSearched, flag: flag});
            } else {
                return;
            }
        } else {
            this.map.set(myHash, {evaluationValue: value, depthSearched: depthSearched, flag: flag});
        }
    }

    /**
     * gets a game state from the table
     * @param {gameState} gameState the game state
     * @param {number} currentDepth the current depth of the search
     * @returns {Object} an object containing the value, depth, and alpha and beta values of the game state
     */
    get(gameState, currentDepth) {
        var myHash = this.hashGameState(gameState);
        
        if(this.map.has(myHash)){
            var tempDepth = this.map.get(myHash).depthSearched;
            if(tempDepth >= currentDepth){
                return this.map.get(myHash);
            }
        }
        return null;
    }
    
}

module.exports = TranspositionTable;