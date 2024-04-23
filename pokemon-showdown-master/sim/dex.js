"use strict";
/**
 * Dex
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Handles getting data about pokemon, items, etc. Also contains some useful
 * helper functions for using dex data.
 *
 * By default, nothing is loaded until you call Dex.mod(mod) or
 * Dex.forFormat(format).
 *
 * You may choose to preload some things:
 * - Dex.includeMods() ~10ms
 *   This will preload `Dex.dexes`, giving you a list of possible mods.
 * - Dex.includeFormats() ~30ms
 *   As above, but will also preload `Dex.formats.all()`.
 * - Dex.includeData() ~500ms
 *   As above, but will also preload all of Dex.data for Gen 8, so
 *   functions like `Dex.species.get`, etc will be instantly usable.
 * - Dex.includeModData() ~1500ms
 *   As above, but will also preload `Dex.dexes[...].data` for all mods.
 *
 * Note that preloading is never necessary. All the data will be
 * automatically preloaded when needed, preloading will just spend time
 * now so you don't need to spend time later.
 *
 * @license MIT
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dex = exports.ModdedDex = exports.toID = void 0;
var fs = require("fs");
var path = require("path");
var Data = require("./dex-data");
var dex_conditions_1 = require("./dex-conditions");
var dex_moves_1 = require("./dex-moves");
var dex_items_1 = require("./dex-items");
var dex_abilities_1 = require("./dex-abilities");
var dex_species_1 = require("./dex-species");
var dex_formats_1 = require("./dex-formats");
var lib_1 = require("../lib");
var BASE_MOD = 'gen9';
var DATA_DIR = path.resolve(__dirname, '../data');
var MODS_DIR = path.resolve(DATA_DIR, './mods');
var dexes = Object.create(null);
var DATA_TYPES = [
    'Abilities', 'Rulesets', 'FormatsData', 'Items', 'Learnsets', 'Moves',
    'Natures', 'Pokedex', 'Scripts', 'Conditions', 'TypeChart', 'PokemonGoData',
];
var DATA_FILES = {
    Abilities: 'abilities',
    Aliases: 'aliases',
    Rulesets: 'rulesets',
    FormatsData: 'formats-data',
    Items: 'items',
    Learnsets: 'learnsets',
    Moves: 'moves',
    Natures: 'natures',
    Pokedex: 'pokedex',
    PokemonGoData: 'pokemongo',
    Scripts: 'scripts',
    Conditions: 'conditions',
    TypeChart: 'typechart',
};
exports.toID = Data.toID;
var ModdedDex = /** @class */ (function () {
    function ModdedDex(mod) {
        if (mod === void 0) { mod = 'base'; }
        this.Data = Data;
        this.Condition = dex_conditions_1.Condition;
        this.Ability = dex_abilities_1.Ability;
        this.Item = dex_items_1.Item;
        this.Move = dex_moves_1.DataMove;
        this.Species = dex_species_1.Species;
        this.Format = dex_formats_1.Format;
        this.ModdedDex = ModdedDex;
        this.name = "[ModdedDex]";
        this.toID = Data.toID;
        this.gen = 0;
        this.parentMod = '';
        this.modsLoaded = false;
        this.deepClone = lib_1.Utils.deepClone;
        this.isBase = (mod === 'base');
        this.currentMod = mod;
        this.dataDir = (this.isBase ? DATA_DIR : MODS_DIR + '/' + this.currentMod);
        this.dataCache = null;
        this.textCache = null;
        this.formats = new dex_formats_1.DexFormats(this);
        this.abilities = new dex_abilities_1.DexAbilities(this);
        this.items = new dex_items_1.DexItems(this);
        this.moves = new dex_moves_1.DexMoves(this);
        this.species = new dex_species_1.DexSpecies(this);
        this.conditions = new dex_conditions_1.DexConditions(this);
        this.natures = new Data.DexNatures(this);
        this.types = new Data.DexTypes(this);
        this.stats = new Data.DexStats(this);
    }
    Object.defineProperty(ModdedDex.prototype, "data", {
        get: function () {
            return this.loadData();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ModdedDex.prototype, "dexes", {
        get: function () {
            this.includeMods();
            return dexes;
        },
        enumerable: false,
        configurable: true
    });
    ModdedDex.prototype.mod = function (mod) {
        if (!dexes['base'].modsLoaded)
            dexes['base'].includeMods();
        return dexes[mod || 'base'];
    };
    ModdedDex.prototype.forGen = function (gen) {
        if (!gen)
            return this;
        return this.mod("gen".concat(gen));
    };
    ModdedDex.prototype.forFormat = function (format) {
        if (!this.modsLoaded)
            this.includeMods();
        var mod = this.formats.get(format).mod;
        return dexes[mod || BASE_MOD].includeData();
    };
    ModdedDex.prototype.modData = function (dataType, id) {
        if (this.isBase)
            return this.data[dataType][id];
        if (this.data[dataType][id] !== dexes[this.parentMod].data[dataType][id])
            return this.data[dataType][id];
        return (this.data[dataType][id] = lib_1.Utils.deepClone(this.data[dataType][id]));
    };
    ModdedDex.prototype.effectToString = function () {
        return this.name;
    };
    /**
     * Sanitizes a username or Pokemon nickname
     *
     * Returns the passed name, sanitized for safe use as a name in the PS
     * protocol.
     *
     * Such a string must uphold these guarantees:
     * - must not contain any ASCII whitespace character other than a space
     * - must not start or end with a space character
     * - must not contain any of: | , [ ]
     * - must not be the empty string
     * - must not contain Unicode RTL control characters
     *
     * If no such string can be found, returns the empty string. Calling
     * functions are expected to check for that condition and deal with it
     * accordingly.
     *
     * getName also enforces that there are not multiple consecutive space
     * characters in the name, although this is not strictly necessary for
     * safety.
     */
    ModdedDex.prototype.getName = function (name) {
        if (typeof name !== 'string' && typeof name !== 'number')
            return '';
        name = ('' + name).replace(/[|\s[\],\u202e]+/g, ' ').trim();
        if (name.length > 18)
            name = name.substr(0, 18).trim();
        // remove zalgo
        name = name.replace(/[\u0300-\u036f\u0483-\u0489\u0610-\u0615\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06ED\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{3,}/g, '');
        name = name.replace(/[\u239b-\u23b9]/g, '');
        return name;
    };
    /**
     * Returns false if the target is immune; true otherwise.
     * Also checks immunity to some statuses.
     */
    ModdedDex.prototype.getImmunity = function (source, target) {
        var _a;
        var sourceType = typeof source !== 'string' ? source.type : source;
        // @ts-ignore
        var targetTyping = ((_a = target.getTypes) === null || _a === void 0 ? void 0 : _a.call(target)) || target.types || target;
        if (Array.isArray(targetTyping)) {
            for (var _i = 0, targetTyping_1 = targetTyping; _i < targetTyping_1.length; _i++) {
                var type = targetTyping_1[_i];
                if (!this.getImmunity(sourceType, type))
                    return false;
            }
            return true;
        }
        var typeData = this.types.get(targetTyping);
        if (typeData && typeData.damageTaken[sourceType] === 3)
            return false;
        return true;
    };
    ModdedDex.prototype.getEffectiveness = function (source, target) {
        var _a;
        var sourceType = typeof source !== 'string' ? source.type : source;
        // @ts-ignore
        var targetTyping = ((_a = target.getTypes) === null || _a === void 0 ? void 0 : _a.call(target)) || target.types || target;
        var totalTypeMod = 0;
        if (Array.isArray(targetTyping)) {
            for (var _i = 0, targetTyping_2 = targetTyping; _i < targetTyping_2.length; _i++) {
                var type = targetTyping_2[_i];
                totalTypeMod += this.getEffectiveness(sourceType, type);
            }
            return totalTypeMod;
        }
        var typeData = this.types.get(targetTyping);
        if (!typeData)
            return 0;
        switch (typeData.damageTaken[sourceType]) {
            case 1: return 1; // super-effective
            case 2: return -1; // resist
            // in case of weird situations like Gravity, immunity is handled elsewhere
            default: return 0;
        }
    };
    ModdedDex.prototype.getDescs = function (table, id, dataEntry) {
        var _a, _b;
        if (dataEntry.shortDesc) {
            return {
                desc: dataEntry.desc,
                shortDesc: dataEntry.shortDesc,
            };
        }
        var entry = this.loadTextData()[table][id];
        if (!entry)
            return null;
        var descs = {
            desc: '',
            shortDesc: '',
        };
        for (var i = this.gen; i < dexes['base'].gen; i++) {
            var curDesc = (_a = entry["gen".concat(i)]) === null || _a === void 0 ? void 0 : _a.desc;
            var curShortDesc = (_b = entry["gen".concat(i)]) === null || _b === void 0 ? void 0 : _b.shortDesc;
            if (!descs.desc && curDesc) {
                descs.desc = curDesc;
            }
            if (!descs.shortDesc && curShortDesc) {
                descs.shortDesc = curShortDesc;
            }
            if (descs.desc && descs.shortDesc)
                break;
        }
        if (!descs.shortDesc)
            descs.shortDesc = entry.shortDesc || '';
        if (!descs.desc)
            descs.desc = entry.desc || descs.shortDesc;
        return descs;
    };
    /**
     * Ensure we're working on a copy of a move (and make a copy if we aren't)
     *
     * Remember: "ensure" - by default, it won't make a copy of a copy:
     *     moveCopy === Dex.getActiveMove(moveCopy)
     *
     * If you really want to, use:
     *     moveCopyCopy = Dex.getActiveMove(moveCopy.id)
     */
    ModdedDex.prototype.getActiveMove = function (move) {
        if (move && typeof move.hit === 'number')
            return move;
        move = this.moves.get(move);
        var moveCopy = this.deepClone(move);
        moveCopy.hit = 0;
        return moveCopy;
    };
    ModdedDex.prototype.getHiddenPower = function (ivs) {
        var hpTypes = [
            'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel',
            'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark',
        ];
        var tr = this.trunc;
        var stats = { hp: 31, atk: 31, def: 31, spe: 31, spa: 31, spd: 31 };
        if (this.gen <= 2) {
            // Gen 2 specific Hidden Power check. IVs are still treated 0-31 so we get them 0-15
            var atkDV = tr(ivs.atk / 2);
            var defDV = tr(ivs.def / 2);
            var speDV = tr(ivs.spe / 2);
            var spcDV = tr(ivs.spa / 2);
            return {
                type: hpTypes[4 * (atkDV % 4) + (defDV % 4)],
                power: tr((5 * ((spcDV >> 3) + (2 * (speDV >> 3)) + (4 * (defDV >> 3)) + (8 * (atkDV >> 3))) + (spcDV % 4)) / 2 + 31),
            };
        }
        else {
            // Hidden Power check for Gen 3 onwards
            var hpTypeX = 0;
            var hpPowerX = 0;
            var i = 1;
            for (var s in stats) {
                hpTypeX += i * (ivs[s] % 2);
                hpPowerX += i * (tr(ivs[s] / 2) % 2);
                i *= 2;
            }
            return {
                type: hpTypes[tr(hpTypeX * 15 / 63)],
                // After Gen 6, Hidden Power is always 60 base power
                power: (this.gen && this.gen < 6) ? tr(hpPowerX * 40 / 63) + 30 : 60,
            };
        }
    };
    /**
     * Truncate a number into an unsigned 32-bit integer, for
     * compatibility with the cartridge games' math systems.
     */
    ModdedDex.prototype.trunc = function (num, bits) {
        if (bits === void 0) { bits = 0; }
        if (bits)
            return (num >>> 0) % (Math.pow(2, bits));
        return num >>> 0;
    };
    ModdedDex.prototype.dataSearch = function (target, searchIn, isInexact) {
        if (!target)
            return null;
        searchIn = searchIn || ['Pokedex', 'Moves', 'Abilities', 'Items', 'Natures'];
        var searchObjects = {
            Pokedex: 'species', Moves: 'moves', Abilities: 'abilities', Items: 'items', Natures: 'natures',
        };
        var searchTypes = {
            Pokedex: 'pokemon', Moves: 'move', Abilities: 'ability', Items: 'item', Natures: 'nature',
        };
        var searchResults = [];
        for (var _i = 0, searchIn_1 = searchIn; _i < searchIn_1.length; _i++) {
            var table = searchIn_1[_i];
            var res = this[searchObjects[table]].get(target);
            if (res.exists && res.gen <= this.gen) {
                searchResults.push({
                    isInexact: isInexact,
                    searchType: searchTypes[table],
                    name: res.name,
                });
            }
        }
        if (searchResults.length)
            return searchResults;
        if (isInexact)
            return null; // prevent infinite loop
        var cmpTarget = (0, exports.toID)(target);
        var maxLd = 3;
        if (cmpTarget.length <= 1) {
            return null;
        }
        else if (cmpTarget.length <= 4) {
            maxLd = 1;
        }
        else if (cmpTarget.length <= 6) {
            maxLd = 2;
        }
        searchResults = null;
        for (var _a = 0, _b = __spreadArray(__spreadArray([], searchIn, true), ['Aliases'], false); _a < _b.length; _a++) {
            var table = _b[_a];
            var searchObj = this.data[table];
            if (!searchObj)
                continue;
            for (var j in searchObj) {
                var ld = lib_1.Utils.levenshtein(cmpTarget, j, maxLd);
                if (ld <= maxLd) {
                    var word = searchObj[j].name || searchObj[j].species || j;
                    var results = this.dataSearch(word, searchIn, word);
                    if (results) {
                        searchResults = results;
                        maxLd = ld;
                    }
                }
            }
        }
        return searchResults;
    };
    ModdedDex.prototype.loadDataFile = function (basePath, dataType) {
        var _a, _b;
        try {
            var filePath = basePath + DATA_FILES[dataType];
            var dataObject = require(filePath);
            if (!dataObject || typeof dataObject !== 'object') {
                throw new TypeError("".concat(filePath, ", if it exists, must export a non-null object"));
            }
            if (((_b = (_a = dataObject[dataType]) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) !== 'Object') {
                throw new TypeError("".concat(filePath, ", if it exists, must export an object whose '").concat(dataType, "' property is an Object"));
            }
            return dataObject[dataType];
        }
        catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') {
                throw e;
            }
        }
        return {};
    };
    ModdedDex.prototype.loadTextFile = function (name, exportName) {
        return require("".concat(DATA_DIR, "/text/").concat(name))[exportName];
    };
    ModdedDex.prototype.includeMods = function () {
        if (!this.isBase)
            throw new Error("This must be called on the base Dex");
        if (this.modsLoaded)
            return this;
        for (var _i = 0, _a = fs.readdirSync(MODS_DIR); _i < _a.length; _i++) {
            var mod = _a[_i];
            dexes[mod] = new ModdedDex(mod);
        }
        this.modsLoaded = true;
        return this;
    };
    ModdedDex.prototype.includeModData = function () {
        for (var mod in this.dexes) {
            dexes[mod].includeData();
        }
        return this;
    };
    ModdedDex.prototype.includeData = function () {
        this.loadData();
        return this;
    };
    ModdedDex.prototype.loadTextData = function () {
        if (dexes['base'].textCache)
            return dexes['base'].textCache;
        dexes['base'].textCache = {
            Pokedex: this.loadTextFile('pokedex', 'PokedexText'),
            Moves: this.loadTextFile('moves', 'MovesText'),
            Abilities: this.loadTextFile('abilities', 'AbilitiesText'),
            Items: this.loadTextFile('items', 'ItemsText'),
            Default: this.loadTextFile('default', 'DefaultText'),
        };
        return dexes['base'].textCache;
    };
    ModdedDex.prototype.loadData = function () {
        if (this.dataCache)
            return this.dataCache;
        dexes['base'].includeMods();
        var dataCache = {};
        var basePath = this.dataDir + '/';
        var Scripts = this.loadDataFile(basePath, 'Scripts');
        this.parentMod = this.isBase ? '' : (Scripts.inherit || 'base');
        var parentDex;
        if (this.parentMod) {
            parentDex = dexes[this.parentMod];
            if (!parentDex || parentDex === this) {
                throw new Error("Unable to load ".concat(this.currentMod, ". 'inherit' in scripts.ts should specify a parent mod from which to inherit data, or must be not specified."));
            }
        }
        if (!parentDex) {
            // Formats are inherited by mods and used by Rulesets
            this.includeFormats();
        }
        for (var _i = 0, _a = DATA_TYPES.concat('Aliases'); _i < _a.length; _i++) {
            var dataType = _a[_i];
            var BattleData = this.loadDataFile(basePath, dataType);
            if (BattleData !== dataCache[dataType])
                dataCache[dataType] = Object.assign(BattleData, dataCache[dataType]);
            if (dataType === 'Rulesets' && !parentDex) {
                for (var _b = 0, _c = this.formats.all(); _b < _c.length; _b++) {
                    var format = _c[_b];
                    BattleData[format.id] = __assign(__assign({}, format), { ruleTable: null });
                }
            }
        }
        if (parentDex) {
            for (var _d = 0, DATA_TYPES_1 = DATA_TYPES; _d < DATA_TYPES_1.length; _d++) {
                var dataType = DATA_TYPES_1[_d];
                var parentTypedData = parentDex.data[dataType];
                var childTypedData = dataCache[dataType] || (dataCache[dataType] = {});
                for (var entryId in parentTypedData) {
                    if (childTypedData[entryId] === null) {
                        // null means don't inherit
                        delete childTypedData[entryId];
                    }
                    else if (!(entryId in childTypedData)) {
                        // If it doesn't exist it's inherited from the parent data
                        if (dataType === 'Pokedex') {
                            // Pokedex entries can be modified too many different ways
                            // e.g. inheriting different formats-data/learnsets
                            childTypedData[entryId] = this.deepClone(parentTypedData[entryId]);
                        }
                        else {
                            childTypedData[entryId] = parentTypedData[entryId];
                        }
                    }
                    else if (childTypedData[entryId] && childTypedData[entryId].inherit) {
                        // {inherit: true} can be used to modify only parts of the parent data,
                        // instead of overwriting entirely
                        delete childTypedData[entryId].inherit;
                        // Merge parent into children entry, preserving existing childs' properties.
                        for (var key in parentTypedData[entryId]) {
                            if (key in childTypedData[entryId])
                                continue;
                            childTypedData[entryId][key] = parentTypedData[entryId][key];
                        }
                    }
                }
            }
            dataCache['Aliases'] = parentDex.data['Aliases'];
        }
        // Flag the generation. Required for team validator.
        this.gen = dataCache.Scripts.gen;
        if (!this.gen)
            throw new Error("Mod ".concat(this.currentMod, " needs a generation number in scripts.js"));
        this.dataCache = dataCache;
        // Execute initialization script.
        if (Scripts.init)
            Scripts.init.call(this);
        return this.dataCache;
    };
    ModdedDex.prototype.includeFormats = function () {
        this.formats.load();
        return this;
    };
    return ModdedDex;
}());
exports.ModdedDex = ModdedDex;
dexes['base'] = new ModdedDex();
// "gen9" is an alias for the current base data
dexes[BASE_MOD] = dexes['base'];
exports.Dex = dexes['base'];
exports.default = exports.Dex;
