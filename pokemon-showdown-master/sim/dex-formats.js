"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.DexFormats = exports.Format = exports.RuleTable = void 0;
var lib_1 = require("../lib");
var dex_data_1 = require("./dex-data");
var tags_1 = require("../data/tags");
var DEFAULT_MOD = 'gen9';
/**
 * A RuleTable keeps track of the rules that a format has. The key can be:
 * - '[ruleid]' the ID of a rule in effect
 * - '-[thing]' or '-[category]:[thing]' ban a thing
 * - '+[thing]' or '+[category]:[thing]' allow a thing (override a ban)
 * [category] is one of: item, move, ability, species, basespecies
 *
 * The value is the name of the parent rule (blank for the active format).
 */
var RuleTable = /** @class */ (function (_super) {
    __extends(RuleTable, _super);
    function RuleTable() {
        var _this = _super.call(this) || this;
        _this.complexBans = [];
        _this.complexTeamBans = [];
        _this.checkCanLearn = null;
        _this.timer = null;
        _this.tagRules = [];
        _this.valueRules = new Map();
        return _this;
    }
    RuleTable.prototype.isBanned = function (thing) {
        if (this.has("+".concat(thing)))
            return false;
        return this.has("-".concat(thing));
    };
    RuleTable.prototype.isBannedSpecies = function (species) {
        if (this.has("+pokemon:".concat(species.id)))
            return false;
        if (this.has("-pokemon:".concat(species.id)))
            return true;
        if (this.has("+basepokemon:".concat((0, dex_data_1.toID)(species.baseSpecies))))
            return false;
        if (this.has("-basepokemon:".concat((0, dex_data_1.toID)(species.baseSpecies))))
            return true;
        for (var tagid in tags_1.Tags) {
            var tag = tags_1.Tags[tagid];
            if (this.has("-pokemontag:".concat(tagid))) {
                if ((tag.speciesFilter || tag.genericFilter)(species))
                    return true;
            }
        }
        for (var tagid in tags_1.Tags) {
            var tag = tags_1.Tags[tagid];
            if (this.has("+pokemontag:".concat(tagid))) {
                if ((tag.speciesFilter || tag.genericFilter)(species))
                    return false;
            }
        }
        return this.has("-pokemontag:allpokemon");
    };
    RuleTable.prototype.isRestricted = function (thing) {
        if (this.has("+".concat(thing)))
            return false;
        return this.has("*".concat(thing));
    };
    RuleTable.prototype.isRestrictedSpecies = function (species) {
        if (this.has("+pokemon:".concat(species.id)))
            return false;
        if (this.has("*pokemon:".concat(species.id)))
            return true;
        if (this.has("+basepokemon:".concat((0, dex_data_1.toID)(species.baseSpecies))))
            return false;
        if (this.has("*basepokemon:".concat((0, dex_data_1.toID)(species.baseSpecies))))
            return true;
        for (var tagid in tags_1.Tags) {
            var tag = tags_1.Tags[tagid];
            if (this.has("*pokemontag:".concat(tagid))) {
                if ((tag.speciesFilter || tag.genericFilter)(species))
                    return true;
            }
        }
        for (var tagid in tags_1.Tags) {
            var tag = tags_1.Tags[tagid];
            if (this.has("+pokemontag:".concat(tagid))) {
                if ((tag.speciesFilter || tag.genericFilter)(species))
                    return false;
            }
        }
        return this.has("*pokemontag:allpokemon");
    };
    RuleTable.prototype.getTagRules = function () {
        var tagRules = [];
        for (var _i = 0, _a = this.keys(); _i < _a.length; _i++) {
            var ruleid = _a[_i];
            if (/^[+*-]pokemontag:/.test(ruleid)) {
                var banid = ruleid.slice(12);
                if (banid === 'allpokemon' || banid === 'allitems' || banid === 'allmoves' ||
                    banid === 'allabilities' || banid === 'allnatures') {
                    // hardcoded and not a part of the ban rule system
                }
                else {
                    tagRules.push(ruleid);
                }
            }
            else if ('+*-'.includes(ruleid.charAt(0)) && ruleid.slice(1) === 'nonexistent') {
                tagRules.push(ruleid.charAt(0) + 'pokemontag:nonexistent');
            }
        }
        this.tagRules = tagRules.reverse();
        return this.tagRules;
    };
    /**
     * - non-empty string: banned, string is the reason
     * - '': whitelisted
     * - null: neither whitelisted nor banned
     */
    RuleTable.prototype.check = function (thing, setHas) {
        if (setHas === void 0) { setHas = null; }
        if (this.has("+".concat(thing)))
            return '';
        if (setHas)
            setHas[thing] = true;
        return this.getReason("-".concat(thing));
    };
    RuleTable.prototype.getReason = function (key) {
        var source = this.get(key);
        if (source === undefined)
            return null;
        if (key === '-nonexistent' || key.startsWith('obtainable')) {
            return 'not obtainable';
        }
        return source ? "banned by ".concat(source) : "banned";
    };
    RuleTable.prototype.blame = function (key) {
        var source = this.get(key);
        return source ? " from ".concat(source) : "";
    };
    RuleTable.prototype.getComplexBanIndex = function (complexBans, rule) {
        var ruleId = (0, dex_data_1.toID)(rule);
        var complexBanIndex = -1;
        for (var i = 0; i < complexBans.length; i++) {
            if ((0, dex_data_1.toID)(complexBans[i][0]) === ruleId) {
                complexBanIndex = i;
                break;
            }
        }
        return complexBanIndex;
    };
    RuleTable.prototype.addComplexBan = function (rule, source, limit, bans) {
        var complexBanIndex = this.getComplexBanIndex(this.complexBans, rule);
        if (complexBanIndex !== -1) {
            if (this.complexBans[complexBanIndex][2] === Infinity)
                return;
            this.complexBans[complexBanIndex] = [rule, source, limit, bans];
        }
        else {
            this.complexBans.push([rule, source, limit, bans]);
        }
    };
    RuleTable.prototype.addComplexTeamBan = function (rule, source, limit, bans) {
        var complexBanTeamIndex = this.getComplexBanIndex(this.complexTeamBans, rule);
        if (complexBanTeamIndex !== -1) {
            if (this.complexTeamBans[complexBanTeamIndex][2] === Infinity)
                return;
            this.complexTeamBans[complexBanTeamIndex] = [rule, source, limit, bans];
        }
        else {
            this.complexTeamBans.push([rule, source, limit, bans]);
        }
    };
    /** After a RuleTable has been filled out, resolve its hardcoded numeric properties */
    RuleTable.prototype.resolveNumbers = function (format, dex) {
        var gameTypeMinTeamSize = ['triples', 'rotation'].includes(format.gameType) ? 3 :
            format.gameType === 'doubles' ? 2 :
                1;
        // NOTE: These numbers are pre-calculated here because they're hardcoded
        // into the team validator and battle engine, and can affect validation
        // in complicated ways.
        // If you're making your own rule, it nearly definitely does not not
        // belong here: `onValidateRule`, `onValidateSet`, and `onValidateTeam`
        // should be enough for a validator rule, and the battle event system
        // should be enough for a battle rule.
        this.minTeamSize = Number(this.valueRules.get('minteamsize')) || 0;
        this.maxTeamSize = Number(this.valueRules.get('maxteamsize')) || 6;
        this.pickedTeamSize = Number(this.valueRules.get('pickedteamsize')) || null;
        this.maxTotalLevel = Number(this.valueRules.get('maxtotallevel')) || null;
        this.maxMoveCount = Number(this.valueRules.get('maxmovecount')) || 4;
        this.minSourceGen = Number(this.valueRules.get('minsourcegen')) || 1;
        this.minLevel = Number(this.valueRules.get('minlevel')) || 1;
        this.maxLevel = Number(this.valueRules.get('maxlevel')) || 100;
        this.defaultLevel = Number(this.valueRules.get('defaultlevel')) || 0;
        this.adjustLevel = Number(this.valueRules.get('adjustlevel')) || null;
        this.adjustLevelDown = Number(this.valueRules.get('adjustleveldown')) || null;
        this.evLimit = Number(this.valueRules.get('evlimit')) || null;
        if (this.valueRules.get('pickedteamsize') === 'Auto') {
            this.pickedTeamSize = (['doubles', 'rotation'].includes(format.gameType) ? 4 :
                format.gameType === 'triples' ? 6 :
                    3);
        }
        if (this.valueRules.get('evlimit') === 'Auto') {
            this.evLimit = dex.gen > 2 ? 510 : null;
            if (format.mod === 'gen7letsgo') {
                this.evLimit = this.has('allowavs') ? null : 0;
            }
            // Gen 6 hackmons also has a limit, which is currently implemented
            // at the appropriate format.
        }
        // sanity checks; these _could_ be inside `onValidateRule` but this way
        // involves less string conversion.
        // engine hard limits
        if (this.maxTeamSize > 24) {
            throw new Error("Max team size ".concat(this.maxTeamSize).concat(this.blame('maxteamsize'), " is unsupported (we only support up to 24)."));
        }
        if (this.maxLevel > 99999) {
            throw new Error("Max level ".concat(this.maxLevel).concat(this.blame('maxlevel'), " is unsupported (we only support up to 99999)"));
        }
        if (this.maxMoveCount > 24) {
            // A limit is imposed here to prevent too much engine strain or
            // too much layout deformation - to be exact, this is the limit
            // allowed in Custom Game.
            throw new Error("Max move count ".concat(this.maxMoveCount).concat(this.blame('maxmovecount'), " is unsupported (we only support up to 24)"));
        }
        if (!this.defaultLevel) {
            // defaultLevel will set level 100 pokemon to the default level, which can break
            // Max Total Level if Max Level is above 100.
            var maxTeamSize = this.pickedTeamSize || this.maxTeamSize;
            if (this.maxTotalLevel && this.maxLevel > 100 && this.maxLevel * maxTeamSize > this.maxTotalLevel) {
                this.defaultLevel = 100;
            }
            else {
                this.defaultLevel = this.maxLevel;
            }
        }
        if (this.minTeamSize && this.minTeamSize < gameTypeMinTeamSize) {
            throw new Error("Min team size ".concat(this.minTeamSize).concat(this.blame('minteamsize'), " must be at least ").concat(gameTypeMinTeamSize, " for a ").concat(format.gameType, " game."));
        }
        if (this.pickedTeamSize && this.pickedTeamSize < gameTypeMinTeamSize) {
            throw new Error("Chosen team size ".concat(this.pickedTeamSize).concat(this.blame('pickedteamsize'), " must be at least ").concat(gameTypeMinTeamSize, " for a ").concat(format.gameType, " game."));
        }
        if (this.minTeamSize && this.pickedTeamSize && this.minTeamSize < this.pickedTeamSize) {
            throw new Error("Min team size ".concat(this.minTeamSize).concat(this.blame('minteamsize'), " is lower than chosen team size ").concat(this.pickedTeamSize).concat(this.blame('pickedteamsize'), "."));
        }
        if (!this.minTeamSize)
            this.minTeamSize = Math.max(gameTypeMinTeamSize, this.pickedTeamSize || 0);
        if (this.maxTeamSize < gameTypeMinTeamSize) {
            throw new Error("Max team size ".concat(this.maxTeamSize).concat(this.blame('maxteamsize'), " must be at least ").concat(gameTypeMinTeamSize, " for a ").concat(format.gameType, " game."));
        }
        if (this.maxTeamSize < this.minTeamSize) {
            throw new Error("Max team size ".concat(this.maxTeamSize).concat(this.blame('maxteamsize'), " must be at least min team size ").concat(this.minTeamSize).concat(this.blame('minteamsize'), "."));
        }
        if (this.minLevel > this.maxLevel) {
            throw new Error("Min level ".concat(this.minLevel).concat(this.blame('minlevel'), " should not be above max level ").concat(this.maxLevel).concat(this.blame('maxlevel'), "."));
        }
        if (this.defaultLevel > this.maxLevel) {
            throw new Error("Default level ".concat(this.defaultLevel).concat(this.blame('defaultlevel'), " should not be above max level ").concat(this.maxLevel).concat(this.blame('maxlevel'), "."));
        }
        if (this.defaultLevel < this.minLevel) {
            throw new Error("Default level ".concat(this.defaultLevel).concat(this.blame('defaultlevel'), " should not be below min level ").concat(this.minLevel).concat(this.blame('minlevel'), "."));
        }
        if (this.adjustLevelDown && this.adjustLevelDown >= this.maxLevel) {
            throw new Error("Adjust Level Down ".concat(this.adjustLevelDown).concat(this.blame('adjustleveldown'), " will have no effect because it's not below max level ").concat(this.maxLevel).concat(this.blame('maxlevel'), "."));
        }
        if (this.adjustLevel && this.valueRules.has('minlevel')) {
            throw new Error("Min Level ".concat(this.minLevel).concat(this.blame('minlevel'), " will have no effect because you're using Adjust Level ").concat(this.adjustLevel).concat(this.blame('adjustlevel'), "."));
        }
        if (this.evLimit && this.evLimit >= 1512) {
            throw new Error("EV Limit ".concat(this.evLimit).concat(this.blame('evlimit'), " will have no effect because it's not lower than 1512, the maximum possible combination of 252 EVs in every stat (if you currently have an EV limit, use \"! EV Limit\" to remove the limit)."));
        }
        if (this.evLimit && this.evLimit < 0) {
            throw new Error("EV Limit ".concat(this.evLimit).concat(this.blame('evlimit'), " can't be less than 0 (you might have meant: \"! EV Limit\" to remove the limit, or \"EV Limit = 0\" to ban EVs)."));
        }
        if (format.cupLevelLimit) {
            throw new Error("cupLevelLimit.range[0], cupLevelLimit.range[1], cupLevelLimit.total are now rules, respectively: \"Min Level = NUMBER\", \"Max Level = NUMBER\", and \"Max Total Level = NUMBER\"");
        }
        if (format.teamLength) {
            throw new Error("teamLength.validate[0], teamLength.validate[1], teamLength.battle are now rules, respectively: \"Min Team Size = NUMBER\", \"Max Team Size = NUMBER\", and \"Picked Team Size = NUMBER\"");
        }
        if (format.minSourceGen) {
            throw new Error("minSourceGen is now a rule: \"Min Source Gen = NUMBER\"");
        }
        if (format.maxLevel) {
            throw new Error("maxLevel is now a rule: \"Max Level = NUMBER\"");
        }
        if (format.defaultLevel) {
            throw new Error("defaultLevel is now a rule: \"Default Level = NUMBER\"");
        }
        if (format.forcedLevel) {
            throw new Error("forcedLevel is now a rule: \"Adjust Level = NUMBER\"");
        }
        if (format.maxForcedLevel) {
            throw new Error("maxForcedLevel is now a rule: \"Adjust Level Down = NUMBER\"");
        }
    };
    RuleTable.prototype.hasComplexBans = function () {
        var _a, _b;
        return (((_a = this.complexBans) === null || _a === void 0 ? void 0 : _a.length) > 0) || (((_b = this.complexTeamBans) === null || _b === void 0 ? void 0 : _b.length) > 0);
    };
    return RuleTable;
}(Map));
exports.RuleTable = RuleTable;
var Format = /** @class */ (function (_super) {
    __extends(Format, _super);
    function Format(data) {
        var _this = _super.call(this, data) || this;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        data = _this;
        _this.mod = lib_1.Utils.getString(data.mod) || 'gen9';
        _this.effectType = lib_1.Utils.getString(data.effectType) || 'Format';
        _this.debug = !!data.debug;
        _this.rated = (typeof data.rated === 'string' ? data.rated : data.rated !== false);
        _this.gameType = data.gameType || 'singles';
        _this.ruleset = data.ruleset || [];
        _this.baseRuleset = data.baseRuleset || [];
        _this.banlist = data.banlist || [];
        _this.restricted = data.restricted || [];
        _this.unbanlist = data.unbanlist || [];
        _this.customRules = data.customRules || null;
        _this.ruleTable = null;
        _this.onBegin = data.onBegin || undefined;
        _this.noLog = !!data.noLog;
        return _this;
    }
    return Format;
}(dex_data_1.BasicEffect));
exports.Format = Format;
/** merges format lists from config/formats and config/custom-formats */
function mergeFormatLists(main, custom) {
    // result that is return and makes the actual list for formats.
    var result = [];
    // used as a intermediary to build the final list.
    var build = [];
    // used to track current section to keep formats under their sections.
    var current = { section: "", formats: [] };
    // populates the original sections and formats easily
    // there should be no repeat sections at this point.
    for (var _i = 0, main_1 = main; _i < main_1.length; _i++) {
        var element = main_1[_i];
        if (element.section) {
            current = { section: element.section, column: element.column, formats: [] };
            build.push(current);
        }
        else if (element.name) {
            current.formats.push(element);
        }
    }
    // merges the second list the hard way. Accounts for repeats.
    if (custom !== undefined) {
        var _loop_1 = function (element) {
            // finds the section and makes it if it doesn't exist.
            if (element.section) {
                current = build.find(function (e) { return e.section === element.section; });
                // if it's new it makes a new entry.
                if (current === undefined) {
                    current = { section: element.section, column: element.column, formats: [] };
                    build.push(current);
                }
            }
            else if (element.name) { // otherwise, adds the element to its section.
                current.formats.push(element);
            }
        };
        for (var _a = 0, custom_1 = custom; _a < custom_1.length; _a++) {
            var element = custom_1[_a];
            _loop_1(element);
        }
    }
    // builds the final result.
    for (var _b = 0, build_1 = build; _b < build_1.length; _b++) {
        var element = build_1[_b];
        // adds the section to the list.
        result.push.apply(result, __spreadArray([{ section: element.section, column: element.column }], element.formats, false));
    }
    return result;
}
var DexFormats = /** @class */ (function () {
    function DexFormats(dex) {
        this.rulesetCache = new Map();
        this.dex = dex;
        this.formatsListCache = null;
    }
    DexFormats.prototype.load = function () {
        if (!this.dex.isBase)
            throw new Error("This should only be run on the base mod");
        this.dex.includeMods();
        if (this.formatsListCache)
            return this;
        var formatsList = [];
        // Load formats
        var customFormats;
        try {
            customFormats = require("".concat(__dirname, "/../config/custom-formats")).Formats;
            if (!Array.isArray(customFormats)) {
                throw new TypeError("Exported property 'Formats' from \"./config/custom-formats.ts\" must be an array");
            }
        }
        catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') {
                throw e;
            }
        }
        var Formats = require("".concat(__dirname, "/../config/formats")).Formats;
        if (!Array.isArray(Formats)) {
            throw new TypeError("Exported property 'Formats' from \"./config/formats.ts\" must be an array");
        }
        if (customFormats)
            Formats = mergeFormatLists(Formats, customFormats);
        var section = '';
        var column = 1;
        for (var _i = 0, _a = Formats.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], format = _b[1];
            var id = (0, dex_data_1.toID)(format.name);
            if (format.section)
                section = format.section;
            if (format.column)
                column = format.column;
            if (!format.name && format.section)
                continue;
            if (!id) {
                throw new RangeError("Format #".concat(i + 1, " must have a name with alphanumeric characters, not '").concat(format.name, "'"));
            }
            if (!format.section)
                format.section = section;
            if (!format.column)
                format.column = column;
            if (this.rulesetCache.has(id))
                throw new Error("Format #".concat(i + 1, " has a duplicate ID: '").concat(id, "'"));
            format.effectType = 'Format';
            format.baseRuleset = format.ruleset ? format.ruleset.slice() : [];
            if (format.challengeShow === undefined)
                format.challengeShow = true;
            if (format.searchShow === undefined)
                format.searchShow = true;
            if (format.tournamentShow === undefined)
                format.tournamentShow = true;
            if (format.mod === undefined)
                format.mod = 'gen9';
            if (!this.dex.dexes[format.mod])
                throw new Error("Format \"".concat(format.name, "\" requires nonexistent mod: '").concat(format.mod, "'"));
            var ruleset = new Format(format);
            this.rulesetCache.set(id, ruleset);
            formatsList.push(ruleset);
        }
        this.formatsListCache = formatsList;
        return this;
    };
    /**
     * Returns a sanitized format ID if valid, or throws if invalid.
     */
    DexFormats.prototype.validate = function (name) {
        var _this = this;
        var _a = name.split('@@@', 2), formatName = _a[0], customRulesString = _a[1];
        var format = this.get(formatName);
        if (!format.exists)
            throw new Error("Unrecognized format \"".concat(formatName, "\""));
        if (!customRulesString)
            return format.id;
        var ruleTable = this.getRuleTable(format);
        var customRules = customRulesString.split(',').map(function (rule) {
            rule = rule.replace(/[\r\n|]*/g, '').trim();
            var ruleSpec = _this.validateRule(rule);
            if (typeof ruleSpec === 'string' && ruleTable.has(ruleSpec))
                return null;
            return rule;
        }).filter(Boolean);
        if (!customRules.length)
            throw new Error("The format already has your custom rules");
        var validatedFormatid = format.id + '@@@' + customRules.join(',');
        var moddedFormat = this.get(validatedFormatid, true);
        this.getRuleTable(moddedFormat);
        return validatedFormatid;
    };
    DexFormats.prototype.get = function (name, isTrusted) {
        if (isTrusted === void 0) { isTrusted = false; }
        if (name && typeof name !== 'string')
            return name;
        name = (name || '').trim();
        var id = (0, dex_data_1.toID)(name);
        if (!name.includes('@@@')) {
            var ruleset = this.rulesetCache.get(id);
            if (ruleset)
                return ruleset;
        }
        if (this.dex.data.Aliases.hasOwnProperty(id)) {
            name = this.dex.data.Aliases[id];
            id = (0, dex_data_1.toID)(name);
        }
        if (this.dex.data.Rulesets.hasOwnProperty(DEFAULT_MOD + id)) {
            id = (DEFAULT_MOD + id);
        }
        var supplementaryAttributes = null;
        if (name.includes('@@@')) {
            if (!isTrusted) {
                try {
                    name = this.validate(name);
                    isTrusted = true;
                }
                catch (_a) { }
            }
            var _b = name.split('@@@', 2), newName = _b[0], customRulesString = _b[1];
            name = newName.trim();
            id = (0, dex_data_1.toID)(name);
            if (isTrusted && customRulesString) {
                supplementaryAttributes = {
                    customRules: customRulesString.split(','),
                    searchShow: false,
                };
            }
        }
        var effect;
        if (this.dex.data.Rulesets.hasOwnProperty(id)) {
            effect = new Format(__assign(__assign({ name: name }, this.dex.data.Rulesets[id]), supplementaryAttributes));
        }
        else {
            effect = new Format({ id: id, name: name, exists: false });
        }
        return effect;
    };
    DexFormats.prototype.all = function () {
        this.load();
        return this.formatsListCache;
    };
    DexFormats.prototype.getRuleTable = function (format, depth, repeals) {
        var _a;
        if (depth === void 0) { depth = 1; }
        if (format.ruleTable && !repeals)
            return format.ruleTable;
        if (depth === 1) {
            var dex = this.dex.mod(format.mod);
            if (dex !== this.dex) {
                return dex.formats.getRuleTable(format, 2, repeals);
            }
        }
        var ruleTable = new RuleTable();
        var ruleset = format.ruleset.slice();
        for (var _i = 0, _b = format.banlist; _i < _b.length; _i++) {
            var ban = _b[_i];
            ruleset.push('-' + ban);
        }
        for (var _c = 0, _d = format.restricted; _c < _d.length; _c++) {
            var ban = _d[_c];
            ruleset.push('*' + ban);
        }
        for (var _e = 0, _f = format.unbanlist; _e < _f.length; _e++) {
            var ban = _f[_e];
            ruleset.push('+' + ban);
        }
        if (format.customRules) {
            ruleset.push.apply(ruleset, format.customRules);
        }
        if (format.checkCanLearn) {
            ruleTable.checkCanLearn = [format.checkCanLearn, format.name];
        }
        if (format.timer) {
            ruleTable.timer = [format.timer, format.name];
        }
        // apply rule repeals before other rules
        // repeals is a ruleid:depth map (positive: unused, negative: used)
        for (var _g = 0, ruleset_1 = ruleset; _g < ruleset_1.length; _g++) {
            var rule = ruleset_1[_g];
            if (rule.startsWith('!') && !rule.startsWith('!!')) {
                var ruleSpec = this.validateRule(rule, format);
                if (!repeals)
                    repeals = new Map();
                repeals.set(ruleSpec.slice(1), depth);
            }
        }
        for (var _h = 0, ruleset_2 = ruleset; _h < ruleset_2.length; _h++) {
            var rule = ruleset_2[_h];
            var ruleSpec = this.validateRule(rule, format);
            if (typeof ruleSpec !== 'string') {
                if (ruleSpec[0] === 'complexTeamBan') {
                    var complexTeamBan = ruleSpec.slice(1);
                    ruleTable.addComplexTeamBan(complexTeamBan[0], complexTeamBan[1], complexTeamBan[2], complexTeamBan[3]);
                }
                else if (ruleSpec[0] === 'complexBan') {
                    var complexBan = ruleSpec.slice(1);
                    ruleTable.addComplexBan(complexBan[0], complexBan[1], complexBan[2], complexBan[3]);
                }
                else {
                    throw new Error("Unrecognized rule spec ".concat(ruleSpec));
                }
                continue;
            }
            if (rule.startsWith('!') && !rule.startsWith('!!')) {
                var repealDepth = repeals.get(ruleSpec.slice(1));
                if (repealDepth === undefined)
                    throw new Error("Multiple \"".concat(rule, "\" rules in ").concat(format.name));
                if (repealDepth === depth) {
                    throw new Error("Rule \"".concat(rule, "\" did nothing because \"").concat(rule.slice(1), "\" is not in effect"));
                }
                if (repealDepth === -depth)
                    repeals.delete(ruleSpec.slice(1));
                continue;
            }
            if ('+*-'.includes(ruleSpec.charAt(0))) {
                if (ruleTable.has(ruleSpec)) {
                    throw new Error("Rule \"".concat(rule, "\" in \"").concat(format.name, "\" already exists in \"").concat(ruleTable.get(ruleSpec) || format.name, "\""));
                }
                for (var _j = 0, _k = '+*-'; _j < _k.length; _j++) {
                    var prefix = _k[_j];
                    ruleTable.delete(prefix + ruleSpec.slice(1));
                }
                ruleTable.set(ruleSpec, '');
                continue;
            }
            var _l = ruleSpec.split('='), formatid = _l[0], value = _l[1];
            var subformat = this.get(formatid);
            var repealAndReplace = ruleSpec.startsWith('!!');
            if (repeals === null || repeals === void 0 ? void 0 : repeals.has(subformat.id)) {
                repeals.set(subformat.id, -Math.abs(repeals.get(subformat.id)));
                continue;
            }
            if (subformat.hasValue) {
                if (value === undefined)
                    throw new Error("Rule \"".concat(ruleSpec, "\" should have a value (like \"").concat(ruleSpec, " = something\")"));
                if (value === 'Current Gen')
                    value = "".concat(this.dex.gen);
                if ((subformat.id === 'pickedteamsize' || subformat.id === 'evlimit') && value === 'Auto') {
                    // can't be resolved until later
                }
                else if (subformat.hasValue === 'integer' || subformat.hasValue === 'positive-integer') {
                    var intValue = parseInt(value);
                    if (isNaN(intValue) || value !== "".concat(intValue)) {
                        throw new Error("In rule \"".concat(ruleSpec, "\", \"").concat(value, "\" must be an integer number."));
                    }
                }
                if (subformat.hasValue === 'positive-integer') {
                    if (parseInt(value) === 0) {
                        throw new Error("In rule \"".concat(ruleSpec, "\", \"").concat(value, "\" must be positive (to remove it, use the rule \"! ").concat(subformat.name, "\")."));
                    }
                    if (parseInt(value) <= 0) {
                        throw new Error("In rule \"".concat(ruleSpec, "\", \"").concat(value, "\" must be positive."));
                    }
                }
                var oldValue = ruleTable.valueRules.get(subformat.id);
                if (oldValue === value) {
                    throw new Error("Rule \"".concat(ruleSpec, "\" is redundant with existing rule \"").concat(subformat.id, "=").concat(value, "\"").concat(ruleTable.blame(subformat.id), "."));
                }
                else if (repealAndReplace) {
                    if (oldValue === undefined) {
                        if (subformat.mutuallyExclusiveWith && ruleTable.valueRules.has(subformat.mutuallyExclusiveWith)) {
                            if (this.dex.formats.get(subformat.mutuallyExclusiveWith).ruleset.length) {
                                throw new Error("This format does not support \"!!\"");
                            }
                            ruleTable.valueRules.delete(subformat.mutuallyExclusiveWith);
                            ruleTable.delete(subformat.mutuallyExclusiveWith);
                        }
                        else {
                            throw new Error("Rule \"".concat(ruleSpec, "\" is not replacing anything (it should not have \"!!\")"));
                        }
                    }
                }
                else {
                    if (oldValue !== undefined) {
                        throw new Error("Rule \"".concat(ruleSpec, "\" conflicts with \"").concat(subformat.id, "=").concat(oldValue, "\"").concat(ruleTable.blame(subformat.id), " (Use \"!! ").concat(ruleSpec, "\" to override \"").concat(subformat.id, "=").concat(oldValue, "\".)"));
                    }
                    if (subformat.mutuallyExclusiveWith && ruleTable.valueRules.has(subformat.mutuallyExclusiveWith)) {
                        var oldRule = "\"".concat(subformat.mutuallyExclusiveWith, "=").concat(ruleTable.valueRules.get(subformat.mutuallyExclusiveWith), "\"");
                        throw new Error("Format can't simultaneously have \"".concat(ruleSpec, "\" and ").concat(oldRule).concat(ruleTable.blame(subformat.mutuallyExclusiveWith), " (Use \"!! ").concat(ruleSpec, "\" to override ").concat(oldRule, ".)"));
                    }
                }
                ruleTable.valueRules.set(subformat.id, value);
            }
            else {
                if (value !== undefined)
                    throw new Error("Rule \"".concat(ruleSpec, "\" should not have a value (no equals sign)"));
                if (repealAndReplace)
                    throw new Error("\"!!\" is not supported for this rule");
                if (ruleTable.has(subformat.id) && !repealAndReplace) {
                    throw new Error("Rule \"".concat(rule, "\" in \"").concat(format.name, "\" already exists in \"").concat(ruleTable.get(subformat.id) || format.name, "\""));
                }
            }
            ruleTable.set(subformat.id, '');
            if (depth > 16) {
                throw new Error("Excessive ruleTable recursion in ".concat(format.name, ": ").concat(ruleSpec, " of ").concat(format.ruleset));
            }
            var subRuleTable = this.getRuleTable(subformat, depth + 1, repeals);
            for (var _m = 0, subRuleTable_1 = subRuleTable; _m < subRuleTable_1.length; _m++) {
                var _o = subRuleTable_1[_m], ruleid = _o[0], sourceFormat = _o[1];
                // don't check for "already exists" here; multiple inheritance is allowed
                if (!(repeals === null || repeals === void 0 ? void 0 : repeals.has(ruleid))) {
                    var newValue = subRuleTable.valueRules.get(ruleid);
                    var oldValue = ruleTable.valueRules.get(ruleid);
                    if (newValue !== undefined) {
                        // set a value
                        var subSubFormat = this.get(ruleid);
                        if (subSubFormat.mutuallyExclusiveWith && ruleTable.valueRules.has(subSubFormat.mutuallyExclusiveWith)) {
                            // mutually exclusive conflict!
                            throw new Error("Rule \"".concat(ruleid, "=").concat(newValue, "\" from ").concat(subformat.name).concat(subRuleTable.blame(ruleid), " conflicts with \"").concat(subSubFormat.mutuallyExclusiveWith, "=").concat(ruleTable.valueRules.get(subSubFormat.mutuallyExclusiveWith), "\"").concat(ruleTable.blame(subSubFormat.mutuallyExclusiveWith), " (Repeal one with ! before adding another)"));
                        }
                        if (newValue !== oldValue) {
                            if (oldValue !== undefined) {
                                // conflict!
                                throw new Error("Rule \"".concat(ruleid, "=").concat(newValue, "\" from ").concat(subformat.name).concat(subRuleTable.blame(ruleid), " conflicts with \"").concat(ruleid, "=").concat(oldValue, "\"").concat(ruleTable.blame(ruleid), " (Repeal one with ! before adding another)"));
                            }
                            ruleTable.valueRules.set(ruleid, newValue);
                        }
                    }
                    ruleTable.set(ruleid, sourceFormat || subformat.name);
                }
            }
            for (var _p = 0, _q = subRuleTable.complexBans; _p < _q.length; _p++) {
                var _r = _q[_p], subRule = _r[0], source = _r[1], limit = _r[2], bans = _r[3];
                ruleTable.addComplexBan(subRule, source || subformat.name, limit, bans);
            }
            for (var _s = 0, _t = subRuleTable.complexTeamBans; _s < _t.length; _s++) {
                var _u = _t[_s], subRule = _u[0], source = _u[1], limit = _u[2], bans = _u[3];
                ruleTable.addComplexTeamBan(subRule, source || subformat.name, limit, bans);
            }
            if (subRuleTable.checkCanLearn) {
                if (ruleTable.checkCanLearn) {
                    throw new Error("\"".concat(format.name, "\" has conflicting move validation rules from ") +
                        "\"".concat(ruleTable.checkCanLearn[1], "\" and \"").concat(subRuleTable.checkCanLearn[1], "\""));
                }
                ruleTable.checkCanLearn = subRuleTable.checkCanLearn;
            }
            if (subRuleTable.timer) {
                if (ruleTable.timer) {
                    throw new Error("\"".concat(format.name, "\" has conflicting timer validation rules from \"").concat(ruleTable.timer[1], "\" and \"").concat(subRuleTable.timer[1], "\""));
                }
                ruleTable.timer = subRuleTable.timer;
            }
        }
        ruleTable.getTagRules();
        ruleTable.resolveNumbers(format, this.dex);
        var canMegaEvo = this.dex.gen <= 7 || ruleTable.has('+pokemontag:past');
        if (ruleTable.has('obtainableformes') && canMegaEvo &&
            ruleTable.isBannedSpecies(this.dex.species.get('rayquazamega')) &&
            !ruleTable.isBannedSpecies(this.dex.species.get('rayquaza'))) {
            // Banning Rayquaza-Mega implicitly adds Mega Rayquaza Clause
            // note that already having it explicitly in the ruleset is ok
            ruleTable.set('megarayquazaclause', '');
        }
        for (var _v = 0, _w = ruleTable.keys(); _v < _w.length; _v++) {
            var rule = _w[_v];
            if ("+*-!".includes(rule.charAt(0)))
                continue;
            var subFormat = this.dex.formats.get(rule);
            if (subFormat.exists) {
                var value = (_a = subFormat.onValidateRule) === null || _a === void 0 ? void 0 : _a.call({ format: format, ruleTable: ruleTable, dex: this.dex }, ruleTable.valueRules.get(rule));
                if (typeof value === 'string')
                    ruleTable.valueRules.set(subFormat.id, value);
            }
        }
        if (!repeals)
            format.ruleTable = ruleTable;
        return ruleTable;
    };
    DexFormats.prototype.validateRule = function (rule, format) {
        var _this = this;
        if (format === void 0) { format = null; }
        if (rule !== rule.trim())
            throw new Error("Rule \"".concat(rule, "\" should be trimmed"));
        switch (rule.charAt(0)) {
            case '-':
            case '*':
            case '+':
                if (rule.slice(1).includes('>') || rule.slice(1).includes('+')) {
                    var buf = rule.slice(1);
                    var gtIndex = buf.lastIndexOf('>');
                    var limit = rule.startsWith('+') ? Infinity : 0;
                    if (gtIndex >= 0 && /^[0-9]+$/.test(buf.slice(gtIndex + 1).trim())) {
                        if (limit === 0)
                            limit = parseInt(buf.slice(gtIndex + 1));
                        buf = buf.slice(0, gtIndex);
                    }
                    var checkTeam = buf.includes('++');
                    var banNames = buf.split(checkTeam ? '++' : '+').map(function (v) { return v.trim(); });
                    if (banNames.length === 1 && limit > 0)
                        checkTeam = true;
                    var innerRule = banNames.join(checkTeam ? ' ++ ' : ' + ');
                    var bans = banNames.map(function (v) { return _this.validateBanRule(v); });
                    if (checkTeam) {
                        return ['complexTeamBan', innerRule, '', limit, bans];
                    }
                    if (bans.length > 1 || limit > 0) {
                        return ['complexBan', innerRule, '', limit, bans];
                    }
                    throw new Error("Confusing rule ".concat(rule));
                }
                return rule.charAt(0) + this.validateBanRule(rule.slice(1));
            default:
                var _a = rule.split('='), ruleName = _a[0], value = _a[1];
                var id = (0, dex_data_1.toID)(ruleName);
                var ruleset = this.dex.formats.get(id);
                if (!ruleset.exists) {
                    throw new Error("Unrecognized rule \"".concat(rule, "\""));
                }
                if (typeof value === 'string')
                    id = "".concat(id, "=").concat(value.trim());
                if (rule.startsWith('!!'))
                    return "!!".concat(id);
                if (rule.startsWith('!'))
                    return "!".concat(id);
                return id;
        }
    };
    DexFormats.prototype.validPokemonTag = function (tagid) {
        var tag = tags_1.Tags.hasOwnProperty(tagid) && tags_1.Tags[tagid];
        if (!tag)
            return false;
        return !!(tag.speciesFilter || tag.genericFilter);
    };
    DexFormats.prototype.validateBanRule = function (rule) {
        var id = (0, dex_data_1.toID)(rule);
        if (id === 'unreleased')
            return 'unreleased';
        if (id === 'nonexistent')
            return 'nonexistent';
        var matches = [];
        var matchTypes = ['pokemon', 'move', 'ability', 'item', 'nature', 'pokemontag'];
        for (var _i = 0, matchTypes_1 = matchTypes; _i < matchTypes_1.length; _i++) {
            var matchType = matchTypes_1[_i];
            if (rule.startsWith("".concat(matchType, ":"))) {
                matchTypes = [matchType];
                id = id.slice(matchType.length);
                break;
            }
        }
        var ruleid = id;
        if (this.dex.data.Aliases.hasOwnProperty(id))
            id = (0, dex_data_1.toID)(this.dex.data.Aliases[id]);
        for (var _a = 0, matchTypes_2 = matchTypes; _a < matchTypes_2.length; _a++) {
            var matchType = matchTypes_2[_a];
            if (matchType === 'item' && ruleid === 'noitem')
                return 'item:noitem';
            var table = void 0;
            switch (matchType) {
                case 'pokemon':
                    table = this.dex.data.Pokedex;
                    break;
                case 'move':
                    table = this.dex.data.Moves;
                    break;
                case 'item':
                    table = this.dex.data.Items;
                    break;
                case 'ability':
                    table = this.dex.data.Abilities;
                    break;
                case 'nature':
                    table = this.dex.data.Natures;
                    break;
                case 'pokemontag':
                    // valid pokemontags
                    var validTags = [
                        // all
                        'allpokemon', 'allitems', 'allmoves', 'allabilities', 'allnatures',
                    ];
                    if (validTags.includes(ruleid) || this.validPokemonTag(ruleid)) {
                        matches.push('pokemontag:' + ruleid);
                    }
                    continue;
                default:
                    throw new Error("Unrecognized match type.");
            }
            if (table.hasOwnProperty(id)) {
                if (matchType === 'pokemon') {
                    var species = table[id];
                    if ((species.otherFormes || species.cosmeticFormes) && ruleid !== species.id + (0, dex_data_1.toID)(species.baseForme)) {
                        matches.push('basepokemon:' + id);
                        continue;
                    }
                }
                matches.push(matchType + ':' + id);
            }
            else if (matchType === 'pokemon' && id.endsWith('base')) {
                id = id.slice(0, -4);
                if (table.hasOwnProperty(id)) {
                    matches.push('pokemon:' + id);
                }
            }
        }
        if (matches.length > 1) {
            throw new Error("More than one thing matches \"".concat(rule, "\"; please specify one of: ") + matches.join(', '));
        }
        if (matches.length < 1) {
            throw new Error("Nothing matches \"".concat(rule, "\""));
        }
        return matches[0];
    };
    return DexFormats;
}());
exports.DexFormats = DexFormats;
