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
exports.DexMoves = exports.DataMove = void 0;
var lib_1 = require("../lib");
var dex_data_1 = require("./dex-data");
var DataMove = /** @class */ (function (_super) {
    __extends(DataMove, _super);
    function DataMove(data) {
        var _this = _super.call(this, data) || this;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        data = _this;
        _this.fullname = "move: ".concat(_this.name);
        _this.effectType = 'Move';
        _this.type = lib_1.Utils.getString(data.type);
        _this.target = data.target;
        _this.basePower = Number(data.basePower);
        _this.accuracy = data.accuracy;
        _this.critRatio = Number(data.critRatio) || 1;
        _this.baseMoveType = lib_1.Utils.getString(data.baseMoveType) || _this.type;
        _this.secondary = data.secondary || null;
        _this.secondaries = data.secondaries || (_this.secondary && [_this.secondary]) || null;
        _this.hasSheerForce = !!(data.hasSheerForce && !_this.secondaries);
        _this.priority = Number(data.priority) || 0;
        _this.category = data.category;
        _this.overrideOffensiveStat = data.overrideOffensiveStat || undefined;
        _this.overrideOffensivePokemon = data.overrideOffensivePokemon || undefined;
        _this.overrideDefensiveStat = data.overrideDefensiveStat || undefined;
        _this.overrideDefensivePokemon = data.overrideDefensivePokemon || undefined;
        _this.ignoreNegativeOffensive = !!data.ignoreNegativeOffensive;
        _this.ignorePositiveDefensive = !!data.ignorePositiveDefensive;
        _this.ignoreOffensive = !!data.ignoreOffensive;
        _this.ignoreDefensive = !!data.ignoreDefensive;
        _this.ignoreImmunity = (data.ignoreImmunity !== undefined ? data.ignoreImmunity : _this.category === 'Status');
        _this.pp = Number(data.pp);
        _this.noPPBoosts = !!data.noPPBoosts;
        _this.isZ = data.isZ || false;
        _this.isMax = data.isMax || false;
        _this.flags = data.flags || {};
        _this.selfSwitch = (typeof data.selfSwitch === 'string' ? data.selfSwitch : data.selfSwitch) || undefined;
        _this.pressureTarget = data.pressureTarget || '';
        _this.nonGhostTarget = data.nonGhostTarget || '';
        _this.ignoreAbility = data.ignoreAbility || false;
        _this.damage = data.damage;
        _this.spreadHit = data.spreadHit || false;
        _this.forceSTAB = !!data.forceSTAB;
        _this.noSketch = !!data.noSketch;
        _this.stab = data.stab || undefined;
        _this.volatileStatus = typeof data.volatileStatus === 'string' ? data.volatileStatus : undefined;
        if (_this.category !== 'Status' && !_this.maxMove && _this.id !== 'struggle') {
            _this.maxMove = { basePower: 1 };
            if (_this.isMax || _this.isZ) {
                // already initialized to 1
            }
            else if (!_this.basePower) {
                _this.maxMove.basePower = 100;
            }
            else if (['Fighting', 'Poison'].includes(_this.type)) {
                if (_this.basePower >= 150) {
                    _this.maxMove.basePower = 100;
                }
                else if (_this.basePower >= 110) {
                    _this.maxMove.basePower = 95;
                }
                else if (_this.basePower >= 75) {
                    _this.maxMove.basePower = 90;
                }
                else if (_this.basePower >= 65) {
                    _this.maxMove.basePower = 85;
                }
                else if (_this.basePower >= 55) {
                    _this.maxMove.basePower = 80;
                }
                else if (_this.basePower >= 45) {
                    _this.maxMove.basePower = 75;
                }
                else {
                    _this.maxMove.basePower = 70;
                }
            }
            else {
                if (_this.basePower >= 150) {
                    _this.maxMove.basePower = 150;
                }
                else if (_this.basePower >= 110) {
                    _this.maxMove.basePower = 140;
                }
                else if (_this.basePower >= 75) {
                    _this.maxMove.basePower = 130;
                }
                else if (_this.basePower >= 65) {
                    _this.maxMove.basePower = 120;
                }
                else if (_this.basePower >= 55) {
                    _this.maxMove.basePower = 110;
                }
                else if (_this.basePower >= 45) {
                    _this.maxMove.basePower = 100;
                }
                else {
                    _this.maxMove.basePower = 90;
                }
            }
        }
        if (_this.category !== 'Status' && !_this.zMove && !_this.isZ && !_this.isMax && _this.id !== 'struggle') {
            var basePower = _this.basePower;
            _this.zMove = {};
            if (Array.isArray(_this.multihit))
                basePower *= 3;
            if (!basePower) {
                _this.zMove.basePower = 100;
            }
            else if (basePower >= 140) {
                _this.zMove.basePower = 200;
            }
            else if (basePower >= 130) {
                _this.zMove.basePower = 195;
            }
            else if (basePower >= 120) {
                _this.zMove.basePower = 190;
            }
            else if (basePower >= 110) {
                _this.zMove.basePower = 185;
            }
            else if (basePower >= 100) {
                _this.zMove.basePower = 180;
            }
            else if (basePower >= 90) {
                _this.zMove.basePower = 175;
            }
            else if (basePower >= 80) {
                _this.zMove.basePower = 160;
            }
            else if (basePower >= 70) {
                _this.zMove.basePower = 140;
            }
            else if (basePower >= 60) {
                _this.zMove.basePower = 120;
            }
            else {
                _this.zMove.basePower = 100;
            }
        }
        if (!_this.gen) {
            // special handling for gen8 gmax moves (all of them have num 1000 but they are part of gen8)
            if (_this.num >= 827 && !_this.isMax) {
                _this.gen = 9;
            }
            else if (_this.num >= 743) {
                _this.gen = 8;
            }
            else if (_this.num >= 622) {
                _this.gen = 7;
            }
            else if (_this.num >= 560) {
                _this.gen = 6;
            }
            else if (_this.num >= 468) {
                _this.gen = 5;
            }
            else if (_this.num >= 355) {
                _this.gen = 4;
            }
            else if (_this.num >= 252) {
                _this.gen = 3;
            }
            else if (_this.num >= 166) {
                _this.gen = 2;
            }
            else if (_this.num >= 1) {
                _this.gen = 1;
            }
        }
        return _this;
    }
    return DataMove;
}(dex_data_1.BasicEffect));
exports.DataMove = DataMove;
var DexMoves = /** @class */ (function () {
    function DexMoves(dex) {
        this.moveCache = new Map();
        this.allCache = null;
        this.dex = dex;
    }
    DexMoves.prototype.get = function (name) {
        if (name && typeof name !== 'string')
            return name;
        name = (name || '').trim();
        var id = (0, dex_data_1.toID)(name);
        return this.getByID(id);
    };
    DexMoves.prototype.getByID = function (id) {
        var move = this.moveCache.get(id);
        if (move)
            return move;
        if (this.dex.data.Aliases.hasOwnProperty(id)) {
            move = this.get(this.dex.data.Aliases[id]);
            if (move.exists) {
                this.moveCache.set(id, move);
            }
            return move;
        }
        if (id.startsWith('hiddenpower')) {
            id = /([a-z]*)([0-9]*)/.exec(id)[1];
        }
        if (id && this.dex.data.Moves.hasOwnProperty(id)) {
            var moveData = this.dex.data.Moves[id];
            var moveTextData = this.dex.getDescs('Moves', id, moveData);
            move = new DataMove(__assign(__assign({ name: id }, moveData), moveTextData));
            if (move.gen > this.dex.gen) {
                move.isNonstandard = 'Future';
            }
        }
        else {
            move = new DataMove({
                name: id, exists: false,
            });
        }
        if (move.exists)
            this.moveCache.set(id, move);
        return move;
    };
    DexMoves.prototype.all = function () {
        if (this.allCache)
            return this.allCache;
        var moves = [];
        for (var id in this.dex.data.Moves) {
            moves.push(this.getByID(id));
        }
        this.allCache = moves;
        return this.allCache;
    };
    return DexMoves;
}());
exports.DexMoves = DexMoves;
