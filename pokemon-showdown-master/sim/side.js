"use strict";
/**
 * Simulator Side
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * There's a lot of ambiguity between the terms "player", "side", "team",
 * and "half-field", which I'll try to explain here:
 *
 * These terms usually all mean the same thing. The exceptions are:
 *
 * - Multi-battle: there are 2 half-fields, 2 teams, 4 sides
 *
 * - Free-for-all: there are 2 half-fields, 4 teams, 4 sides
 *
 * "Half-field" is usually abbreviated to "half".
 *
 * Function naming will be very careful about which term to use. Pay attention
 * if it's relevant to your code.
 *
 * @license MIT
 */
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
exports.Side = void 0;
var lib_1 = require("../lib");
var pokemon_1 = require("./pokemon");
var state_1 = require("./state");
var dex_1 = require("./dex");
var Side = /** @class */ (function () {
    function Side(name, battle, sideNum, team) {
        this.foe = null; // set in battle.start()
        /** Only exists in multi battle, for the allied side */
        this.allySide = null; // set in battle.start()
        /** only used by Gen 1 Counter */
        this.lastSelectedMove = '';
        var sideScripts = battle.dex.data.Scripts.side;
        if (sideScripts)
            Object.assign(this, sideScripts);
        this.battle = battle;
        this.id = ['p1', 'p2', 'p3', 'p4'][sideNum];
        this.n = sideNum;
        this.name = name;
        this.avatar = '';
        this.team = team;
        this.pokemon = [];
        for (var i = 0; i < this.team.length && i < 24; i++) {
            // console.log("NEW POKEMON: " + (this.team[i] ? this.team[i].name : '[unidentified]'));
            this.pokemon.push(new pokemon_1.Pokemon(this.team[i], this));
            this.pokemon[i].position = i;
        }
        switch (this.battle.gameType) {
            case 'doubles':
                this.active = [null, null];
                break;
            case 'triples':
            case 'rotation':
                this.active = [null, null, null];
                break;
            default:
                this.active = [null];
        }
        this.pokemonLeft = this.pokemon.length;
        this.faintedLastTurn = null;
        this.faintedThisTurn = null;
        this.totalFainted = 0;
        this.zMoveUsed = false;
        this.dynamaxUsed = this.battle.gen !== 8;
        this.sideConditions = {};
        this.slotConditions = [];
        // Array#fill doesn't work for this
        for (var i = 0; i < this.active.length; i++)
            this.slotConditions[i] = {};
        this.activeRequest = null;
        this.choice = {
            cantUndo: false,
            error: "",
            actions: [],
            forcedSwitchesLeft: 0,
            forcedPassesLeft: 0,
            switchIns: new Set(),
            zMove: false,
            mega: false,
            ultra: false,
            dynamax: false,
            terastallize: false,
        };
        // old-gens
        this.lastMove = null;
    }
    Side.prototype.toJSON = function () {
        return state_1.State.serializeSide(this);
    };
    Object.defineProperty(Side.prototype, "requestState", {
        get: function () {
            if (!this.activeRequest || this.activeRequest.wait)
                return '';
            if (this.activeRequest.teamPreview)
                return 'teampreview';
            if (this.activeRequest.forceSwitch)
                return 'switch';
            return 'move';
        },
        enumerable: false,
        configurable: true
    });
    Side.prototype.canDynamaxNow = function () {
        if (this.battle.gen !== 8)
            return false;
        // In multi battles, players on a team are alternatingly given the option to dynamax each turn
        // On turn 1, the players on their team's respective left have the first chance (p1 and p2)
        if (this.battle.gameType === 'multi' && this.battle.turn % 2 !== [1, 1, 0, 0][this.n])
            return false;
        // if (this.battle.gameType === 'multitriples' && this.battle.turn % 3 !== [1, 1, 2, 2, 0, 0][this.side.n]) {
        //		return false;
        // }
        return !this.dynamaxUsed;
    };
    Side.prototype.getChoice = function () {
        var _this = this;
        if (this.choice.actions.length > 1 && this.choice.actions.every(function (action) { return action.choice === 'team'; })) {
            return "team " + this.choice.actions.map(function (action) { return action.pokemon.position + 1; }).join(', ');
        }
        return this.choice.actions.map(function (action) {
            switch (action.choice) {
                case 'move':
                    var details = "";
                    if (action.targetLoc && _this.active.length > 1)
                        details += " ".concat(action.targetLoc > 0 ? '+' : '').concat(action.targetLoc);
                    if (action.mega)
                        details += (action.pokemon.item === 'ultranecroziumz' ? " ultra" : " mega");
                    if (action.zmove)
                        details += " zmove";
                    if (action.maxMove)
                        details += " dynamax";
                    if (action.terastallize)
                        details += " terastallize";
                    return "move ".concat(action.moveid).concat(details);
                case 'switch':
                case 'instaswitch':
                case 'revivalblessing':
                    return "switch ".concat(action.target.position + 1);
                case 'team':
                    return "team ".concat(action.pokemon.position + 1);
                default:
                    return action.choice;
            }
        }).join(', ');
    };
    Side.prototype.toString = function () {
        return "".concat(this.id, ": ").concat(this.name);
    };
    Side.prototype.getRequestData = function (forAlly) {
        var data = {
            name: this.name,
            id: this.id,
            pokemon: [],
        };
        for (var _i = 0, _a = this.pokemon; _i < _a.length; _i++) {
            var pokemon = _a[_i];
            data.pokemon.push(pokemon.getSwitchRequestData(forAlly));
        }
        return data;
    };
    Side.prototype.randomFoe = function () {
        var actives = this.foes();
        if (!actives.length)
            return null;
        return this.battle.sample(actives);
    };
    /** Intended as a way to iterate through all foe side conditions - do not use for anything else. */
    Side.prototype.foeSidesWithConditions = function () {
        var _this = this;
        if (this.battle.gameType === 'freeforall')
            return this.battle.sides.filter(function (side) { return side !== _this; });
        return [this.foe];
    };
    Side.prototype.foePokemonLeft = function () {
        var _this = this;
        if (this.battle.gameType === 'freeforall') {
            return this.battle.sides.filter(function (side) { return side !== _this; }).map(function (side) { return side.pokemonLeft; }).reduce(function (a, b) { return a + b; });
        }
        if (this.foe.allySide)
            return this.foe.pokemonLeft + this.foe.allySide.pokemonLeft;
        return this.foe.pokemonLeft;
    };
    Side.prototype.allies = function (all) {
        // called during the first switch-in, so `active` can still contain nulls at this point
        var allies = this.activeTeam().filter(function (ally) { return ally; });
        if (!all)
            allies = allies.filter(function (ally) { return !!ally.hp; });
        return allies;
    };
    Side.prototype.foes = function (all) {
        var _this = this;
        if (this.battle.gameType === 'freeforall') {
            return this.battle.sides.map(function (side) { return side.active[0]; })
                .filter(function (pokemon) { return pokemon && pokemon.side !== _this && (all || !!pokemon.hp); });
        }
        return this.foe.allies(all);
    };
    Side.prototype.activeTeam = function () {
        if (this.battle.gameType !== 'multi')
            return this.active;
        return this.battle.sides[this.n % 2].active.concat(this.battle.sides[this.n % 2 + 2].active);
    };
    Side.prototype.hasAlly = function (pokemon) {
        return pokemon.side === this || pokemon.side === this.allySide;
    };
    Side.prototype.addSideCondition = function (status, source, sourceEffect) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        if (!source && this.battle.event && this.battle.event.target)
            source = this.battle.event.target;
        if (source === 'debug')
            source = this.active[0];
        if (!source)
            throw new Error("setting sidecond without a source");
        if (!source.getSlot)
            source = source.active[0];
        status = this.battle.dex.conditions.get(status);
        if (this.sideConditions[status.id]) {
            if (!status.onSideRestart)
                return false;
            return this.battle.singleEvent('SideRestart', status, this.sideConditions[status.id], this, source, sourceEffect);
        }
        this.sideConditions[status.id] = {
            id: status.id,
            target: this,
            source: source,
            sourceSlot: source.getSlot(),
            duration: status.duration,
        };
        if (status.durationCallback) {
            this.sideConditions[status.id].duration =
                status.durationCallback.call(this.battle, this.active[0], source, sourceEffect);
        }
        if (!this.battle.singleEvent('SideStart', status, this.sideConditions[status.id], this, source, sourceEffect)) {
            delete this.sideConditions[status.id];
            return false;
        }
        this.battle.runEvent('SideConditionStart', source, source, status);
        return true;
    };
    Side.prototype.getSideCondition = function (status) {
        status = this.battle.dex.conditions.get(status);
        if (!this.sideConditions[status.id])
            return null;
        return status;
    };
    Side.prototype.getSideConditionData = function (status) {
        status = this.battle.dex.conditions.get(status);
        return this.sideConditions[status.id] || null;
    };
    Side.prototype.removeSideCondition = function (status) {
        status = this.battle.dex.conditions.get(status);
        if (!this.sideConditions[status.id])
            return false;
        this.battle.singleEvent('SideEnd', status, this.sideConditions[status.id], this);
        delete this.sideConditions[status.id];
        return true;
    };
    Side.prototype.addSlotCondition = function (target, status, source, sourceEffect) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        if (!source && this.battle.event && this.battle.event.target)
            source = this.battle.event.target;
        if (source === 'debug')
            source = this.active[0];
        if (target instanceof pokemon_1.Pokemon)
            target = target.position;
        if (!source)
            throw new Error("setting sidecond without a source");
        status = this.battle.dex.conditions.get(status);
        if (this.slotConditions[target][status.id]) {
            if (!status.onRestart)
                return false;
            return this.battle.singleEvent('Restart', status, this.slotConditions[target][status.id], this, source, sourceEffect);
        }
        var conditionState = this.slotConditions[target][status.id] = {
            id: status.id,
            target: this,
            source: source,
            sourceSlot: source.getSlot(),
            duration: status.duration,
        };
        if (status.durationCallback) {
            conditionState.duration =
                status.durationCallback.call(this.battle, this.active[0], source, sourceEffect);
        }
        if (!this.battle.singleEvent('Start', status, conditionState, this.active[target], source, sourceEffect)) {
            delete this.slotConditions[target][status.id];
            return false;
        }
        return true;
    };
    Side.prototype.getSlotCondition = function (target, status) {
        if (target instanceof pokemon_1.Pokemon)
            target = target.position;
        status = this.battle.dex.conditions.get(status);
        if (!this.slotConditions[target][status.id])
            return null;
        return status;
    };
    Side.prototype.removeSlotCondition = function (target, status) {
        if (target instanceof pokemon_1.Pokemon)
            target = target.position;
        status = this.battle.dex.conditions.get(status);
        if (!this.slotConditions[target][status.id])
            return false;
        this.battle.singleEvent('End', status, this.slotConditions[target][status.id], this.active[target]);
        delete this.slotConditions[target][status.id];
        return true;
    };
    // eslint-disable-next-line @typescript-eslint/ban-types
    Side.prototype.send = function () {
        var _this = this;
        var parts = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            parts[_i] = arguments[_i];
        }
        var sideUpdate = '|' + parts.map(function (part) {
            if (typeof part !== 'function')
                return part;
            return part(_this);
        }).join('|');
        this.battle.send('sideupdate', "".concat(this.id, "\n").concat(sideUpdate));
    };
    Side.prototype.emitRequest = function (update) {
        this.battle.send('sideupdate', "".concat(this.id, "\n|request|").concat(JSON.stringify(update)));
        this.activeRequest = update;
    };
    Side.prototype.emitChoiceError = function (message, unavailable) {
        this.choice.error = message;
        var type = "[".concat(unavailable ? 'Unavailable' : 'Invalid', " choice]");
        this.battle.send('sideupdate', "".concat(this.id, "\n|error|").concat(type, " ").concat(message));
        if (this.battle.strictChoices)
            throw new Error("".concat(type, " ").concat(message));
        return false;
    };
    Side.prototype.isChoiceDone = function () {
        if (!this.requestState)
            return true;
        if (this.choice.forcedSwitchesLeft)
            return false;
        if (this.requestState === 'teampreview') {
            return this.choice.actions.length >= this.pickedTeamSize();
        }
        // current request is move/switch
        this.getChoiceIndex(); // auto-pass
        return this.choice.actions.length >= this.active.length;
    };
    Side.prototype.chooseMove = function (moveText, targetLoc, event) {
        var _a, _b;
        if (targetLoc === void 0) { targetLoc = 0; }
        if (event === void 0) { event = ''; }
        if (this.requestState !== 'move') {
            return this.emitChoiceError("Can't move: You need a ".concat(this.requestState, " response"));
        }
        var index = this.getChoiceIndex();
        if (index >= this.active.length) {
            return this.emitChoiceError("Can't move: You sent more choices than unfainted Pok\u00E9mon.");
        }
        var autoChoose = !moveText;
        var pokemon = this.active[index];
        // Parse moveText (name or index)
        // If the move is not found, the action is invalid without requiring further inspection.
        var request = pokemon.getMoveRequestData();
        var moveid = '';
        var targetType = '';
        if (autoChoose)
            moveText = 1;
        if (typeof moveText === 'number' || (moveText && /^[0-9]+$/.test(moveText))) {
            // Parse a one-based move index.
            var moveIndex = Number(moveText) - 1;
            if (moveIndex < 0 || moveIndex >= request.moves.length || !request.moves[moveIndex]) {
                return this.emitChoiceError("Can't move: Your ".concat(pokemon.name, " doesn't have a move ").concat(moveIndex + 1));
            }
            moveid = request.moves[moveIndex].id;
            targetType = request.moves[moveIndex].target;
        }
        else {
            // Parse a move ID.
            // Move names are also allowed, but may cause ambiguity (see client issue #167).
            moveid = (0, dex_1.toID)(moveText);
            if (moveid.startsWith('hiddenpower')) {
                moveid = 'hiddenpower';
            }
            for (var _i = 0, _c = request.moves; _i < _c.length; _i++) {
                var move_1 = _c[_i];
                if (move_1.id !== moveid)
                    continue;
                targetType = move_1.target || 'normal';
                break;
            }
            if (!targetType && ['', 'dynamax'].includes(event) && request.maxMoves) {
                for (var _d = 0, _e = request.maxMoves.maxMoves.entries(); _d < _e.length; _d++) {
                    var _f = _e[_d], i = _f[0], moveRequest = _f[1];
                    if (moveid === moveRequest.move) {
                        moveid = request.moves[i].id;
                        targetType = moveRequest.target;
                        event = 'dynamax';
                        break;
                    }
                }
            }
            if (!targetType && ['', 'zmove'].includes(event) && request.canZMove) {
                for (var _g = 0, _h = request.canZMove.entries(); _g < _h.length; _g++) {
                    var _j = _h[_g], i = _j[0], moveRequest = _j[1];
                    if (!moveRequest)
                        continue;
                    if (moveid === (0, dex_1.toID)(moveRequest.move)) {
                        moveid = request.moves[i].id;
                        targetType = moveRequest.target;
                        event = 'zmove';
                        break;
                    }
                }
            }
            if (!targetType) {
                return this.emitChoiceError("Can't move: Your ".concat(pokemon.name, " doesn't have a move matching ").concat(moveid));
            }
        }
        var moves = pokemon.getMoves();
        if (autoChoose) {
            for (var _k = 0, _l = request.moves.entries(); _k < _l.length; _k++) {
                var _m = _l[_k], i = _m[0], move_2 = _m[1];
                if (move_2.disabled)
                    continue;
                if (i < moves.length && move_2.id === moves[i].id && moves[i].disabled)
                    continue;
                moveid = move_2.id;
                targetType = move_2.target;
                break;
            }
        }
        var move = this.battle.dex.moves.get(moveid);
        // Z-move
        var zMove = event === 'zmove' ? this.battle.actions.getZMove(move, pokemon) : undefined;
        if (event === 'zmove' && !zMove) {
            return this.emitChoiceError("Can't move: ".concat(pokemon.name, " can't use ").concat(move.name, " as a Z-move"));
        }
        if (zMove && this.choice.zMove) {
            return this.emitChoiceError("Can't move: You can't Z-move more than once per battle");
        }
        if (zMove)
            targetType = this.battle.dex.moves.get(zMove).target;
        // Dynamax
        // Is dynamaxed or will dynamax this turn.
        var maxMove = (event === 'dynamax' || pokemon.volatiles['dynamax']) ?
            this.battle.actions.getMaxMove(move, pokemon) : undefined;
        if (event === 'dynamax' && !maxMove) {
            return this.emitChoiceError("Can't move: ".concat(pokemon.name, " can't use ").concat(move.name, " as a Max Move"));
        }
        if (maxMove)
            targetType = this.battle.dex.moves.get(maxMove).target;
        // Validate targetting
        if (autoChoose) {
            targetLoc = 0;
        }
        else if (this.battle.actions.targetTypeChoices(targetType)) {
            if (!targetLoc && this.active.length >= 2) {
                return this.emitChoiceError("Can't move: ".concat(move.name, " needs a target"));
            }
            if (!this.battle.validTargetLoc(targetLoc, pokemon, targetType)) {
                return this.emitChoiceError("Can't move: Invalid target for ".concat(move.name));
            }
        }
        else {
            if (targetLoc) {
                return this.emitChoiceError("Can't move: You can't choose a target for ".concat(move.name));
            }
        }
        var lockedMove = pokemon.getLockedMove();
        if (lockedMove) {
            var lockedMoveTargetLoc = pokemon.lastMoveTargetLoc || 0;
            var lockedMoveID = (0, dex_1.toID)(lockedMove);
            if (pokemon.volatiles[lockedMoveID] && pokemon.volatiles[lockedMoveID].targetLoc) {
                lockedMoveTargetLoc = pokemon.volatiles[lockedMoveID].targetLoc;
            }
            this.choice.actions.push({
                choice: 'move',
                pokemon: pokemon,
                targetLoc: lockedMoveTargetLoc,
                moveid: lockedMoveID,
            });
            return true;
        }
        else if (!moves.length && !zMove) {
            // Override action and use Struggle if there are no enabled moves with PP
            // Gen 4 and earlier announce a Pokemon has no moves left before the turn begins, and only to that player's side.
            if (this.battle.gen <= 4)
                this.send('-activate', pokemon, 'move: Struggle');
            moveid = 'struggle';
        }
        else if (maxMove) {
            // Dynamaxed; only Taunt and Assault Vest disable Max Guard, but the base move must have PP remaining
            if (pokemon.maxMoveDisabled(move)) {
                return this.emitChoiceError("Can't move: ".concat(pokemon.name, "'s ").concat(maxMove.name, " is disabled"));
            }
        }
        else if (!zMove) {
            // Check for disabled moves
            var isEnabled = false;
            var disabledSource_1 = '';
            for (var _o = 0, moves_1 = moves; _o < moves_1.length; _o++) {
                var m = moves_1[_o];
                if (m.id !== moveid)
                    continue;
                if (!m.disabled) {
                    isEnabled = true;
                    break;
                }
                else if (m.disabledSource) {
                    disabledSource_1 = m.disabledSource;
                }
            }
            if (!isEnabled) {
                // Request a different choice
                if (autoChoose)
                    throw new Error("autoChoose chose a disabled move");
                var includeRequest = this.updateRequestForPokemon(pokemon, function (req) {
                    var updated = false;
                    for (var _i = 0, _a = req.moves; _i < _a.length; _i++) {
                        var m = _a[_i];
                        if (m.id === moveid) {
                            if (!m.disabled) {
                                m.disabled = true;
                                updated = true;
                            }
                            if (m.disabledSource !== disabledSource_1) {
                                m.disabledSource = disabledSource_1;
                                updated = true;
                            }
                            break;
                        }
                    }
                    return updated;
                });
                var status_1 = this.emitChoiceError("Can't move: ".concat(pokemon.name, "'s ").concat(move.name, " is disabled"), includeRequest);
                if (includeRequest)
                    this.emitRequest(this.activeRequest);
                return status_1;
            }
            // The chosen move is valid yay
        }
        // Mega evolution
        var mega = (event === 'mega');
        if (mega && !pokemon.canMegaEvo) {
            return this.emitChoiceError("Can't move: ".concat(pokemon.name, " can't mega evolve"));
        }
        if (mega && this.choice.mega) {
            return this.emitChoiceError("Can't move: You can only mega-evolve once per battle");
        }
        var ultra = (event === 'ultra');
        if (ultra && !pokemon.canUltraBurst) {
            return this.emitChoiceError("Can't move: ".concat(pokemon.name, " can't ultra burst"));
        }
        if (ultra && this.choice.ultra) {
            return this.emitChoiceError("Can't move: You can only ultra burst once per battle");
        }
        var dynamax = (event === 'dynamax');
        var canDynamax = (_a = this.activeRequest) === null || _a === void 0 ? void 0 : _a.active[this.active.indexOf(pokemon)].canDynamax;
        if (dynamax && (this.choice.dynamax || !canDynamax)) {
            if (pokemon.volatiles['dynamax']) {
                dynamax = false;
            }
            else {
                if (this.battle.gen !== 8) {
                    return this.emitChoiceError("Can't move: Dynamaxing doesn't outside of Gen 8.");
                }
                else if (pokemon.side.canDynamaxNow()) {
                    return this.emitChoiceError("Can't move: ".concat(pokemon.name, " can't Dynamax now."));
                }
                else if ((_b = pokemon.side.allySide) === null || _b === void 0 ? void 0 : _b.canDynamaxNow()) {
                    return this.emitChoiceError("Can't move: It's your partner's turn to Dynamax.");
                }
                return this.emitChoiceError("Can't move: You can only Dynamax once per battle.");
            }
        }
        var terastallize = (event === 'terastallize');
        if (terastallize && !pokemon.canTerastallize) {
            // Make this work properly
            return this.emitChoiceError("Can't move: ".concat(pokemon.name, " can't Terastallize."));
        }
        if (terastallize && this.choice.terastallize) {
            return this.emitChoiceError("Can't move: You can only Terastallize once per battle.");
        }
        if (terastallize && this.battle.gen !== 9) {
            // Make this work properly
            return this.emitChoiceError("Can't move: You can only Terastallize in Gen 9.");
        }
        this.choice.actions.push({
            choice: 'move',
            pokemon: pokemon,
            targetLoc: targetLoc,
            moveid: moveid,
            mega: mega || ultra,
            zmove: zMove,
            maxMove: maxMove ? maxMove.id : undefined,
            terastallize: terastallize ? pokemon.teraType : undefined,
        });
        if (pokemon.maybeDisabled) {
            this.choice.cantUndo = this.choice.cantUndo || pokemon.isLastActive();
        }
        if (mega)
            this.choice.mega = true;
        if (ultra)
            this.choice.ultra = true;
        if (zMove)
            this.choice.zMove = true;
        if (dynamax)
            this.choice.dynamax = true;
        if (terastallize)
            this.choice.terastallize = true;
        return true;
    };
    Side.prototype.updateRequestForPokemon = function (pokemon, update) {
        var _a;
        if (!((_a = this.activeRequest) === null || _a === void 0 ? void 0 : _a.active)) {
            throw new Error("Can't update a request without active Pokemon");
        }
        var req = this.activeRequest.active[pokemon.position];
        if (!req)
            throw new Error("Pokemon not found in request's active field");
        return update(req);
    };
    Side.prototype.chooseSwitch = function (slotText) {
        if (this.requestState !== 'move' && this.requestState !== 'switch') {
            return this.emitChoiceError("Can't switch: You need a ".concat(this.requestState, " response"));
        }
        var index = this.getChoiceIndex();
        if (index >= this.active.length) {
            if (this.requestState === 'switch') {
                return this.emitChoiceError("Can't switch: You sent more switches than Pok\u00E9mon that need to switch");
            }
            return this.emitChoiceError("Can't switch: You sent more choices than unfainted Pok\u00E9mon");
        }
        var pokemon = this.active[index];
        var slot;
        if (!slotText) {
            if (this.requestState !== 'switch') {
                return this.emitChoiceError("Can't switch: You need to select a Pok\u00E9mon to switch in");
            }
            if (this.slotConditions[pokemon.position]['revivalblessing']) {
                slot = 0;
                while (!this.pokemon[slot].fainted)
                    slot++;
            }
            else {
                if (!this.choice.forcedSwitchesLeft)
                    return this.choosePass();
                slot = this.active.length;
                while (this.choice.switchIns.has(slot) || this.pokemon[slot].fainted)
                    slot++;
            }
        }
        else {
            slot = parseInt(slotText) - 1;
        }
        if (isNaN(slot) || slot < 0) {
            // maybe it's a name/species id!
            slot = -1;
            for (var _i = 0, _a = this.pokemon.entries(); _i < _a.length; _i++) {
                var _b = _a[_i], i = _b[0], mon = _b[1];
                if (slotText.toLowerCase() === mon.name.toLowerCase() || (0, dex_1.toID)(slotText) === mon.species.id) {
                    slot = i;
                    break;
                }
            }
            if (slot < 0) {
                return this.emitChoiceError("Can't switch: You do not have a Pok\u00E9mon named \"".concat(slotText, "\" to switch to"));
            }
        }
        if (slot >= this.pokemon.length) {
            return this.emitChoiceError("Can't switch: You do not have a Pok\u00E9mon in slot ".concat(slot + 1, " to switch to"));
        }
        else if (slot < this.active.length && !this.slotConditions[pokemon.position]['revivalblessing']) {
            return this.emitChoiceError("Can't switch: You can't switch to an active Pok\u00E9mon");
        }
        else if (this.choice.switchIns.has(slot)) {
            return this.emitChoiceError("Can't switch: The Pok\u00E9mon in slot ".concat(slot + 1, " can only switch in once"));
        }
        var targetPokemon = this.pokemon[slot];
        if (this.slotConditions[pokemon.position]['revivalblessing']) {
            if (!targetPokemon.fainted) {
                return this.emitChoiceError("Can't switch: You have to pass to a fainted Pok\u00E9mon");
            }
            // Should always subtract, but stop at 0 to prevent errors.
            this.choice.forcedSwitchesLeft = this.battle.clampIntRange(this.choice.forcedSwitchesLeft - 1, 0);
            pokemon.switchFlag = false;
            this.choice.actions.push({
                choice: 'revivalblessing',
                pokemon: pokemon,
                target: targetPokemon,
            });
            return true;
        }
        if (targetPokemon.fainted) {
            return this.emitChoiceError("Can't switch: You can't switch to a fainted Pok\u00E9mon");
        }
        if (this.requestState === 'move') {
            if (pokemon.trapped) {
                var includeRequest = this.updateRequestForPokemon(pokemon, function (req) {
                    var updated = false;
                    if (req.maybeTrapped) {
                        delete req.maybeTrapped;
                        updated = true;
                    }
                    if (!req.trapped) {
                        req.trapped = true;
                        updated = true;
                    }
                    return updated;
                });
                var status_2 = this.emitChoiceError("Can't switch: The active Pok\u00E9mon is trapped", includeRequest);
                if (includeRequest)
                    this.emitRequest(this.activeRequest);
                return status_2;
            }
            else if (pokemon.maybeTrapped) {
                this.choice.cantUndo = this.choice.cantUndo || pokemon.isLastActive();
            }
        }
        else if (this.requestState === 'switch') {
            if (!this.choice.forcedSwitchesLeft) {
                throw new Error("Player somehow switched too many Pokemon");
            }
            this.choice.forcedSwitchesLeft--;
        }
        this.choice.switchIns.add(slot);
        this.choice.actions.push({
            choice: (this.requestState === 'switch' ? 'instaswitch' : 'switch'),
            pokemon: pokemon,
            target: targetPokemon,
        });
        return true;
    };
    /**
     * The number of pokemon you must choose in Team Preview.
     *
     * Note that PS doesn't support choosing fewer than this number of pokemon.
     * In the games, it is sometimes possible to bring fewer than this, but
     * since that's nearly always a mistake, we haven't gotten around to
     * supporting it.
     */
    Side.prototype.pickedTeamSize = function () {
        return Math.min(this.pokemon.length, this.battle.ruleTable.pickedTeamSize || Infinity);
    };
    Side.prototype.chooseTeam = function (data) {
        var _this = this;
        if (data === void 0) { data = ''; }
        if (this.requestState !== 'teampreview') {
            return this.emitChoiceError("Can't choose for Team Preview: You're not in a Team Preview phase");
        }
        var ruleTable = this.battle.ruleTable;
        var positions = data.split(data.includes(',') ? ',' : '')
            .map(function (datum) { return parseInt(datum) - 1; });
        var pickedTeamSize = this.pickedTeamSize();
        // make sure positions is exactly of length pickedTeamSize
        // - If too big: the client automatically sends a full list, so we just trim it down to size
        positions.splice(pickedTeamSize);
        // - If too small: we intentionally support only sending leads and having the sim fill in the rest
        if (positions.length === 0) {
            for (var i = 0; i < pickedTeamSize; i++)
                positions.push(i);
        }
        else if (positions.length < pickedTeamSize) {
            for (var i = 0; i < pickedTeamSize; i++) {
                if (!positions.includes(i))
                    positions.push(i);
                // duplicate in input, let the rest of the code handle the error message
                if (positions.length >= pickedTeamSize)
                    break;
            }
        }
        for (var _i = 0, _a = positions.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], index = _b[0], pos = _b[1];
            if (isNaN(pos) || pos < 0 || pos >= this.pokemon.length) {
                return this.emitChoiceError("Can't choose for Team Preview: You do not have a Pok\u00E9mon in slot ".concat(pos + 1));
            }
            if (positions.indexOf(pos) !== index) {
                return this.emitChoiceError("Can't choose for Team Preview: The Pok\u00E9mon in slot ".concat(pos + 1, " can only switch in once"));
            }
        }
        if (ruleTable.maxTotalLevel) {
            var totalLevel = 0;
            for (var _c = 0, positions_1 = positions; _c < positions_1.length; _c++) {
                var pos = positions_1[_c];
                totalLevel += this.pokemon[pos].level;
            }
            if (totalLevel > ruleTable.maxTotalLevel) {
                if (!data) {
                    // autoChoose
                    positions = __spreadArray([], this.pokemon.keys(), true).sort(function (a, b) { return (_this.pokemon[a].level - _this.pokemon[b].level); })
                        .slice(0, pickedTeamSize);
                }
                else {
                    return this.emitChoiceError("Your selected team has a total level of ".concat(totalLevel, ", but it can't be above ").concat(ruleTable.maxTotalLevel, "; please select a valid team of ").concat(pickedTeamSize, " Pok\u00E9mon"));
                }
            }
        }
        if (ruleTable.valueRules.has('forceselect')) {
            var species_1 = this.battle.dex.species.get(ruleTable.valueRules.get('forceselect'));
            if (!data) {
                // autoChoose
                positions = __spreadArray([], this.pokemon.keys(), true).filter(function (pos) { return _this.pokemon[pos].species.name === species_1.name; })
                    .concat(__spreadArray([], this.pokemon.keys(), true).filter(function (pos) { return _this.pokemon[pos].species.name !== species_1.name; }))
                    .slice(0, pickedTeamSize);
            }
            else {
                var hasSelection = false;
                for (var _d = 0, positions_2 = positions; _d < positions_2.length; _d++) {
                    var pos = positions_2[_d];
                    if (this.pokemon[pos].species.name === species_1.name) {
                        hasSelection = true;
                        break;
                    }
                }
                if (!hasSelection) {
                    return this.emitChoiceError("You must bring ".concat(species_1.name, " to the battle."));
                }
            }
        }
        for (var _e = 0, _f = positions.entries(); _e < _f.length; _e++) {
            var _g = _f[_e], index = _g[0], pos = _g[1];
            this.choice.switchIns.add(pos);
            this.choice.actions.push({
                choice: 'team',
                index: index,
                pokemon: this.pokemon[pos],
                priority: -index,
            });
        }
        return true;
    };
    Side.prototype.chooseShift = function () {
        var index = this.getChoiceIndex();
        if (index >= this.active.length) {
            return this.emitChoiceError("Can't shift: You do not have a Pok\u00E9mon in slot ".concat(index + 1));
        }
        else if (this.requestState !== 'move') {
            return this.emitChoiceError("Can't shift: You can only shift during a move phase");
        }
        else if (this.battle.gameType !== 'triples') {
            return this.emitChoiceError("Can't shift: You can only shift to the center in triples");
        }
        else if (index === 1) {
            return this.emitChoiceError("Can't shift: You can only shift from the edge to the center");
        }
        var pokemon = this.active[index];
        this.choice.actions.push({
            choice: 'shift',
            pokemon: pokemon,
        });
        return true;
    };
    Side.prototype.clearChoice = function () {
        var forcedSwitches = 0;
        var forcedPasses = 0;
        if (this.battle.requestState === 'switch') {
            var canSwitchOut = this.active.filter(function (pokemon) { return pokemon === null || pokemon === void 0 ? void 0 : pokemon.switchFlag; }).length;
            var canSwitchIn = this.pokemon.slice(this.active.length).filter(function (pokemon) { return pokemon && !pokemon.fainted; }).length;
            forcedSwitches = Math.min(canSwitchOut, canSwitchIn);
            forcedPasses = canSwitchOut - forcedSwitches;
        }
        this.choice = {
            cantUndo: false,
            error: "",
            actions: [],
            forcedSwitchesLeft: forcedSwitches,
            forcedPassesLeft: forcedPasses,
            switchIns: new Set(),
            zMove: false,
            mega: false,
            ultra: false,
            dynamax: false,
            terastallize: false,
        };
    };
    Side.prototype.choose = function (input) {
        var _this = this;
        if (!this.requestState) {
            return this.emitChoiceError(this.battle.ended ? "Can't do anything: The game is over" : "Can't do anything: It's not your turn");
        }
        if (this.choice.cantUndo) {
            return this.emitChoiceError("Can't undo: A trapping/disabling effect would cause undo to leak information");
        }
        this.clearChoice();
        var choiceStrings = (input.startsWith('team ') ? [input] : input.split(','));
        if (choiceStrings.length > this.active.length) {
            return this.emitChoiceError("Can't make choices: You sent choices for ".concat(choiceStrings.length, " Pok\u00E9mon, but this is a ").concat(this.battle.gameType, " game!"));
        }
        var _loop_1 = function (choiceString) {
            var _a = lib_1.Utils.splitFirst(choiceString.trim(), ' '), choiceType = _a[0], data = _a[1];
            data = data.trim();
            switch (choiceType) {
                case 'move':
                    var original_1 = data;
                    var error = function () { return _this.emitChoiceError("Conflicting arguments for \"move\": ".concat(original_1)); };
                    var targetLoc = void 0;
                    var event_1 = '';
                    while (true) {
                        // If data ends with a number, treat it as a target location.
                        // We need to special case 'Conversion 2' so it doesn't get
                        // confused with 'Conversion' erroneously sent with the target
                        // '2' (since Conversion targets 'self', targetLoc can't be 2).
                        if (/\s(?:-|\+)?[1-3]$/.test(data) && (0, dex_1.toID)(data) !== 'conversion2') {
                            if (targetLoc !== undefined)
                                return { value: error() };
                            targetLoc = parseInt(data.slice(-2));
                            data = data.slice(0, -2).trim();
                        }
                        else if (data.endsWith(' mega')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'mega';
                            data = data.slice(0, -5);
                        }
                        else if (data.endsWith(' zmove')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'zmove';
                            data = data.slice(0, -6);
                        }
                        else if (data.endsWith(' ultra')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'ultra';
                            data = data.slice(0, -6);
                        }
                        else if (data.endsWith(' dynamax')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'dynamax';
                            data = data.slice(0, -8);
                        }
                        else if (data.endsWith(' gigantamax')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'dynamax';
                            data = data.slice(0, -11);
                        }
                        else if (data.endsWith(' max')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'dynamax';
                            data = data.slice(0, -4);
                        }
                        else if (data.endsWith(' terastal')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'terastallize';
                            data = data.slice(0, -9);
                        }
                        else if (data.endsWith(' terastallize')) {
                            if (event_1)
                                return { value: error() };
                            event_1 = 'terastallize';
                            data = data.slice(0, -13);
                        }
                        else {
                            break;
                        }
                    }
                    if (!this_1.chooseMove(data, targetLoc, event_1))
                        return { value: false };
                    break;
                case 'switch':
                    this_1.chooseSwitch(data);
                    break;
                case 'shift':
                    if (data)
                        return { value: this_1.emitChoiceError("Unrecognized data after \"shift\": ".concat(data)) };
                    if (!this_1.chooseShift())
                        return { value: false };
                    break;
                case 'team':
                    if (!this_1.chooseTeam(data))
                        return { value: false };
                    break;
                case 'pass':
                case 'skip':
                    if (data)
                        return { value: this_1.emitChoiceError("Unrecognized data after \"pass\": ".concat(data)) };
                    if (!this_1.choosePass())
                        return { value: false };
                    break;
                case 'auto':
                case 'default':
                    this_1.autoChoose();
                    break;
                default:
                    this_1.emitChoiceError("Unrecognized choice: ".concat(choiceString));
                    break;
            }
        };
        var this_1 = this;
        for (var _i = 0, choiceStrings_1 = choiceStrings; _i < choiceStrings_1.length; _i++) {
            var choiceString = choiceStrings_1[_i];
            var state_2 = _loop_1(choiceString);
            if (typeof state_2 === "object")
                return state_2.value;
        }
        return !this.choice.error;
    };
    Side.prototype.getChoiceIndex = function (isPass) {
        var index = this.choice.actions.length;
        if (!isPass) {
            switch (this.requestState) {
                case 'move':
                    // auto-pass
                    while (index < this.active.length &&
                        (this.active[index].fainted || this.active[index].volatiles['commanding'])) {
                        this.choosePass();
                        index++;
                    }
                    break;
                case 'switch':
                    while (index < this.active.length && !this.active[index].switchFlag) {
                        this.choosePass();
                        index++;
                    }
                    break;
            }
        }
        return index;
    };
    Side.prototype.choosePass = function () {
        var index = this.getChoiceIndex(true);
        if (index >= this.active.length)
            return false;
        var pokemon = this.active[index];
        switch (this.requestState) {
            case 'switch':
                if (pokemon.switchFlag) { // This condition will always happen if called by Battle#choose()
                    if (!this.choice.forcedPassesLeft) {
                        return this.emitChoiceError("Can't pass: You need to switch in a Pok\u00E9mon to replace ".concat(pokemon.name));
                    }
                    this.choice.forcedPassesLeft--;
                }
                break;
            case 'move':
                if (!pokemon.fainted && !pokemon.volatiles['commanding']) {
                    return this.emitChoiceError("Can't pass: Your ".concat(pokemon.name, " must make a move (or switch)"));
                }
                break;
            default:
                return this.emitChoiceError("Can't pass: Not a move or switch request");
        }
        this.choice.actions.push({
            choice: 'pass',
        });
        return true;
    };
    /** Automatically finish a choice if not currently complete. */
    Side.prototype.autoChoose = function () {
        if (this.requestState === 'teampreview') {
            if (!this.isChoiceDone())
                this.chooseTeam();
        }
        else if (this.requestState === 'switch') {
            var i = 0;
            while (!this.isChoiceDone()) {
                if (!this.chooseSwitch())
                    throw new Error("autoChoose switch crashed: ".concat(this.choice.error));
                i++;
                if (i > 10)
                    throw new Error("autoChoose failed: infinite looping");
            }
        }
        else if (this.requestState === 'move') {
            var i = 0;
            while (!this.isChoiceDone()) {
                if (!this.chooseMove())
                    throw new Error("autoChoose crashed: ".concat(this.choice.error));
                i++;
                if (i > 10)
                    throw new Error("autoChoose failed: infinite looping");
            }
        }
        return true;
    };
    Side.prototype.destroy = function () {
        // deallocate ourself
        // deallocate children and get rid of references to them
        for (var _i = 0, _a = this.pokemon; _i < _a.length; _i++) {
            var pokemon = _a[_i];
            if (pokemon)
                pokemon.destroy();
        }
        for (var _b = 0, _c = this.choice.actions; _b < _c.length; _b++) {
            var action = _c[_b];
            delete action.side;
            delete action.pokemon;
            delete action.target;
        }
        this.choice.actions = [];
        // get rid of some possibly-circular references
        this.pokemon = [];
        this.active = [];
        this.foe = null;
        this.battle = null;
    };
    return Side;
}());
exports.Side = Side;
