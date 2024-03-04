const hash = require('object-hash');
const gameState = require('./gameState');

/**
 * Stores the transposition table
 */
class TranspositionTable {
    /**
     * @type {number} the total size of the table
     */
    totalSize = 10000;
    
    /**
     * Initializes a new transposition table
     */
    constructor() {
        /**
         * @type {Object[]} the table 
         */
        this.table = new Array(this.totalSize);
        this.table.fill(null);
    }


    /**
     * gets the index of the key
     * @param {number} key the key
     * @returns the index 
     */
    getIndexOfKey(key) {
        return key % this.totalSize;
    }

    /**
     * hashes the game state
     * @param {gameState} gameState the game state
     * @returns {number} the hash of the game state
     */
    hashGameState(gameState) {
        return parseInt(hash(gameState), 16);
    }

    /**
     * adds a game state to the table
     * @param {gameState} gameState the game state
     * @param {number} value the value of the game state
     * @param {number} depthSearched the depth the game state was searched to
     */
    add(gameState, value, depthSearched) {
        var index = this.getIndexOfKey(this.hashGameState(gameState));
        //if the index is empty, add the game state
        //if depthSearched is greater than the depthSearched in the table, update the table as the result is more accurate
        if(this.table[index] == null){
            this.table[index] = {value: value, depthSearched: depthSearched};
        } else if(this.table[index].depthSearched < depthSearched) {
            this.table[index] = {value: value, depthSearched: depthSearched};
        }
    }

    /**
     * gets a game state from the table
     * @param {gameState} gameState the game state
     * @param {number} currentDepth the current depth of the search
     * @returns {number} the value of the game state
     */
    get(gameState, currentDepth) {
        var index = this.getIndexOfKey(this.hashGameState(gameState));
        if(this.table[index] == null){
            return null;
        }
        //we only want to return the value if the depthSearched is greater than or equal to the current depth otherwise the result is not accurate
        if(this.table[index].depthSearched >= currentDepth){
            return this.table[index].value;
        } else {
            return null;
        }
    }
    
}

module.exports = TranspositionTable;