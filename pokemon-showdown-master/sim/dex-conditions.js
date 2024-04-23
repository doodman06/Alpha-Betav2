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
exports.DexConditions = exports.Condition = void 0;
var dex_data_1 = require("./dex-data");
var Condition = /** @class */ (function (_super) {
    __extends(Condition, _super);
    function Condition(data) {
        var _this = _super.call(this, data) || this;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        data = _this;
        _this.effectType = (['Weather', 'Status'].includes(data.effectType) ? data.effectType : 'Condition');
        return _this;
    }
    return Condition;
}(dex_data_1.BasicEffect));
exports.Condition = Condition;
var EMPTY_CONDITION = new Condition({ name: '', exists: false });
var DexConditions = /** @class */ (function () {
    function DexConditions(dex) {
        this.conditionCache = new Map();
        this.dex = dex;
    }
    DexConditions.prototype.get = function (name) {
        if (!name)
            return EMPTY_CONDITION;
        if (typeof name !== 'string')
            return name;
        return this.getByID(name.startsWith('item:') || name.startsWith('ability:') ? name : (0, dex_data_1.toID)(name));
    };
    DexConditions.prototype.getByID = function (id) {
        if (!id)
            return EMPTY_CONDITION;
        var condition = this.conditionCache.get(id);
        if (condition)
            return condition;
        var found;
        if (id.startsWith('item:')) {
            var item = this.dex.items.getByID(id.slice(5));
            condition = __assign(__assign({}, item), { id: 'item:' + item.id });
        }
        else if (id.startsWith('ability:')) {
            var ability = this.dex.abilities.getByID(id.slice(8));
            condition = __assign(__assign({}, ability), { id: 'ability:' + ability.id });
        }
        else if (this.dex.data.Rulesets.hasOwnProperty(id)) {
            condition = this.dex.formats.get(id);
        }
        else if (this.dex.data.Conditions.hasOwnProperty(id)) {
            condition = new Condition(__assign({ name: id }, this.dex.data.Conditions[id]));
        }
        else if ((this.dex.data.Moves.hasOwnProperty(id) && (found = this.dex.data.Moves[id]).condition) ||
            (this.dex.data.Abilities.hasOwnProperty(id) && (found = this.dex.data.Abilities[id]).condition) ||
            (this.dex.data.Items.hasOwnProperty(id) && (found = this.dex.data.Items[id]).condition)) {
            condition = new Condition(__assign({ name: found.name || id }, found.condition));
        }
        else if (id === 'recoil') {
            condition = new Condition({ name: 'Recoil', effectType: 'Recoil' });
        }
        else if (id === 'drain') {
            condition = new Condition({ name: 'Drain', effectType: 'Drain' });
        }
        else {
            condition = new Condition({ name: id, exists: false });
        }
        this.conditionCache.set(id, condition);
        return condition;
    };
    return DexConditions;
}());
exports.DexConditions = DexConditions;
