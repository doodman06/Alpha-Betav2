"use strict";
/**
 * Team Validator
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Handles team validation, and specifically learnset checking.
 *
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamValidator = exports.PokemonSources = void 0;
var dex_1 = require("./dex");
var lib_1 = require("../lib");
var tags_1 = require("../data/tags");
var teams_1 = require("./teams");
var prng_1 = require("./prng");
/**
 * Represents a set of possible ways to get a Pokémon with a given
 * set.
 *
 * `new PokemonSources()` creates an empty set;
 * `new PokemonSources(dex.gen)` allows all Pokemon.
 *
 * The set mainly stored as an Array `sources`, but for sets that
 * could be sourced from anywhere (for instance, TM moves), we
 * instead just set `sourcesBefore` to a number meaning "any
 * source at or before this gen is possible."
 *
 * In other words, this variable represents the set of all
 * sources in `sources`, union all sources at or before
 * gen `sourcesBefore`.
 */
var PokemonSources = /** @class */ (function () {
    function PokemonSources(sourcesBefore, sourcesAfter) {
        if (sourcesBefore === void 0) { sourcesBefore = 0; }
        if (sourcesAfter === void 0) { sourcesAfter = 0; }
        this.sources = [];
        this.sourcesBefore = sourcesBefore;
        this.sourcesAfter = sourcesAfter;
        this.isHidden = null;
        this.limitedEggMoves = undefined;
        this.moveEvoCarryCount = 0;
        this.dreamWorldMoveCount = 0;
    }
    PokemonSources.prototype.size = function () {
        if (this.sourcesBefore)
            return Infinity;
        return this.sources.length;
    };
    PokemonSources.prototype.add = function (source, limitedEggMove) {
        if (this.sources[this.sources.length - 1] !== source)
            this.sources.push(source);
        if (limitedEggMove) {
            if (source.substr(0, 3) === '1ET') {
                this.tradebackLimitedEggMoves = [limitedEggMove];
            }
        }
        if (limitedEggMove && this.limitedEggMoves !== null) {
            this.limitedEggMoves = [limitedEggMove];
        }
        else if (limitedEggMove === null) {
            this.limitedEggMoves = null;
        }
    };
    PokemonSources.prototype.addGen = function (sourceGen) {
        this.sourcesBefore = Math.max(this.sourcesBefore, sourceGen);
        this.limitedEggMoves = null;
    };
    PokemonSources.prototype.minSourceGen = function () {
        if (this.sourcesBefore)
            return this.sourcesAfter || 1;
        var min = 10;
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            var sourceGen = parseInt(source.charAt(0));
            if (sourceGen < min)
                min = sourceGen;
        }
        if (min === 10)
            return 0;
        return min;
    };
    PokemonSources.prototype.maxSourceGen = function () {
        var max = this.sourcesBefore;
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            var sourceGen = parseInt(source.charAt(0));
            if (sourceGen > max)
                max = sourceGen;
        }
        return max;
    };
    PokemonSources.prototype.intersectWith = function (other) {
        var _a, _b, _c, _d, _e;
        if (this.pomegEventEgg && other.pomegEggMoves) {
            var newSources = [];
            for (var _i = 0, _f = other.sources; _i < _f.length; _i++) {
                var source = _f[_i];
                newSources.push(source.substr(0, 2) === '3E' ? this.pomegEventEgg : source);
            }
            other.sources = newSources;
        }
        else if (other.pomegEventEgg && this.pomegEventEgg !== null) {
            var newSources = [];
            for (var _g = 0, _h = this.sources; _g < _h.length; _g++) {
                var source = _h[_g];
                newSources.push(source.substr(0, 2) === '3E' ? other.pomegEventEgg : source);
            }
            this.sources = newSources;
            this.pomegEventEgg = other.pomegEventEgg;
        }
        else if (!other.pomegEggMoves && !other.sourcesBefore) {
            this.pomegEventEgg = null;
        }
        if (other.sourcesBefore || this.sourcesBefore) {
            // having sourcesBefore is the equivalent of having everything before that gen
            // in sources, so we fill the other array in preparation for intersection
            if (other.sourcesBefore > this.sourcesBefore) {
                for (var _j = 0, _k = this.sources; _j < _k.length; _j++) {
                    var source = _k[_j];
                    var sourceGen = parseInt(source.charAt(0));
                    if (sourceGen <= other.sourcesBefore) {
                        other.sources.push(source);
                    }
                }
            }
            else if (this.sourcesBefore > other.sourcesBefore) {
                for (var _l = 0, _m = other.sources; _l < _m.length; _l++) {
                    var source = _m[_l];
                    var sourceGen = parseInt(source.charAt(0));
                    if (sourceGen <= this.sourcesBefore) {
                        this.sources.push(source);
                    }
                }
            }
            this.sourcesBefore = Math.min(other.sourcesBefore, this.sourcesBefore);
        }
        if (this.sources.length) {
            if (other.sources.length) {
                var sourcesSet_1 = new Set(other.sources);
                var intersectSources = this.sources.filter(function (source) { return sourcesSet_1.has(source); });
                this.sources = intersectSources;
            }
            else {
                this.sources = [];
            }
        }
        if (other.restrictedMove && other.restrictedMove !== this.restrictedMove) {
            if (this.restrictedMove) {
                // incompatible
                this.sources = [];
                this.sourcesBefore = 0;
            }
            else {
                this.restrictedMove = other.restrictedMove;
            }
        }
        if (other.limitedEggMoves) {
            if (!this.limitedEggMoves) {
                this.limitedEggMoves = other.limitedEggMoves;
            }
            else {
                (_a = this.limitedEggMoves).push.apply(_a, other.limitedEggMoves);
            }
        }
        if (other.possiblyLimitedEggMoves) {
            if (!this.possiblyLimitedEggMoves) {
                this.possiblyLimitedEggMoves = other.possiblyLimitedEggMoves;
            }
            else {
                (_b = this.possiblyLimitedEggMoves).push.apply(_b, other.possiblyLimitedEggMoves);
            }
        }
        if (other.tradebackLimitedEggMoves) {
            if (!this.tradebackLimitedEggMoves) {
                this.tradebackLimitedEggMoves = other.tradebackLimitedEggMoves;
            }
            else {
                (_c = this.tradebackLimitedEggMoves).push.apply(_c, other.tradebackLimitedEggMoves);
            }
        }
        if (other.levelUpEggMoves) {
            if (!this.levelUpEggMoves) {
                this.levelUpEggMoves = other.levelUpEggMoves;
            }
            else {
                (_d = this.levelUpEggMoves).push.apply(_d, other.levelUpEggMoves);
            }
        }
        if (other.pomegEggMoves) {
            if (!this.pomegEggMoves) {
                this.pomegEggMoves = other.pomegEggMoves;
            }
            else {
                (_e = this.pomegEggMoves).push.apply(_e, other.pomegEggMoves);
            }
        }
        if (this.possiblyLimitedEggMoves && !this.sourcesBefore) {
            var eggSources = this.sources.filter(function (source) { return source.charAt(1) === 'E'; });
            var minEggGen = parseInt(eggSources[0]);
            for (var _o = 0, eggSources_1 = eggSources; _o < eggSources_1.length; _o++) {
                var source = eggSources_1[_o];
                minEggGen = Math.min(minEggGen, parseInt(source.charAt(0)));
            }
            if (minEggGen) {
                for (var _p = 0, _q = this.possiblyLimitedEggMoves; _p < _q.length; _p++) {
                    var eggMoveAndGen = _q[_p];
                    if (!this.limitedEggMoves)
                        this.limitedEggMoves = [];
                    if (parseInt(eggMoveAndGen.charAt(0)) < minEggGen) {
                        var eggMove = (0, dex_1.toID)(eggMoveAndGen.substr(1));
                        if (!this.limitedEggMoves.includes(eggMove))
                            this.limitedEggMoves.push(eggMove);
                    }
                }
            }
        }
        var eggTradebackLegal = false;
        for (var _r = 0, _s = this.sources; _r < _s.length; _r++) {
            var source = _s[_r];
            if (source.substr(0, 3) === '1ET') {
                eggTradebackLegal = true;
                break;
            }
        }
        if (!eggTradebackLegal && this.tradebackLimitedEggMoves) {
            for (var _t = 0, _u = this.tradebackLimitedEggMoves; _t < _u.length; _t++) {
                var eggMove = _u[_t];
                if (!this.limitedEggMoves)
                    this.limitedEggMoves = [];
                if (!this.limitedEggMoves.includes(eggMove))
                    this.limitedEggMoves.push(eggMove);
            }
        }
        this.moveEvoCarryCount += other.moveEvoCarryCount;
        this.dreamWorldMoveCount += other.dreamWorldMoveCount;
        if (other.sourcesAfter > this.sourcesAfter)
            this.sourcesAfter = other.sourcesAfter;
        if (other.isHidden)
            this.isHidden = true;
    };
    return PokemonSources;
}());
exports.PokemonSources = PokemonSources;
var TeamValidator = /** @class */ (function () {
    function TeamValidator(format, dex) {
        if (dex === void 0) { dex = dex_1.Dex; }
        this.format = dex.formats.get(format);
        this.dex = dex.forFormat(this.format);
        this.gen = this.dex.gen;
        this.ruleTable = this.dex.formats.getRuleTable(this.format);
        this.minSourceGen = this.ruleTable.minSourceGen;
        this.toID = dex_1.toID;
    }
    TeamValidator.prototype.validateTeam = function (team, options) {
        if (options === void 0) { options = {}; }
        if (team && this.format.validateTeam) {
            return this.format.validateTeam.call(this, team, options) || null;
        }
        return this.baseValidateTeam(team, options);
    };
    TeamValidator.prototype.baseValidateTeam = function (team, options) {
        if (options === void 0) { options = {}; }
        var format = this.format;
        var dex = this.dex;
        var problems = [];
        var ruleTable = this.ruleTable;
        if (format.team) {
            if (team) {
                return [
                    "This format doesn't let you use your own team.",
                    "If you're not using a custom client, please report this as a bug. If you are, remember to use `/utm null` before starting a game in this format.",
                ];
            }
            var testTeamSeed = prng_1.PRNG.generateSeed();
            try {
                var testTeamGenerator = teams_1.Teams.getGenerator(format, testTeamSeed);
                testTeamGenerator.getTeam(options); // Throws error if generation fails
            }
            catch (e) {
                return [
                    "".concat(format.name, "'s team generator (").concat(format.team, ") failed using these rules and seed (").concat(testTeamSeed, "):-"),
                    "".concat(e),
                ];
            }
            return null;
        }
        if (!team) {
            return [
                "This format requires you to use your own team.",
                "If you're not using a custom client, please report this as a bug.",
            ];
        }
        if (!Array.isArray(team)) {
            throw new Error("Invalid team data");
        }
        if (team.length < ruleTable.minTeamSize) {
            problems.push("You must bring at least ".concat(ruleTable.minTeamSize, " Pok\u00E9mon (your team has ").concat(team.length, ")."));
        }
        if (team.length > ruleTable.maxTeamSize) {
            return ["You may only bring up to ".concat(ruleTable.maxTeamSize, " Pok\u00E9mon (your team has ").concat(team.length, ").")];
        }
        // A limit is imposed here to prevent too much engine strain or
        // too much layout deformation - to be exact, this is the limit
        // allowed in Custom Game.
        if (team.length > 24) {
            problems.push("Your team has more than than 24 Pok\u00E9mon, which the simulator can't handle.");
            return problems;
        }
        var teamHas = {};
        var lgpeStarterCount = 0;
        var deoxysType;
        for (var _i = 0, team_1 = team; _i < team_1.length; _i++) {
            var set = team_1[_i];
            if (!set)
                return ["You sent invalid team data. If you're not using a custom client, please report this as a bug."];
            var setProblems = null;
            if (options.skipSets && options.skipSets[set.name]) {
                for (var i in options.skipSets[set.name]) {
                    teamHas[i] = (teamHas[i] || 0) + 1;
                }
            }
            else {
                setProblems = (format.validateSet || this.validateSet).call(this, set, teamHas);
            }
            if (set.species === 'Pikachu-Starter' || set.species === 'Eevee-Starter') {
                lgpeStarterCount++;
                if (lgpeStarterCount === 2 && ruleTable.isBanned('nonexistent')) {
                    problems.push("You can only have one of Pikachu-Starter or Eevee-Starter on a team.");
                }
            }
            if (dex.gen === 3 && set.species.startsWith('Deoxys')) {
                if (!deoxysType) {
                    deoxysType = set.species;
                }
                else if (deoxysType !== set.species && ruleTable.isBanned('nonexistent')) {
                    return [
                        "You cannot have more than one type of Deoxys forme.",
                        "(Each game in Gen 3 supports only one forme of Deoxys.)",
                    ];
                }
            }
            if (setProblems) {
                problems = problems.concat(setProblems);
            }
            if (options.removeNicknames) {
                var useCrossSpeciesNicknames = format.name.includes('Cross Evolution') || ruleTable.has('franticfusionsmod');
                var species = dex.species.get(set.species);
                var crossSpecies = void 0;
                if (useCrossSpeciesNicknames && (crossSpecies = dex.species.get(set.name)).exists) {
                    set.name = crossSpecies.name;
                }
                else {
                    set.name = species.baseSpecies;
                    if (species.baseSpecies === 'Unown')
                        set.species = 'Unown';
                }
            }
        }
        for (var _a = 0, _b = ruleTable.complexTeamBans; _a < _b.length; _a++) {
            var _c = _b[_a], rule = _c[0], source = _c[1], limit = _c[2], bans = _c[3];
            var count = 0;
            for (var _d = 0, bans_1 = bans; _d < bans_1.length; _d++) {
                var ban = bans_1[_d];
                if (teamHas[ban] > 0) {
                    count += limit ? teamHas[ban] : 1;
                }
            }
            if (limit && count > limit) {
                var clause = source ? " by ".concat(source) : "";
                problems.push("You are limited to ".concat(limit, " of ").concat(rule).concat(clause, "."));
            }
            else if (!limit && count >= bans.length) {
                var clause = source ? " by ".concat(source) : "";
                problems.push("Your team has the combination of ".concat(rule, ", which is banned").concat(clause, "."));
            }
        }
        for (var _e = 0, _f = ruleTable.keys(); _e < _f.length; _e++) {
            var rule = _f[_e];
            if ('!+-'.includes(rule.charAt(0)))
                continue;
            var subformat = dex.formats.get(rule);
            if (subformat.onValidateTeam && ruleTable.has(subformat.id)) {
                problems = problems.concat(subformat.onValidateTeam.call(this, team, format, teamHas) || []);
            }
        }
        if (format.onValidateTeam) {
            problems = problems.concat(format.onValidateTeam.call(this, team, format, teamHas) || []);
        }
        if (!problems.length)
            return null;
        return problems;
    };
    TeamValidator.prototype.getEventOnlyData = function (species, noRecurse) {
        var dex = this.dex;
        var learnset = dex.species.getLearnsetData(species.id);
        if (!(learnset === null || learnset === void 0 ? void 0 : learnset.eventOnly)) {
            if (noRecurse)
                return null;
            return this.getEventOnlyData(dex.species.get(species.prevo), true);
        }
        if (!learnset.eventData && species.forme) {
            return this.getEventOnlyData(dex.species.get(species.baseSpecies), true);
        }
        if (!learnset.eventData) {
            throw new Error("Event-only species ".concat(species.name, " has no eventData table"));
        }
        return { species: species, eventData: learnset.eventData };
    };
    TeamValidator.prototype.getValidationSpecies = function (set) {
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        var species = dex.species.get(set.species);
        var item = dex.items.get(set.item);
        var ability = dex.abilities.get(set.ability);
        var outOfBattleSpecies = species;
        var tierSpecies = species;
        if (ability.id === 'battlebond' && (0, dex_1.toID)(species.baseSpecies) === 'greninja') {
            outOfBattleSpecies = dex.species.get('greninjabond');
            if (ruleTable.has('obtainableformes')) {
                tierSpecies = outOfBattleSpecies;
            }
        }
        if (ability.id === 'owntempo' && species.id === 'rockruff') {
            tierSpecies = outOfBattleSpecies = dex.species.get('rockruffdusk');
        }
        if (ruleTable.has('obtainableformes')) {
            var canMegaEvo = dex.gen <= 7 || ruleTable.has('+pokemontag:past');
            if (item.megaEvolves === species.name) {
                if (!item.megaStone)
                    throw new Error("Item ".concat(item.name, " has no base form for mega evolution"));
                tierSpecies = dex.species.get(item.megaStone);
            }
            else if (item.id === 'redorb' && species.id === 'groudon') {
                tierSpecies = dex.species.get('Groudon-Primal');
            }
            else if (item.id === 'blueorb' && species.id === 'kyogre') {
                tierSpecies = dex.species.get('Kyogre-Primal');
            }
            else if (canMegaEvo && species.id === 'rayquaza' && set.moves.map(dex_1.toID).includes('dragonascent') &&
                !ruleTable.has('megarayquazaclause')) {
                tierSpecies = dex.species.get('Rayquaza-Mega');
            }
            else if (item.id === 'rustedsword' && species.id === 'zacian') {
                tierSpecies = dex.species.get('Zacian-Crowned');
            }
            else if (item.id === 'rustedshield' && species.id === 'zamazenta') {
                tierSpecies = dex.species.get('Zamazenta-Crowned');
            }
        }
        return [outOfBattleSpecies, tierSpecies];
    };
    TeamValidator.prototype.validateSet = function (set, teamHas) {
        var _a;
        var format = this.format;
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        var problems = [];
        if (!set) {
            return ["This is not a Pokemon."];
        }
        var species = dex.species.get(set.species);
        set.species = species.name;
        // Backwards compatability with old Gmax format
        if (set.species.toLowerCase().endsWith('-gmax') && this.format.id !== 'gen8megamax') {
            set.species = set.species.slice(0, -5);
            species = dex.species.get(set.species);
            if (set.name && set.name.endsWith('-Gmax'))
                set.name = species.baseSpecies;
            set.gigantamax = true;
        }
        if (set.name && set.name.length > 18) {
            if (set.name === set.species) {
                set.name = species.baseSpecies;
            }
            else {
                problems.push("Nickname \"".concat(set.name, "\" too long (should be 18 characters or fewer)"));
            }
        }
        set.name = dex.getName(set.name);
        var item = dex.items.get(lib_1.Utils.getString(set.item));
        set.item = item.name;
        var ability = dex.abilities.get(lib_1.Utils.getString(set.ability));
        set.ability = ability.name;
        var nature = dex.natures.get(lib_1.Utils.getString(set.nature));
        set.nature = nature.name;
        if (!Array.isArray(set.moves))
            set.moves = [];
        set.name = set.name || species.baseSpecies;
        var name = set.species;
        if (set.species !== set.name && species.baseSpecies !== set.name) {
            name = "".concat(set.name, " (").concat(set.species, ")");
        }
        if (!set.teraType && this.gen === 9) {
            set.teraType = species.types[0];
        }
        if (!set.level)
            set.level = ruleTable.defaultLevel;
        var adjustLevel = ruleTable.adjustLevel;
        if (ruleTable.adjustLevelDown && set.level >= ruleTable.adjustLevelDown) {
            adjustLevel = ruleTable.adjustLevelDown;
        }
        if (set.level === adjustLevel || (set.level === 100 && ruleTable.maxLevel < 100)) {
            // Note that we're temporarily setting level 50 pokemon in VGC to level 100
            // This allows e.g. level 50 Hydreigon even though it doesn't evolve until level 64.
            // Leveling up can't make an obtainable pokemon unobtainable, so this is safe.
            // Just remember to set the level back to adjustLevel at the end of validation.
            set.level = ruleTable.maxLevel;
        }
        if (set.level < ruleTable.minLevel) {
            problems.push("".concat(name, " (level ").concat(set.level, ") is below the minimum level of ").concat(ruleTable.minLevel).concat(ruleTable.blame('minlevel')));
        }
        if (set.level > ruleTable.maxLevel) {
            problems.push("".concat(name, " (level ").concat(set.level, ") is above the maximum level of ").concat(ruleTable.maxLevel).concat(ruleTable.blame('maxlevel')));
        }
        var setHas = {};
        if (!set.evs)
            set.evs = TeamValidator.fillStats(null, ruleTable.evLimit === null ? 252 : 0);
        if (!set.ivs)
            set.ivs = TeamValidator.fillStats(null, 31);
        if (ruleTable.has('obtainableformes')) {
            problems.push.apply(problems, this.validateForme(set));
            species = dex.species.get(set.species);
        }
        var setSources = this.allSources(species);
        for (var _i = 0, ruleTable_1 = ruleTable; _i < ruleTable_1.length; _i++) {
            var rule = ruleTable_1[_i][0];
            if ('!+-'.includes(rule.charAt(0)))
                continue;
            var subformat = dex.formats.get(rule);
            if (subformat.onChangeSet && ruleTable.has(subformat.id)) {
                problems = problems.concat(subformat.onChangeSet.call(this, set, format, setHas, teamHas) || []);
            }
        }
        if (format.onChangeSet) {
            problems = problems.concat(format.onChangeSet.call(this, set, format, setHas, teamHas) || []);
        }
        // onChangeSet can modify set.species, set.item, set.ability
        species = dex.species.get(set.species);
        item = dex.items.get(set.item);
        ability = dex.abilities.get(set.ability);
        var _b = this.getValidationSpecies(set), outOfBattleSpecies = _b[0], tierSpecies = _b[1];
        if (ability.id === 'battlebond' && (0, dex_1.toID)(species.baseSpecies) === 'greninja') {
            if (ruleTable.has('obtainablemisc')) {
                if (set.gender && set.gender !== 'M') {
                    problems.push("Battle Bond Greninja must be male.");
                }
                set.gender = 'M';
            }
        }
        if (species.id === 'melmetal' && set.gigantamax && this.dex.species.getLearnsetData(species.id).eventData) {
            setSources.sourcesBefore = 0;
            setSources.sources = ['8S0 melmetal'];
        }
        if (!species.exists) {
            return ["The Pokemon \"".concat(set.species, "\" does not exist.")];
        }
        if (item.id && !item.exists) {
            return ["\"".concat(set.item, "\" is an invalid item.")];
        }
        if (ability.id && !ability.exists) {
            if (dex.gen < 3) {
                // gen 1-2 don't have abilities, just silently remove
                ability = dex.abilities.get('');
                set.ability = '';
            }
            else {
                return ["\"".concat(set.ability, "\" is an invalid ability.")];
            }
        }
        if (nature.id && !nature.exists) {
            if (dex.gen < 3) {
                // gen 1-2 don't have natures, just remove them
                nature = dex.natures.get('');
                set.nature = '';
            }
            else {
                problems.push("\"".concat(set.nature, "\" is an invalid nature."));
            }
        }
        if (set.happiness !== undefined && isNaN(set.happiness)) {
            problems.push("".concat(name, " has an invalid happiness value."));
        }
        if (set.hpType) {
            var type = dex.types.get(set.hpType);
            if (!type.exists || ['normal', 'fairy'].includes(type.id)) {
                problems.push("".concat(name, "'s Hidden Power type (").concat(set.hpType, ") is invalid."));
            }
            else {
                set.hpType = type.name;
            }
        }
        if (species.forceTeraType) {
            set.teraType = species.forceTeraType;
        }
        if (set.teraType) {
            var type = dex.types.get(set.teraType);
            if (!type.exists) {
                problems.push("".concat(name, "'s Terastal type (").concat(set.teraType, ") is invalid."));
            }
            else {
                set.teraType = type.name;
            }
        }
        var problem = this.checkSpecies(set, species, tierSpecies, setHas);
        if (problem)
            problems.push(problem);
        problem = this.checkItem(set, item, setHas);
        if (problem)
            problems.push(problem);
        if (ruleTable.has('obtainablemisc')) {
            if (dex.gen === 4 && item.id === 'griseousorb' && species.num !== 487) {
                problems.push("".concat(set.name, " cannot hold the Griseous Orb."), "(In Gen 4, only Giratina could hold the Griseous Orb).");
            }
            if (dex.gen <= 1) {
                if (item.id) {
                    // no items allowed
                    set.item = '';
                }
            }
        }
        if (!set.ability)
            set.ability = 'No Ability';
        if (ruleTable.has('obtainableabilities')) {
            if (dex.gen <= 2 || dex.currentMod === 'gen7letsgo') {
                set.ability = 'No Ability';
            }
            else {
                if (!ability.name || ability.name === 'No Ability') {
                    problems.push("".concat(name, " needs to have an ability."));
                }
                else if (!Object.values(species.abilities).includes(ability.name)) {
                    if (tierSpecies.abilities[0] === ability.name) {
                        set.ability = species.abilities[0];
                    }
                    else {
                        problems.push("".concat(name, " can't have ").concat(set.ability, "."));
                    }
                }
                if (ability.name === species.abilities['H']) {
                    setSources.isHidden = true;
                    var unreleasedHidden = species.unreleasedHidden;
                    if (unreleasedHidden === 'Past' && this.minSourceGen < dex.gen)
                        unreleasedHidden = false;
                    if (unreleasedHidden && ruleTable.has('-unreleased')) {
                        problems.push("".concat(name, "'s Hidden Ability is unreleased."));
                    }
                    else if (dex.gen === 7 && ['entei', 'suicune', 'raikou'].includes(species.id) && this.minSourceGen > 1) {
                        problems.push("".concat(name, "'s Hidden Ability is only available from Virtual Console, which is not allowed in this format."));
                    }
                    else if (dex.gen === 6 && ability.name === 'Symbiosis' &&
                        (set.species.endsWith('Orange') || set.species.endsWith('White'))) {
                        problems.push("".concat(name, "'s Hidden Ability is unreleased for the Orange and White forms."));
                    }
                    else if (dex.gen === 5 && set.level < 10 && (species.maleOnlyHidden || species.gender === 'N')) {
                        problems.push("".concat(name, " must be at least level 10 to have a Hidden Ability."));
                    }
                    if (species.maleOnlyHidden) {
                        if (set.gender && set.gender !== 'M') {
                            problems.push("".concat(name, " must be male to have a Hidden Ability."));
                        }
                        set.gender = 'M';
                        setSources.sources = ['5D'];
                    }
                }
                else {
                    setSources.isHidden = false;
                }
            }
        }
        ability = dex.abilities.get(set.ability);
        problem = this.checkAbility(set, ability, setHas);
        if (problem)
            problems.push(problem);
        if (!set.nature || dex.gen <= 2) {
            set.nature = '';
        }
        nature = dex.natures.get(set.nature);
        problem = this.checkNature(set, nature, setHas);
        if (problem)
            problems.push(problem);
        if (set.moves && Array.isArray(set.moves)) {
            set.moves = set.moves.filter(function (val) { return val; });
        }
        if (!((_a = set.moves) === null || _a === void 0 ? void 0 : _a.length)) {
            problems.push("".concat(name, " has no moves (it must have at least one to be usable)."));
            set.moves = [];
        }
        if (set.moves.length > ruleTable.maxMoveCount) {
            problems.push("".concat(name, " has ").concat(set.moves.length, " moves, which is more than the limit of ").concat(ruleTable.maxMoveCount, "."));
            return problems;
        }
        var moveLegalityWhitelist = {};
        for (var _c = 0, _d = set.moves; _c < _d.length; _c++) {
            var moveName = _d[_c];
            if (!moveName)
                continue;
            var move = dex.moves.get(lib_1.Utils.getString(moveName));
            if (!move.exists)
                return ["\"".concat(move.name, "\" is an invalid move.")];
            problem = this.checkMove(set, move, setHas);
            if (problem) {
                var allowedByOM = void 0;
                if (problem.includes('hacking or glitches') &&
                    ruleTable.has('omunobtainablemoves')) {
                    problem = "".concat(name, "'s ").concat(problem);
                    allowedByOM = !this.omCheckCanLearn(move, outOfBattleSpecies, setSources, set, problem);
                }
                if (!allowedByOM) {
                    problems.push(problem);
                }
                else {
                    moveLegalityWhitelist[move.id] = true;
                }
            }
        }
        var pokemonGoProblems = this.validatePokemonGo(outOfBattleSpecies, set, setSources);
        var learnsetSpecies = dex.species.getLearnsetData(outOfBattleSpecies.id);
        var isFromRBYEncounter = false;
        if (this.gen === 1 && ruleTable.has('obtainablemisc') && !this.ruleTable.has('allowtradeback')) {
            var lowestEncounterLevel = void 0;
            for (var _e = 0, _f = learnsetSpecies.encounters || []; _e < _f.length; _e++) {
                var encounter = _f[_e];
                if (encounter.generation !== 1)
                    continue;
                if (!encounter.level)
                    continue;
                if (lowestEncounterLevel && encounter.level > lowestEncounterLevel)
                    continue;
                lowestEncounterLevel = encounter.level;
            }
            if (lowestEncounterLevel) {
                if (set.level < lowestEncounterLevel) {
                    problems.push("".concat(name, " is not obtainable at levels below ").concat(lowestEncounterLevel, " in Gen 1."));
                }
                isFromRBYEncounter = true;
            }
        }
        if (!isFromRBYEncounter && ruleTable.has('obtainablemisc')) {
            // FIXME: Event pokemon given at a level under what it normally can be attained at gives a false positive
            var evoSpecies = species;
            while (evoSpecies.prevo) {
                if (set.level < (evoSpecies.evoLevel || 0)) {
                    if (!pokemonGoProblems || (pokemonGoProblems && pokemonGoProblems.length)) {
                        problems.push("".concat(name, " must be at least level ").concat(evoSpecies.evoLevel, " to be evolved."));
                        if (pokemonGoProblems && pokemonGoProblems.length) {
                            problems.push("It failed to validate as a Pokemon from Pokemon GO because:");
                            for (var _g = 0, pokemonGoProblems_1 = pokemonGoProblems; _g < pokemonGoProblems_1.length; _g++) {
                                var pokemonGoProblem = pokemonGoProblems_1[_g];
                                problems.push(pokemonGoProblem);
                            }
                        }
                    }
                    else {
                        // Pokemon from Pokemon GO can be transferred to LGPE
                        setSources.isFromPokemonGo = true;
                        setSources.sources.push('8V');
                        setSources.sourcesBefore = 0;
                    }
                    break;
                }
                evoSpecies = dex.species.get(evoSpecies.prevo);
            }
        }
        var moveProblems;
        if (ruleTable.has('obtainablemoves')) {
            moveProblems = this.validateMoves(outOfBattleSpecies, set.moves, setSources, set, name, moveLegalityWhitelist);
            problems.push.apply(problems, moveProblems);
        }
        var eventOnlyData;
        if (!setSources.sourcesBefore && setSources.sources.length) {
            var legalSources = [];
            for (var _h = 0, _j = setSources.sources; _h < _j.length; _h++) {
                var source = _j[_h];
                if (this.validateSource(set, source, setSources, outOfBattleSpecies))
                    continue;
                legalSources.push(source);
            }
            if (legalSources.length) {
                setSources.sources = legalSources;
            }
            else {
                var nonEggSource = null;
                for (var _k = 0, _l = setSources.sources; _k < _l.length; _k++) {
                    var source = _l[_k];
                    if (source.charAt(1) !== 'E') {
                        nonEggSource = source;
                        break;
                    }
                }
                if (!nonEggSource) {
                    // all egg moves
                    problems.push("".concat(name, " can't get its egg move combination (").concat(setSources.limitedEggMoves.join(', '), ") from any possible father."));
                    problems.push("(Is this incorrect? If so, post the chainbreeding instructions in Bug Reports)");
                }
                else {
                    if (species.id === 'mew' && pokemonGoProblems && !pokemonGoProblems.length) {
                        // Whitelist Pokemon GO Mew, which cannot be sent to Let's Go
                        setSources.isFromPokemonGo = true;
                    }
                    else {
                        if (setSources.sources.length > 1) {
                            problems.push("".concat(name, " has an event-exclusive move that it doesn't qualify for (only one of several ways to get the move will be listed):"));
                        }
                        var eventProblems = this.validateSource(set, nonEggSource, setSources, outOfBattleSpecies, " because it has a move only available");
                        if (eventProblems)
                            problems.push.apply(problems, eventProblems);
                        if (species.id === 'mew' && pokemonGoProblems && pokemonGoProblems.length) {
                            problems.push("Additionally, it failed to validate as a Pokemon from Pokemon GO because:");
                            for (var _m = 0, pokemonGoProblems_2 = pokemonGoProblems; _m < pokemonGoProblems_2.length; _m++) {
                                var pokemonGoProblem = pokemonGoProblems_2[_m];
                                problems.push(pokemonGoProblem);
                            }
                        }
                    }
                }
            }
        }
        else if (ruleTable.has('obtainablemisc') && (eventOnlyData = this.getEventOnlyData(outOfBattleSpecies))) {
            var eventSpecies = eventOnlyData.species, eventData = eventOnlyData.eventData;
            var legal = false;
            for (var _o = 0, eventData_1 = eventData; _o < eventData_1.length; _o++) {
                var event_1 = eventData_1[_o];
                if (this.validateEvent(set, setSources, event_1, eventSpecies))
                    continue;
                legal = true;
                break;
            }
            if (!legal && species.gen <= 2 && dex.gen >= 7 && !this.validateSource(set, '7V', setSources, species)) {
                legal = true;
            }
            if (!legal) {
                if (!pokemonGoProblems || (pokemonGoProblems && pokemonGoProblems.length)) {
                    if (eventData.length === 1) {
                        problems.push("".concat(species.name, " is only obtainable from an event - it needs to match its event:"));
                    }
                    else {
                        problems.push("".concat(species.name, " is only obtainable from events - it needs to match one of its events:"));
                    }
                    for (var _p = 0, _q = eventData.entries(); _p < _q.length; _p++) {
                        var _r = _q[_p], i = _r[0], event_2 = _r[1];
                        if (event_2.generation <= dex.gen && event_2.generation >= this.minSourceGen) {
                            var eventInfo = event_2;
                            var eventNum = i + 1;
                            var eventName = eventData.length > 1 ? " #".concat(eventNum) : "";
                            var eventProblems = this.validateEvent(set, setSources, eventInfo, eventSpecies, " to be", "from its event".concat(eventName));
                            if (eventProblems)
                                problems.push.apply(problems, eventProblems);
                        }
                    }
                    if (pokemonGoProblems && pokemonGoProblems.length) {
                        problems.push("Additionally, it failed to validate as a Pokemon from Pokemon GO because:");
                        for (var _s = 0, pokemonGoProblems_3 = pokemonGoProblems; _s < pokemonGoProblems_3.length; _s++) {
                            var pokemonGoProblem = pokemonGoProblems_3[_s];
                            problems.push(pokemonGoProblem);
                        }
                    }
                }
                else {
                    setSources.isFromPokemonGo = true;
                }
            }
        }
        // Hardcoded forced validation for Pokemon GO
        var pokemonGoOnlySpecies = ['meltan', 'melmetal', 'gimmighoulroaming'];
        if (ruleTable.has('obtainablemisc') && (pokemonGoOnlySpecies.includes(species.id))) {
            setSources.isFromPokemonGo = true;
            if (pokemonGoProblems && pokemonGoProblems.length) {
                problems.push("".concat(name, " is only obtainable from Pokemon GO, and failed to validate because:"));
                for (var _t = 0, pokemonGoProblems_4 = pokemonGoProblems; _t < pokemonGoProblems_4.length; _t++) {
                    var pokemonGoProblem = pokemonGoProblems_4[_t];
                    problems.push(pokemonGoProblem);
                }
            }
        }
        if (ruleTable.isBanned('nonexistent')) {
            problems.push.apply(problems, this.validateStats(set, species, setSources, pokemonGoProblems));
        }
        // Attempt move validation again after verifying Pokemon GO origin
        if (ruleTable.has('obtainablemoves') && setSources.isFromPokemonGo) {
            setSources.restrictiveMoves = [];
            setSources.sources = ['8V'];
            setSources.sourcesBefore = 0;
            if (moveProblems && !moveProblems.length) {
                problems.push.apply(problems, this.validateMoves(outOfBattleSpecies, set.moves, setSources, set, name, moveLegalityWhitelist));
            }
        }
        if (ruleTable.has('obtainablemoves')) {
            if (species.id === 'keldeo' && set.moves.includes('secretsword') && this.minSourceGen > 5 && dex.gen <= 7) {
                problems.push("".concat(name, " has Secret Sword, which is only compatible with Keldeo-Ordinary obtained from Gen 5."));
            }
            var requiresGen3Source = setSources.maxSourceGen() <= 3;
            if (requiresGen3Source && dex.abilities.get(set.ability).gen === 4 && !species.prevo && dex.gen <= 5) {
                // Ability Capsule allows this in Gen 6+
                problems.push("".concat(name, " has a Gen 4 ability and isn't evolved - it can't use moves from Gen 3."));
            }
            var canUseAbilityPatch = dex.gen >= 8 && format.mod !== 'gen8dlc1';
            if (setSources.isHidden && !canUseAbilityPatch && setSources.maxSourceGen() < 5) {
                problems.push("".concat(name, " has a Hidden Ability - it can't use moves from before Gen 5."));
            }
            if (species.maleOnlyHidden && setSources.isHidden && setSources.sourcesBefore < 5 &&
                setSources.sources.every(function (source) { return source.charAt(1) === 'E'; })) {
                problems.push("".concat(name, " has an unbreedable Hidden Ability - it can't use egg moves."));
            }
        }
        if (teamHas) {
            for (var i in setHas) {
                if (i in teamHas) {
                    teamHas[i]++;
                }
                else {
                    teamHas[i] = 1;
                }
            }
        }
        for (var _u = 0, _v = ruleTable.complexBans; _u < _v.length; _u++) {
            var _w = _v[_u], rule = _w[0], source = _w[1], limit = _w[2], bans = _w[3];
            var count = 0;
            for (var _x = 0, bans_2 = bans; _x < bans_2.length; _x++) {
                var ban = bans_2[_x];
                if (setHas[ban])
                    count++;
            }
            if (limit && count > limit) {
                var clause = source ? " by ".concat(source) : "";
                problems.push("".concat(name, " is limited to ").concat(limit, " of ").concat(rule).concat(clause, "."));
            }
            else if (!limit && count >= bans.length) {
                var clause = source ? " by ".concat(source) : "";
                if (source === 'Obtainable Moves') {
                    problems.push("".concat(name, " has the combination of ").concat(rule, ", which is impossible to obtain legitimately."));
                }
                else {
                    problems.push("".concat(name, " has the combination of ").concat(rule, ", which is banned").concat(clause, "."));
                }
            }
        }
        for (var _y = 0, ruleTable_2 = ruleTable; _y < ruleTable_2.length; _y++) {
            var rule = ruleTable_2[_y][0];
            if ('!+-'.includes(rule.charAt(0)))
                continue;
            var subformat = dex.formats.get(rule);
            if (subformat.onValidateSet && ruleTable.has(subformat.id)) {
                problems = problems.concat(subformat.onValidateSet.call(this, set, format, setHas, teamHas) || []);
            }
        }
        if (format.onValidateSet) {
            problems = problems.concat(format.onValidateSet.call(this, set, format, setHas, teamHas) || []);
        }
        var nameSpecies = dex.species.get(set.name);
        if (nameSpecies.exists && nameSpecies.name.toLowerCase() === set.name.toLowerCase()) {
            // nickname is the name of a species
            if (nameSpecies.baseSpecies === species.baseSpecies) {
                set.name = species.baseSpecies;
            }
            else if (nameSpecies.name !== species.name &&
                nameSpecies.name !== species.baseSpecies && ruleTable.has('nicknameclause')) {
                // nickname species doesn't match actual species
                // Nickname Clause
                problems.push("".concat(name, " must not be nicknamed a different Pok\u00E9mon species than what it actually is."));
            }
        }
        if (!problems.length) {
            if (set.gender === '' && !species.gender) {
                set.gender = ['M', 'F'][Math.floor(Math.random() * 2)];
            }
            if (adjustLevel)
                set.level = adjustLevel;
            return null;
        }
        return problems;
    };
    TeamValidator.prototype.validateStats = function (set, species, setSources, pokemonGoProblems) {
        var ruleTable = this.ruleTable;
        var dex = this.dex;
        var allowAVs = ruleTable.has('allowavs');
        var evLimit = ruleTable.evLimit;
        var canBottleCap = dex.gen >= 7 && (set.level >= (dex.gen < 9 ? 100 : 50) || !ruleTable.has('obtainablemisc'));
        if (!set.evs)
            set.evs = TeamValidator.fillStats(null, evLimit === null ? 252 : 0);
        if (!set.ivs)
            set.ivs = TeamValidator.fillStats(null, 31);
        var problems = [];
        var name = set.name || set.species;
        var maxedIVs = Object.values(set.ivs).every(function (stat) { return stat === 31; });
        for (var _i = 0, _a = set.moves; _i < _a.length; _i++) {
            var moveName = _a[_i];
            var move = dex.moves.get(moveName);
            if (move.id === 'hiddenpower' && move.type !== 'Normal') {
                if (!set.hpType) {
                    set.hpType = move.type;
                }
                else if (set.hpType !== move.type && ruleTable.has('obtainablemisc')) {
                    problems.push("".concat(name, "'s Hidden Power type ").concat(set.hpType, " is incompatible with Hidden Power ").concat(move.type));
                }
            }
        }
        if (set.hpType && maxedIVs && ruleTable.has('obtainablemisc')) {
            if (dex.gen <= 2) {
                var HPdvs = dex.types.get(set.hpType).HPdvs;
                set.ivs = { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 };
                var statName = void 0;
                for (statName in HPdvs) {
                    set.ivs[statName] = HPdvs[statName] * 2;
                }
                set.ivs.hp = -1;
            }
            else if (!canBottleCap) {
                set.ivs = TeamValidator.fillStats(dex.types.get(set.hpType).HPivs, 31);
            }
        }
        if (!set.hpType && set.moves.some(function (m) { return dex.moves.get(m).id === 'hiddenpower'; })) {
            set.hpType = dex.getHiddenPower(set.ivs).type;
        }
        var cantBreedNorEvolve = (species.eggGroups[0] === 'Undiscovered' && !species.prevo && !species.nfe);
        var isLegendary = (cantBreedNorEvolve && !species.tags.includes('Paradox') && ![
            'Pikachu', 'Unown', 'Dracozolt', 'Arctozolt', 'Dracovish', 'Arctovish',
        ].includes(species.baseSpecies)) || [
            'Manaphy', 'Cosmog', 'Cosmoem', 'Solgaleo', 'Lunala',
        ].includes(species.baseSpecies);
        var diancieException = species.name === 'Diancie' && !set.shiny;
        var has3PerfectIVs = setSources.minSourceGen() >= 6 && isLegendary && !diancieException;
        if (set.hpType === 'Fighting' && ruleTable.has('obtainablemisc')) {
            if (has3PerfectIVs) {
                // Legendary Pokemon must have at least 3 perfect IVs in gen 6+
                problems.push("".concat(name, " must not have Hidden Power Fighting because it starts with 3 perfect IVs because it's a Gen 6+ legendary."));
            }
        }
        if (has3PerfectIVs && ruleTable.has('obtainablemisc')) {
            var perfectIVs = 0;
            for (var stat in set.ivs) {
                if (set.ivs[stat] >= 31)
                    perfectIVs++;
            }
            if (perfectIVs < 3) {
                if (!pokemonGoProblems || (pokemonGoProblems && pokemonGoProblems.length)) {
                    var reason = (this.minSourceGen === 6 ? " and this format requires Gen ".concat(dex.gen, " Pok\u00E9mon") : " in Gen 6 or later");
                    problems.push("".concat(name, " must have at least three perfect IVs because it's a legendary").concat(reason, "."));
                    if (pokemonGoProblems && pokemonGoProblems.length) {
                        problems.push("Additionally, it failed to validate as a Pokemon from Pokemon GO because:");
                        for (var _b = 0, pokemonGoProblems_5 = pokemonGoProblems; _b < pokemonGoProblems_5.length; _b++) {
                            var pokemonGoProblem = pokemonGoProblems_5[_b];
                            problems.push(pokemonGoProblem);
                        }
                    }
                }
                else {
                    setSources.isFromPokemonGo = true;
                }
            }
        }
        if (set.hpType && !canBottleCap) {
            var ivHpType = dex.getHiddenPower(set.ivs).type;
            if (set.hpType !== ivHpType) {
                problems.push("".concat(name, " has Hidden Power ").concat(set.hpType, ", but its IVs are for Hidden Power ").concat(ivHpType, "."));
            }
        }
        else if (set.hpType) {
            if (!this.possibleBottleCapHpType(set.hpType, set.ivs)) {
                problems.push("".concat(name, " has Hidden Power ").concat(set.hpType, ", but its IVs don't allow this even with (Bottle Cap) Hyper Training."));
            }
        }
        if (setSources.isFromPokemonGo) {
            // Pokemon from Pokemon GO must have odd IVs in non-Spe stats
            // Since the set can be fixed while making minimal changes, it does not force the IVs to be manually fixed
            for (var stat in set.ivs) {
                if (set.ivs[stat] % 2 === 0 && stat !== 'spe') {
                    set.ivs[stat]++;
                }
            }
            if (set.ivs.atk !== set.ivs.spa && !(canBottleCap && (set.ivs.atk === 31 || set.ivs.spa === 31))) {
                problems.push("".concat(name, "'s Atk and Spa IVs must match because it is from Pokemon GO."));
            }
            if (set.ivs.def !== set.ivs.spd && !(canBottleCap && (set.ivs.def === 31 || set.ivs.spd === 31))) {
                problems.push("".concat(name, "'s Def and Spd IVs must match because it is from Pokemon GO."));
            }
            if (set.hpType && set.hpType !== 'Dark' && set.hpType !== 'Ice') {
                problems.push("".concat(name, " must have Hidden Power Dark or Ice because it is from Pokemon GO."));
            }
        }
        if (dex.gen <= 2) {
            // validate DVs
            var ivs = set.ivs;
            var atkDV = Math.floor(ivs.atk / 2);
            var defDV = Math.floor(ivs.def / 2);
            var speDV = Math.floor(ivs.spe / 2);
            var spcDV = Math.floor(ivs.spa / 2);
            var expectedHpDV = (atkDV % 2) * 8 + (defDV % 2) * 4 + (speDV % 2) * 2 + (spcDV % 2);
            if (ivs.hp === -1)
                ivs.hp = expectedHpDV * 2;
            var hpDV = Math.floor(ivs.hp / 2);
            if (expectedHpDV !== hpDV) {
                problems.push("".concat(name, " has an HP DV of ").concat(hpDV, ", but its Atk, Def, Spe, and Spc DVs give it an HP DV of ").concat(expectedHpDV, "."));
            }
            if (ivs.spa !== ivs.spd) {
                if (dex.gen === 2) {
                    problems.push("".concat(name, " has different SpA and SpD DVs, which is not possible in Gen 2."));
                }
                else {
                    ivs.spd = ivs.spa;
                }
            }
            if (dex.gen > 1 && !species.gender) {
                // Gen 2 gender is calculated from the Atk DV.
                // High Atk DV <-> M. The meaning of "high" depends on the gender ratio.
                var genderThreshold = species.genderRatio.F * 16;
                var expectedGender = (atkDV >= genderThreshold ? 'M' : 'F');
                if (set.gender && set.gender !== expectedGender) {
                    problems.push("".concat(name, " is ").concat(set.gender, ", but it has an Atk DV of ").concat(atkDV, ", which makes its gender ").concat(expectedGender, "."));
                }
                else {
                    set.gender = expectedGender;
                }
            }
            if (set.species === 'Marowak' && (0, dex_1.toID)(set.item) === 'thickclub' &&
                set.moves.map(dex_1.toID).includes('swordsdance') && set.level === 100) {
                // Marowak hack
                set.ivs.atk = Math.floor(set.ivs.atk / 2) * 2;
                while (set.evs.atk > 0 && 2 * 80 + set.ivs.atk + Math.floor(set.evs.atk / 4) + 5 > 255) {
                    set.evs.atk -= 4;
                }
            }
            if (dex.gen > 1) {
                var expectedShiny = !!(defDV === 10 && speDV === 10 && spcDV === 10 && atkDV % 4 >= 2);
                if (expectedShiny && !set.shiny) {
                    problems.push("".concat(name, " is not shiny, which does not match its DVs."));
                }
                else if (!expectedShiny && set.shiny) {
                    problems.push("".concat(name, " is shiny, which does not match its DVs (its DVs must all be 10, except Atk which must be 2, 3, 6, 7, 10, 11, 14, or 15)."));
                }
            }
            set.nature = 'Serious';
        }
        for (var stat in set.evs) {
            if (set.evs[stat] < 0) {
                problems.push("".concat(name, " has less than 0 ").concat(allowAVs ? 'Awakening Values' : 'EVs', " in ").concat(dex_1.Dex.stats.names[stat], "."));
            }
        }
        if (dex.currentMod === 'gen7letsgo') { // AVs
            for (var stat in set.evs) {
                if (set.evs[stat] > 0 && !allowAVs) {
                    problems.push("".concat(name, " has Awakening Values but this format doesn't allow them."));
                    break;
                }
                else if (set.evs[stat] > 200) {
                    problems.push("".concat(name, " has more than 200 Awakening Values in ").concat(dex_1.Dex.stats.names[stat], "."));
                }
            }
        }
        else { // EVs
            for (var stat in set.evs) {
                if (set.evs[stat] > 255) {
                    problems.push("".concat(name, " has more than 255 EVs in ").concat(dex_1.Dex.stats.names[stat], "."));
                }
            }
            if (dex.gen <= 2) {
                if (set.evs.spa !== set.evs.spd) {
                    if (dex.gen === 2) {
                        problems.push("".concat(name, " has different SpA and SpD EVs, which is not possible in Gen 2."));
                    }
                    else {
                        set.evs.spd = set.evs.spa;
                    }
                }
            }
        }
        var totalEV = 0;
        for (var stat in set.evs)
            totalEV += set.evs[stat];
        if (!this.format.debug) {
            if (set.level > 1 && evLimit !== 0 && totalEV === 0) {
                problems.push("".concat(name, " has exactly 0 EVs - did you forget to EV it? (If this was intentional, add exactly 1 to one of your EVs, which won't change its stats but will tell us that it wasn't a mistake)."));
            }
            else if (![508, 510].includes(evLimit) && [508, 510].includes(totalEV)) {
                problems.push("".concat(name, " has exactly ").concat(totalEV, " EVs, but this format does not restrict you to 510 EVs (If this was intentional, add exactly 1 to one of your EVs, which won't change its stats but will tell us that it wasn't a mistake)."));
            }
            // Check for level import errors from user in VGC -> DOU, etc.
            // Note that in VGC etc (Adjust Level Down = 50), `set.level` will be 100 here for validation purposes
            if (set.level === 50 && ruleTable.maxLevel !== 50 && !ruleTable.maxTotalLevel && evLimit !== 0 && totalEV % 4 === 0) {
                problems.push("".concat(name, " is level 50, but this format allows level ").concat(ruleTable.maxLevel, " Pok\u00E9mon. (If this was intentional, add exactly 1 to one of your EVs, which won't change its stats but will tell us that it wasn't a mistake)."));
            }
        }
        if (evLimit !== null && totalEV > evLimit) {
            if (!evLimit) {
                problems.push("".concat(name, " has EVs, which is not allowed by this format."));
            }
            else {
                problems.push("".concat(name, " has ").concat(totalEV, " total EVs, which is more than this format's limit of ").concat(evLimit, "."));
            }
        }
        return problems;
    };
    /**
     * Not exhaustive, just checks Atk and Spe, which are the only competitively
     * relevant IVs outside of extremely obscure situations.
     */
    TeamValidator.prototype.possibleBottleCapHpType = function (type, ivs) {
        if (!type)
            return true;
        if (['Dark', 'Dragon', 'Grass', 'Ghost', 'Poison'].includes(type)) {
            // Spe must be odd
            if (ivs.spe % 2 === 0)
                return false;
        }
        if (['Psychic', 'Fire', 'Rock', 'Fighting'].includes(type)) {
            // Spe must be even
            if (ivs.spe !== 31 && ivs.spe % 2 === 1)
                return false;
        }
        if (type === 'Dark') {
            // Atk must be odd
            if (ivs.atk % 2 === 0)
                return false;
        }
        if (['Ice', 'Water'].includes(type)) {
            // Spe or Atk must be odd
            if (ivs.spe % 2 === 0 && ivs.atk % 2 === 0)
                return false;
        }
        return true;
    };
    /**
     * Returns array of error messages if invalid, undefined if valid
     *
     * If `because` is not passed, instead returns true if invalid.
     */
    TeamValidator.prototype.validateSource = function (set, source, setSources, species, because) {
        var _a;
        var eventData;
        var eventSpecies = species;
        if (source.charAt(1) === 'S') {
            var splitSource = source.substr(source.charAt(2) === 'T' ? 3 : 2).split(' ');
            var dex = (this.dex.gen === 1 ? this.dex.mod('gen2') : this.dex);
            eventSpecies = dex.species.get(splitSource[1]);
            var eventLsetData = this.dex.species.getLearnsetData(eventSpecies.id);
            eventData = (_a = eventLsetData.eventData) === null || _a === void 0 ? void 0 : _a[parseInt(splitSource[0])];
            if (!eventData) {
                throw new Error("".concat(eventSpecies.name, " from ").concat(species.name, " doesn't have data for event ").concat(source));
            }
        }
        else if (source === '7V') {
            var isMew = species.id === 'mew';
            var isCelebi = species.id === 'celebi';
            var g7speciesName = (species.gen > 2 && species.prevo) ? species.prevo : species.id;
            var isHidden = !!this.dex.mod('gen7').species.get(g7speciesName).abilities['H'];
            eventData = {
                generation: 2,
                level: isMew ? 5 : isCelebi ? 30 : 3,
                perfectIVs: isMew || isCelebi ? 5 : 3,
                isHidden: isHidden,
                shiny: isMew ? undefined : 1,
                pokeball: 'pokeball',
                from: 'Gen 1-2 Virtual Console transfer',
            };
        }
        else if (source === '8V') {
            var isMew = species.id === 'mew';
            eventData = {
                generation: 8,
                perfectIVs: isMew ? 3 : undefined,
                shiny: isMew ? undefined : 1,
                from: 'Gen 7 Let\'s Go! HOME transfer',
            };
        }
        else if (source.charAt(1) === 'D') {
            eventData = {
                generation: 5,
                level: 10,
                from: 'Gen 5 Dream World',
                isHidden: !!this.dex.mod('gen5').species.get(species.id).abilities['H'],
            };
        }
        else if (source.charAt(1) === 'E') {
            if (this.findEggMoveFathers(source, species, setSources)) {
                return undefined;
            }
            if (because)
                throw new Error("Wrong place to get an egg incompatibility message");
            return true;
        }
        else {
            throw new Error("Unidentified source ".concat(source, " passed to validateSource"));
        }
        // complicated fancy return signature
        return this.validateEvent(set, setSources, eventData, eventSpecies, because);
    };
    TeamValidator.prototype.findEggMoveFathers = function (source, species, setSources, getAll, pokemonBlacklist, noRecurse) {
        if (!pokemonBlacklist)
            pokemonBlacklist = [];
        if (!pokemonBlacklist.includes(species.id))
            pokemonBlacklist.push(species.id);
        // tradebacks have an eggGen of 2 even though the source is 1ET
        var eggGen = Math.max(parseInt(source.charAt(0)), 2);
        var fathers = [];
        // Gen 6+ don't have egg move incompatibilities
        // (except for certain cases with baby Pokemon not handled here)
        if (!getAll && eggGen >= 6 && !setSources.levelUpEggMoves)
            return true;
        var eggMoves = setSources.limitedEggMoves;
        if (eggGen === 3)
            eggMoves = eggMoves === null || eggMoves === void 0 ? void 0 : eggMoves.filter(function (eggMove) { var _a; return !((_a = setSources.pomegEggMoves) === null || _a === void 0 ? void 0 : _a.includes(eggMove)); });
        // must have 2 or more egg moves to have egg move incompatibilities
        if (!eggMoves) {
            // happens often in gen 1-6 LC if your only egg moves are level-up moves,
            // which aren't limited and so aren't in `limitedEggMoves`
            return getAll ? ['*'] : true;
        }
        if (!getAll && eggMoves.length <= 1 && !setSources.levelUpEggMoves)
            return true;
        if (setSources.levelUpEggMoves && eggGen >= 6)
            eggMoves = setSources.levelUpEggMoves;
        // gen 1 eggs come from gen 2 breeding
        var dex = this.dex.gen === 1 ? this.dex.mod('gen2') : this.dex;
        // In Gen 5 and earlier, egg moves can only be inherited from the father
        // we'll test each possible father separately
        var eggGroups = species.eggGroups;
        if (species.id === 'nidoqueen' || species.id === 'nidorina') {
            eggGroups = dex.species.get('nidoranf').eggGroups;
        }
        else if (species.id === 'shedinja') {
            // Shedinja and Nincada are different Egg groups; Shedinja itself is genderless
            eggGroups = dex.species.get('nincada').eggGroups;
        }
        else if (dex !== this.dex) {
            // Gen 1 tradeback; grab the egg groups from Gen 2
            eggGroups = dex.species.get(species.id).eggGroups;
        }
        if (eggGroups[0] === 'Undiscovered')
            eggGroups = dex.species.get(species.evos[0]).eggGroups;
        if (eggGroups[0] === 'Undiscovered' || !eggGroups.length) {
            throw new Error("".concat(species.name, " has no egg groups for source ").concat(source));
        }
        // no chainbreeding necessary if the father can be Smeargle
        if (!getAll && eggGroups.includes('Field'))
            return true;
        // try to find a father to inherit the egg move combination from
        for (var _i = 0, _a = dex.species.all(); _i < _a.length; _i++) {
            var father = _a[_i];
            // can't inherit from CAP pokemon
            if (father.isNonstandard)
                continue;
            // can't breed mons from future gens
            if (father.gen > eggGen)
                continue;
            // father must be male
            if (father.gender === 'N' || father.gender === 'F')
                continue;
            // can't inherit from dex entries with no learnsets
            if (!dex.species.getLearnset(father.id))
                continue;
            // something is clearly wrong if its only possible father is itself
            // (exceptions: ExtremeSpeed Dragonite, Self-destruct Snorlax)
            if (pokemonBlacklist.includes(father.id) && !['dragonite', 'snorlax'].includes(father.id))
                continue;
            // don't check NFE Pokémon - their evolutions will know all their moves and more
            // exception: Combee/Salandit, because their evos can't be fathers
            if (father.evos.length) {
                var evolvedFather = dex.species.get(father.evos[0]);
                if (evolvedFather.gen <= eggGen && evolvedFather.gender !== 'F')
                    continue;
            }
            // must be able to breed with father
            if (!father.eggGroups.some(function (eggGroup) { return eggGroups.includes(eggGroup); }))
                continue;
            // father must be able to learn the move
            if (!this.fatherCanLearn(species, father, eggMoves, eggGen, pokemonBlacklist, noRecurse))
                continue;
            // father found!
            if (!getAll)
                return true;
            fathers.push(father.id);
        }
        if (!getAll)
            return false;
        return (!fathers.length && eggGen < 6) ? null : fathers;
    };
    /**
     * We could, if we wanted, do a complete move validation of the father's
     * moveset to see if it's valid. This would recurse and be NP-Hard so
     * instead we won't. We'll instead use a simplified algorithm: The father
     * is allowed to have multiple egg moves and a maximum of one move from
     * any other restrictive source; recursion is done only if there are less
     * egg moves to validate or if the father has an egg group it doesn't
     * share with the egg Pokemon. Recursion is also limited to two iterations
     * of calling findEggMoveFathers.
     */
    TeamValidator.prototype.fatherCanLearn = function (baseSpecies, species, moves, eggGen, pokemonBlacklist, noRecurse) {
        var learnset = this.dex.species.getLearnset(species.id);
        if (!learnset)
            return false;
        if (species.id === 'smeargle')
            return true;
        var canBreedWithSmeargle = species.eggGroups.includes('Field');
        var allEggSources = new PokemonSources();
        allEggSources.sourcesBefore = eggGen;
        for (var _i = 0, moves_1 = moves; _i < moves_1.length; _i++) {
            var move = moves_1[_i];
            var curSpecies = species;
            var eggSources = new PokemonSources();
            while (curSpecies) {
                var eggPokemon = curSpecies.prevo ? curSpecies.id : '';
                learnset = this.dex.species.getLearnset(curSpecies.id);
                if (learnset && learnset[move]) {
                    for (var _a = 0, _b = learnset[move]; _a < _b.length; _a++) {
                        var moveSource = _b[_a];
                        if (eggGen > 8 && parseInt(moveSource.charAt(0)) <= 8)
                            continue;
                        if (parseInt(moveSource.charAt(0)) > eggGen)
                            continue;
                        var canLearnFromSmeargle = moveSource.charAt(1) === 'E' && canBreedWithSmeargle;
                        if (!'ESDV'.includes(moveSource.charAt(1)) || canLearnFromSmeargle) {
                            eggSources.addGen(parseInt(moveSource.charAt(0)));
                            break;
                        }
                        else {
                            if (moveSource.charAt(1) === 'E') {
                                eggSources.add(moveSource + eggPokemon, move);
                                if (eggGen === 2 && this.dex.moves.getByID(move).gen === 1)
                                    eggSources.add('1ET' + eggPokemon, move);
                            }
                            else {
                                eggSources.add(moveSource + eggPokemon);
                            }
                        }
                    }
                }
                if (eggSources.sourcesBefore === eggGen)
                    break;
                curSpecies = this.learnsetParent(curSpecies);
            }
            if (eggSources.sourcesBefore === eggGen)
                continue;
            if (!eggSources.sourcesBefore && !eggSources.sources.length)
                return false;
            var onlyEggSources = eggSources.sources.filter(function (source) { return source.charAt(1) === 'E'; });
            if (eggGen >= 3 && onlyEggSources.length && eggSources.limitedEggMoves === null && eggSources.sourcesBefore) {
                eggSources.possiblyLimitedEggMoves = [(0, dex_1.toID)(eggSources.sourcesBefore + move)];
            }
            allEggSources.intersectWith(eggSources);
            if (!allEggSources.size())
                return false;
        }
        pokemonBlacklist.push(species.id);
        if (allEggSources.limitedEggMoves && allEggSources.limitedEggMoves.length > 1) {
            if (noRecurse)
                return false;
            var canChainbreed = false;
            for (var _c = 0, _d = species.eggGroups; _c < _d.length; _c++) {
                var fatherEggGroup = _d[_c];
                if (!baseSpecies.eggGroups.includes(fatherEggGroup)) {
                    canChainbreed = true;
                    break;
                }
            }
            if (!canChainbreed && allEggSources.limitedEggMoves.length === moves.length)
                return false;
            var setSources = new PokemonSources();
            setSources.limitedEggMoves = allEggSources.limitedEggMoves;
            return this.findEggMoveFathers(allEggSources.sources[0], species, setSources, false, pokemonBlacklist, true);
        }
        return true;
    };
    TeamValidator.prototype.validateForme = function (set) {
        var dex = this.dex;
        var name = set.name || set.species;
        var problems = [];
        var item = dex.items.get(set.item);
        var species = dex.species.get(set.species);
        if (species.name === 'Necrozma-Ultra') {
            var whichMoves = (set.moves.includes('sunsteelstrike') ? 1 : 0) +
                (set.moves.includes('moongeistbeam') ? 2 : 0);
            if (item.name !== 'Ultranecrozium Z') {
                // Necrozma-Ultra transforms from one of two formes, and neither one is the base forme
                problems.push("Necrozma-Ultra must start the battle holding Ultranecrozium Z.");
            }
            else if (whichMoves === 1) {
                set.species = 'Necrozma-Dusk-Mane';
            }
            else if (whichMoves === 2) {
                set.species = 'Necrozma-Dawn-Wings';
            }
            else {
                problems.push("Necrozma-Ultra must start the battle as Necrozma-Dusk-Mane or Necrozma-Dawn-Wings holding Ultranecrozium Z. Please specify which Necrozma it should start as.");
            }
        }
        else if (species.name === 'Zygarde-Complete') {
            problems.push("Zygarde-Complete must start the battle as Zygarde or Zygarde-10% with Power Construct. Please specify which Zygarde it should start as.");
        }
        else if (species.battleOnly) {
            if (species.requiredAbility && set.ability !== species.requiredAbility) {
                // Darmanitan-Zen
                problems.push("".concat(species.name, " transforms in-battle with ").concat(species.requiredAbility, ", please fix its ability."));
            }
            if (species.requiredItems) {
                if (!species.requiredItems.includes(item.name)) {
                    // Mega or Primal
                    problems.push("".concat(species.name, " transforms in-battle with ").concat(species.requiredItem, ", please fix its item."));
                }
            }
            if (species.requiredMove && !set.moves.map(dex_1.toID).includes((0, dex_1.toID)(species.requiredMove))) {
                // Meloetta-Pirouette, Rayquaza-Mega
                problems.push("".concat(species.name, " transforms in-battle with ").concat(species.requiredMove, ", please fix its moves."));
            }
            if (typeof species.battleOnly !== 'string') {
                // Ultra Necrozma and Complete Zygarde are already checked above
                throw new Error("".concat(species.name, " should have a string battleOnly"));
            }
            // Set to out-of-battle forme
            set.species = species.battleOnly;
        }
        else {
            if (species.requiredAbility) {
                // Impossible!
                throw new Error("Species ".concat(species.name, " has a required ability despite not being a battle-only forme; it should just be in its abilities table."));
            }
            if (species.requiredItems && !species.requiredItems.includes(item.name)) {
                if (dex.gen >= 8 && (species.baseSpecies === 'Arceus' || species.baseSpecies === 'Silvally')) {
                    // Arceus/Silvally formes in gen 8 only require the item with Multitype/RKS System
                    if (set.ability === species.abilities[0]) {
                        problems.push("".concat(name, " needs to hold ").concat(species.requiredItems.join(' or '), "."), "(It will revert to its Normal forme if you remove the item or give it a different item.)");
                    }
                }
                else {
                    // Memory/Drive/Griseous Orb/Plate/Z-Crystal - Forme mismatch
                    var baseSpecies = this.dex.species.get(species.changesFrom);
                    problems.push("".concat(name, " needs to hold ").concat(species.requiredItems.join(' or '), " to be in its ").concat(species.forme, " forme."), "(It will revert to its ".concat(baseSpecies.baseForme || 'base', " forme if you remove the item or give it a different item.)"));
                }
            }
            if (species.requiredMove && !set.moves.map(dex_1.toID).includes((0, dex_1.toID)(species.requiredMove))) {
                var baseSpecies = this.dex.species.get(species.changesFrom);
                problems.push("".concat(name, " needs to know the move ").concat(species.requiredMove, " to be in its ").concat(species.forme, " forme."), "(It will revert to its ".concat(baseSpecies.baseForme, " forme if it forgets the move.)"));
            }
            // Mismatches between the set forme (if not base) and the item signature forme will have been rejected already.
            // It only remains to assign the right forme to a set with the base species (Arceus/Genesect/Giratina/Silvally).
            if (item.forcedForme && species.name === dex.species.get(item.forcedForme).baseSpecies) {
                set.species = item.forcedForme;
            }
        }
        if (species.name === 'Pikachu-Cosplay') {
            var cosplay = {
                meteormash: 'Pikachu-Rock-Star', iciclecrash: 'Pikachu-Belle', drainingkiss: 'Pikachu-Pop-Star',
                electricterrain: 'Pikachu-PhD', flyingpress: 'Pikachu-Libre',
            };
            for (var _i = 0, _a = set.moves; _i < _a.length; _i++) {
                var moveid = _a[_i];
                if (moveid in cosplay) {
                    set.species = cosplay[moveid];
                    break;
                }
            }
        }
        if (species.name === 'Keldeo' && set.moves.map(dex_1.toID).includes('secretsword') && dex.gen >= 8) {
            set.species = 'Keldeo-Resolute';
        }
        var crowned = {
            'Zacian-Crowned': 'behemothblade', 'Zamazenta-Crowned': 'behemothbash',
        };
        if (species.name in crowned) {
            var behemothMove = set.moves.map(dex_1.toID).indexOf(crowned[species.name]);
            if (behemothMove >= 0) {
                set.moves[behemothMove] = 'ironhead';
            }
        }
        if (species.baseSpecies === "Hoopa" && dex.gen >= 9) {
            var moves = set.moves.map(dex_1.toID);
            var hyperspaceHole = moves.indexOf('hyperspacehole');
            var hyperspaceFury = moves.indexOf('hyperspacefury');
            if (species.name === "Hoopa" && hyperspaceFury >= 0) {
                problems.push("In Generation 9, Hoopa cannot run Hyperspace Fury because it gets replaced with Hyperspace Hole upon changing forme.");
            }
            else if (species.name === "Hoopa-Unbound" && hyperspaceHole >= 0) {
                problems.push("In Generation 9, Hoopa-Unbound cannot run Hyperspace Hole because it gets replaced with Hyperspace Fury upon changing forme.");
            }
        }
        if (species.baseSpecies === "Greninja" && (0, dex_1.toID)(set.ability) === 'battlebond') {
            set.species = "Greninja-Bond";
        }
        return problems;
    };
    TeamValidator.prototype.checkSpecies = function (set, species, tierSpecies, setHas) {
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        // https://www.smogon.com/forums/posts/8659168
        if ((tierSpecies.id === 'zamazentacrowned' && species.id === 'zamazenta') ||
            (tierSpecies.id === 'zaciancrowned' && species.id === 'zacian')) {
            species = tierSpecies;
        }
        setHas['pokemon:' + species.id] = true;
        setHas['basepokemon:' + (0, dex_1.toID)(species.baseSpecies)] = true;
        var isMega = false;
        if (tierSpecies !== species) {
            setHas['pokemon:' + tierSpecies.id] = true;
            if (tierSpecies.isMega || tierSpecies.isPrimal) {
                setHas['pokemontag:mega'] = true;
                isMega = true;
            }
        }
        var isGmax = false;
        if (tierSpecies.canGigantamax && set.gigantamax) {
            setHas['pokemon:' + tierSpecies.id + 'gmax'] = true;
            isGmax = true;
        }
        if (tierSpecies.baseSpecies === 'Greninja' && (0, dex_1.toID)(set.ability) === 'battlebond') {
            setHas['pokemon:greninjabond'] = true;
        }
        var tier = tierSpecies.tier === '(PU)' ? 'ZU' : tierSpecies.tier === '(NU)' ? 'PU' : tierSpecies.tier;
        var tierTag = 'pokemontag:' + (0, dex_1.toID)(tier);
        setHas[tierTag] = true;
        var doublesTier = tierSpecies.doublesTier === '(DUU)' ? 'DNU' : tierSpecies.doublesTier;
        var doublesTierTag = 'pokemontag:' + (0, dex_1.toID)(doublesTier);
        setHas[doublesTierTag] = true;
        var ndTier = tierSpecies.natDexTier === '(PU)' ? 'ZU' :
            tierSpecies.natDexTier === '(NU)' ? 'PU' : tierSpecies.natDexTier;
        var ndTierTag = 'pokemontag:nd' + (0, dex_1.toID)(ndTier);
        setHas[ndTierTag] = true;
        // Only pokemon that can gigantamax should have the Gmax flag
        if (!tierSpecies.canGigantamax && set.gigantamax) {
            return "".concat(tierSpecies.name, " cannot Gigantamax but is flagged as being able to.");
        }
        var banReason = ruleTable.check('pokemon:' + species.id);
        if (banReason) {
            return "".concat(species.name, " is ").concat(banReason, ".");
        }
        if (banReason === '')
            return null;
        if (tierSpecies !== species) {
            banReason = ruleTable.check('pokemon:' + tierSpecies.id);
            if (banReason) {
                return "".concat(tierSpecies.name, " is ").concat(banReason, ".");
            }
            if (banReason === '')
                return null;
        }
        if (isMega) {
            banReason = ruleTable.check('pokemontag:mega', setHas);
            if (banReason) {
                return "Mega evolutions are ".concat(banReason, ".");
            }
        }
        if (isGmax) {
            banReason = ruleTable.check('pokemon:' + tierSpecies.id + 'gmax');
            if (banReason) {
                return "Gigantamaxing ".concat(species.name, " is ").concat(banReason, ".");
            }
        }
        banReason = ruleTable.check('basepokemon:' + (0, dex_1.toID)(species.baseSpecies));
        if (banReason) {
            return "".concat(species.name, " is ").concat(banReason, ".");
        }
        if (banReason === '') {
            // don't allow nonstandard speciess when whitelisting standard base species
            // i.e. unbanning Pichu doesn't mean allowing Pichu-Spiky-Eared outside of Gen 4
            var baseSpecies = dex.species.get(species.baseSpecies);
            if (baseSpecies.isNonstandard === species.isNonstandard) {
                return null;
            }
        }
        // We can't return here because the `-nonexistent` rule is a bit
        // complicated in terms of what trumps it. We don't want e.g.
        // +Mythical to unban Shaymin in Gen 1, for instance.
        var nonexistentCheck = tags_1.Tags.nonexistent.genericFilter(tierSpecies) && ruleTable.check('nonexistent');
        var EXISTENCE_TAG = ['past', 'future', 'lgpe', 'unobtainable', 'cap', 'custom', 'nonexistent'];
        for (var _i = 0, _a = ruleTable.tagRules; _i < _a.length; _i++) {
            var ruleid = _a[_i];
            if (ruleid.startsWith('*'))
                continue;
            var tagid = ruleid.slice(12);
            var tag = tags_1.Tags[tagid];
            if ((tag.speciesFilter || tag.genericFilter)(tierSpecies)) {
                var existenceTag = EXISTENCE_TAG.includes(tagid);
                if (ruleid.startsWith('+')) {
                    // we want rules like +CAP to trump -Nonexistent, but most tags shouldn't
                    if (!existenceTag && nonexistentCheck)
                        continue;
                    return null;
                }
                if (existenceTag) {
                    // for a nicer error message
                    nonexistentCheck = 'banned';
                    break;
                }
                return "".concat(species.name, " is tagged ").concat(tag.name, ", which is ").concat(ruleTable.check(ruleid.slice(1)) || "banned", ".");
            }
        }
        if (nonexistentCheck) {
            if (tierSpecies.isNonstandard === 'Past' || tierSpecies.isNonstandard === 'Future') {
                return "".concat(tierSpecies.name, " does not exist in Gen ").concat(dex.gen, ".");
            }
            if (tierSpecies.isNonstandard === 'LGPE') {
                return "".concat(tierSpecies.name, " does not exist in this game, only in Let's Go Pikachu/Eevee.");
            }
            if (tierSpecies.isNonstandard === 'CAP') {
                return "".concat(tierSpecies.name, " is a CAP and does not exist in this game.");
            }
            if (tierSpecies.isNonstandard === 'Unobtainable') {
                return "".concat(tierSpecies.name, " is not possible to obtain in this game.");
            }
            if (tierSpecies.isNonstandard === 'Gigantamax') {
                return "".concat(tierSpecies.name, " is a placeholder for a Gigantamax sprite, not a real Pok\u00E9mon. (This message is likely to be a validator bug.)");
            }
            return "".concat(tierSpecies.name, " does not exist in this game.");
        }
        if (nonexistentCheck === '')
            return null;
        // Special casing for Pokemon that can Gmax, but their Gmax factor cannot be legally obtained
        if (tierSpecies.gmaxUnreleased && set.gigantamax) {
            banReason = ruleTable.check('pokemontag:unobtainable');
            if (banReason) {
                return "".concat(tierSpecies.name, " is flagged as gigantamax, but it cannot gigantamax without hacking or glitches.");
            }
            if (banReason === '')
                return null;
        }
        banReason = ruleTable.check('pokemontag:allpokemon');
        if (banReason) {
            return "".concat(species.name, " is not in the list of allowed pokemon.");
        }
        return null;
    };
    TeamValidator.prototype.checkItem = function (set, item, setHas) {
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        setHas['item:' + item.id] = true;
        var banReason = ruleTable.check('item:' + (item.id || 'noitem'));
        if (banReason) {
            if (!item.id) {
                return "".concat(set.name, " not holding an item is ").concat(banReason, ".");
            }
            return "".concat(set.name, "'s item ").concat(item.name, " is ").concat(banReason, ".");
        }
        if (banReason === '')
            return null;
        if (!item.id)
            return null;
        banReason = ruleTable.check('pokemontag:allitems');
        if (banReason) {
            return "".concat(set.name, "'s item ").concat(item.name, " is not in the list of allowed items.");
        }
        // obtainability
        if (item.isNonstandard) {
            banReason = ruleTable.check('pokemontag:' + (0, dex_1.toID)(item.isNonstandard));
            if (banReason) {
                if (item.isNonstandard === 'Unobtainable') {
                    return "".concat(item.name, " is not obtainable without hacking or glitches.");
                }
                return "".concat(set.name, "'s item ").concat(item.name, " is tagged ").concat(item.isNonstandard, ", which is ").concat(banReason, ".");
            }
            if (banReason === '')
                return null;
        }
        if (item.isNonstandard && item.isNonstandard !== 'Unobtainable') {
            banReason = ruleTable.check('nonexistent', setHas);
            if (banReason) {
                if (['Past', 'Future'].includes(item.isNonstandard)) {
                    return "".concat(set.name, "'s item ").concat(item.name, " does not exist in Gen ").concat(dex.gen, ".");
                }
                return "".concat(set.name, "'s item ").concat(item.name, " does not exist in this game.");
            }
            if (banReason === '')
                return null;
        }
        return null;
    };
    TeamValidator.prototype.checkMove = function (set, move, setHas) {
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        setHas['move:' + move.id] = true;
        var banReason = ruleTable.check('move:' + move.id);
        if (banReason) {
            return "".concat(set.name, "'s move ").concat(move.name, " is ").concat(banReason, ".");
        }
        if (banReason === '')
            return null;
        banReason = ruleTable.check('pokemontag:allmoves');
        if (banReason) {
            return "".concat(set.name, "'s move ").concat(move.name, " is not in the list of allowed moves.");
        }
        // obtainability
        if (move.isNonstandard) {
            banReason = ruleTable.check('pokemontag:' + (0, dex_1.toID)(move.isNonstandard));
            if (banReason) {
                if (move.isNonstandard === 'Unobtainable') {
                    return "".concat(move.name, " is not obtainable without hacking or glitches").concat(dex.gen >= 9 && move.gen < dex.gen ? " in Gen ".concat(dex.gen) : "", ".");
                }
                if (move.isNonstandard === 'Gigantamax') {
                    return "".concat(move.name, " is not usable without Gigantamaxing its user, ").concat(move.isMax, ".");
                }
                return "".concat(set.name, "'s move ").concat(move.name, " is tagged ").concat(move.isNonstandard, ", which is ").concat(banReason, ".");
            }
            if (banReason === '')
                return null;
        }
        if (move.isNonstandard && move.isNonstandard !== 'Unobtainable') {
            banReason = ruleTable.check('nonexistent', setHas);
            if (banReason) {
                if (['Past', 'Future'].includes(move.isNonstandard)) {
                    return "".concat(set.name, "'s move ").concat(move.name, " does not exist in Gen ").concat(dex.gen, ".");
                }
                return "".concat(set.name, "'s move ").concat(move.name, " does not exist in this game.");
            }
            if (banReason === '')
                return null;
        }
        return null;
    };
    TeamValidator.prototype.checkAbility = function (set, ability, setHas) {
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        setHas['ability:' + ability.id] = true;
        if (this.format.id.startsWith('gen9pokebilities')) {
            var species_1 = dex.species.get(set.species);
            var unSeenAbilities = Object.keys(species_1.abilities)
                .filter(function (key) { return key !== 'S' && (key !== 'H' || !species_1.unreleasedHidden); })
                .map(function (key) { return species_1.abilities[key]; });
            if (ability.id !== this.toID(species_1.abilities['S'])) {
                for (var _i = 0, unSeenAbilities_1 = unSeenAbilities; _i < unSeenAbilities_1.length; _i++) {
                    var abilityName = unSeenAbilities_1[_i];
                    setHas['ability:' + (0, dex_1.toID)(abilityName)] = true;
                }
            }
        }
        var banReason = ruleTable.check('ability:' + ability.id);
        if (banReason) {
            return "".concat(set.name, "'s ability ").concat(ability.name, " is ").concat(banReason, ".");
        }
        if (banReason === '')
            return null;
        banReason = ruleTable.check('pokemontag:allabilities');
        if (banReason) {
            return "".concat(set.name, "'s ability ").concat(ability.name, " is not in the list of allowed abilities.");
        }
        // obtainability
        if (ability.isNonstandard) {
            banReason = ruleTable.check('pokemontag:' + (0, dex_1.toID)(ability.isNonstandard));
            if (banReason) {
                return "".concat(set.name, "'s ability ").concat(ability.name, " is tagged ").concat(ability.isNonstandard, ", which is ").concat(banReason, ".");
            }
            if (banReason === '')
                return null;
            banReason = ruleTable.check('nonexistent', setHas);
            if (banReason) {
                if (['Past', 'Future'].includes(ability.isNonstandard)) {
                    return "".concat(set.name, "'s ability ").concat(ability.name, " does not exist in Gen ").concat(dex.gen, ".");
                }
                return "".concat(set.name, "'s ability ").concat(ability.name, " does not exist in this game.");
            }
            if (banReason === '')
                return null;
        }
        return null;
    };
    TeamValidator.prototype.checkNature = function (set, nature, setHas) {
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        setHas['nature:' + nature.id] = true;
        var banReason = ruleTable.check('nature:' + nature.id);
        if (banReason) {
            return "".concat(set.name, "'s nature ").concat(nature.name, " is ").concat(banReason, ".");
        }
        if (banReason === '')
            return null;
        banReason = ruleTable.check('allnatures');
        if (banReason) {
            return "".concat(set.name, "'s nature ").concat(nature.name, " is not in the list of allowed natures.");
        }
        // obtainability
        if (nature.isNonstandard) {
            banReason = ruleTable.check('pokemontag:' + (0, dex_1.toID)(nature.isNonstandard));
            if (banReason) {
                return "".concat(set.name, "'s nature ").concat(nature.name, " is tagged ").concat(nature.isNonstandard, ", which is ").concat(banReason, ".");
            }
            if (banReason === '')
                return null;
            banReason = ruleTable.check('nonexistent', setHas);
            if (banReason) {
                if (['Past', 'Future'].includes(nature.isNonstandard)) {
                    return "".concat(set.name, "'s nature ").concat(nature.name, " does not exist in Gen ").concat(dex.gen, ".");
                }
                return "".concat(set.name, "'s nature ").concat(nature.name, " does not exist in this game.");
            }
            if (banReason === '')
                return null;
        }
        return null;
    };
    /**
     * Returns array of error messages if invalid, undefined if valid
     *
     * If `because` is not passed, instead returns true if invalid.
     */
    TeamValidator.prototype.validateEvent = function (set, setSources, eventData, eventSpecies, because, from) {
        if (because === void 0) { because = ""; }
        if (from === void 0) { from = "from an event"; }
        var dex = this.dex;
        var name = set.species;
        var species = dex.species.get(set.species);
        var maxSourceGen = this.ruleTable.has('allowtradeback') ? lib_1.Utils.clampIntRange(dex.gen + 1, 1, 8) : dex.gen;
        if (!eventSpecies)
            eventSpecies = species;
        if (set.name && set.species !== set.name && species.baseSpecies !== set.name)
            name = "".concat(set.name, " (").concat(set.species, ")");
        var fastReturn = !because;
        if (eventData.from)
            from = "from ".concat(eventData.from);
        var etc = "".concat(because, " ").concat(from);
        var problems = [];
        if (dex.gen < 8 && this.minSourceGen > eventData.generation) {
            if (fastReturn)
                return true;
            problems.push("This format requires Pokemon from gen ".concat(this.minSourceGen, " or later and ").concat(name, " is from gen ").concat(eventData.generation).concat(etc, "."));
        }
        if (maxSourceGen < eventData.generation) {
            if (fastReturn)
                return true;
            problems.push("This format is in gen ".concat(dex.gen, " and ").concat(name, " is from gen ").concat(eventData.generation).concat(etc, "."));
        }
        if (eventData.japan && dex.currentMod !== 'gen1jpn') {
            if (fastReturn)
                return true;
            problems.push("".concat(name, " has moves from Japan-only events, but this format simulates International Yellow/Crystal which can't trade with Japanese games."));
        }
        if (eventData.level && (set.level || 0) < eventData.level) {
            if (fastReturn)
                return true;
            problems.push("".concat(name, " must be at least level ").concat(eventData.level).concat(etc, "."));
        }
        if ((eventData.shiny === true && !set.shiny) || (!eventData.shiny && set.shiny)) {
            if (fastReturn)
                return true;
            var shinyReq = eventData.shiny ? " be shiny" : " not be shiny";
            problems.push("".concat(name, " must").concat(shinyReq).concat(etc, "."));
        }
        if (eventData.gender) {
            if (set.gender && eventData.gender !== set.gender) {
                if (fastReturn)
                    return true;
                problems.push("".concat(name, "'s gender must be ").concat(eventData.gender).concat(etc, "."));
            }
        }
        var canMint = dex.gen > 7;
        if (eventData.nature && eventData.nature !== set.nature && !canMint) {
            if (fastReturn)
                return true;
            problems.push("".concat(name, " must have a ").concat(eventData.nature, " nature").concat(etc, " - Mints are only available starting gen 8."));
        }
        var requiredIVs = 0;
        if (eventData.ivs) {
            /** In Gen 7+, IVs can be changed to 31 */
            var canBottleCap = dex.gen >= 7 && set.level >= (dex.gen < 9 ? 100 : 50);
            if (!set.ivs)
                set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
            var statName = void 0;
            for (statName in eventData.ivs) {
                if (canBottleCap && set.ivs[statName] === 31)
                    continue;
                if (set.ivs[statName] !== eventData.ivs[statName]) {
                    if (fastReturn)
                        return true;
                    problems.push("".concat(name, " must have ").concat(eventData.ivs[statName], " ").concat(dex_1.Dex.stats.names[statName], " IVs").concat(etc, "."));
                }
            }
            if (canBottleCap) {
                // IVs can be overridden but Hidden Power type can't
                if (Object.keys(eventData.ivs).length >= 6) {
                    var requiredHpType = dex.getHiddenPower(eventData.ivs).type;
                    if (set.hpType && set.hpType !== requiredHpType) {
                        if (fastReturn)
                            return true;
                        problems.push("".concat(name, " can only have Hidden Power ").concat(requiredHpType).concat(etc, "."));
                    }
                    set.hpType = requiredHpType;
                }
            }
        }
        else {
            requiredIVs = eventData.perfectIVs || 0;
        }
        if (requiredIVs && set.ivs) {
            // Legendary Pokemon must have at least 3 perfect IVs in gen 6
            // Events can also have a certain amount of guaranteed perfect IVs
            var perfectIVs = 0;
            var statName = void 0;
            for (statName in set.ivs) {
                if (set.ivs[statName] >= 31)
                    perfectIVs++;
            }
            if (perfectIVs < requiredIVs) {
                if (fastReturn)
                    return true;
                if (eventData.perfectIVs) {
                    problems.push("".concat(name, " must have at least ").concat(requiredIVs, " perfect IVs").concat(etc, "."));
                }
            }
            // The perfect IV count affects Hidden Power availability
            if (dex.gen >= 3 && requiredIVs >= 3 && set.hpType === 'Fighting') {
                if (fastReturn)
                    return true;
                problems.push("".concat(name, " can't use Hidden Power Fighting because it must have at least three perfect IVs").concat(etc, "."));
            }
            else if (dex.gen >= 3 && requiredIVs >= 5 && set.hpType &&
                !['Dark', 'Dragon', 'Electric', 'Steel', 'Ice'].includes(set.hpType)) {
                if (fastReturn)
                    return true;
                problems.push("".concat(name, " can only use Hidden Power Dark/Dragon/Electric/Steel/Ice because it must have at least 5 perfect IVs").concat(etc, "."));
            }
        }
        var ruleTable = this.ruleTable;
        if (ruleTable.has('obtainablemoves')) {
            var ssMaxSourceGen = setSources.maxSourceGen();
            var tradebackEligible = dex.gen === 2 && (species.gen === 1 || eventSpecies.gen === 1);
            if (ssMaxSourceGen && eventData.generation > ssMaxSourceGen && !tradebackEligible) {
                if (fastReturn)
                    return true;
                problems.push("".concat(name, " must not have moves only learnable in gen ").concat(ssMaxSourceGen).concat(etc, "."));
            }
            if (eventData.from === "Gen 5 Dream World" && setSources.dreamWorldMoveCount > 1) {
                problems.push("".concat(name, " can only have one Dream World move."));
            }
        }
        if (ruleTable.has('obtainableabilities')) {
            if (dex.gen <= 5 && eventData.abilities && eventData.abilities.length === 1 && !eventData.isHidden) {
                if (species.name === eventSpecies.name) {
                    // has not evolved, abilities must match
                    var requiredAbility = dex.abilities.get(eventData.abilities[0]).name;
                    if (set.ability !== requiredAbility) {
                        if (fastReturn)
                            return true;
                        problems.push("".concat(name, " must have ").concat(requiredAbility).concat(etc, "."));
                    }
                }
                else {
                    // has evolved
                    var ability1 = dex.abilities.get(eventSpecies.abilities['1']);
                    if (ability1.gen && eventData.generation >= ability1.gen) {
                        // pokemon had 2 available abilities in the gen the event happened
                        // ability is restricted to a single ability slot
                        var requiredAbilitySlot = ((0, dex_1.toID)(eventData.abilities[0]) === ability1.id ? 1 : 0);
                        var requiredAbility = dex.abilities.get(species.abilities[requiredAbilitySlot] || species.abilities['0']).name;
                        if (set.ability !== requiredAbility) {
                            var originalAbility = dex.abilities.get(eventData.abilities[0]).name;
                            if (fastReturn)
                                return true;
                            problems.push("".concat(name, " must have ").concat(requiredAbility).concat(because, " from a ").concat(originalAbility, " ").concat(eventSpecies.name, " event."));
                        }
                    }
                }
            }
            if (species.abilities['H']) {
                var isHidden = (set.ability === species.abilities['H']);
                if (!isHidden && eventData.isHidden && dex.gen <= 8) {
                    if (fastReturn)
                        return true;
                    problems.push("".concat(name, " must have its Hidden Ability").concat(etc, "."));
                }
                var canUseAbilityPatch = dex.gen >= 8 && this.format.mod !== 'gen8dlc1';
                if (isHidden && !eventData.isHidden && !canUseAbilityPatch) {
                    if (fastReturn)
                        return true;
                    problems.push("".concat(name, " must not have its Hidden Ability").concat(etc, "."));
                }
            }
        }
        if (problems.length)
            return problems;
        if (eventData.gender)
            set.gender = eventData.gender;
    };
    TeamValidator.prototype.allSources = function (species) {
        var minSourceGen = this.minSourceGen;
        if (this.dex.gen >= 3 && minSourceGen < 3)
            minSourceGen = 3;
        if (species)
            minSourceGen = Math.max(minSourceGen, species.gen);
        var maxSourceGen = this.ruleTable.has('allowtradeback') ? lib_1.Utils.clampIntRange(this.dex.gen + 1, 1, 8) : this.dex.gen;
        return new PokemonSources(maxSourceGen, minSourceGen);
    };
    TeamValidator.prototype.validateMoves = function (species, moves, setSources, set, name, moveLegalityWhitelist) {
        var _a;
        if (name === void 0) { name = species.name; }
        if (moveLegalityWhitelist === void 0) { moveLegalityWhitelist = {}; }
        var dex = this.dex;
        var ruleTable = this.ruleTable;
        var problems = [];
        var checkCanLearn = (((_a = ruleTable.checkCanLearn) === null || _a === void 0 ? void 0 : _a[0]) || this.checkCanLearn);
        for (var _i = 0, moves_2 = moves; _i < moves_2.length; _i++) {
            var moveName = moves_2[_i];
            var move = dex.moves.get(moveName);
            if (moveLegalityWhitelist[move.id])
                continue;
            var problem = checkCanLearn.call(this, move, species, setSources, set);
            if (problem) {
                problems.push("".concat(name).concat(problem));
                break;
            }
        }
        if (setSources.size() && setSources.moveEvoCarryCount > 3) {
            if (setSources.sourcesBefore < 6)
                setSources.sourcesBefore = 0;
            setSources.sources = setSources.sources.filter(function (source) { return source.charAt(1) === 'E' && parseInt(source.charAt(0)) >= 6; });
            if (!setSources.size()) {
                problems.push("".concat(name, " needs to know ").concat(species.evoMove || 'a Fairy-type move', " to evolve, so it can only know 3 other moves from ").concat(species.prevo, "."));
            }
        }
        if (problems.length)
            return problems;
        if (setSources.isHidden) {
            setSources.sources = setSources.sources.filter(function (source) { return parseInt(source.charAt(0)) >= 5; });
            if (setSources.sourcesBefore < 5)
                setSources.sourcesBefore = 0;
            var canUseAbilityPatch = dex.gen >= 8 && this.format.mod !== 'gen8dlc1';
            if (!setSources.size() && !canUseAbilityPatch) {
                problems.push("".concat(name, " has a hidden ability - it can't have moves only learned before gen 5."));
                return problems;
            }
        }
        if (setSources.babyOnly && setSources.sources.length) {
            var baby_1 = dex.species.get(setSources.babyOnly);
            var babyEvo_1 = (0, dex_1.toID)(baby_1.evos[0]);
            setSources.sources = setSources.sources.filter(function (source) {
                if (source.charAt(1) === 'S') {
                    var sourceId = source.split(' ')[1];
                    if (sourceId !== baby_1.id)
                        return false;
                }
                if (source.charAt(1) === 'E') {
                    if (babyEvo_1 && source.slice(2) === babyEvo_1)
                        return false;
                }
                if (source.charAt(1) === 'D') {
                    if (babyEvo_1 && source.slice(2) === babyEvo_1)
                        return false;
                }
                return true;
            });
            if (!setSources.size()) {
                problems.push("".concat(name, "'s event/egg moves are from an evolution, and are incompatible with its moves from ").concat(baby_1.name, "."));
            }
        }
        if (setSources.babyOnly && setSources.size() && this.gen > 2) {
            // there do theoretically exist evo/tradeback incompatibilities in
            // gen 2, but those are very complicated to validate and should be
            // handled separately anyway, so for now we just treat them all as
            // legal (competitively relevant ones can be manually banned)
            var baby_2 = dex.species.get(setSources.babyOnly);
            setSources.sources = setSources.sources.filter(function (source) {
                if (baby_2.gen > parseInt(source.charAt(0)) && !source.startsWith('1ST'))
                    return false;
                if (baby_2.gen > 2 && source === '7V')
                    return false;
                return true;
            });
            if (setSources.sourcesBefore < baby_2.gen)
                setSources.sourcesBefore = 0;
            if (!setSources.size()) {
                problems.push("".concat(name, " has moves from before Gen ").concat(baby_2.gen, ", which are incompatible with its moves from ").concat(baby_2.name, "."));
            }
        }
        return problems;
    };
    /**
     * Returns a list of problems regarding a Pokemon's avilability in Pokemon GO (empty list if no problems)
     * If the Pokemon cannot be obtained from Pokemon GO, returns null
     */
    TeamValidator.prototype.validatePokemonGo = function (species, set, setSources, name) {
        if (name === void 0) { name = species.name; }
        var problems = [];
        var minLevel = 50; // maximum level a Pokemon can be in Pokemon GO
        var minIVs = 15; // IVs range from 0 to 15 in Pokemon GO
        var dex = this.dex;
        var pokemonGoData = dex.species.getPokemonGoData(species.id);
        if (dex.gen < 8 || this.format.mod === 'gen8dlc1')
            return null;
        if (!pokemonGoData) {
            // Handles forms and evolutions not obtainable from Pokemon GO
            var otherSpecies = this.learnsetParent(species);
            // If a Pokemon is somehow not obtainable from Pokemon GO and it must be leveled up to be evolved,
            // validation for the game should stop because it's more optimal to get the Pokemon outside of the game
            if (otherSpecies && !species.evoLevel) {
                var otherProblems = this.validatePokemonGo(otherSpecies, set, setSources, name);
                if (otherProblems) {
                    problems = otherProblems;
                }
                else {
                    return null;
                }
            }
            else {
                return null;
            }
        }
        else {
            var pokemonGoSources = pokemonGoData.encounters;
            // should never happen
            if (!pokemonGoSources)
                throw new Error("Species with no Pokemon GO data: ".concat(species.id));
            if (set.shiny)
                name = "Shiny " + name;
            if (set.shiny && pokemonGoSources.includes('noshiny')) {
                problems.push("".concat(name, " is not obtainable from Pokemon GO."));
            }
            else {
                if (pokemonGoSources.includes('wild') && !((set.shiny && pokemonGoSources.includes('nowildshiny')))) {
                    minLevel = 1;
                    minIVs = 0;
                }
                if (pokemonGoSources.includes('egg')) {
                    /**
                     * A Pokemon's level when hatched is determined by the trainer's level when it is obtained
                     * It is no longer possible for new accounts to obtain eggs at level 1 because they will have reached
                     * level 2 by the time they can spin a PokeStop. However, it might be possible for a sleeper account
                     * from before XP changes to get a level 1 egg from spinning a PokeStop that sends the account to
                     * level 2, but this needs research
                    */
                    minLevel = Math.min(minLevel, 2);
                    minIVs = Math.min(minIVs, 10);
                }
                if (pokemonGoSources.includes('12kmegg')) {
                    minLevel = Math.min(minLevel, 8);
                    minIVs = Math.min(minIVs, 10);
                }
                if (pokemonGoSources.includes('raid')) {
                    minLevel = Math.min(minLevel, 20);
                    minIVs = Math.min(minIVs, 10);
                }
                if (species.id === 'mewtwo' && set.level && set.level >= 20) {
                    // A bug allowed Mewtwo to be encountered with an IV floor of 0 from GO Battle League
                    minIVs = Math.min(minIVs, 0);
                }
                if (pokemonGoSources.includes('research')) {
                    minLevel = Math.min(minLevel, 15);
                    minIVs = Math.min(minIVs, 10);
                }
                if (pokemonGoSources.includes('giovanni') && !set.shiny) {
                    /**
                     * Purified Pokemon can be leveled down to level 8 after trading; they are forced to
                     * special trades, but currently all Giovanni Shadow Pokemon are already forced special trades
                    */
                    minLevel = Math.min(minLevel, 8);
                    minIVs = Math.min(minIVs, 1);
                    if (set.level && set.level < 12)
                        setSources.pokemonGoSource = "purified";
                }
                // Attempt to trade the Pokemon to reduce level and IVs
                if (!pokemonGoSources.includes('notrade')) {
                    // Special trades require a good friend
                    // Trading with a friend of this level has an IV floor of 1
                    // Note that (non-shiny) Deoxys could be traded for a short time when it was introduced
                    if (!set.shiny || species.id !== 'deoxys') {
                        var specialTrade = pokemonGoSources.includes('specialtrade') || set.shiny;
                        minLevel = Math.min(minLevel, 12);
                        minIVs = Math.min(minIVs, specialTrade ? 1 : 0);
                    }
                }
                if (set.level && set.level < minLevel) {
                    problems.push("".concat(name, " must be at least level ").concat(minLevel, " to be from Pokemon GO."));
                }
                var ivs = set.ivs || TeamValidator.fillStats(null, 31);
                for (var stat in ivs) {
                    if (Math.floor(ivs[stat] / 2) < minIVs && stat !== 'spe') {
                        problems.push("".concat(name, " must have at least ").concat(minIVs, " ") +
                            (minIVs === 1 ? "IV" : "IVs") + " in non-Speed stats to be from Pokemon GO.");
                        break;
                    }
                }
            }
        }
        return problems;
    };
    TeamValidator.prototype.omCheckCanLearn = function (move, s, setSources, set, problem) {
        var _a;
        if (setSources === void 0) { setSources = this.allSources(s); }
        if (set === void 0) { set = {}; }
        if (problem === void 0) { problem = "".concat(set.name || s.name, " can't learn ").concat(move.name); }
        if (!((_a = this.ruleTable.checkCanLearn) === null || _a === void 0 ? void 0 : _a[0]))
            return problem;
        var baseCheckCanLearn = this.checkCanLearn;
        // tell the custom move legality check that the move is illegal by default
        this.checkCanLearn = function () { return problem; };
        var omVerdict = this.ruleTable.checkCanLearn[0].call(this, move, s, setSources, set);
        this.checkCanLearn = baseCheckCanLearn;
        return omVerdict;
    };
    /** Returns null if you can learn the move, or a string explaining why you can't learn it */
    TeamValidator.prototype.checkCanLearn = function (move, s, setSources, set) {
        var _a;
        if (setSources === void 0) { setSources = this.allSources(s); }
        if (set === void 0) { set = {}; }
        var dex = this.dex;
        if (!setSources.size())
            throw new Error("Bad sources passed to checkCanLearn");
        move = dex.moves.get(move);
        var moveid = move.id;
        var baseSpecies = dex.species.get(s);
        var species = baseSpecies;
        var format = this.format;
        var ruleTable = dex.formats.getRuleTable(format);
        var alreadyChecked = {};
        var level = set.level || 100;
        var cantLearnReason = null;
        var limit1 = true;
        var sketch = false;
        var blockedHM = false;
        var babyOnly = '';
        // This is a pretty complicated algorithm
        // Abstractly, what it does is construct the union of sets of all
        // possible ways this pokemon could be obtained, and then intersect
        // it with a the pokemon's existing set of all possible ways it could
        // be obtained. If this intersection is non-empty, the move is legal.
        // set of possible sources of a pokemon with this move
        var moveSources = new PokemonSources();
        /**
         * The format doesn't allow Pokemon traded from the future
         * (This is everything except in Gen 1 Tradeback)
         */
        var noFutureGen = !ruleTable.has('allowtradeback');
        /**
         * The format allows Sketch to copy moves in Gen 8
         */
        var canSketchPostGen7Moves = ruleTable.has('sketchpostgen7moves') || this.dex.currentMod === 'gen8bdsp';
        var tradebackEligible = false;
        while ((species === null || species === void 0 ? void 0 : species.name) && !alreadyChecked[species.id]) {
            alreadyChecked[species.id] = true;
            if (dex.gen <= 2 && species.gen === 1)
                tradebackEligible = true;
            var learnset = dex.species.getLearnset(species.id);
            if (!learnset) {
                if ((species.changesFrom || species.baseSpecies) !== species.name) {
                    // forme without its own learnset
                    species = dex.species.get(species.changesFrom || species.baseSpecies);
                    // warning: formes with their own learnset, like Wormadam, should NOT
                    // inherit from their base forme unless they're freely switchable
                    continue;
                }
                if (species.isNonstandard) {
                    // It's normal for a nonstandard species not to have learnset data
                    // Formats should replace the `Obtainable Moves` rule if they want to
                    // allow pokemon without learnsets.
                    return " can't learn any moves at all.";
                }
                if (species.prevo && dex.species.getLearnset((0, dex_1.toID)(species.prevo))) {
                    learnset = dex.species.getLearnset((0, dex_1.toID)(species.prevo));
                    continue;
                }
                // should never happen
                throw new Error("Species with no learnset data: ".concat(species.id));
            }
            var checkingPrevo = species.baseSpecies !== s.baseSpecies;
            if (checkingPrevo && !moveSources.size()) {
                if (!setSources.babyOnly || !species.prevo) {
                    babyOnly = species.id;
                }
            }
            var sources = learnset[moveid];
            if (moveid === 'sketch') {
                sketch = true;
            }
            else if (learnset['sketch']) {
                if (move.noSketch || move.isZ || move.isMax) {
                    cantLearnReason = "can't be Sketched.";
                }
                else if (move.gen > 7 && !canSketchPostGen7Moves) {
                    cantLearnReason = "can't be Sketched because it's a Gen ".concat(move.gen, " move and Sketch isn't available in Gen ").concat(move.gen, ".");
                }
                else {
                    if (!sources || !moveSources.size())
                        sketch = true;
                    sources = learnset['sketch'].concat(sources || []);
                }
            }
            if (typeof sources === 'string')
                sources = [sources];
            if (sources) {
                for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                    var learned = sources_1[_i];
                    // Every `learned` represents a single way a pokemon might
                    // learn a move. This can be handled one of several ways:
                    // `continue`
                    //   means we can't learn it
                    // `return null`
                    //   means we can learn it with no restrictions
                    //   (there's a way to just teach any pokemon of this species
                    //   the move in the current gen, like a TM.)
                    // `moveSources.add(source)`
                    //   means we can learn it only if obtained that exact way described
                    //   in source
                    // `moveSources.addGen(learnedGen)`
                    //   means we can learn it only if obtained at or before learnedGen
                    //   (i.e. get the pokemon however you want, transfer to that gen,
                    //   teach it, and transfer it to the current gen.)
                    var learnedGen = parseInt(learned.charAt(0));
                    if (learnedGen < this.minSourceGen) {
                        if (!cantLearnReason) {
                            cantLearnReason = "can't be transferred from Gen ".concat(learnedGen, " to ").concat(this.minSourceGen, ".");
                        }
                        continue;
                    }
                    if (noFutureGen && learnedGen > dex.gen) {
                        if (!cantLearnReason) {
                            cantLearnReason = "can't be transferred from Gen ".concat(learnedGen, " to ").concat(dex.gen, ".");
                        }
                        continue;
                    }
                    // redundant
                    if (learnedGen <= moveSources.sourcesBefore)
                        continue;
                    if (baseSpecies.evoRegion === 'Alola' && checkingPrevo && learnedGen >= 8 &&
                        (dex.gen < 9 || learned.charAt(1) !== 'E')) {
                        cantLearnReason = "is from a ".concat(species.name, " that can't be transferred to USUM to evolve into ").concat(baseSpecies.name, ".");
                        continue;
                    }
                    var canUseAbilityPatch = dex.gen >= 8 && format.mod !== 'gen8dlc1';
                    if (learnedGen < 7 && setSources.isHidden && !canUseAbilityPatch &&
                        !dex.mod('gen' + learnedGen).species.get(baseSpecies.name).abilities['H']) {
                        cantLearnReason = "can only be learned in gens without Hidden Abilities.";
                        continue;
                    }
                    var ability = dex.abilities.get(set.ability);
                    if (dex.gen < 6 && ability.gen > learnedGen && !checkingPrevo) {
                        // You can evolve a transfered mon to reroll for its new Ability.
                        cantLearnReason = "is learned in gen ".concat(learnedGen, ", but the Ability ").concat(ability.name, " did not exist then.");
                        continue;
                    }
                    if (!species.isNonstandard) {
                        // HMs can't be transferred
                        if (dex.gen >= 4 && learnedGen <= 3 && [
                            'cut', 'fly', 'surf', 'strength', 'flash', 'rocksmash', 'waterfall', 'dive',
                        ].includes(moveid)) {
                            cantLearnReason = "can't be transferred from Gen 3 to 4 because it's an HM move.";
                            continue;
                        }
                        if (dex.gen >= 5 && learnedGen <= 4 && [
                            'cut', 'fly', 'surf', 'strength', 'rocksmash', 'waterfall', 'rockclimb',
                        ].includes(moveid)) {
                            cantLearnReason = "can't be transferred from Gen 4 to 5 because it's an HM move.";
                            continue;
                        }
                        // Defog and Whirlpool can't be transferred together
                        if (dex.gen >= 5 && ['defog', 'whirlpool'].includes(moveid) && learnedGen <= 4)
                            blockedHM = true;
                    }
                    if (learned.charAt(1) === 'L') {
                        // special checking for level-up moves
                        if (level >= parseInt(learned.substr(2)) || learnedGen === 7) {
                            // we're past the required level to learn it
                            // (gen 7 level-up moves can be relearnered at any level)
                            // falls through to LMT check below
                        }
                        else if (level >= 5 && learnedGen === 3 && species.canHatch) {
                            // Pomeg Glitch
                            learned = learnedGen + 'Epomeg';
                        }
                        else if ((!species.gender || species.gender === 'F') &&
                            learnedGen >= 2 && species.canHatch && !setSources.isFromPokemonGo) {
                            // available as egg move
                            learned = learnedGen + 'Eany';
                            // falls through to E check below
                        }
                        else {
                            // this move is unavailable, skip it
                            cantLearnReason = "is learned at level ".concat(parseInt(learned.substr(2)), ".");
                            continue;
                        }
                    }
                    // Gen 8+ egg moves can be taught to any pokemon from any source
                    if (learnedGen >= 8 && learned.charAt(1) === 'E' && learned.slice(1) !== 'Eany' &&
                        learned.slice(1) !== 'Epomeg' || 'LMTR'.includes(learned.charAt(1))) {
                        if (learnedGen === dex.gen && learned.charAt(1) !== 'R') {
                            // current-gen level-up, TM or tutor moves:
                            //   always available
                            if (!(learnedGen >= 8 && learned.charAt(1) === 'E') && babyOnly) {
                                if (setSources.isFromPokemonGo && species.evoLevel) {
                                    cantLearnReason = "is from a prevo, which is incompatible with its Pokemon GO origin.";
                                    continue;
                                }
                                else {
                                    setSources.babyOnly = babyOnly;
                                }
                            }
                            if (!moveSources.moveEvoCarryCount)
                                return null;
                        }
                        // past-gen level-up, TM, or tutor moves:
                        //   available as long as the source gen was or was before this gen
                        if (learned.charAt(1) === 'R') {
                            moveSources.restrictedMove = moveid;
                        }
                        limit1 = false;
                        moveSources.addGen(learnedGen);
                    }
                    else if (learned.charAt(1) === 'E') {
                        // egg moves:
                        //   only if hatched from an egg
                        var limitedEggMove = undefined;
                        if (learned.slice(1) === 'Eany') {
                            if (species.gender === 'F') {
                                limitedEggMove = move.id;
                                moveSources.levelUpEggMoves = [move.id];
                            }
                            else {
                                limitedEggMove = null;
                            }
                        }
                        else if (learned.slice(1) === 'Epomeg') {
                            // Pomeg glitched moves have to be from an egg but since they aren't true egg moves,
                            // there should be no breeding restrictions
                            moveSources.pomegEggMoves = [move.id];
                        }
                        else if (learnedGen < 6) {
                            limitedEggMove = move.id;
                        }
                        learned = learnedGen + 'E' + (species.prevo ? species.id : '');
                        if (tradebackEligible && learnedGen === 2 && move.gen <= 1) {
                            // can tradeback
                            moveSources.add('1ET' + learned.slice(2), limitedEggMove);
                        }
                        moveSources.add(learned, limitedEggMove);
                    }
                    else if (learned.charAt(1) === 'S') {
                        // event moves:
                        //   only if that was the source
                        // Event Pokémon:
                        // 	Available as long as the past gen can get the Pokémon and then trade it back.
                        if (tradebackEligible && learnedGen === 2 && move.gen <= 1) {
                            // can tradeback
                            moveSources.add('1ST' + learned.slice(2) + ' ' + species.id);
                        }
                        moveSources.add(learned + ' ' + species.id);
                        var eventLearnset = dex.species.getLearnsetData(species.id);
                        if (((_a = eventLearnset.eventData) === null || _a === void 0 ? void 0 : _a[parseInt(learned.charAt(2))].emeraldEventEgg) && learnedGen === 3) {
                            moveSources.pomegEventEgg = learned + ' ' + species.id;
                        }
                    }
                    else if (learned.charAt(1) === 'D') {
                        // DW moves:
                        //   only if that was the source
                        moveSources.add(learned + species.id);
                        moveSources.dreamWorldMoveCount++;
                    }
                    else if (learned.charAt(1) === 'V' && this.minSourceGen < learnedGen) {
                        // Virtual Console or Let's Go transfer moves:
                        //   only if that was the source
                        if (learned === '8V' && setSources.isFromPokemonGo && babyOnly && species.evoLevel) {
                            cantLearnReason = "is from a prevo, which is incompatible with its Pokemon GO origin.";
                            continue;
                        }
                        moveSources.add(learned);
                    }
                }
            }
            if (ruleTable.has('mimicglitch') && species.gen < 5) {
                // include the Mimic Glitch when checking this mon's learnset
                var glitchMoves = ['metronome', 'copycat', 'transform', 'mimic', 'assist'];
                var getGlitch = false;
                for (var _b = 0, glitchMoves_1 = glitchMoves; _b < glitchMoves_1.length; _b++) {
                    var i = glitchMoves_1[_b];
                    if (learnset[i]) {
                        if (!(i === 'mimic' && dex.abilities.get(set.ability).gen === 4 && !species.prevo)) {
                            getGlitch = true;
                            break;
                        }
                    }
                }
                if (getGlitch) {
                    moveSources.addGen(4);
                    if (move.gen < 5) {
                        limit1 = false;
                    }
                }
            }
            if (!moveSources.size()) {
                if ((species.evoType === 'levelMove' && species.evoMove !== move.name) ||
                    (species.id === 'sylveon' && move.type !== 'Fairy')) {
                    moveSources.moveEvoCarryCount = 1;
                }
            }
            // also check to see if the mon's prevo or freely switchable formes can learn this move
            species = this.learnsetParent(species);
        }
        if (limit1 && sketch) {
            // limit 1 sketch move
            if (setSources.sketchMove) {
                return " can't Sketch ".concat(move.name, " and ").concat(setSources.sketchMove, " because it can only Sketch 1 move.");
            }
            setSources.sketchMove = move.name;
        }
        if (blockedHM) {
            // Limit one of Defog/Whirlpool to be transferred
            if (setSources.hm)
                return " can't simultaneously transfer Defog and Whirlpool from Gen 4 to 5.";
            setSources.hm = moveid;
        }
        if (!setSources.restrictiveMoves) {
            setSources.restrictiveMoves = [];
        }
        setSources.restrictiveMoves.push(move.name);
        var checkedSpecies = babyOnly ? species : baseSpecies;
        if (checkedSpecies && setSources.isFromPokemonGo &&
            (setSources.pokemonGoSource === 'purified' || checkedSpecies.id === 'mew')) {
            // Pokemon that cannot be sent from Pokemon GO to Let's Go can only access Let's Go moves through HOME
            // It can only obtain a chain of four level up moves and cannot have TM moves
            var pokemonGoData = dex.species.getPokemonGoData(checkedSpecies.id);
            if (pokemonGoData.LGPERestrictiveMoves) {
                var levelUpMoveCount = 0;
                var restrictiveMovesToID = [];
                for (var _c = 0, _d = setSources.restrictiveMoves; _c < _d.length; _c++) {
                    var moveName = _d[_c];
                    restrictiveMovesToID.push((0, dex_1.toID)(moveName));
                }
                for (var restrictiveMove in pokemonGoData.LGPERestrictiveMoves) {
                    var moveLevel = pokemonGoData.LGPERestrictiveMoves[restrictiveMove];
                    if ((0, dex_1.toID)(move) === restrictiveMove) {
                        if (!moveLevel) {
                            return "'s move ".concat(move.name, " is incompatible with its Pokemon GO origin.");
                        }
                        else if (set.level && set.level < moveLevel) {
                            return " must be at least level ".concat(moveLevel, " to learn ").concat(move.name, " due to its Pokemon GO origin.");
                        }
                    }
                    if (levelUpMoveCount)
                        levelUpMoveCount++;
                    if (restrictiveMovesToID.includes(restrictiveMove)) {
                        if (!levelUpMoveCount) {
                            levelUpMoveCount++;
                        }
                        else if (levelUpMoveCount > 4) {
                            return "'s moves ".concat((setSources.restrictiveMoves || []).join(', '), " are incompatible with its Pokemon GO origin.");
                        }
                    }
                }
            }
        }
        // Now that we have our list of possible sources, intersect it with the current list
        if (!moveSources.size()) {
            if (cantLearnReason)
                return "'s move ".concat(move.name, " ").concat(cantLearnReason);
            return " can't learn ".concat(move.name, ".");
        }
        var eggSources = moveSources.sources.filter(function (source) { return source.charAt(1) === 'E'; });
        if (dex.gen >= 3 && eggSources.length && moveSources.limitedEggMoves === null && moveSources.sourcesBefore) {
            moveSources.possiblyLimitedEggMoves = [(0, dex_1.toID)(moveSources.sourcesBefore + move.id)];
        }
        var backupSources = setSources.sources;
        var backupSourcesBefore = setSources.sourcesBefore;
        setSources.intersectWith(moveSources);
        if (!setSources.size()) {
            // pretend this pokemon didn't have this move:
            // prevents a crash if OMs override `checkCanLearn` to keep validating after an error
            setSources.sources = backupSources;
            setSources.sourcesBefore = backupSourcesBefore;
            if (setSources.isFromPokemonGo)
                return "'s move ".concat(move.name, " is incompatible with its Pokemon GO origin.");
            return "'s moves ".concat((setSources.restrictiveMoves || []).join(', '), " are incompatible.");
        }
        if (babyOnly)
            setSources.babyOnly = babyOnly;
        return null;
    };
    TeamValidator.prototype.learnsetParent = function (species) {
        // Own Tempo Rockruff and Battle Bond Greninja are special event formes
        // that are visually indistinguishable from their base forme but have
        // different learnsets. To prevent a leak, we make them show up as their
        // base forme, but hardcode their learnsets into Rockruff-Dusk and
        // Greninja-Ash
        if (['Gastrodon', 'Pumpkaboo', 'Sinistea', 'Tatsugiri'].includes(species.baseSpecies) && species.forme) {
            return this.dex.species.get(species.baseSpecies);
        }
        else if (species.name === 'Lycanroc-Dusk') {
            return this.dex.species.get('Rockruff-Dusk');
        }
        else if (species.name === 'Greninja-Bond') {
            return null;
        }
        else if (species.prevo) {
            // there used to be a check for Hidden Ability here, but apparently it's unnecessary
            // Shed Skin Pupitar can definitely evolve into Unnerve Tyranitar
            species = this.dex.species.get(species.prevo);
            if (species.gen > Math.max(2, this.dex.gen))
                return null;
            return species;
        }
        else if (species.changesFrom && species.baseSpecies !== 'Kyurem') {
            // For Pokemon like Rotom and Necrozma whose movesets are extensions are their base formes
            return this.dex.species.get(species.changesFrom);
        }
        return null;
    };
    TeamValidator.fillStats = function (stats, fillNum) {
        if (fillNum === void 0) { fillNum = 0; }
        var filledStats = { hp: fillNum, atk: fillNum, def: fillNum, spa: fillNum, spd: fillNum, spe: fillNum };
        if (stats) {
            var statName = void 0;
            for (statName in filledStats) {
                var stat = stats[statName];
                if (typeof stat === 'number')
                    filledStats[statName] = stat;
            }
        }
        return filledStats;
    };
    TeamValidator.get = function (format) {
        return new TeamValidator(format);
    };
    return TeamValidator;
}());
exports.TeamValidator = TeamValidator;
