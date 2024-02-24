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

    setStatBoost(statBoosts) {
        this.statBoosts = statBoosts;
    }

    clone() {
        var clone = new enemyPokemon(this.name);
        clone.hp = this.hp;
        clone.maxHP = this.maxHP;
        clone.setStatBoost(this.statBoosts);
        return clone;
    }
}

module.exports = enemyPokemon;