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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DexSpecies = exports.Learnset = exports.Species = void 0;
var dex_data_1 = require("./dex-data");
var Species = /** @class */ (function (_super) {
    __extends(Species, _super);
    function Species(data) {
        var _this = _super.call(this, data) || this;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        data = _this;
        _this.fullname = "pokemon: ".concat(data.name);
        _this.effectType = 'Pokemon';
        _this.baseSpecies = data.baseSpecies || _this.name;
        _this.forme = data.forme || '';
        _this.baseForme = data.baseForme || '';
        _this.cosmeticFormes = data.cosmeticFormes || undefined;
        _this.otherFormes = data.otherFormes || undefined;
        _this.formeOrder = data.formeOrder || undefined;
        _this.spriteid = data.spriteid ||
            ((0, dex_data_1.toID)(_this.baseSpecies) + (_this.baseSpecies !== _this.name ? "-".concat((0, dex_data_1.toID)(_this.forme)) : ''));
        _this.abilities = data.abilities || { 0: "" };
        _this.types = data.types || ['???'];
        _this.addedType = data.addedType || undefined;
        _this.prevo = data.prevo || '';
        _this.tier = data.tier || '';
        _this.doublesTier = data.doublesTier || '';
        _this.natDexTier = data.natDexTier || '';
        _this.evos = data.evos || [];
        _this.evoType = data.evoType || undefined;
        _this.evoMove = data.evoMove || undefined;
        _this.evoLevel = data.evoLevel || undefined;
        _this.nfe = data.nfe || false;
        _this.eggGroups = data.eggGroups || [];
        _this.canHatch = data.canHatch || false;
        _this.gender = data.gender || '';
        _this.genderRatio = data.genderRatio || (_this.gender === 'M' ? { M: 1, F: 0 } :
            _this.gender === 'F' ? { M: 0, F: 1 } :
                _this.gender === 'N' ? { M: 0, F: 0 } :
                    { M: 0.5, F: 0.5 });
        _this.requiredItem = data.requiredItem || undefined;
        _this.requiredItems = _this.requiredItems || (_this.requiredItem ? [_this.requiredItem] : undefined);
        _this.baseStats = data.baseStats || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        _this.bst = _this.baseStats.hp + _this.baseStats.atk + _this.baseStats.def +
            _this.baseStats.spa + _this.baseStats.spd + _this.baseStats.spe;
        _this.weightkg = data.weightkg || 0;
        _this.weighthg = _this.weightkg * 10;
        _this.heightm = data.heightm || 0;
        _this.color = data.color || '';
        _this.tags = data.tags || [];
        _this.unreleasedHidden = data.unreleasedHidden || false;
        _this.maleOnlyHidden = !!data.maleOnlyHidden;
        _this.maxHP = data.maxHP || undefined;
        _this.isMega = !!(_this.forme && ['Mega', 'Mega-X', 'Mega-Y'].includes(_this.forme)) || undefined;
        _this.canGigantamax = data.canGigantamax || undefined;
        _this.gmaxUnreleased = !!data.gmaxUnreleased;
        _this.cannotDynamax = !!data.cannotDynamax;
        _this.battleOnly = data.battleOnly || (_this.isMega ? _this.baseSpecies : undefined);
        _this.changesFrom = data.changesFrom ||
            (_this.battleOnly !== _this.baseSpecies ? _this.battleOnly : _this.baseSpecies);
        _this.pokemonGoData = data.pokemonGoData || undefined;
        if (Array.isArray(data.changesFrom))
            _this.changesFrom = data.changesFrom[0];
        if (!_this.gen && _this.num >= 1) {
            if (_this.num >= 906 || _this.forme.includes('Paldea')) {
                _this.gen = 9;
            }
            else if (_this.num >= 810 || ['Gmax', 'Galar', 'Galar-Zen', 'Hisui'].includes(_this.forme)) {
                _this.gen = 8;
            }
            else if (_this.num >= 722 || _this.forme.startsWith('Alola') || _this.forme === 'Starter') {
                _this.gen = 7;
            }
            else if (_this.forme === 'Primal') {
                _this.gen = 6;
                _this.isPrimal = true;
                _this.battleOnly = _this.baseSpecies;
            }
            else if (_this.num >= 650 || _this.isMega) {
                _this.gen = 6;
            }
            else if (_this.num >= 494) {
                _this.gen = 5;
            }
            else if (_this.num >= 387) {
                _this.gen = 4;
            }
            else if (_this.num >= 252) {
                _this.gen = 3;
            }
            else if (_this.num >= 152) {
                _this.gen = 2;
            }
            else {
                _this.gen = 1;
            }
        }
        return _this;
    }
    return Species;
}(dex_data_1.BasicEffect));
exports.Species = Species;
var Learnset = /** @class */ (function () {
    function Learnset(data) {
        this.exists = true;
        this.effectType = 'Learnset';
        this.learnset = data.learnset || undefined;
        this.eventOnly = !!data.eventOnly;
        this.eventData = data.eventData || undefined;
        this.encounters = data.encounters || undefined;
    }
    return Learnset;
}());
exports.Learnset = Learnset;
var DexSpecies = /** @class */ (function () {
    function DexSpecies(dex) {
        this.speciesCache = new Map();
        this.learnsetCache = new Map();
        this.allCache = null;
        this.dex = dex;
    }
    DexSpecies.prototype.get = function (name) {
        if (name && typeof name !== 'string')
            return name;
        name = (name || '').trim();
        var id = (0, dex_data_1.toID)(name);
        if (id === 'nidoran' && name.endsWith('♀')) {
            id = 'nidoranf';
        }
        else if (id === 'nidoran' && name.endsWith('♂')) {
            id = 'nidoranm';
        }
        return this.getByID(id);
    };
    DexSpecies.prototype.getByID = function (id) {
        var _this = this;
        var species = this.speciesCache.get(id);
        if (species)
            return species;
        if (this.dex.data.Aliases.hasOwnProperty(id)) {
            if (this.dex.data.FormatsData.hasOwnProperty(id)) {
                // special event ID, like Rockruff-Dusk
                var baseId = (0, dex_data_1.toID)(this.dex.data.Aliases[id]);
                species = new Species(__assign(__assign(__assign({}, this.dex.data.Pokedex[baseId]), this.dex.data.FormatsData[id]), { name: id }));
                species.abilities = { 0: species.abilities['S'] };
            }
            else {
                species = this.get(this.dex.data.Aliases[id]);
                if (species.cosmeticFormes) {
                    for (var _i = 0, _a = species.cosmeticFormes; _i < _a.length; _i++) {
                        var forme = _a[_i];
                        if ((0, dex_data_1.toID)(forme) === id) {
                            species = new Species(__assign(__assign({}, species), { name: forme, forme: forme.slice(species.name.length + 1), baseForme: "", baseSpecies: species.name, otherFormes: null, cosmeticFormes: null }));
                            break;
                        }
                    }
                }
            }
            this.speciesCache.set(id, species);
            return species;
        }
        if (!this.dex.data.Pokedex.hasOwnProperty(id)) {
            var aliasTo = '';
            var formeNames = {
                alola: ['a', 'alola', 'alolan'],
                galar: ['g', 'galar', 'galarian'],
                hisui: ['h', 'hisui', 'hisuian'],
                paldea: ['p', 'paldea', 'paldean'],
                mega: ['m', 'mega'],
                primal: ['p', 'primal'],
            };
            for (var forme in formeNames) {
                var pokeName = '';
                for (var _b = 0, _c = formeNames[forme]; _b < _c.length; _b++) {
                    var i = _c[_b];
                    if (id.startsWith(i)) {
                        pokeName = id.slice(i.length);
                    }
                    else if (id.endsWith(i)) {
                        pokeName = id.slice(0, -i.length);
                    }
                }
                if (this.dex.data.Aliases.hasOwnProperty(pokeName))
                    pokeName = (0, dex_data_1.toID)(this.dex.data.Aliases[pokeName]);
                if (this.dex.data.Pokedex[pokeName + forme]) {
                    aliasTo = pokeName + forme;
                    break;
                }
            }
            if (aliasTo) {
                species = this.get(aliasTo);
                if (species.exists) {
                    this.speciesCache.set(id, species);
                    return species;
                }
            }
        }
        if (id && this.dex.data.Pokedex.hasOwnProperty(id)) {
            var pokedexData = this.dex.data.Pokedex[id];
            var baseSpeciesTags = pokedexData.baseSpecies && this.dex.data.Pokedex[(0, dex_data_1.toID)(pokedexData.baseSpecies)].tags;
            species = new Species(__assign(__assign({ tags: baseSpeciesTags }, pokedexData), this.dex.data.FormatsData[id]));
            // Inherit any statuses from the base species (Arceus, Silvally).
            var baseSpeciesStatuses = this.dex.data.Conditions[(0, dex_data_1.toID)(species.baseSpecies)];
            if (baseSpeciesStatuses !== undefined) {
                var key = void 0;
                for (key in baseSpeciesStatuses) {
                    if (!(key in species))
                        species[key] = baseSpeciesStatuses[key];
                }
            }
            if (!species.tier && !species.doublesTier && !species.natDexTier && species.baseSpecies !== species.name) {
                if (species.baseSpecies === 'Mimikyu') {
                    species.tier = this.dex.data.FormatsData[(0, dex_data_1.toID)(species.baseSpecies)].tier || 'Illegal';
                    species.doublesTier = this.dex.data.FormatsData[(0, dex_data_1.toID)(species.baseSpecies)].doublesTier || 'Illegal';
                    species.natDexTier = this.dex.data.FormatsData[(0, dex_data_1.toID)(species.baseSpecies)].natDexTier || 'Illegal';
                }
                else if (species.id.endsWith('totem')) {
                    species.tier = this.dex.data.FormatsData[species.id.slice(0, -5)].tier || 'Illegal';
                    species.doublesTier = this.dex.data.FormatsData[species.id.slice(0, -5)].doublesTier || 'Illegal';
                    species.natDexTier = this.dex.data.FormatsData[species.id.slice(0, -5)].natDexTier || 'Illegal';
                }
                else if (species.battleOnly) {
                    species.tier = this.dex.data.FormatsData[(0, dex_data_1.toID)(species.battleOnly)].tier || 'Illegal';
                    species.doublesTier = this.dex.data.FormatsData[(0, dex_data_1.toID)(species.battleOnly)].doublesTier || 'Illegal';
                    species.natDexTier = this.dex.data.FormatsData[(0, dex_data_1.toID)(species.battleOnly)].natDexTier || 'Illegal';
                }
                else {
                    var baseFormatsData = this.dex.data.FormatsData[(0, dex_data_1.toID)(species.baseSpecies)];
                    if (!baseFormatsData) {
                        throw new Error("".concat(species.baseSpecies, " has no formats-data entry"));
                    }
                    species.tier = baseFormatsData.tier || 'Illegal';
                    species.doublesTier = baseFormatsData.doublesTier || 'Illegal';
                    species.natDexTier = baseFormatsData.natDexTier || 'Illegal';
                }
            }
            if (!species.tier)
                species.tier = 'Illegal';
            if (!species.doublesTier)
                species.doublesTier = species.tier;
            if (!species.natDexTier)
                species.natDexTier = species.tier;
            if (species.gen > this.dex.gen) {
                species.tier = 'Illegal';
                species.doublesTier = 'Illegal';
                species.natDexTier = 'Illegal';
                species.isNonstandard = 'Future';
            }
            if (this.dex.currentMod === 'gen7letsgo' && !species.isNonstandard) {
                var isLetsGo = ((species.num <= 151 || ['Meltan', 'Melmetal'].includes(species.name)) &&
                    (!species.forme || (['Alola', 'Mega', 'Mega-X', 'Mega-Y', 'Starter'].includes(species.forme) &&
                        species.name !== 'Pikachu-Alola')));
                if (!isLetsGo)
                    species.isNonstandard = 'Past';
            }
            if (this.dex.currentMod === 'gen8bdsp' &&
                (!species.isNonstandard || ["Gigantamax", "CAP"].includes(species.isNonstandard))) {
                if (species.gen > 4 || (species.num < 1 && species.isNonstandard !== 'CAP') ||
                    species.id === 'pichuspikyeared') {
                    species.isNonstandard = 'Future';
                    species.tier = species.doublesTier = species.natDexTier = 'Illegal';
                }
            }
            species.nfe = species.evos.some(function (evo) {
                var evoSpecies = _this.get(evo);
                return !evoSpecies.isNonstandard ||
                    evoSpecies.isNonstandard === (species === null || species === void 0 ? void 0 : species.isNonstandard) ||
                    // Pokemon with Hisui evolutions
                    evoSpecies.isNonstandard === "Unobtainable";
            });
            species.canHatch = species.canHatch ||
                (!['Ditto', 'Undiscovered'].includes(species.eggGroups[0]) && !species.prevo && species.name !== 'Manaphy');
            if (this.dex.gen === 1)
                species.bst -= species.baseStats.spd;
            if (this.dex.gen < 5)
                delete species.abilities['H'];
            if (this.dex.gen === 3 && this.dex.abilities.get(species.abilities['1']).gen === 4)
                delete species.abilities['1'];
        }
        else {
            species = new Species({
                id: id,
                name: id,
                exists: false, tier: 'Illegal', doublesTier: 'Illegal', natDexTier: 'Illegal', isNonstandard: 'Custom',
            });
        }
        if (species.exists)
            this.speciesCache.set(id, species);
        return species;
    };
    DexSpecies.prototype.getLearnset = function (id) {
        return this.getLearnsetData(id).learnset;
    };
    DexSpecies.prototype.getLearnsetData = function (id) {
        var learnsetData = this.learnsetCache.get(id);
        if (learnsetData)
            return learnsetData;
        if (!this.dex.data.Learnsets.hasOwnProperty(id)) {
            return new Learnset({ exists: false });
        }
        learnsetData = new Learnset(this.dex.data.Learnsets[id]);
        this.learnsetCache.set(id, learnsetData);
        return learnsetData;
    };
    DexSpecies.prototype.getPokemonGoData = function (id) {
        return this.dex.data.PokemonGoData[id];
    };
    DexSpecies.prototype.all = function () {
        if (this.allCache)
            return this.allCache;
        var species = [];
        for (var id in this.dex.data.Pokedex) {
            species.push(this.getByID(id));
        }
        this.allCache = species;
        return this.allCache;
    };
    return DexSpecies;
}());
exports.DexSpecies = DexSpecies;
