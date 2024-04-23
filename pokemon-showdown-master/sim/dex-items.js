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
exports.DexItems = exports.Item = void 0;
var dex_data_1 = require("./dex-data");
var Item = /** @class */ (function (_super) {
    __extends(Item, _super);
    function Item(data) {
        var _this = _super.call(this, data) || this;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        data = _this;
        _this.fullname = "item: ".concat(_this.name);
        _this.effectType = 'Item';
        _this.fling = data.fling || undefined;
        _this.onDrive = data.onDrive || undefined;
        _this.onMemory = data.onMemory || undefined;
        _this.megaStone = data.megaStone || undefined;
        _this.megaEvolves = data.megaEvolves || undefined;
        _this.zMove = data.zMove || undefined;
        _this.zMoveType = data.zMoveType || undefined;
        _this.zMoveFrom = data.zMoveFrom || undefined;
        _this.itemUser = data.itemUser || undefined;
        _this.isBerry = !!data.isBerry;
        _this.ignoreKlutz = !!data.ignoreKlutz;
        _this.onPlate = data.onPlate || undefined;
        _this.isGem = !!data.isGem;
        _this.isPokeball = !!data.isPokeball;
        if (!_this.gen) {
            if (_this.num >= 1124) {
                _this.gen = 9;
            }
            else if (_this.num >= 927) {
                _this.gen = 8;
            }
            else if (_this.num >= 689) {
                _this.gen = 7;
            }
            else if (_this.num >= 577) {
                _this.gen = 6;
            }
            else if (_this.num >= 537) {
                _this.gen = 5;
            }
            else if (_this.num >= 377) {
                _this.gen = 4;
            }
            else {
                _this.gen = 3;
            }
            // Due to difference in gen 2 item numbering, gen 2 items must be
            // specified manually
        }
        if (_this.isBerry)
            _this.fling = { basePower: 10 };
        if (_this.id.endsWith('plate'))
            _this.fling = { basePower: 90 };
        if (_this.onDrive)
            _this.fling = { basePower: 70 };
        if (_this.megaStone)
            _this.fling = { basePower: 80 };
        if (_this.onMemory)
            _this.fling = { basePower: 50 };
        return _this;
    }
    return Item;
}(dex_data_1.BasicEffect));
exports.Item = Item;
var DexItems = /** @class */ (function () {
    function DexItems(dex) {
        this.itemCache = new Map();
        this.allCache = null;
        this.dex = dex;
    }
    DexItems.prototype.get = function (name) {
        if (name && typeof name !== 'string')
            return name;
        name = (name || '').trim();
        var id = (0, dex_data_1.toID)(name);
        return this.getByID(id);
    };
    DexItems.prototype.getByID = function (id) {
        var item = this.itemCache.get(id);
        if (item)
            return item;
        if (this.dex.data.Aliases.hasOwnProperty(id)) {
            item = this.get(this.dex.data.Aliases[id]);
            if (item.exists) {
                this.itemCache.set(id, item);
            }
            return item;
        }
        if (id && !this.dex.data.Items[id] && this.dex.data.Items[id + 'berry']) {
            item = this.getByID(id + 'berry');
            this.itemCache.set(id, item);
            return item;
        }
        if (id && this.dex.data.Items.hasOwnProperty(id)) {
            var itemData = this.dex.data.Items[id];
            var itemTextData = this.dex.getDescs('Items', id, itemData);
            item = new Item(__assign(__assign({ name: id }, itemData), itemTextData));
            if (item.gen > this.dex.gen) {
                item.isNonstandard = 'Future';
            }
            // hack for allowing mega evolution in LGPE
            if (this.dex.currentMod === 'gen7letsgo' && !item.isNonstandard && !item.megaStone) {
                item.isNonstandard = 'Past';
            }
        }
        else {
            item = new Item({ name: id, exists: false });
        }
        if (item.exists)
            this.itemCache.set(id, item);
        return item;
    };
    DexItems.prototype.all = function () {
        if (this.allCache)
            return this.allCache;
        var items = [];
        for (var id in this.dex.data.Items) {
            items.push(this.getByID(id));
        }
        this.allCache = items;
        return this.allCache;
    };
    return DexItems;
}());
exports.DexItems = DexItems;
