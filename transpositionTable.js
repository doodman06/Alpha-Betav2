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
    add(gameState, value, depthSearched) {
        var myHash = this.hashGameState(gameState);
        
        if(this.map.has(myHash)){
            var tempDepth = this.map.get(myHash).depthSearched;
            if(tempDepth < depthSearched){
                this.map.set(myHash, {value: value, depthSearched: depthSearched});
            } else {
                return;
            }
        } else {
            this.map.set(myHash, {value: value, depthSearched: depthSearched});
        }
    }

    /**
     * gets a game state from the table
     * @param {gameState} gameState the game state
     * @param {number} currentDepth the current depth of the search
     * @returns {number} the value of the game state
     */
    get(gameState, currentDepth) {
        var myHash = this.hashGameState(gameState);
        
        if(this.map.has(myHash)){
            var tempDepth = this.map.get(myHash).depthSearched;
            if(tempDepth >= currentDepth){
                return this.map.get(myHash).value;
            }
        }
        return null;
    }
    
}

module.exports = TranspositionTable;