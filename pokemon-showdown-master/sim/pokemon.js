"use strict";
/**
 * Simulator Pokemon
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * @license MIT license
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pokemon = exports.RESTORATIVE_BERRIES = void 0;
var state_1 = require("./state");
var dex_1 = require("./dex");
// Berries which restore PP/HP and thus inflict external staleness when given to an opponent as
// there are very few non-malicious competitive reasons to do so
exports.RESTORATIVE_BERRIES = new Set([
    'leppaberry', 'aguavberry', 'enigmaberry', 'figyberry', 'iapapaberry', 'magoberry', 'sitrusberry', 'wikiberry', 'oranberry',
]);
var Pokemon = /** @class */ (function () {
    function Pokemon(set, side) {
        var _this = this;
        var _a;
        this.getDetails = function () {
            var health = _this.getHealth();
            var details = _this.details;
            if (_this.illusion) {
                var displayedSpeciesName = _this.illusion.species.name;
                if (displayedSpeciesName === 'Greninja-Bond')
                    displayedSpeciesName = 'Greninja';
                var illusionDetails = displayedSpeciesName + (_this.level === 100 ? '' : ', L' + _this.level) +
                    (_this.illusion.gender === '' ? '' : ', ' + _this.illusion.gender) + (_this.illusion.set.shiny ? ', shiny' : '');
                details = illusionDetails;
            }
            if (_this.terastallized)
                details += ", tera:".concat(_this.terastallized);
            return { side: health.side, secret: "".concat(details, "|").concat(health.secret), shared: "".concat(details, "|").concat(health.shared) };
        };
        this.getHealth = function () {
            if (!_this.hp)
                return { side: _this.side.id, secret: '0 fnt', shared: '0 fnt' };
            var secret = "".concat(_this.hp, "/").concat(_this.maxhp);
            var shared;
            var ratio = _this.hp / _this.maxhp;
            if (_this.battle.reportExactHP) {
                shared = secret;
            }
            else if (_this.battle.reportPercentages || _this.battle.gen >= 8) {
                // HP Percentage Mod mechanics
                var percentage = Math.ceil(ratio * 100);
                if ((percentage === 100) && (ratio < 1.0)) {
                    percentage = 99;
                }
                shared = "".concat(percentage, "/100");
            }
            else {
                // In-game accurate pixel health mechanics
                var pixels = Math.floor(ratio * 48) || 1;
                shared = "".concat(pixels, "/48");
                if ((pixels === 9) && (ratio > 0.2)) {
                    shared += 'y'; // force yellow HP bar
                }
                else if ((pixels === 24) && (ratio > 0.5)) {
                    shared += 'g'; // force green HP bar
                }
            }
            if (_this.status) {
                secret += " ".concat(_this.status);
                shared += " ".concat(_this.status);
            }
            return { side: _this.side.id, secret: secret, shared: shared };
        };
        this.side = side;
        this.battle = side.battle;
        this.m = {};
        var pokemonScripts = this.battle.format.pokemon || this.battle.dex.data.Scripts.pokemon;
        if (pokemonScripts)
            Object.assign(this, pokemonScripts);
        if (typeof set === 'string')
            set = { name: set };
        this.baseSpecies = this.battle.dex.species.get(set.species || set.name);
        if (!this.baseSpecies.exists) {
            throw new Error("Unidentified species: ".concat(this.baseSpecies.name));
        }
        this.set = set;
        this.species = this.baseSpecies;
        if (set.name === set.species || !set.name) {
            set.name = this.baseSpecies.baseSpecies;
        }
        this.speciesState = { id: this.species.id };
        this.name = set.name.substr(0, 20);
        this.fullname = this.side.id + ': ' + this.name;
        set.level = this.battle.clampIntRange(set.adjustLevel || set.level || 100, 1, 9999);
        this.level = set.level;
        var genders = { M: 'M', F: 'F', N: 'N' };
        this.gender = genders[set.gender] || this.species.gender || (this.battle.random() * 2 < 1 ? 'M' : 'F');
        if (this.gender === 'N')
            this.gender = '';
        this.happiness = typeof set.happiness === 'number' ? this.battle.clampIntRange(set.happiness, 0, 255) : 255;
        this.pokeball = this.set.pokeball || 'pokeball';
        this.dynamaxLevel = typeof set.dynamaxLevel === 'number' ? this.battle.clampIntRange(set.dynamaxLevel, 0, 10) : 10;
        this.gigantamax = this.set.gigantamax || false;
        this.baseMoveSlots = [];
        this.moveSlots = [];
        if (!((_a = this.set.moves) === null || _a === void 0 ? void 0 : _a.length)) {
            throw new Error("Set ".concat(this.name, " has no moves"));
        }
        for (var _i = 0, _b = this.set.moves; _i < _b.length; _i++) {
            var moveid = _b[_i];
            var move = this.battle.dex.moves.get(moveid);
            if (!move.id)
                continue;
            if (move.id === 'hiddenpower' && move.type !== 'Normal') {
                if (!set.hpType)
                    set.hpType = move.type;
                move = this.battle.dex.moves.get('hiddenpower');
            }
            var basepp = (move.noPPBoosts || move.isZ) ? move.pp : move.pp * 8 / 5;
            if (this.battle.gen < 3)
                basepp = Math.min(61, basepp);
            this.baseMoveSlots.push({
                move: move.name,
                id: move.id,
                pp: basepp,
                maxpp: basepp,
                target: move.target,
                disabled: false,
                disabledSource: '',
                used: false,
            });
        }
        this.position = 0;
        var displayedSpeciesName = this.species.name;
        if (displayedSpeciesName === 'Greninja-Bond')
            displayedSpeciesName = 'Greninja';
        this.details = displayedSpeciesName + (this.level === 100 ? '' : ', L' + this.level) +
            (this.gender === '' ? '' : ', ' + this.gender) + (this.set.shiny ? ', shiny' : '');
        this.status = '';
        this.statusState = {};
        this.volatiles = {};
        this.showCure = undefined;
        if (!this.set.evs) {
            this.set.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        }
        if (!this.set.ivs) {
            this.set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        }
        var stats = { hp: 31, atk: 31, def: 31, spe: 31, spa: 31, spd: 31 };
        var stat;
        for (stat in stats) {
            if (!this.set.evs[stat])
                this.set.evs[stat] = 0;
            if (!this.set.ivs[stat] && this.set.ivs[stat] !== 0)
                this.set.ivs[stat] = 31;
        }
        for (stat in this.set.evs) {
            this.set.evs[stat] = this.battle.clampIntRange(this.set.evs[stat], 0, 255);
        }
        for (stat in this.set.ivs) {
            this.set.ivs[stat] = this.battle.clampIntRange(this.set.ivs[stat], 0, 31);
        }
        if (this.battle.gen && this.battle.gen <= 2) {
            // We represent DVs using even IVs. Ensure they are in fact even.
            for (stat in this.set.ivs) {
                this.set.ivs[stat] &= 30;
            }
        }
        var hpData = this.battle.dex.getHiddenPower(this.set.ivs);
        this.hpType = set.hpType || hpData.type;
        this.hpPower = hpData.power;
        this.baseHpType = this.hpType;
        this.baseHpPower = this.hpPower;
        // initialized in this.setSpecies(this.baseSpecies)
        this.baseStoredStats = null;
        this.storedStats = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        this.boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
        this.baseAbility = (0, dex_1.toID)(set.ability);
        this.ability = this.baseAbility;
        this.abilityState = { id: this.ability };
        this.item = (0, dex_1.toID)(set.item);
        this.itemState = { id: this.item };
        this.lastItem = '';
        this.usedItemThisTurn = false;
        this.ateBerry = false;
        this.trapped = false;
        this.maybeTrapped = false;
        this.maybeDisabled = false;
        this.illusion = null;
        this.transformed = false;
        this.fainted = false;
        this.faintQueued = false;
        this.subFainted = null;
        this.types = this.baseSpecies.types;
        this.baseTypes = this.types;
        this.addedType = '';
        this.knownType = true;
        this.apparentType = this.baseSpecies.types.join('/');
        // Every Pokemon has a Terastal type
        this.teraType = this.set.teraType || this.types[0];
        this.switchFlag = false;
        this.forceSwitchFlag = false;
        this.skipBeforeSwitchOutEventFlag = false;
        this.draggedIn = null;
        this.newlySwitched = false;
        this.beingCalledBack = false;
        this.lastMove = null;
        // This is used in gen 2 only, here to avoid code repetition.
        // Only declared if gen 2 to avoid declaring an object we aren't going to need.
        if (this.battle.gen === 2)
            this.lastMoveEncore = null;
        this.lastMoveUsed = null;
        this.moveThisTurn = '';
        this.statsRaisedThisTurn = false;
        this.statsLoweredThisTurn = false;
        this.hurtThisTurn = null;
        this.lastDamage = 0;
        this.attackedBy = [];
        this.timesAttacked = 0;
        this.isActive = false;
        this.activeTurns = 0;
        this.activeMoveActions = 0;
        this.previouslySwitchedIn = 0;
        this.truantTurn = false;
        this.swordBoost = false;
        this.shieldBoost = false;
        this.syrupTriggered = false;
        this.isStarted = false;
        this.duringMove = false;
        this.weighthg = 1;
        this.speed = 0;
        /**
         * Determines the order in which redirect abilities like Lightning Rod
         * activate if speed tied. Surprisingly not random like every other speed
         * tie, but based on who first switched in or acquired the ability!
         */
        this.abilityOrder = 0;
        this.canMegaEvo = this.battle.actions.canMegaEvo(this);
        this.canUltraBurst = this.battle.actions.canUltraBurst(this);
        this.canGigantamax = this.baseSpecies.canGigantamax || null;
        this.canTerastallize = this.battle.actions.canTerastallize(this);
        // This is used in gen 1 only, here to avoid code repetition.
        // Only declared if gen 1 to avoid declaring an object we aren't going to need.
        if (this.battle.gen === 1)
            this.modifiedStats = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        this.maxhp = 0;
        this.baseMaxhp = 0;
        this.hp = 0;
        this.clearVolatile();
        this.hp = this.maxhp;
    }
    Pokemon.prototype.toJSON = function () {
        return state_1.State.serializePokemon(this);
    };
    Object.defineProperty(Pokemon.prototype, "moves", {
        get: function () {
            return this.moveSlots.map(function (moveSlot) { return moveSlot.id; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Pokemon.prototype, "baseMoves", {
        get: function () {
            return this.baseMoveSlots.map(function (moveSlot) { return moveSlot.id; });
        },
        enumerable: false,
        configurable: true
    });
    Pokemon.prototype.getSlot = function () {
        var positionOffset = Math.floor(this.side.n / 2) * this.side.active.length;
        var positionLetter = 'abcdef'.charAt(this.position + positionOffset);
        return (this.side.id + positionLetter);
    };
    Pokemon.prototype.toString = function () {
        var fullname = (this.illusion) ? this.illusion.fullname : this.fullname;
        return this.isActive ? this.getSlot() + fullname.slice(2) : fullname;
    };
    Pokemon.prototype.updateSpeed = function () {
        this.speed = this.getActionSpeed();
    };
    Pokemon.prototype.calculateStat = function (statName, boost, modifier, statUser) {
        statName = (0, dex_1.toID)(statName);
        // @ts-ignore - type checking prevents 'hp' from being passed, but we're paranoid
        if (statName === 'hp')
            throw new Error("Please read `maxhp` directly");
        // base stat
        var stat = this.storedStats[statName];
        // Wonder Room swaps defenses before calculating anything else
        if ('wonderroom' in this.battle.field.pseudoWeather) {
            if (statName === 'def') {
                stat = this.storedStats['spd'];
            }
            else if (statName === 'spd') {
                stat = this.storedStats['def'];
            }
        }
        // stat boosts
        var boosts = {};
        var boostName = statName;
        boosts[boostName] = boost;
        boosts = this.battle.runEvent('ModifyBoost', statUser || this, null, null, boosts);
        boost = boosts[boostName];
        var boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
        if (boost > 6)
            boost = 6;
        if (boost < -6)
            boost = -6;
        if (boost >= 0) {
            stat = Math.floor(stat * boostTable[boost]);
        }
        else {
            stat = Math.floor(stat / boostTable[-boost]);
        }
        // stat modifier
        return this.battle.modify(stat, (modifier || 1));
    };
    Pokemon.prototype.getStat = function (statName, unboosted, unmodified) {
        var _a;
        statName = (0, dex_1.toID)(statName);
        // @ts-ignore - type checking prevents 'hp' from being passed, but we're paranoid
        if (statName === 'hp')
            throw new Error("Please read `maxhp` directly");
        // base stat
        var stat = this.storedStats[statName];
        // Download ignores Wonder Room's effect, but this results in
        // stat stages being calculated on the opposite defensive stat
        if (unmodified && 'wonderroom' in this.battle.field.pseudoWeather) {
            if (statName === 'def') {
                statName = 'spd';
            }
            else if (statName === 'spd') {
                statName = 'def';
            }
        }
        // stat boosts
        if (!unboosted) {
            var boosts = this.battle.runEvent('ModifyBoost', this, null, null, __assign({}, this.boosts));
            var boost = boosts[statName];
            var boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
            if (boost > 6)
                boost = 6;
            if (boost < -6)
                boost = -6;
            if (boost >= 0) {
                stat = Math.floor(stat * boostTable[boost]);
            }
            else {
                stat = Math.floor(stat / boostTable[-boost]);
            }
        }
        // stat modifier effects
        if (!unmodified) {
            var statTable = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
            stat = this.battle.runEvent('Modify' + statTable[statName], this, null, null, stat);
        }
        if (statName === 'spe' && stat > 10000 && !((_a = this.battle.format.battle) === null || _a === void 0 ? void 0 : _a.trunc))
            stat = 10000;
        return stat;
    };
    Pokemon.prototype.getActionSpeed = function () {
        var speed = this.getStat('spe', false, false);
        if (this.battle.field.getPseudoWeather('trickroom')) {
            speed = 10000 - speed;
        }
        return this.battle.trunc(speed, 13);
    };
    /**
     * Gets the Pokemon's best stat.
     * Moved to its own method due to frequent use of the same code.
     * Used by Beast Boost, Quark Drive, and Protosynthesis.
     */
    Pokemon.prototype.getBestStat = function (unboosted, unmodified) {
        var statName = 'atk';
        var bestStat = 0;
        var stats = ['atk', 'def', 'spa', 'spd', 'spe'];
        for (var _i = 0, stats_1 = stats; _i < stats_1.length; _i++) {
            var i = stats_1[_i];
            if (this.getStat(i, unboosted, unmodified) > bestStat) {
                statName = i;
                bestStat = this.getStat(i, unboosted, unmodified);
            }
        }
        return statName;
    };
    /* Commented out for now until a use for Combat Power is found in Let's Go
    getCombatPower() {
        let statSum = 0;
        let awakeningSum = 0;
        for (const stat in this.stats) {
            statSum += this.calculateStat(stat, this.boosts[stat as BoostName]);
            awakeningSum += this.calculateStat(
                stat, this.boosts[stat as BoostName]) + this.set.evs[stat];
        }
        const combatPower = Math.floor(Math.floor(statSum * this.level * 6 / 100) +
            (Math.floor(awakeningSum) * Math.floor((this.level * 4) / 100 + 2)));
        return this.battle.clampIntRange(combatPower, 0, 10000);
    }
    */
    Pokemon.prototype.getWeight = function () {
        var weighthg = this.battle.runEvent('ModifyWeight', this, null, null, this.weighthg);
        return Math.max(1, weighthg);
    };
    Pokemon.prototype.getMoveData = function (move) {
        move = this.battle.dex.moves.get(move);
        for (var _i = 0, _a = this.moveSlots; _i < _a.length; _i++) {
            var moveSlot = _a[_i];
            if (moveSlot.id === move.id) {
                return moveSlot;
            }
        }
        return null;
    };
    Pokemon.prototype.getMoveHitData = function (move) {
        if (!move.moveHitData)
            move.moveHitData = {};
        var slot = this.getSlot();
        return move.moveHitData[slot] || (move.moveHitData[slot] = {
            crit: false,
            typeMod: 0,
            zBrokeProtect: false,
        });
    };
    Pokemon.prototype.alliesAndSelf = function () {
        return this.side.allies();
    };
    Pokemon.prototype.allies = function () {
        var _this = this;
        return this.side.allies().filter(function (ally) { return ally !== _this; });
    };
    Pokemon.prototype.adjacentAllies = function () {
        var _this = this;
        return this.side.allies().filter(function (ally) { return _this.isAdjacent(ally); });
    };
    Pokemon.prototype.foes = function (all) {
        return this.side.foes(all);
    };
    Pokemon.prototype.adjacentFoes = function () {
        var _this = this;
        if (this.battle.activePerHalf <= 2)
            return this.side.foes();
        return this.side.foes().filter(function (foe) { return _this.isAdjacent(foe); });
    };
    Pokemon.prototype.isAlly = function (pokemon) {
        return !!pokemon && (this.side === pokemon.side || this.side.allySide === pokemon.side);
    };
    Pokemon.prototype.isAdjacent = function (pokemon2) {
        if (this.fainted || pokemon2.fainted)
            return false;
        if (this.battle.activePerHalf <= 2)
            return this !== pokemon2;
        if (this.side === pokemon2.side)
            return Math.abs(this.position - pokemon2.position) === 1;
        return Math.abs(this.position + pokemon2.position + 1 - this.side.active.length) <= 1;
    };
    Pokemon.prototype.getUndynamaxedHP = function (amount) {
        var hp = amount || this.hp;
        if (this.volatiles['dynamax']) {
            return Math.ceil(hp * this.baseMaxhp / this.maxhp);
        }
        return hp;
    };
    /** Get targets for Dragon Darts */
    Pokemon.prototype.getSmartTargets = function (target, move) {
        var target2 = target.adjacentAllies()[0];
        if (!target2 || target2 === this || !target2.hp) {
            move.smartTarget = false;
            return [target];
        }
        if (!target.hp) {
            move.smartTarget = false;
            return [target2];
        }
        return [target, target2];
    };
    Pokemon.prototype.getAtLoc = function (targetLoc) {
        var side = this.battle.sides[targetLoc < 0 ? this.side.n % 2 : (this.side.n + 1) % 2];
        targetLoc = Math.abs(targetLoc);
        if (targetLoc > side.active.length) {
            targetLoc -= side.active.length;
            side = this.battle.sides[side.n + 2];
        }
        return side.active[targetLoc - 1];
    };
    /**
     * Returns a relative location: 1-3, positive for foe, and negative for ally.
     * Use `getAtLoc` to reverse.
     */
    Pokemon.prototype.getLocOf = function (target) {
        var positionOffset = Math.floor(target.side.n / 2) * target.side.active.length;
        var position = target.position + positionOffset + 1;
        var sameHalf = (this.side.n % 2) === (target.side.n % 2);
        return sameHalf ? -position : position;
    };
    Pokemon.prototype.getMoveTargets = function (move, target) {
        var targets = [];
        switch (move.target) {
            case 'all':
            case 'foeSide':
            case 'allySide':
            case 'allyTeam':
                if (!move.target.startsWith('foe')) {
                    targets.push.apply(targets, this.alliesAndSelf());
                }
                if (!move.target.startsWith('ally')) {
                    targets.push.apply(targets, this.foes(true));
                }
                if (targets.length && !targets.includes(target)) {
                    this.battle.retargetLastMove(targets[targets.length - 1]);
                }
                break;
            case 'allAdjacent':
                targets.push.apply(targets, this.adjacentAllies());
            // falls through
            case 'allAdjacentFoes':
                targets.push.apply(targets, this.adjacentFoes());
                if (targets.length && !targets.includes(target)) {
                    this.battle.retargetLastMove(targets[targets.length - 1]);
                }
                break;
            case 'allies':
                targets = this.alliesAndSelf();
                break;
            default:
                var selectedTarget = target;
                if (!target || (target.fainted && !target.isAlly(this)) && this.battle.gameType !== 'freeforall') {
                    // If a targeted foe faints, the move is retargeted
                    var possibleTarget = this.battle.getRandomTarget(this, move);
                    if (!possibleTarget)
                        return { targets: [], pressureTargets: [] };
                    target = possibleTarget;
                }
                if (this.battle.activePerHalf > 1 && !move.tracksTarget) {
                    var isCharging = move.flags['charge'] && !this.volatiles['twoturnmove'] &&
                        !(move.id.startsWith('solarb') && this.battle.field.isWeather(['sunnyday', 'desolateland'])) &&
                        !(this.hasItem('powerherb') && move.id !== 'skydrop');
                    if (!isCharging) {
                        target = this.battle.priorityEvent('RedirectTarget', this, this, move, target);
                    }
                }
                if (move.smartTarget) {
                    targets = this.getSmartTargets(target, move);
                    target = targets[0];
                }
                else {
                    targets.push(target);
                }
                if (target.fainted && !move.flags['futuremove']) {
                    return { targets: [], pressureTargets: [] };
                }
                if (selectedTarget !== target) {
                    this.battle.retargetLastMove(target);
                }
        }
        // Resolve apparent targets for Pressure.
        var pressureTargets = targets;
        if (move.target === 'foeSide') {
            pressureTargets = [];
        }
        if (move.flags['mustpressure']) {
            pressureTargets = this.foes();
        }
        return { targets: targets, pressureTargets: pressureTargets };
    };
    Pokemon.prototype.ignoringAbility = function () {
        if (this.battle.gen >= 5 && !this.isActive)
            return true;
        if (this.getAbility().isPermanent)
            return false;
        if (this.volatiles['gastroacid'])
            return true;
        // Check if any active pokemon have the ability Neutralizing Gas
        if (this.hasItem('Ability Shield') || this.ability === 'neutralizinggas')
            return false;
        for (var _i = 0, _a = this.battle.getAllActive(); _i < _a.length; _i++) {
            var pokemon = _a[_i];
            // can't use hasAbility because it would lead to infinite recursion
            if (pokemon.ability === 'neutralizinggas' && !pokemon.volatiles['gastroacid'] &&
                !pokemon.transformed && !pokemon.abilityState.ending && !this.volatiles['commanding']) {
                return true;
            }
        }
        return false;
    };
    Pokemon.prototype.ignoringItem = function () {
        return !!(this.itemState.knockedOff || // Gen 3-4
            (this.battle.gen >= 5 && !this.isActive) ||
            (!this.getItem().ignoreKlutz && this.hasAbility('klutz')) ||
            this.volatiles['embargo'] || this.battle.field.pseudoWeather['magicroom']);
    };
    Pokemon.prototype.deductPP = function (move, amount, target) {
        var gen = this.battle.gen;
        move = this.battle.dex.moves.get(move);
        var ppData = this.getMoveData(move);
        if (!ppData)
            return 0;
        ppData.used = true;
        if (!ppData.pp && gen > 1)
            return 0;
        if (!amount)
            amount = 1;
        ppData.pp -= amount;
        if (ppData.pp < 0 && gen > 1) {
            amount += ppData.pp;
            ppData.pp = 0;
        }
        return amount;
    };
    Pokemon.prototype.moveUsed = function (move, targetLoc) {
        this.lastMove = move;
        if (this.battle.gen === 2)
            this.lastMoveEncore = move;
        this.lastMoveTargetLoc = targetLoc;
        this.moveThisTurn = move.id;
    };
    Pokemon.prototype.gotAttacked = function (move, damage, source) {
        var damageNumber = (typeof damage === 'number') ? damage : 0;
        move = this.battle.dex.moves.get(move);
        this.attackedBy.push({
            source: source,
            damage: damageNumber,
            move: move.id,
            thisTurn: true,
            slot: source.getSlot(),
            damageValue: damage,
        });
    };
    Pokemon.prototype.getLastAttackedBy = function () {
        if (this.attackedBy.length === 0)
            return undefined;
        return this.attackedBy[this.attackedBy.length - 1];
    };
    Pokemon.prototype.getLastDamagedBy = function (filterOutSameSide) {
        var _this = this;
        var damagedBy = this.attackedBy.filter(function (attacker) { return (typeof attacker.damageValue === 'number' &&
            (filterOutSameSide === undefined || !_this.isAlly(attacker.source))); });
        if (damagedBy.length === 0)
            return undefined;
        return damagedBy[damagedBy.length - 1];
    };
    /**
     * This refers to multi-turn moves like SolarBeam and Outrage and
     * Sky Drop, which remove all choice (no dynamax, switching, etc).
     * Don't use it for "soft locks" like Choice Band.
     */
    Pokemon.prototype.getLockedMove = function () {
        var lockedMove = this.battle.runEvent('LockMove', this);
        return (lockedMove === true) ? null : lockedMove;
    };
    Pokemon.prototype.getMoves = function (lockedMove, restrictData) {
        if (lockedMove) {
            lockedMove = (0, dex_1.toID)(lockedMove);
            this.trapped = true;
            if (lockedMove === 'recharge') {
                return [{
                        move: 'Recharge',
                        id: 'recharge',
                    }];
            }
            for (var _i = 0, _a = this.moveSlots; _i < _a.length; _i++) {
                var moveSlot = _a[_i];
                if (moveSlot.id !== lockedMove)
                    continue;
                return [{
                        move: moveSlot.move,
                        id: moveSlot.id,
                    }];
            }
            // does this happen?
            return [{
                    move: this.battle.dex.moves.get(lockedMove).name,
                    id: lockedMove,
                }];
        }
        var moves = [];
        var hasValidMove = false;
        for (var _b = 0, _c = this.moveSlots; _b < _c.length; _b++) {
            var moveSlot = _c[_b];
            var moveName = moveSlot.move;
            if (moveSlot.id === 'hiddenpower') {
                moveName = 'Hidden Power ' + this.hpType;
                if (this.battle.gen < 6)
                    moveName += ' ' + this.hpPower;
            }
            else if (moveSlot.id === 'return' || moveSlot.id === 'frustration') {
                var basePowerCallback = this.battle.dex.moves.get(moveSlot.id).basePowerCallback;
                moveName += ' ' + basePowerCallback(this);
            }
            var target = moveSlot.target;
            if (moveSlot.id === 'curse') {
                if (!this.hasType('Ghost')) {
                    target = this.battle.dex.moves.get('curse').nonGhostTarget || moveSlot.target;
                }
                // Heal Block only prevents Pollen Puff from targeting an ally when the user has Heal Block
            }
            else if (moveSlot.id === 'pollenpuff' && this.volatiles['healblock']) {
                target = 'adjacentFoe';
            }
            var disabled = moveSlot.disabled;
            if (this.volatiles['dynamax']) {
                // if each of a Pokemon's base moves are disabled by one of these effects, it will Struggle
                var canCauseStruggle = ['Encore', 'Disable', 'Taunt', 'Assault Vest', 'Belch', 'Stuff Cheeks'];
                disabled = this.maxMoveDisabled(moveSlot.id) || disabled && canCauseStruggle.includes(moveSlot.disabledSource);
            }
            else if ((moveSlot.pp <= 0 && !this.volatiles['partialtrappinglock']) || disabled &&
                this.side.active.length >= 2 && this.battle.actions.targetTypeChoices(target)) {
                disabled = true;
            }
            if (!disabled) {
                hasValidMove = true;
            }
            else if (disabled === 'hidden' && restrictData) {
                disabled = false;
            }
            moves.push({
                move: moveName,
                id: moveSlot.id,
                pp: moveSlot.pp,
                maxpp: moveSlot.maxpp,
                target: target,
                disabled: disabled,
            });
        }
        return hasValidMove ? moves : [];
    };
    /** This should be passed the base move and not the corresponding max move so we can check how much PP is left. */
    Pokemon.prototype.maxMoveDisabled = function (baseMove) {
        var _a;
        baseMove = this.battle.dex.moves.get(baseMove);
        if (!((_a = this.getMoveData(baseMove.id)) === null || _a === void 0 ? void 0 : _a.pp))
            return true;
        return !!(baseMove.category === 'Status' && (this.hasItem('assaultvest') || this.volatiles['taunt']));
    };
    Pokemon.prototype.getDynamaxRequest = function (skipChecks) {
        var _a;
        // {gigantamax?: string, maxMoves: {[k: string]: string} | null}[]
        if (!skipChecks) {
            if (!this.side.canDynamaxNow())
                return;
            if (this.species.isMega || this.species.isPrimal || this.species.forme === "Ultra" ||
                this.getItem().zMove || this.canMegaEvo) {
                return;
            }
            // Some pokemon species are unable to dynamax
            if (this.species.cannotDynamax || ((_a = this.illusion) === null || _a === void 0 ? void 0 : _a.species.cannotDynamax))
                return;
        }
        var result = { maxMoves: [] };
        var atLeastOne = false;
        for (var _i = 0, _b = this.moveSlots; _i < _b.length; _i++) {
            var moveSlot = _b[_i];
            var move = this.battle.dex.moves.get(moveSlot.id);
            var maxMove = this.battle.actions.getMaxMove(move, this);
            if (maxMove) {
                if (this.maxMoveDisabled(move)) {
                    result.maxMoves.push({ move: maxMove.id, target: maxMove.target, disabled: true });
                }
                else {
                    result.maxMoves.push({ move: maxMove.id, target: maxMove.target });
                    atLeastOne = true;
                }
            }
        }
        if (!atLeastOne)
            return;
        if (this.canGigantamax)
            result.gigantamax = this.canGigantamax;
        return result;
    };
    Pokemon.prototype.getMoveRequestData = function () {
        var lockedMove = this.getLockedMove();
        // Information should be restricted for the last active Pokémon
        var isLastActive = this.isLastActive();
        var canSwitchIn = this.battle.canSwitch(this.side) > 0;
        var moves = this.getMoves(lockedMove, isLastActive);
        if (!moves.length) {
            moves = [{ move: 'Struggle', id: 'struggle', target: 'randomNormal', disabled: false }];
            lockedMove = 'struggle';
        }
        var data = {
            moves: moves,
        };
        if (isLastActive) {
            if (this.maybeDisabled) {
                data.maybeDisabled = true;
            }
            if (canSwitchIn) {
                if (this.trapped === true) {
                    data.trapped = true;
                }
                else if (this.maybeTrapped) {
                    data.maybeTrapped = true;
                }
            }
        }
        else if (canSwitchIn) {
            // Discovered by selecting a valid Pokémon as a switch target and cancelling.
            if (this.trapped)
                data.trapped = true;
        }
        if (!lockedMove) {
            if (this.canMegaEvo)
                data.canMegaEvo = true;
            if (this.canUltraBurst)
                data.canUltraBurst = true;
            var canZMove = this.battle.actions.canZMove(this);
            if (canZMove)
                data.canZMove = canZMove;
            if (this.getDynamaxRequest())
                data.canDynamax = true;
            if (data.canDynamax || this.volatiles['dynamax'])
                data.maxMoves = this.getDynamaxRequest(true);
            if (this.canTerastallize)
                data.canTerastallize = this.canTerastallize;
        }
        return data;
    };
    Pokemon.prototype.getSwitchRequestData = function (forAlly) {
        var _this = this;
        var entry = {
            ident: this.fullname,
            details: this.details,
            condition: this.getHealth().secret,
            active: (this.position < this.side.active.length),
            stats: {
                atk: this.baseStoredStats['atk'],
                def: this.baseStoredStats['def'],
                spa: this.baseStoredStats['spa'],
                spd: this.baseStoredStats['spd'],
                spe: this.baseStoredStats['spe'],
            },
            moves: this[forAlly ? 'baseMoves' : 'moves'].map(function (move) {
                if (move === 'hiddenpower') {
                    return move + (0, dex_1.toID)(_this.hpType) + (_this.battle.gen < 6 ? '' : _this.hpPower);
                }
                if (move === 'frustration' || move === 'return') {
                    var basePowerCallback = _this.battle.dex.moves.get(move).basePowerCallback;
                    return move + basePowerCallback(_this);
                }
                return move;
            }),
            baseAbility: this.baseAbility,
            item: this.item,
            pokeball: this.pokeball,
        };
        if (this.battle.gen > 6)
            entry.ability = this.ability;
        if (this.battle.gen >= 9) {
            entry.commanding = !!this.volatiles['commanding'] && !this.fainted;
            entry.reviving = this.isActive && !!this.side.slotConditions[this.position]['revivalblessing'];
        }
        if (this.battle.gen === 9) {
            entry.teraType = this.teraType;
            entry.terastallized = this.terastallized || '';
        }
        return entry;
    };
    Pokemon.prototype.isLastActive = function () {
        if (!this.isActive)
            return false;
        var allyActive = this.side.active;
        for (var i = this.position + 1; i < allyActive.length; i++) {
            if (allyActive[i] && !allyActive[i].fainted)
                return false;
        }
        return true;
    };
    Pokemon.prototype.positiveBoosts = function () {
        var boosts = 0;
        var boost;
        for (boost in this.boosts) {
            if (this.boosts[boost] > 0)
                boosts += this.boosts[boost];
        }
        return boosts;
    };
    Pokemon.prototype.getCappedBoost = function (boosts) {
        var cappedBoost = {};
        var boostName;
        for (boostName in boosts) {
            var boost = boosts[boostName];
            if (!boost)
                continue;
            cappedBoost[boostName] = this.battle.clampIntRange(this.boosts[boostName] + boost, -6, 6) - this.boosts[boostName];
        }
        return cappedBoost;
    };
    Pokemon.prototype.boostBy = function (boosts) {
        boosts = this.getCappedBoost(boosts);
        var delta = 0;
        var boostName;
        for (boostName in boosts) {
            delta = boosts[boostName];
            this.boosts[boostName] += delta;
        }
        return delta;
    };
    Pokemon.prototype.clearBoosts = function () {
        var boostName;
        for (boostName in this.boosts) {
            this.boosts[boostName] = 0;
        }
    };
    Pokemon.prototype.setBoost = function (boosts) {
        var boostName;
        for (boostName in boosts) {
            this.boosts[boostName] = boosts[boostName];
        }
    };
    Pokemon.prototype.copyVolatileFrom = function (pokemon, switchCause) {
        this.clearVolatile();
        if (switchCause !== 'shedtail')
            this.boosts = pokemon.boosts;
        for (var i in pokemon.volatiles) {
            if (switchCause === 'shedtail' && i !== 'substitute')
                continue;
            if (this.battle.dex.conditions.getByID(i).noCopy)
                continue;
            // shallow clones
            this.volatiles[i] = __assign({}, pokemon.volatiles[i]);
            if (this.volatiles[i].linkedPokemon) {
                delete pokemon.volatiles[i].linkedPokemon;
                delete pokemon.volatiles[i].linkedStatus;
                for (var _i = 0, _a = this.volatiles[i].linkedPokemon; _i < _a.length; _i++) {
                    var linkedPoke = _a[_i];
                    var linkedPokeLinks = linkedPoke.volatiles[this.volatiles[i].linkedStatus].linkedPokemon;
                    linkedPokeLinks[linkedPokeLinks.indexOf(pokemon)] = this;
                }
            }
        }
        pokemon.clearVolatile();
        for (var i in this.volatiles) {
            var volatile = this.getVolatile(i);
            this.battle.singleEvent('Copy', volatile, this.volatiles[i], this);
        }
    };
    Pokemon.prototype.transformInto = function (pokemon, effect) {
        var species = pokemon.species;
        if (pokemon.fainted || this.illusion || pokemon.illusion || (pokemon.volatiles['substitute'] && this.battle.gen >= 5) ||
            (pokemon.transformed && this.battle.gen >= 2) || (this.transformed && this.battle.gen >= 5) ||
            species.name === 'Eternatus-Eternamax' || (species.baseSpecies === 'Ogerpon' &&
            (this.terastallized || pokemon.terastallized))) {
            return false;
        }
        if (this.battle.dex.currentMod === 'gen1stadium' && (species.name === 'Ditto' ||
            (this.species.name === 'Ditto' && pokemon.moves.includes('transform')))) {
            return false;
        }
        if (!this.setSpecies(species, effect, true))
            return false;
        this.transformed = true;
        this.weighthg = pokemon.weighthg;
        var types = pokemon.getTypes(true, true);
        this.setType(pokemon.volatiles['roost'] ? pokemon.volatiles['roost'].typeWas : types, true);
        this.addedType = pokemon.addedType;
        this.knownType = this.isAlly(pokemon) && pokemon.knownType;
        this.apparentType = pokemon.apparentType;
        var statName;
        for (statName in this.storedStats) {
            this.storedStats[statName] = pokemon.storedStats[statName];
            if (this.modifiedStats)
                this.modifiedStats[statName] = pokemon.modifiedStats[statName]; // Gen 1: Copy modified stats.
        }
        this.moveSlots = [];
        this.hpType = (this.battle.gen >= 5 ? this.hpType : pokemon.hpType);
        this.hpPower = (this.battle.gen >= 5 ? this.hpPower : pokemon.hpPower);
        this.timesAttacked = pokemon.timesAttacked;
        for (var _i = 0, _a = pokemon.moveSlots; _i < _a.length; _i++) {
            var moveSlot = _a[_i];
            var moveName = moveSlot.move;
            if (moveSlot.id === 'hiddenpower') {
                moveName = 'Hidden Power ' + this.hpType;
            }
            this.moveSlots.push({
                move: moveName,
                id: moveSlot.id,
                pp: moveSlot.maxpp === 1 ? 1 : 5,
                maxpp: this.battle.gen >= 5 ? (moveSlot.maxpp === 1 ? 1 : 5) : moveSlot.maxpp,
                target: moveSlot.target,
                disabled: false,
                used: false,
                virtual: true,
            });
        }
        var boostName;
        for (boostName in pokemon.boosts) {
            this.boosts[boostName] = pokemon.boosts[boostName];
        }
        if (this.battle.gen >= 6) {
            var volatilesToCopy = ['focusenergy', 'gmaxchistrike', 'laserfocus'];
            for (var _b = 0, volatilesToCopy_1 = volatilesToCopy; _b < volatilesToCopy_1.length; _b++) {
                var volatile = volatilesToCopy_1[_b];
                if (pokemon.volatiles[volatile]) {
                    this.addVolatile(volatile);
                    if (volatile === 'gmaxchistrike')
                        this.volatiles[volatile].layers = pokemon.volatiles[volatile].layers;
                }
                else {
                    this.removeVolatile(volatile);
                }
            }
        }
        if (effect) {
            this.battle.add('-transform', this, pokemon, '[from] ' + effect.fullname);
        }
        else {
            this.battle.add('-transform', this, pokemon);
        }
        if (this.terastallized) {
            this.knownType = true;
            this.apparentType = this.terastallized;
        }
        if (this.battle.gen > 2)
            this.setAbility(pokemon.ability, this, true, true);
        // Change formes based on held items (for Transform)
        // Only ever relevant in Generation 4 since Generation 3 didn't have item-based forme changes
        if (this.battle.gen === 4) {
            if (this.species.num === 487) {
                // Giratina formes
                if (this.species.name === 'Giratina' && this.item === 'griseousorb') {
                    this.formeChange('Giratina-Origin');
                }
                else if (this.species.name === 'Giratina-Origin' && this.item !== 'griseousorb') {
                    this.formeChange('Giratina');
                }
            }
            if (this.species.num === 493) {
                // Arceus formes
                var item = this.getItem();
                var targetForme = ((item === null || item === void 0 ? void 0 : item.onPlate) ? 'Arceus-' + item.onPlate : 'Arceus');
                if (this.species.name !== targetForme) {
                    this.formeChange(targetForme);
                }
            }
        }
        // Pokemon transformed into Ogerpon cannot Terastallize
        // restoring their ability to tera after they untransform is handled ELSEWHERE
        if (this.species.baseSpecies === 'Ogerpon' && this.canTerastallize)
            this.canTerastallize = false;
        return true;
    };
    /**
     * Changes this Pokemon's species to the given speciesId (or species).
     * This function only handles changes to stats and type.
     * Use formChange to handle changes to ability and sending client messages.
     */
    Pokemon.prototype.setSpecies = function (rawSpecies, source, isTransform) {
        if (source === void 0) { source = this.battle.effect; }
        if (isTransform === void 0) { isTransform = false; }
        var species = this.battle.runEvent('ModifySpecies', this, null, source, rawSpecies);
        if (!species)
            return null;
        this.species = species;
        this.setType(species.types, true);
        this.apparentType = rawSpecies.types.join('/');
        this.addedType = species.addedType || '';
        this.knownType = true;
        this.weighthg = species.weighthg;
        var stats = this.battle.spreadModify(this.species.baseStats, this.set);
        if (this.species.maxHP)
            stats.hp = this.species.maxHP;
        if (!this.maxhp) {
            this.baseMaxhp = stats.hp;
            this.maxhp = stats.hp;
            this.hp = stats.hp;
        }
        if (!isTransform)
            this.baseStoredStats = stats;
        var statName;
        for (statName in this.storedStats) {
            this.storedStats[statName] = stats[statName];
            if (this.modifiedStats)
                this.modifiedStats[statName] = stats[statName]; // Gen 1: Reset modified stats.
        }
        if (this.battle.gen <= 1) {
            // Gen 1: Re-Apply burn and para drops.
            if (this.status === 'par')
                this.modifyStat('spe', 0.25);
            if (this.status === 'brn')
                this.modifyStat('atk', 0.5);
        }
        this.speed = this.storedStats.spe;
        return species;
    };
    /**
     * Changes this Pokemon's forme to match the given speciesId (or species).
     * This function handles all changes to stats, ability, type, species, etc.
     * as well as sending all relevant messages sent to the client.
     */
    Pokemon.prototype.formeChange = function (speciesId, source, isPermanent, message) {
        if (source === void 0) { source = this.battle.effect; }
        var rawSpecies = this.battle.dex.species.get(speciesId);
        var species = this.setSpecies(rawSpecies, source);
        if (!species)
            return false;
        if (this.battle.gen <= 2)
            return true;
        // The species the opponent sees
        var apparentSpecies = this.illusion ? this.illusion.species.name : species.baseSpecies;
        if (isPermanent) {
            this.baseSpecies = rawSpecies;
            this.details = species.name + (this.level === 100 ? '' : ', L' + this.level) +
                (this.gender === '' ? '' : ', ' + this.gender) + (this.set.shiny ? ', shiny' : '');
            var details = (this.illusion || this).details;
            if (this.terastallized)
                details += ", tera:".concat(this.terastallized);
            this.battle.add('detailschange', this, details);
            if (source.effectType === 'Item') {
                this.canTerastallize = null; // National Dex behavior
                if (source.zMove) {
                    this.battle.add('-burst', this, apparentSpecies, species.requiredItem);
                    this.moveThisTurnResult = true; // Ultra Burst counts as an action for Truant
                }
                else if (source.onPrimal) {
                    if (this.illusion) {
                        this.ability = '';
                        this.battle.add('-primal', this.illusion, species.requiredItem);
                    }
                    else {
                        this.battle.add('-primal', this, species.requiredItem);
                    }
                }
                else {
                    // So a Mega Evolution message isn't sent while we're waiting on Ogerpon text
                    if (source.megaEvolves) {
                        this.battle.add('-mega', this, apparentSpecies, species.requiredItem);
                    }
                    this.moveThisTurnResult = true; // Mega Evolution counts as an action for Truant
                }
            }
            else if (source.effectType === 'Status') {
                // Shaymin-Sky -> Shaymin
                this.battle.add('-formechange', this, species.name, message);
            }
        }
        else {
            if (source.effectType === 'Ability') {
                this.battle.add('-formechange', this, species.name, message, "[from] ability: ".concat(source.name));
            }
            else {
                this.battle.add('-formechange', this, this.illusion ? this.illusion.species.name : species.name, message);
            }
        }
        if (isPermanent && !['disguise', 'iceface'].includes(source.id)) {
            if (this.illusion) {
                this.ability = ''; // Don't allow Illusion to wear off
            }
            this.setAbility(species.abilities['0'], null, true);
            this.baseAbility = this.ability;
        }
        if (this.terastallized) {
            this.knownType = true;
            this.apparentType = this.terastallized;
        }
        return true;
    };
    Pokemon.prototype.clearVolatile = function (includeSwitchFlags) {
        if (includeSwitchFlags === void 0) { includeSwitchFlags = true; }
        this.boosts = {
            atk: 0,
            def: 0,
            spa: 0,
            spd: 0,
            spe: 0,
            accuracy: 0,
            evasion: 0,
        };
        if (this.battle.gen === 1 && this.baseMoves.includes('mimic') && !this.transformed) {
            var moveslot = this.baseMoves.indexOf('mimic');
            var mimicPP = this.moveSlots[moveslot] ? this.moveSlots[moveslot].pp : 16;
            this.moveSlots = this.baseMoveSlots.slice();
            this.moveSlots[moveslot].pp = mimicPP;
        }
        else {
            this.moveSlots = this.baseMoveSlots.slice();
        }
        this.transformed = false;
        this.ability = this.baseAbility;
        this.hpType = this.baseHpType;
        this.hpPower = this.baseHpPower;
        if (this.canTerastallize === false)
            this.canTerastallize = this.teraType;
        for (var i in this.volatiles) {
            if (this.volatiles[i].linkedStatus) {
                this.removeLinkedVolatiles(this.volatiles[i].linkedStatus, this.volatiles[i].linkedPokemon);
            }
        }
        if (this.species.name === 'Eternatus-Eternamax' && this.volatiles['dynamax']) {
            this.volatiles = { dynamax: this.volatiles['dynamax'] };
        }
        else {
            this.volatiles = {};
        }
        if (includeSwitchFlags) {
            this.switchFlag = false;
            this.forceSwitchFlag = false;
        }
        this.lastMove = null;
        if (this.battle.gen === 2)
            this.lastMoveEncore = null;
        this.lastMoveUsed = null;
        this.moveThisTurn = '';
        this.lastDamage = 0;
        this.attackedBy = [];
        this.hurtThisTurn = null;
        this.newlySwitched = true;
        this.beingCalledBack = false;
        this.volatileStaleness = undefined;
        this.setSpecies(this.baseSpecies);
    };
    Pokemon.prototype.hasType = function (type) {
        var thisTypes = this.getTypes();
        if (typeof type === 'string') {
            return thisTypes.includes(type);
        }
        for (var _i = 0, type_1 = type; _i < type_1.length; _i++) {
            var typeName = type_1[_i];
            if (thisTypes.includes(typeName))
                return true;
        }
        return false;
    };
    /**
     * This function only puts the pokemon in the faint queue;
     * actually setting of this.fainted comes later when the
     * faint queue is resolved.
     *
     * Returns the amount of damage actually dealt
     */
    Pokemon.prototype.faint = function (source, effect) {
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (this.fainted || this.faintQueued)
            return 0;
        var d = this.hp;
        this.hp = 0;
        this.switchFlag = false;
        this.faintQueued = true;
        this.battle.faintQueue.push({
            target: this,
            source: source,
            effect: effect,
        });
        return d;
    };
    Pokemon.prototype.damage = function (d, source, effect) {
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (!this.hp || isNaN(d) || d <= 0)
            return 0;
        if (d < 1 && d > 0)
            d = 1;
        d = this.battle.trunc(d);
        this.hp -= d;
        if (this.hp <= 0) {
            d += this.hp;
            this.faint(source, effect);
        }
        return d;
    };
    Pokemon.prototype.tryTrap = function (isHidden) {
        if (isHidden === void 0) { isHidden = false; }
        if (!this.runStatusImmunity('trapped'))
            return false;
        if (this.trapped && isHidden)
            return true;
        this.trapped = isHidden ? 'hidden' : true;
        return true;
    };
    Pokemon.prototype.hasMove = function (moveid) {
        moveid = (0, dex_1.toID)(moveid);
        if (moveid.substr(0, 11) === 'hiddenpower')
            moveid = 'hiddenpower';
        for (var _i = 0, _a = this.moveSlots; _i < _a.length; _i++) {
            var moveSlot = _a[_i];
            if (moveid === moveSlot.id) {
                return moveid;
            }
        }
        return false;
    };
    Pokemon.prototype.disableMove = function (moveid, isHidden, sourceEffect) {
        if (!sourceEffect && this.battle.event) {
            sourceEffect = this.battle.effect;
        }
        moveid = (0, dex_1.toID)(moveid);
        for (var _i = 0, _a = this.moveSlots; _i < _a.length; _i++) {
            var moveSlot = _a[_i];
            if (moveSlot.id === moveid && moveSlot.disabled !== true) {
                moveSlot.disabled = (isHidden || true);
                moveSlot.disabledSource = ((sourceEffect === null || sourceEffect === void 0 ? void 0 : sourceEffect.name) || moveSlot.move);
            }
        }
    };
    /** Returns the amount of damage actually healed */
    Pokemon.prototype.heal = function (d, source, effect) {
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (!this.hp)
            return false;
        d = this.battle.trunc(d);
        if (isNaN(d))
            return false;
        if (d <= 0)
            return false;
        if (this.hp >= this.maxhp)
            return false;
        this.hp += d;
        if (this.hp > this.maxhp) {
            d -= this.hp - this.maxhp;
            this.hp = this.maxhp;
        }
        return d;
    };
    /** Sets HP, returns delta */
    Pokemon.prototype.sethp = function (d) {
        if (!this.hp)
            return 0;
        d = this.battle.trunc(d);
        if (isNaN(d))
            return;
        if (d < 1)
            d = 1;
        d = d - this.hp;
        this.hp += d;
        if (this.hp > this.maxhp) {
            d -= this.hp - this.maxhp;
            this.hp = this.maxhp;
        }
        return d;
    };
    Pokemon.prototype.trySetStatus = function (status, source, sourceEffect) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        return this.setStatus(this.status || status, source, sourceEffect);
    };
    /** Unlike clearStatus, gives cure message */
    Pokemon.prototype.cureStatus = function (silent) {
        if (silent === void 0) { silent = false; }
        if (!this.hp || !this.status)
            return false;
        this.battle.add('-curestatus', this, this.status, silent ? '[silent]' : '[msg]');
        if (this.status === 'slp' && this.removeVolatile('nightmare')) {
            this.battle.add('-end', this, 'Nightmare', '[silent]');
        }
        this.setStatus('');
        return true;
    };
    Pokemon.prototype.setStatus = function (status, source, sourceEffect, ignoreImmunities) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        if (ignoreImmunities === void 0) { ignoreImmunities = false; }
        if (!this.hp)
            return false;
        status = this.battle.dex.conditions.get(status);
        if (this.battle.event) {
            if (!source)
                source = this.battle.event.source;
            if (!sourceEffect)
                sourceEffect = this.battle.effect;
        }
        if (!source)
            source = this;
        if (this.status === status.id) {
            if ((sourceEffect === null || sourceEffect === void 0 ? void 0 : sourceEffect.status) === this.status) {
                this.battle.add('-fail', this, this.status);
            }
            else if (sourceEffect === null || sourceEffect === void 0 ? void 0 : sourceEffect.status) {
                this.battle.add('-fail', source);
                this.battle.attrLastMove('[still]');
            }
            return false;
        }
        if (!ignoreImmunities && status.id &&
            !((source === null || source === void 0 ? void 0 : source.hasAbility('corrosion')) && ['tox', 'psn'].includes(status.id))) {
            // the game currently never ignores immunities
            if (!this.runStatusImmunity(status.id === 'tox' ? 'psn' : status.id)) {
                this.battle.debug('immune to status');
                if (sourceEffect === null || sourceEffect === void 0 ? void 0 : sourceEffect.status) {
                    this.battle.add('-immune', this);
                }
                return false;
            }
        }
        var prevStatus = this.status;
        var prevStatusState = this.statusState;
        if (status.id) {
            var result = this.battle.runEvent('SetStatus', this, source, sourceEffect, status);
            if (!result) {
                this.battle.debug('set status [' + status.id + '] interrupted');
                return result;
            }
        }
        this.status = status.id;
        this.statusState = { id: status.id, target: this };
        if (source)
            this.statusState.source = source;
        if (status.duration)
            this.statusState.duration = status.duration;
        if (status.durationCallback) {
            this.statusState.duration = status.durationCallback.call(this.battle, this, source, sourceEffect);
        }
        if (status.id && !this.battle.singleEvent('Start', status, this.statusState, this, source, sourceEffect)) {
            this.battle.debug('status start [' + status.id + '] interrupted');
            // cancel the setstatus
            this.status = prevStatus;
            this.statusState = prevStatusState;
            return false;
        }
        if (status.id && !this.battle.runEvent('AfterSetStatus', this, source, sourceEffect, status)) {
            return false;
        }
        return true;
    };
    /**
     * Unlike cureStatus, does not give cure message
     */
    Pokemon.prototype.clearStatus = function () {
        if (!this.hp || !this.status)
            return false;
        if (this.status === 'slp' && this.removeVolatile('nightmare')) {
            this.battle.add('-end', this, 'Nightmare', '[silent]');
        }
        this.setStatus('');
        return true;
    };
    Pokemon.prototype.getStatus = function () {
        return this.battle.dex.conditions.getByID(this.status);
    };
    Pokemon.prototype.eatItem = function (force, source, sourceEffect) {
        if (!this.item || this.itemState.knockedOff)
            return false;
        if ((!this.hp && this.item !== 'jabocaberry' && this.item !== 'rowapberry') || !this.isActive)
            return false;
        if (!sourceEffect && this.battle.effect)
            sourceEffect = this.battle.effect;
        if (!source && this.battle.event && this.battle.event.target)
            source = this.battle.event.target;
        var item = this.getItem();
        if (this.battle.runEvent('UseItem', this, null, null, item) &&
            (force || this.battle.runEvent('TryEatItem', this, null, null, item))) {
            this.battle.add('-enditem', this, item, '[eat]');
            this.battle.singleEvent('Eat', item, this.itemState, this, source, sourceEffect);
            this.battle.runEvent('EatItem', this, null, null, item);
            if (exports.RESTORATIVE_BERRIES.has(item.id)) {
                switch (this.pendingStaleness) {
                    case 'internal':
                        if (this.staleness !== 'external')
                            this.staleness = 'internal';
                        break;
                    case 'external':
                        this.staleness = 'external';
                        break;
                }
                this.pendingStaleness = undefined;
            }
            this.lastItem = this.item;
            this.item = '';
            this.itemState = { id: '', target: this };
            this.usedItemThisTurn = true;
            this.ateBerry = true;
            this.battle.runEvent('AfterUseItem', this, null, null, item);
            return true;
        }
        return false;
    };
    Pokemon.prototype.useItem = function (source, sourceEffect) {
        if ((!this.hp && !this.getItem().isGem) || !this.isActive)
            return false;
        if (!this.item || this.itemState.knockedOff)
            return false;
        if (!sourceEffect && this.battle.effect)
            sourceEffect = this.battle.effect;
        if (!source && this.battle.event && this.battle.event.target)
            source = this.battle.event.target;
        var item = this.getItem();
        if (this.battle.runEvent('UseItem', this, null, null, item)) {
            switch (item.id) {
                case 'redcard':
                    this.battle.add('-enditem', this, item, '[of] ' + source);
                    break;
                default:
                    if (item.isGem) {
                        this.battle.add('-enditem', this, item, '[from] gem');
                    }
                    else {
                        this.battle.add('-enditem', this, item);
                    }
                    break;
            }
            if (item.boosts) {
                this.battle.boost(item.boosts, this, source, item);
            }
            this.battle.singleEvent('Use', item, this.itemState, this, source, sourceEffect);
            this.lastItem = this.item;
            this.item = '';
            this.itemState = { id: '', target: this };
            this.usedItemThisTurn = true;
            this.battle.runEvent('AfterUseItem', this, null, null, item);
            return true;
        }
        return false;
    };
    Pokemon.prototype.takeItem = function (source) {
        if (!this.isActive)
            return false;
        if (!this.item || this.itemState.knockedOff)
            return false;
        if (!source)
            source = this;
        if (this.battle.gen === 4) {
            if ((0, dex_1.toID)(this.ability) === 'multitype')
                return false;
            if ((0, dex_1.toID)(source.ability) === 'multitype')
                return false;
        }
        var item = this.getItem();
        if (this.battle.runEvent('TakeItem', this, source, null, item)) {
            this.item = '';
            var oldItemState = this.itemState;
            this.itemState = { id: '', target: this };
            this.pendingStaleness = undefined;
            this.battle.singleEvent('End', item, oldItemState, this);
            this.battle.runEvent('AfterTakeItem', this, null, null, item);
            return item;
        }
        return false;
    };
    Pokemon.prototype.setItem = function (item, source, effect) {
        if (!this.hp || !this.isActive)
            return false;
        if (this.itemState.knockedOff)
            return false;
        if (typeof item === 'string')
            item = this.battle.dex.items.get(item);
        var effectid = this.battle.effect ? this.battle.effect.id : '';
        if (exports.RESTORATIVE_BERRIES.has('leppaberry')) {
            var inflicted = ['trick', 'switcheroo'].includes(effectid);
            var external_1 = inflicted && source && !source.isAlly(this);
            this.pendingStaleness = external_1 ? 'external' : 'internal';
        }
        else {
            this.pendingStaleness = undefined;
        }
        var oldItem = this.getItem();
        var oldItemState = this.itemState;
        this.item = item.id;
        this.itemState = { id: item.id, target: this };
        if (oldItem.exists)
            this.battle.singleEvent('End', oldItem, oldItemState, this);
        if (item.id) {
            this.battle.singleEvent('Start', item, this.itemState, this, source, effect);
        }
        return true;
    };
    Pokemon.prototype.getItem = function () {
        return this.battle.dex.items.getByID(this.item);
    };
    Pokemon.prototype.hasItem = function (item) {
        if (Array.isArray(item)) {
            if (!item.map(dex_1.toID).includes(this.item))
                return false;
        }
        else {
            if ((0, dex_1.toID)(item) !== this.item)
                return false;
        }
        return !this.ignoringItem();
    };
    Pokemon.prototype.clearItem = function () {
        return this.setItem('');
    };
    Pokemon.prototype.setAbility = function (ability, source, isFromFormeChange, isTransform) {
        if (isFromFormeChange === void 0) { isFromFormeChange = false; }
        if (isTransform === void 0) { isTransform = false; }
        if (!this.hp)
            return false;
        if (typeof ability === 'string')
            ability = this.battle.dex.abilities.get(ability);
        var oldAbility = this.ability;
        if (!isFromFormeChange) {
            if (ability.isPermanent || this.getAbility().isPermanent)
                return false;
        }
        if (!isTransform) {
            var setAbilityEvent = this.battle.runEvent('SetAbility', this, source, this.battle.effect, ability);
            if (!setAbilityEvent)
                return setAbilityEvent;
        }
        this.battle.singleEvent('End', this.battle.dex.abilities.get(oldAbility), this.abilityState, this, source);
        if (this.battle.effect && this.battle.effect.effectType === 'Move' && !isFromFormeChange) {
            this.battle.add('-endability', this, this.battle.dex.abilities.get(oldAbility), '[from] move: ' +
                this.battle.dex.moves.get(this.battle.effect.id));
        }
        this.ability = ability.id;
        this.abilityState = { id: ability.id, target: this };
        if (ability.id && this.battle.gen > 3 &&
            (!isTransform || oldAbility !== ability.id || this.battle.gen <= 4)) {
            this.battle.singleEvent('Start', ability, this.abilityState, this, source);
        }
        this.abilityOrder = this.battle.abilityOrder++;
        return oldAbility;
    };
    Pokemon.prototype.getAbility = function () {
        return this.battle.dex.abilities.getByID(this.ability);
    };
    Pokemon.prototype.hasAbility = function (ability) {
        if (Array.isArray(ability)) {
            if (!ability.map(dex_1.toID).includes(this.ability))
                return false;
        }
        else {
            if ((0, dex_1.toID)(ability) !== this.ability)
                return false;
        }
        return !this.ignoringAbility();
    };
    Pokemon.prototype.clearAbility = function () {
        return this.setAbility('');
    };
    Pokemon.prototype.getNature = function () {
        return this.battle.dex.natures.get(this.set.nature);
    };
    Pokemon.prototype.addVolatile = function (status, source, sourceEffect, linkedStatus) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        if (linkedStatus === void 0) { linkedStatus = null; }
        var result;
        status = this.battle.dex.conditions.get(status);
        if (!this.hp && !status.affectsFainted)
            return false;
        if (linkedStatus && source && !source.hp)
            return false;
        if (this.battle.event) {
            if (!source)
                source = this.battle.event.source;
            if (!sourceEffect)
                sourceEffect = this.battle.effect;
        }
        if (!source)
            source = this;
        if (this.volatiles[status.id]) {
            if (!status.onRestart)
                return false;
            return this.battle.singleEvent('Restart', status, this.volatiles[status.id], this, source, sourceEffect);
        }
        if (!this.runStatusImmunity(status.id)) {
            this.battle.debug('immune to volatile status');
            if (sourceEffect === null || sourceEffect === void 0 ? void 0 : sourceEffect.status) {
                this.battle.add('-immune', this);
            }
            return false;
        }
        result = this.battle.runEvent('TryAddVolatile', this, source, sourceEffect, status);
        if (!result) {
            this.battle.debug('add volatile [' + status.id + '] interrupted');
            return result;
        }
        this.volatiles[status.id] = { id: status.id, name: status.name, target: this };
        if (source) {
            this.volatiles[status.id].source = source;
            this.volatiles[status.id].sourceSlot = source.getSlot();
        }
        if (sourceEffect)
            this.volatiles[status.id].sourceEffect = sourceEffect;
        if (status.duration)
            this.volatiles[status.id].duration = status.duration;
        if (status.durationCallback) {
            this.volatiles[status.id].duration = status.durationCallback.call(this.battle, this, source, sourceEffect);
        }
        result = this.battle.singleEvent('Start', status, this.volatiles[status.id], this, source, sourceEffect);
        if (!result) {
            // cancel
            delete this.volatiles[status.id];
            return result;
        }
        if (linkedStatus && source) {
            if (!source.volatiles[linkedStatus.toString()]) {
                source.addVolatile(linkedStatus, this, sourceEffect);
                source.volatiles[linkedStatus.toString()].linkedPokemon = [this];
                source.volatiles[linkedStatus.toString()].linkedStatus = status;
            }
            else {
                source.volatiles[linkedStatus.toString()].linkedPokemon.push(this);
            }
            this.volatiles[status.toString()].linkedPokemon = [source];
            this.volatiles[status.toString()].linkedStatus = linkedStatus;
        }
        return true;
    };
    Pokemon.prototype.getVolatile = function (status) {
        status = this.battle.dex.conditions.get(status);
        if (!this.volatiles[status.id])
            return null;
        return status;
    };
    Pokemon.prototype.removeVolatile = function (status) {
        if (!this.hp)
            return false;
        status = this.battle.dex.conditions.get(status);
        if (!this.volatiles[status.id])
            return false;
        this.battle.singleEvent('End', status, this.volatiles[status.id], this);
        var linkedPokemon = this.volatiles[status.id].linkedPokemon;
        var linkedStatus = this.volatiles[status.id].linkedStatus;
        delete this.volatiles[status.id];
        if (linkedPokemon) {
            this.removeLinkedVolatiles(linkedStatus, linkedPokemon);
        }
        return true;
    };
    Pokemon.prototype.removeLinkedVolatiles = function (linkedStatus, linkedPokemon) {
        linkedStatus = linkedStatus.toString();
        for (var _i = 0, linkedPokemon_1 = linkedPokemon; _i < linkedPokemon_1.length; _i++) {
            var linkedPoke = linkedPokemon_1[_i];
            var volatileData = linkedPoke.volatiles[linkedStatus];
            if (!volatileData)
                continue;
            volatileData.linkedPokemon.splice(volatileData.linkedPokemon.indexOf(this), 1);
            if (volatileData.linkedPokemon.length === 0) {
                linkedPoke.removeVolatile(linkedStatus);
            }
        }
    };
    /**
     * Sets a type (except on Arceus, who resists type changes)
     */
    Pokemon.prototype.setType = function (newType, enforce) {
        if (enforce === void 0) { enforce = false; }
        if (!enforce) {
            // First type of Arceus, Silvally cannot be normally changed
            if ((this.battle.gen >= 5 && (this.species.num === 493 || this.species.num === 773)) ||
                (this.battle.gen === 4 && this.hasAbility('multitype'))) {
                return false;
            }
            // Terastallized Pokemon cannot have their base type changed except via forme change
            if (this.terastallized)
                return false;
        }
        if (!newType)
            throw new Error("Must pass type to setType");
        this.types = (typeof newType === 'string' ? [newType] : newType);
        this.addedType = '';
        this.knownType = true;
        this.apparentType = this.types.join('/');
        return true;
    };
    /** Removes any types added previously and adds another one. */
    Pokemon.prototype.addType = function (newType) {
        if (this.terastallized)
            return false;
        this.addedType = newType;
        return true;
    };
    Pokemon.prototype.getTypes = function (excludeAdded, preterastallized) {
        if (!preterastallized && this.terastallized)
            return [this.terastallized];
        var types = this.battle.runEvent('Type', this, null, null, this.types);
        if (!excludeAdded && this.addedType)
            return types.concat(this.addedType);
        if (types.length)
            return types;
        return [this.battle.gen >= 5 ? 'Normal' : '???'];
    };
    Pokemon.prototype.isGrounded = function (negateImmunity) {
        if (negateImmunity === void 0) { negateImmunity = false; }
        if ('gravity' in this.battle.field.pseudoWeather)
            return true;
        if ('ingrain' in this.volatiles && this.battle.gen >= 4)
            return true;
        if ('smackdown' in this.volatiles)
            return true;
        var item = (this.ignoringItem() ? '' : this.item);
        if (item === 'ironball')
            return true;
        // If a Fire/Flying type uses Burn Up and Roost, it becomes ???/Flying-type, but it's still grounded.
        if (!negateImmunity && this.hasType('Flying') && !(this.hasType('???') && 'roost' in this.volatiles))
            return false;
        if (this.hasAbility('levitate') && !this.battle.suppressingAbility(this))
            return null;
        if ('magnetrise' in this.volatiles)
            return false;
        if ('telekinesis' in this.volatiles)
            return false;
        return item !== 'airballoon';
    };
    Pokemon.prototype.isSemiInvulnerable = function () {
        return (this.volatiles['fly'] || this.volatiles['bounce'] || this.volatiles['dive'] || this.volatiles['dig'] ||
            this.volatiles['phantomforce'] || this.volatiles['shadowforce'] || this.isSkyDropped());
    };
    Pokemon.prototype.isSkyDropped = function () {
        if (this.volatiles['skydrop'])
            return true;
        for (var _i = 0, _a = this.side.foe.active; _i < _a.length; _i++) {
            var foeActive = _a[_i];
            if (foeActive.volatiles['skydrop'] && foeActive.volatiles['skydrop'].source === this) {
                return true;
            }
        }
        return false;
    };
    /** Specifically: is protected against a single-target damaging move */
    Pokemon.prototype.isProtected = function () {
        return !!(this.volatiles['protect'] || this.volatiles['detect'] || this.volatiles['maxguard'] ||
            this.volatiles['kingsshield'] || this.volatiles['spikyshield'] || this.volatiles['banefulbunker'] ||
            this.volatiles['obstruct'] || this.volatiles['silktrap']);
    };
    /**
     * Like Field.effectiveWeather(), but ignores sun and rain if
     * the Utility Umbrella is active for the Pokemon.
     */
    Pokemon.prototype.effectiveWeather = function () {
        var weather = this.battle.field.effectiveWeather();
        switch (weather) {
            case 'sunnyday':
            case 'raindance':
            case 'desolateland':
            case 'primordialsea':
                if (this.hasItem('utilityumbrella'))
                    return '';
        }
        return weather;
    };
    Pokemon.prototype.runEffectiveness = function (move) {
        var totalTypeMod = 0;
        for (var _i = 0, _a = this.getTypes(); _i < _a.length; _i++) {
            var type = _a[_i];
            var typeMod = this.battle.dex.getEffectiveness(move, type);
            typeMod = this.battle.singleEvent('Effectiveness', move, null, this, type, move, typeMod);
            totalTypeMod += this.battle.runEvent('Effectiveness', this, type, move, typeMod);
        }
        return totalTypeMod;
    };
    /** false = immune, true = not immune */
    Pokemon.prototype.runImmunity = function (type, message) {
        if (!type || type === '???')
            return true;
        if (!this.battle.dex.types.isName(type)) {
            throw new Error("Use runStatusImmunity for " + type);
        }
        if (this.fainted)
            return false;
        var negateImmunity = !this.battle.runEvent('NegateImmunity', this, type);
        var notImmune = type === 'Ground' ?
            this.isGrounded(negateImmunity) :
            negateImmunity || this.battle.dex.getImmunity(type, this);
        if (notImmune)
            return true;
        if (!message)
            return false;
        if (notImmune === null) {
            this.battle.add('-immune', this, '[from] ability: Levitate');
        }
        else {
            this.battle.add('-immune', this);
        }
        return false;
    };
    Pokemon.prototype.runStatusImmunity = function (type, message) {
        if (this.fainted)
            return false;
        if (!type)
            return true;
        if (!this.battle.dex.getImmunity(type, this)) {
            this.battle.debug('natural status immunity');
            if (message) {
                this.battle.add('-immune', this);
            }
            return false;
        }
        var immunity = this.battle.runEvent('Immunity', this, null, null, type);
        if (!immunity) {
            this.battle.debug('artificial status immunity');
            if (message && immunity !== null) {
                this.battle.add('-immune', this);
            }
            return false;
        }
        return true;
    };
    Pokemon.prototype.destroy = function () {
        // deallocate ourself
        // get rid of some possibly-circular references
        this.battle = null;
        this.side = null;
    };
    return Pokemon;
}());
exports.Pokemon = Pokemon;
