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
exports.DexAbilities = exports.Ability = void 0;
var dex_data_1 = require("./dex-data");
var Ability = /** @class */ (function (_super) {
    __extends(Ability, _super);
    function Ability(data) {
        var _this = _super.call(this, data) || this;
        _this.fullname = "ability: ".concat(_this.name);
        _this.effectType = 'Ability';
        _this.suppressWeather = !!data.suppressWeather;
        _this.rating = data.rating || 0;
        if (!_this.gen) {
            if (_this.num >= 268) {
                _this.gen = 9;
            }
            else if (_this.num >= 234) {
                _this.gen = 8;
            }
            else if (_this.num >= 192) {
                _this.gen = 7;
            }
            else if (_this.num >= 165) {
                _this.gen = 6;
            }
            else if (_this.num >= 124) {
                _this.gen = 5;
            }
            else if (_this.num >= 77) {
                _this.gen = 4;
            }
            else if (_this.num >= 1) {
                _this.gen = 3;
            }
        }
        return _this;
    }
    return Ability;
}(dex_data_1.BasicEffect));
exports.Ability = Ability;
var DexAbilities = /** @class */ (function () {
    function DexAbilities(dex) {
        this.abilityCache = new Map();
        this.allCache = null;
        this.dex = dex;
    }
    DexAbilities.prototype.get = function (name) {
        if (name === void 0) { name = ''; }
        if (name && typeof name !== 'string')
            return name;
        var id = (0, dex_data_1.toID)(name);
        return this.getByID(id);
    };
    DexAbilities.prototype.getByID = function (id) {
        var ability = this.abilityCache.get(id);
        if (ability)
            return ability;
        if (this.dex.data.Aliases.hasOwnProperty(id)) {
            ability = this.get(this.dex.data.Aliases[id]);
        }
        else if (id && this.dex.data.Abilities.hasOwnProperty(id)) {
            var abilityData = this.dex.data.Abilities[id];
            var abilityTextData = this.dex.getDescs('Abilities', id, abilityData);
            ability = new Ability(__assign(__assign({ name: id }, abilityData), abilityTextData));
            if (ability.gen > this.dex.gen) {
                ability.isNonstandard = 'Future';
            }
            if (this.dex.currentMod === 'gen7letsgo' && ability.id !== 'noability') {
                ability.isNonstandard = 'Past';
            }
            if ((this.dex.currentMod === 'gen7letsgo' || this.dex.gen <= 2) && ability.id === 'noability') {
                ability.isNonstandard = null;
            }
        }
        else {
            ability = new Ability({
                id: id,
                name: id, exists: false,
            });
        }
        if (ability.exists)
            this.abilityCache.set(id, ability);
        return ability;
    };
    DexAbilities.prototype.all = function () {
        if (this.allCache)
            return this.allCache;
        var abilities = [];
        for (var id in this.dex.data.Abilities) {
            abilities.push(this.getByID(id));
        }
        this.allCache = abilities;
        return this.allCache;
    };
    return DexAbilities;
}());
exports.DexAbilities = DexAbilities;
