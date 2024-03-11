const {Dex} = require('pokemon-showdown');
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
        
        /**
         * @type {string} the name of the pokemon
         */
        this.name = namespl[0];
        
        /**
         * @type {string[]} the types of the pokemon
         */
        this.types = Dex.species.get(this.name).types;
        
        /**
         * @type {number} the maximum hp of the pokemon
         */
        this.maxHP = 100;
        
        /**
         * @type {number} the current hp of the pokemon
         */
        this.hp = 100;
        
        /**
         * @type {Object} the stat boosts of the pokemon
         */
        this.statBoosts = {atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
        
    };

    /**
     * Adds a stat boost to the enemy pokemon 
     * @param {string} stat the stat to be boosted
     * @param {number} boost the number of stages to be boosted can be negative or positive
     */
    addStatBoost(stat, boost) {
        //stat is unrelated
        if(!this.statBoosts[stat]) {
            return;
        }
        this.statBoosts[stat] += boost;
        if(this.statBoosts[stat] > 6) {
            this.statBoosts[stat] = 6;
        }
        if(this.statBoosts[stat] < -6) {
            this.statBoosts[stat] = -6;
        }
    }

    /**
     * sets the stat boosts of the enemy pokemon
     * @param {Object} statBoosts the stat boosts to be set
     */
    setStatBoost(statBoosts) {
        this.statBoosts = statBoosts;
    }

    /**
     * clones the enemy pokemon
     * @returns {enemyPokemon} a clone of the enemy pokemon
     */
    clone() {
        var clone = new enemyPokemon(this.name);
        clone.hp = this.hp;
        clone.maxHP = this.maxHP;
        clone.setStatBoost(this.statBoosts);
        return clone;
    }
}

module.exports = enemyPokemon;