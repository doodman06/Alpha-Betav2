"use strict";
/**
 * Simulator Battle Action Queue
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * The action queue is the core of the battle simulation. A rough overview of
 * the core battle loop:
 *
 * - chosen moves/switches are added to the action queue
 * - the action queue is sorted in speed/priority order
 * - we go through the action queue
 * - repeat
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
exports.BattleQueue = void 0;
/**
 * Kind of like a priority queue, although not sorted mid-turn in Gen 1-7.
 *
 * Sort order is documented in `BattleQueue.comparePriority`.
 */
var BattleQueue = /** @class */ (function () {
    function BattleQueue(battle) {
        this.battle = battle;
        this.list = [];
        var queueScripts = battle.format.queue || battle.dex.data.Scripts.queue;
        if (queueScripts)
            Object.assign(this, queueScripts);
    }
    BattleQueue.prototype.shift = function () {
        return this.list.shift();
    };
    BattleQueue.prototype.peek = function (end) {
        return this.list[end ? this.list.length - 1 : 0];
    };
    BattleQueue.prototype.push = function (action) {
        return this.list.push(action);
    };
    BattleQueue.prototype.unshift = function (action) {
        return this.list.unshift(action);
    };
    // eslint-disable-next-line no-restricted-globals
    BattleQueue.prototype[Symbol.iterator] = function () { return this.list[Symbol.iterator](); };
    BattleQueue.prototype.entries = function () {
        return this.list.entries();
    };
    /**
     * Takes an ActionChoice, and fills it out into a full Action object.
     *
     * Returns an array of Actions because some ActionChoices (like mega moves)
     * resolve to two Actions (mega evolution + use move)
     */
    BattleQueue.prototype.resolveAction = function (action, midTurn) {
        if (midTurn === void 0) { midTurn = false; }
        if (!action)
            throw new Error("Action not passed to resolveAction");
        if (action.choice === 'pass')
            return [];
        var actions = [action];
        if (!action.side && action.pokemon)
            action.side = action.pokemon.side;
        if (!action.move && action.moveid)
            action.move = this.battle.dex.getActiveMove(action.moveid);
        if (!action.order) {
            var orders = {
                team: 1,
                start: 2,
                instaswitch: 3,
                beforeTurn: 4,
                beforeTurnMove: 5,
                revivalblessing: 6,
                runUnnerve: 100,
                runSwitch: 101,
                runPrimal: 102,
                switch: 103,
                megaEvo: 104,
                runDynamax: 105,
                terastallize: 106,
                priorityChargeMove: 107,
                shift: 200,
                // default is 200 (for moves)
                residual: 300,
            };
            if (action.choice in orders) {
                action.order = orders[action.choice];
            }
            else {
                action.order = 200;
                if (!['move', 'event'].includes(action.choice)) {
                    throw new Error("Unexpected orderless action ".concat(action.choice));
                }
            }
        }
        if (!midTurn) {
            if (action.choice === 'move') {
                if (!action.maxMove && !action.zmove && action.move.beforeTurnCallback) {
                    actions.unshift.apply(actions, this.resolveAction({
                        choice: 'beforeTurnMove', pokemon: action.pokemon, move: action.move, targetLoc: action.targetLoc,
                    }));
                }
                if (action.mega && !action.pokemon.isSkyDropped()) {
                    actions.unshift.apply(actions, this.resolveAction({
                        choice: 'megaEvo',
                        pokemon: action.pokemon,
                    }));
                }
                if (action.terastallize && !action.pokemon.terastallized) {
                    actions.unshift.apply(actions, this.resolveAction({
                        choice: 'terastallize',
                        pokemon: action.pokemon,
                    }));
                }
                if (action.maxMove && !action.pokemon.volatiles['dynamax']) {
                    actions.unshift.apply(actions, this.resolveAction({
                        choice: 'runDynamax',
                        pokemon: action.pokemon,
                    }));
                }
                if (!action.maxMove && !action.zmove && action.move.priorityChargeCallback) {
                    actions.unshift.apply(actions, this.resolveAction({
                        choice: 'priorityChargeMove',
                        pokemon: action.pokemon,
                        move: action.move,
                    }));
                }
                action.fractionalPriority = this.battle.runEvent('FractionalPriority', action.pokemon, null, action.move, 0);
            }
            else if (['switch', 'instaswitch'].includes(action.choice)) {
                if (typeof action.pokemon.switchFlag === 'string') {
                    action.sourceEffect = this.battle.dex.moves.get(action.pokemon.switchFlag);
                }
                action.pokemon.switchFlag = false;
            }
        }
        var deferPriority = this.battle.gen === 7 && action.mega && action.mega !== 'done';
        if (action.move) {
            var target = null;
            action.move = this.battle.dex.getActiveMove(action.move);
            if (!action.targetLoc) {
                target = this.battle.getRandomTarget(action.pokemon, action.move);
                // TODO: what actually happens here?
                if (target)
                    action.targetLoc = action.pokemon.getLocOf(target);
            }
            action.originalTarget = action.pokemon.getAtLoc(action.targetLoc);
        }
        if (!deferPriority)
            this.battle.getActionSpeed(action);
        return actions;
    };
    /**
     * Makes the passed action happen next (skipping speed order).
     */
    BattleQueue.prototype.prioritizeAction = function (action, sourceEffect) {
        for (var _i = 0, _a = this.list.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], curAction = _b[1];
            if (curAction === action) {
                this.list.splice(i, 1);
                break;
            }
        }
        action.sourceEffect = sourceEffect;
        action.order = 3;
        this.list.unshift(action);
    };
    /**
     * Changes a pokemon's action, and inserts its new action
     * in priority order.
     *
     * You'd normally want the OverrideAction event (which doesn't
     * change priority order).
     */
    BattleQueue.prototype.changeAction = function (pokemon, action) {
        this.cancelAction(pokemon);
        if (!action.pokemon)
            action.pokemon = pokemon;
        this.insertChoice(action);
    };
    BattleQueue.prototype.addChoice = function (choices) {
        var _a;
        if (!Array.isArray(choices))
            choices = [choices];
        for (var _i = 0, choices_1 = choices; _i < choices_1.length; _i++) {
            var choice = choices_1[_i];
            var resolvedChoices = this.resolveAction(choice);
            (_a = this.list).push.apply(_a, resolvedChoices);
            for (var _b = 0, resolvedChoices_1 = resolvedChoices; _b < resolvedChoices_1.length; _b++) {
                var resolvedChoice = resolvedChoices_1[_b];
                if (resolvedChoice && resolvedChoice.choice === 'move' && resolvedChoice.move.id !== 'recharge') {
                    resolvedChoice.pokemon.side.lastSelectedMove = resolvedChoice.move.id;
                }
            }
        }
    };
    BattleQueue.prototype.willAct = function () {
        for (var _i = 0, _a = this.list; _i < _a.length; _i++) {
            var action = _a[_i];
            if (['move', 'switch', 'instaswitch', 'shift'].includes(action.choice)) {
                return action;
            }
        }
        return null;
    };
    BattleQueue.prototype.willMove = function (pokemon) {
        if (pokemon.fainted)
            return null;
        for (var _i = 0, _a = this.list; _i < _a.length; _i++) {
            var action = _a[_i];
            if (action.choice === 'move' && action.pokemon === pokemon) {
                return action;
            }
        }
        return null;
    };
    BattleQueue.prototype.cancelAction = function (pokemon) {
        var oldLength = this.list.length;
        for (var i = 0; i < this.list.length; i++) {
            if (this.list[i].pokemon === pokemon) {
                this.list.splice(i, 1);
                i--;
            }
        }
        return this.list.length !== oldLength;
    };
    BattleQueue.prototype.cancelMove = function (pokemon) {
        for (var _i = 0, _a = this.list.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], action = _b[1];
            if (action.choice === 'move' && action.pokemon === pokemon) {
                this.list.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    BattleQueue.prototype.willSwitch = function (pokemon) {
        for (var _i = 0, _a = this.list; _i < _a.length; _i++) {
            var action = _a[_i];
            if (['switch', 'instaswitch'].includes(action.choice) && action.pokemon === pokemon) {
                return action;
            }
        }
        return null;
    };
    /**
     * Inserts the passed action into the action queue when it normally
     * would have happened (sorting by priority/speed), without
     * re-sorting the existing actions.
     */
    BattleQueue.prototype.insertChoice = function (choices, midTurn) {
        var _a, _b;
        if (midTurn === void 0) { midTurn = false; }
        if (Array.isArray(choices)) {
            for (var _i = 0, choices_2 = choices; _i < choices_2.length; _i++) {
                var choice_1 = choices_2[_i];
                this.insertChoice(choice_1);
            }
            return;
        }
        var choice = choices;
        if (choice.pokemon) {
            choice.pokemon.updateSpeed();
        }
        var actions = this.resolveAction(choice, midTurn);
        var firstIndex = null;
        var lastIndex = null;
        for (var _c = 0, _d = this.list.entries(); _c < _d.length; _c++) {
            var _e = _d[_c], i = _e[0], curAction = _e[1];
            var compared = this.battle.comparePriority(actions[0], curAction);
            if (compared <= 0 && firstIndex === null) {
                firstIndex = i;
            }
            if (compared < 0) {
                lastIndex = i;
                break;
            }
        }
        if (firstIndex === null) {
            (_a = this.list).push.apply(_a, actions);
        }
        else {
            if (lastIndex === null)
                lastIndex = this.list.length;
            var index = firstIndex === lastIndex ? firstIndex : this.battle.random(firstIndex, lastIndex + 1);
            (_b = this.list).splice.apply(_b, __spreadArray([index, 0], actions, false));
        }
    };
    BattleQueue.prototype.clear = function () {
        this.list = [];
    };
    BattleQueue.prototype.debug = function (action) {
        var _this = this;
        if (action) {
            return "".concat(action.order || '', ":").concat(action.priority || '', ":").concat(action.speed || '', ":").concat(action.subOrder || '', " - ").concat(action.choice).concat(action.pokemon ? ' ' + action.pokemon : '').concat(action.move ? ' ' + action.move : '');
        }
        return this.list.map(function (queueAction) { return _this.debug(queueAction); }).join('\n') + '\n';
    };
    BattleQueue.prototype.sort = function () {
        // this.log.push('SORT ' + this.debugQueue());
        this.battle.speedSort(this.list);
        return this;
    };
    return BattleQueue;
}());
exports.BattleQueue = BattleQueue;
exports.default = BattleQueue;
