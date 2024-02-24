const {Dex} = require('pokemon-showdown');

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

module.exports = myPokemon;