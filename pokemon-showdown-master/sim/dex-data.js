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
exports.DexStats = exports.DexTypes = exports.TypeInfo = exports.DexNatures = exports.Nature = exports.BasicEffect = exports.toID = void 0;
/**
 * Dex Data
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * @license MIT
 */
var lib_1 = require("../lib");
/**
* Converts anything to an ID. An ID must have only lowercase alphanumeric
* characters.
*
* If a string is passed, it will be converted to lowercase and
* non-alphanumeric characters will be stripped.
*
* If an object with an ID is passed, its ID will be returned.
* Otherwise, an empty string will be returned.
*
* Generally assigned to the global toID, because of how
* commonly it's used.
*/
function toID(text) {
    // The sucrase transformation of optional chaining is too expensive to be used in a hot function like this.
    /* eslint-disable @typescript-eslint/prefer-optional-chain */
    if (text && text.id) {
        text = text.id;
    }
    else if (text && text.userid) {
        text = text.userid;
    }
    else if (text && text.roomid) {
        text = text.roomid;
    }
    if (typeof text !== 'string' && typeof text !== 'number')
        return '';
    return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
    /* eslint-enable @typescript-eslint/prefer-optional-chain */
}
exports.toID = toID;
var BasicEffect = /** @class */ (function () {
    function BasicEffect(data) {
        this.exists = true;
        Object.assign(this, data);
        this.name = lib_1.Utils.getString(data.name).trim();
        this.id = data.realMove ? toID(data.realMove) : toID(this.name); // Hidden Power hack
        this.fullname = lib_1.Utils.getString(data.fullname) || this.name;
        this.effectType = lib_1.Utils.getString(data.effectType) || 'Condition';
        this.exists = !!(this.exists && this.id);
        this.num = data.num || 0;
        this.gen = data.gen || 0;
        this.shortDesc = data.shortDesc || '';
        this.desc = data.desc || '';
        this.isNonstandard = data.isNonstandard || null;
        this.duration = data.duration;
        this.noCopy = !!data.noCopy;
        this.affectsFainted = !!data.affectsFainted;
        this.status = data.status || undefined;
        this.weather = data.weather || undefined;
        this.sourceEffect = data.sourceEffect || '';
    }
    BasicEffect.prototype.toString = function () {
        return this.name;
    };
    return BasicEffect;
}());
exports.BasicEffect = BasicEffect;
var Nature = /** @class */ (function (_super) {
    __extends(Nature, _super);
    function Nature(data) {
        var _this = _super.call(this, data) || this;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        data = _this;
        _this.fullname = "nature: ".concat(_this.name);
        _this.effectType = 'Nature';
        _this.gen = 3;
        _this.plus = data.plus || undefined;
        _this.minus = data.minus || undefined;
        return _this;
    }
    return Nature;
}(BasicEffect));
exports.Nature = Nature;
var DexNatures = /** @class */ (function () {
    function DexNatures(dex) {
        this.natureCache = new Map();
        this.allCache = null;
        this.dex = dex;
    }
    DexNatures.prototype.get = function (name) {
        if (name && typeof name !== 'string')
            return name;
        return this.getByID(toID(name));
    };
    DexNatures.prototype.getByID = function (id) {
        var nature = this.natureCache.get(id);
        if (nature)
            return nature;
        if (this.dex.data.Aliases.hasOwnProperty(id)) {
            nature = this.get(this.dex.data.Aliases[id]);
            if (nature.exists) {
                this.natureCache.set(id, nature);
            }
            return nature;
        }
        if (id && this.dex.data.Natures.hasOwnProperty(id)) {
            var natureData = this.dex.data.Natures[id];
            nature = new Nature(natureData);
            if (nature.gen > this.dex.gen)
                nature.isNonstandard = 'Future';
        }
        else {
            nature = new Nature({ name: id, exists: false });
        }
        if (nature.exists)
            this.natureCache.set(id, nature);
        return nature;
    };
    DexNatures.prototype.all = function () {
        if (this.allCache)
            return this.allCache;
        var natures = [];
        for (var id in this.dex.data.Natures) {
            natures.push(this.getByID(id));
        }
        this.allCache = natures;
        return this.allCache;
    };
    return DexNatures;
}());
exports.DexNatures = DexNatures;
var TypeInfo = /** @class */ (function () {
    function TypeInfo(data) {
        this.exists = true;
        Object.assign(this, data);
        this.name = data.name;
        this.id = data.id;
        this.effectType = lib_1.Utils.getString(data.effectType) || 'Type';
        this.exists = !!(this.exists && this.id);
        this.gen = data.gen || 0;
        this.isNonstandard = data.isNonstandard || null;
        this.damageTaken = data.damageTaken || {};
        this.HPivs = data.HPivs || {};
        this.HPdvs = data.HPdvs || {};
    }
    TypeInfo.prototype.toString = function () {
        return this.name;
    };
    return TypeInfo;
}());
exports.TypeInfo = TypeInfo;
var DexTypes = /** @class */ (function () {
    function DexTypes(dex) {
        this.typeCache = new Map();
        this.allCache = null;
        this.namesCache = null;
        this.dex = dex;
    }
    DexTypes.prototype.get = function (name) {
        if (name && typeof name !== 'string')
            return name;
        return this.getByID(toID(name));
    };
    DexTypes.prototype.getByID = function (id) {
        var type = this.typeCache.get(id);
        if (type)
            return type;
        var typeName = id.charAt(0).toUpperCase() + id.substr(1);
        if (typeName && this.dex.data.TypeChart.hasOwnProperty(id)) {
            type = new TypeInfo(__assign({ name: typeName, id: id }, this.dex.data.TypeChart[id]));
        }
        else {
            type = new TypeInfo({ name: typeName, id: id, exists: false, effectType: 'EffectType' });
        }
        if (type.exists)
            this.typeCache.set(id, type);
        return type;
    };
    DexTypes.prototype.names = function () {
        if (this.namesCache)
            return this.namesCache;
        this.namesCache = this.all().filter(function (type) { return !type.isNonstandard; }).map(function (type) { return type.name; });
        return this.namesCache;
    };
    DexTypes.prototype.isName = function (name) {
        var id = name.toLowerCase();
        var typeName = id.charAt(0).toUpperCase() + id.substr(1);
        return name === typeName && this.dex.data.TypeChart.hasOwnProperty(id);
    };
    DexTypes.prototype.all = function () {
        if (this.allCache)
            return this.allCache;
        var types = [];
        for (var id in this.dex.data.TypeChart) {
            types.push(this.getByID(id));
        }
        this.allCache = types;
        return this.allCache;
    };
    return DexTypes;
}());
exports.DexTypes = DexTypes;
var idsCache = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
var reverseCache = {
    __proto: null,
    "hitpoints": 'hp',
    "attack": 'atk',
    "defense": 'def',
    "specialattack": 'spa', "spatk": 'spa', "spattack": 'spa', "specialatk": 'spa',
    "special": 'spa', "spc": 'spa',
    "specialdefense": 'spd', "spdef": 'spd', "spdefense": 'spd', "specialdef": 'spd',
    "speed": 'spe',
};
var DexStats = /** @class */ (function () {
    function DexStats(dex) {
        if (dex.gen !== 1) {
            this.shortNames = {
                __proto__: null, hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
            };
            this.mediumNames = {
                __proto__: null, hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed",
            };
            this.names = {
                __proto__: null, hp: "HP", atk: "Attack", def: "Defense", spa: "Special Attack", spd: "Special Defense", spe: "Speed",
            };
        }
        else {
            this.shortNames = {
                __proto__: null, hp: "HP", atk: "Atk", def: "Def", spa: "Spc", spd: "[SpD]", spe: "Spe",
            };
            this.mediumNames = {
                __proto__: null, hp: "HP", atk: "Attack", def: "Defense", spa: "Special", spd: "[Sp. Def]", spe: "Speed",
            };
            this.names = {
                __proto__: null, hp: "HP", atk: "Attack", def: "Defense", spa: "Special", spd: "[Special Defense]", spe: "Speed",
            };
        }
    }
    DexStats.prototype.getID = function (name) {
        if (name === 'Spd')
            return 'spe';
        var id = toID(name);
        if (reverseCache[id])
            return reverseCache[id];
        if (idsCache.includes(id))
            return id;
        return null;
    };
    DexStats.prototype.ids = function () {
        return idsCache;
    };
    return DexStats;
}());
exports.DexStats = DexStats;
