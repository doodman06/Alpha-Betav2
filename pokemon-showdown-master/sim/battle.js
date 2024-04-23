"use strict";
/**
 * Simulator Battle
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This file is where the battle simulation itself happens.
 *
 * The most important part of the simulation is the event system:
 * see the `runEvent` function definition for details.
 *
 * General battle mechanics are in `battle-actions`; move-specific,
 * item-specific, etc mechanics are in the corresponding file in
 * `data`.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Battle = exports.extractChannelMessages = void 0;
var dex_1 = require("./dex");
var teams_1 = require("./teams");
var field_1 = require("./field");
var pokemon_1 = require("./pokemon");
var prng_1 = require("./prng");
var side_1 = require("./side");
var state_1 = require("./state");
var battle_queue_1 = require("./battle-queue");
var battle_actions_1 = require("./battle-actions");
var lib_1 = require("../lib");
var splitRegex = /^\|split\|p([1234])\n(.*)\n(.*)|.+/gm;
function extractChannelMessages(message, channelIds) {
    var _a;
    var channelIdSet = new Set(channelIds);
    var channelMessages = (_a = {},
        _a[-1] = [],
        _a[0] = [],
        _a[1] = [],
        _a[2] = [],
        _a[3] = [],
        _a[4] = [],
        _a);
    for (var _i = 0, _b = message.matchAll(splitRegex); _i < _b.length; _i++) {
        var _c = _b[_i], lineMatch = _c[0], playerMatch = _c[1], secretMessage = _c[2], sharedMessage = _c[3];
        var player = playerMatch ? parseInt(playerMatch) : 0;
        for (var _d = 0, channelIdSet_1 = channelIdSet; _d < channelIdSet_1.length; _d++) {
            var channelId = channelIdSet_1[_d];
            var line = lineMatch;
            if (player) {
                line = channelId === -1 || player === channelId ? secretMessage : sharedMessage;
                if (!line)
                    continue;
            }
            channelMessages[channelId].push(line);
        }
    }
    return channelMessages;
}
exports.extractChannelMessages = extractChannelMessages;
var Battle = /** @class */ (function () {
    function Battle(options) {
        this.toID = dex_1.toID;
        this.log = [];
        this.add('t:', Math.floor(Date.now() / 1000));
        var format = options.format || dex_1.Dex.formats.get(options.formatid, true);
        this.format = format;
        this.dex = dex_1.Dex.forFormat(format);
        this.gen = this.dex.gen;
        this.ruleTable = this.dex.formats.getRuleTable(format);
        this.trunc = this.dex.trunc;
        this.clampIntRange = lib_1.Utils.clampIntRange;
        // Object.assign(this, this.dex.data.Scripts);
        for (var i in this.dex.data.Scripts) {
            var entry = this.dex.data.Scripts[i];
            if (typeof entry === 'function')
                this[i] = entry;
        }
        if (format.battle)
            Object.assign(this, format.battle);
        this.id = '';
        this.debugMode = format.debug || !!options.debug;
        // Require debug mode and explicitly passed true/false
        this.forceRandomChance = (this.debugMode && typeof options.forceRandomChance === 'boolean') ?
            options.forceRandomChance : null;
        this.deserialized = !!options.deserialized;
        this.strictChoices = !!options.strictChoices;
        this.formatData = { id: format.id };
        this.gameType = (format.gameType || 'singles');
        this.field = new field_1.Field(this);
        var isFourPlayer = this.gameType === 'multi' || this.gameType === 'freeforall';
        this.sides = Array(isFourPlayer ? 4 : 2).fill(null);
        this.activePerHalf = this.gameType === 'triples' ? 3 :
            (isFourPlayer || this.gameType === 'doubles') ? 2 :
                1;
        this.prng = options.prng || new prng_1.PRNG(options.seed || undefined);
        this.prngSeed = this.prng.startingSeed.slice();
        this.rated = options.rated || !!options.rated;
        this.reportExactHP = !!format.debug;
        this.reportPercentages = false;
        this.supportCancel = false;
        this.queue = new battle_queue_1.BattleQueue(this);
        this.actions = new battle_actions_1.BattleActions(this);
        this.faintQueue = [];
        this.inputLog = [];
        this.messageLog = [];
        this.sentLogPos = 0;
        this.sentEnd = false;
        this.requestState = '';
        this.turn = 0;
        this.midTurn = false;
        this.started = false;
        this.ended = false;
        this.effect = { id: '' };
        this.effectState = { id: '' };
        this.event = { id: '' };
        this.events = null;
        this.eventDepth = 0;
        this.activeMove = null;
        this.activePokemon = null;
        this.activeTarget = null;
        this.lastMove = null;
        this.lastMoveLine = -1;
        this.lastSuccessfulMoveThisTurn = null;
        this.lastDamage = 0;
        this.abilityOrder = 0;
        this.quickClawRoll = false;
        this.teamGenerator = null;
        this.hints = new Set();
        this.NOT_FAIL = '';
        this.HIT_SUBSTITUTE = 0;
        this.FAIL = false;
        this.SILENT_FAIL = null;
        this.send = options.send || (function () { });
        var inputOptions = {
            formatid: options.formatid, seed: this.prng.seed,
        };
        if (this.rated)
            inputOptions.rated = this.rated;
        if (typeof __version !== 'undefined') {
            if (__version.head) {
                this.inputLog.push(">version ".concat(__version.head));
            }
            if (__version.origin) {
                this.inputLog.push(">version-origin ".concat(__version.origin));
            }
        }
        this.inputLog.push(">start " + JSON.stringify(inputOptions));
        this.add('gametype', this.gameType);
        // timing is early enough to hook into ModifySpecies event
        for (var _i = 0, _a = this.ruleTable.keys(); _i < _a.length; _i++) {
            var rule = _a[_i];
            if ('+*-!'.includes(rule.charAt(0)))
                continue;
            var subFormat = this.dex.formats.get(rule);
            if (subFormat.exists) {
                var hasEventHandler = Object.keys(subFormat).some(
                // skip event handlers that are handled elsewhere
                function (val) { return val.startsWith('on') && ![
                    'onBegin', 'onTeamPreview', 'onBattleStart', 'onValidateRule', 'onValidateTeam', 'onChangeSet', 'onValidateSet',
                ].includes(val); });
                if (hasEventHandler)
                    this.field.addPseudoWeather(rule);
            }
        }
        var sides = ['p1', 'p2', 'p3', 'p4'];
        for (var _b = 0, sides_1 = sides; _b < sides_1.length; _b++) {
            var side = sides_1[_b];
            if (options[side]) {
                this.setPlayer(side, options[side]);
            }
        }
    }
    Battle.prototype.toJSON = function () {
        return state_1.State.serializeBattle(this);
    };
    Battle.fromJSON = function (serialized) {
        return state_1.State.deserializeBattle(serialized);
    };
    Object.defineProperty(Battle.prototype, "p1", {
        get: function () {
            return this.sides[0];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Battle.prototype, "p2", {
        get: function () {
            return this.sides[1];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Battle.prototype, "p3", {
        get: function () {
            return this.sides[2];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Battle.prototype, "p4", {
        get: function () {
            return this.sides[3];
        },
        enumerable: false,
        configurable: true
    });
    Battle.prototype.toString = function () {
        return "Battle: ".concat(this.format);
    };
    Battle.prototype.random = function (m, n) {
        return this.prng.next(m, n);
    };
    Battle.prototype.randomChance = function (numerator, denominator) {
        if (this.forceRandomChance !== null)
            return this.forceRandomChance;
        return this.prng.randomChance(numerator, denominator);
    };
    Battle.prototype.sample = function (items) {
        return this.prng.sample(items);
    };
    /** Note that passing `undefined` resets to the starting seed, but `null` will roll a new seed */
    Battle.prototype.resetRNG = function (seed) {
        if (seed === void 0) { seed = this.prng.startingSeed; }
        this.prng = new prng_1.PRNG(seed);
        this.add('message', "The battle's RNG was reset.");
    };
    Battle.prototype.suppressingAbility = function (target) {
        return this.activePokemon && this.activePokemon.isActive && (this.activePokemon !== target || this.gen < 8) &&
            this.activeMove && this.activeMove.ignoreAbility && !(target === null || target === void 0 ? void 0 : target.hasItem('Ability Shield'));
    };
    Battle.prototype.setActiveMove = function (move, pokemon, target) {
        this.activeMove = move || null;
        this.activePokemon = pokemon || null;
        this.activeTarget = target || pokemon || null;
    };
    Battle.prototype.clearActiveMove = function (failed) {
        if (this.activeMove) {
            if (!failed) {
                this.lastMove = this.activeMove;
            }
            this.activeMove = null;
            this.activePokemon = null;
            this.activeTarget = null;
        }
    };
    Battle.prototype.updateSpeed = function () {
        for (var _i = 0, _a = this.getAllActive(); _i < _a.length; _i++) {
            var pokemon = _a[_i];
            pokemon.updateSpeed();
        }
    };
    /**
     * The default sort order for actions, but also event listeners.
     *
     * 1. Order, low to high (default last)
     * 2. Priority, high to low (default 0)
     * 3. Speed, high to low (default 0)
     * 4. SubOrder, low to high (default 0)
     *
     * Doesn't reference `this` so doesn't need to be bound.
     */
    Battle.prototype.comparePriority = function (a, b) {
        return -((b.order || 4294967296) - (a.order || 4294967296)) ||
            ((b.priority || 0) - (a.priority || 0)) ||
            ((b.speed || 0) - (a.speed || 0)) ||
            -((b.subOrder || 0) - (a.subOrder || 0)) ||
            0;
    };
    Battle.compareRedirectOrder = function (a, b) {
        return ((b.priority || 0) - (a.priority || 0)) ||
            ((b.speed || 0) - (a.speed || 0)) ||
            ((a.effectHolder && b.effectHolder) ? -(b.effectHolder.abilityOrder - a.effectHolder.abilityOrder) : 0) ||
            0;
    };
    Battle.compareLeftToRightOrder = function (a, b) {
        return -((b.order || 4294967296) - (a.order || 4294967296)) ||
            ((b.priority || 0) - (a.priority || 0)) ||
            -((b.index || 0) - (a.index || 0)) ||
            0;
    };
    /** Sort a list, resolving speed ties the way the games do. */
    Battle.prototype.speedSort = function (list, comparator) {
        var _a;
        if (comparator === void 0) { comparator = this.comparePriority; }
        if (list.length < 2)
            return;
        var sorted = 0;
        // This is a Selection Sort - not the fastest sort in general, but
        // actually faster than QuickSort for small arrays like the ones
        // `speedSort` is used for.
        // More importantly, it makes it easiest to resolve speed ties
        // properly.
        while (sorted + 1 < list.length) {
            var nextIndexes = [sorted];
            // grab list of next indexes
            for (var i = sorted + 1; i < list.length; i++) {
                var delta = comparator(list[nextIndexes[0]], list[i]);
                if (delta < 0)
                    continue;
                if (delta > 0)
                    nextIndexes = [i];
                if (delta === 0)
                    nextIndexes.push(i);
            }
            // put list of next indexes where they belong
            for (var i = 0; i < nextIndexes.length; i++) {
                var index = nextIndexes[i];
                if (index !== sorted + i) {
                    // nextIndexes is guaranteed to be in order, so it will never have
                    // been disturbed by an earlier swap
                    _a = [list[index], list[sorted + i]], list[sorted + i] = _a[0], list[index] = _a[1];
                }
            }
            if (nextIndexes.length > 1) {
                this.prng.shuffle(list, sorted, sorted + nextIndexes.length);
            }
            sorted += nextIndexes.length;
        }
    };
    /**
     * Runs an event with no source on each Pokémon on the field, in Speed order.
     */
    Battle.prototype.eachEvent = function (eventid, effect, relayVar) {
        var actives = this.getAllActive();
        if (!effect && this.effect)
            effect = this.effect;
        this.speedSort(actives, function (a, b) { return b.speed - a.speed; });
        for (var _i = 0, actives_1 = actives; _i < actives_1.length; _i++) {
            var pokemon = actives_1[_i];
            this.runEvent(eventid, pokemon, null, effect, relayVar);
        }
        if (eventid === 'Weather' && this.gen >= 7) {
            // TODO: further research when updates happen
            this.eachEvent('Update');
        }
    };
    /**
     * Runs an event with no source on each effect on the field, in Speed order.
     *
     * Unlike `eachEvent`, this contains a lot of other handling and is intended only for the residual step.
     */
    Battle.prototype.residualEvent = function (eventid, relayVar) {
        var _a;
        var callbackName = "on".concat(eventid);
        var handlers = this.findBattleEventHandlers(callbackName, 'duration');
        handlers = handlers.concat(this.findFieldEventHandlers(this.field, "onField".concat(eventid), 'duration'));
        for (var _i = 0, _b = this.sides; _i < _b.length; _i++) {
            var side = _b[_i];
            if (side.n < 2 || !side.allySide) {
                handlers = handlers.concat(this.findSideEventHandlers(side, "onSide".concat(eventid), 'duration'));
            }
            for (var _c = 0, _d = side.active; _c < _d.length; _c++) {
                var active = _d[_c];
                if (!active)
                    continue;
                handlers = handlers.concat(this.findPokemonEventHandlers(active, callbackName, 'duration'));
                handlers = handlers.concat(this.findSideEventHandlers(side, callbackName, undefined, active));
                handlers = handlers.concat(this.findFieldEventHandlers(this.field, callbackName, undefined, active));
            }
        }
        this.speedSort(handlers);
        while (handlers.length) {
            var handler = handlers[0];
            handlers.shift();
            var effect = handler.effect;
            if (handler.effectHolder.fainted)
                continue;
            if (handler.end && handler.state && handler.state.duration) {
                handler.state.duration--;
                if (!handler.state.duration) {
                    var endCallArgs = handler.endCallArgs || [handler.effectHolder, effect.id];
                    (_a = handler.end).call.apply(_a, endCallArgs);
                    if (this.ended)
                        return;
                    continue;
                }
            }
            var handlerEventid = eventid;
            if (handler.effectHolder.sideConditions)
                handlerEventid = "Side".concat(eventid);
            if (handler.effectHolder.pseudoWeather)
                handlerEventid = "Field".concat(eventid);
            if (handler.callback) {
                this.singleEvent(handlerEventid, effect, handler.state, handler.effectHolder, null, null, relayVar, handler.callback);
            }
            this.faintMessages();
            if (this.ended)
                return;
        }
    };
    /** The entire event system revolves around this function and runEvent. */
    Battle.prototype.singleEvent = function (eventid, effect, state, target, source, sourceEffect, relayVar, customCallback) {
        if (this.eventDepth >= 8) {
            // oh fuck
            this.add('message', 'STACK LIMIT EXCEEDED');
            this.add('message', 'PLEASE REPORT IN BUG THREAD');
            this.add('message', 'Event: ' + eventid);
            this.add('message', 'Parent event: ' + this.event.id);
            throw new Error("Stack overflow");
        }
        if (this.log.length - this.sentLogPos > 1000) {
            this.add('message', 'LINE LIMIT EXCEEDED');
            this.add('message', 'PLEASE REPORT IN BUG THREAD');
            this.add('message', 'Event: ' + eventid);
            this.add('message', 'Parent event: ' + this.event.id);
            throw new Error("Infinite loop");
        }
        // this.add('Event: ' + eventid + ' (depth ' + this.eventDepth + ')');
        var hasRelayVar = true;
        if (relayVar === undefined) {
            relayVar = true;
            hasRelayVar = false;
        }
        if (effect.effectType === 'Status' && (target instanceof pokemon_1.Pokemon) && target.status !== effect.id) {
            // it's changed; call it off
            return relayVar;
        }
        if (eventid !== 'Start' && eventid !== 'TakeItem' && eventid !== 'Primal' &&
            effect.effectType === 'Item' && (target instanceof pokemon_1.Pokemon) && target.ignoringItem()) {
            this.debug(eventid + ' handler suppressed by Embargo, Klutz or Magic Room');
            return relayVar;
        }
        if (eventid !== 'End' && effect.effectType === 'Ability' && (target instanceof pokemon_1.Pokemon) && target.ignoringAbility()) {
            this.debug(eventid + ' handler suppressed by Gastro Acid or Neutralizing Gas');
            return relayVar;
        }
        if (effect.effectType === 'Weather' && eventid !== 'FieldStart' && eventid !== 'FieldResidual' &&
            eventid !== 'FieldEnd' && this.field.suppressingWeather()) {
            this.debug(eventid + ' handler suppressed by Air Lock');
            return relayVar;
        }
        var callback = customCallback || effect["on".concat(eventid)];
        if (callback === undefined)
            return relayVar;
        var parentEffect = this.effect;
        var parentEffectState = this.effectState;
        var parentEvent = this.event;
        this.effect = effect;
        this.effectState = state || {};
        this.event = { id: eventid, target: target, source: source, effect: sourceEffect };
        this.eventDepth++;
        var args = [target, source, sourceEffect];
        if (hasRelayVar)
            args.unshift(relayVar);
        var returnVal;
        if (typeof callback === 'function') {
            returnVal = callback.apply(this, args);
        }
        else {
            returnVal = callback;
        }
        this.eventDepth--;
        this.effect = parentEffect;
        this.effectState = parentEffectState;
        this.event = parentEvent;
        return returnVal === undefined ? relayVar : returnVal;
    };
    /**
     * runEvent is the core of Pokemon Showdown's event system.
     *
     * Basic usage
     * ===========
     *
     *   this.runEvent('Blah')
     * will trigger any onBlah global event handlers.
     *
     *   this.runEvent('Blah', target)
     * will additionally trigger any onBlah handlers on the target, onAllyBlah
     * handlers on any active pokemon on the target's team, and onFoeBlah
     * handlers on any active pokemon on the target's foe's team
     *
     *   this.runEvent('Blah', target, source)
     * will additionally trigger any onSourceBlah handlers on the source
     *
     *   this.runEvent('Blah', target, source, effect)
     * will additionally pass the effect onto all event handlers triggered
     *
     *   this.runEvent('Blah', target, source, effect, relayVar)
     * will additionally pass the relayVar as the first argument along all event
     * handlers
     *
     * You may leave any of these null. For instance, if you have a relayVar but
     * no source or effect:
     *   this.runEvent('Damage', target, null, null, 50)
     *
     * Event handlers
     * ==============
     *
     * Items, abilities, statuses, and other effects like SR, confusion, weather,
     * or Trick Room can have event handlers. Event handlers are functions that
     * can modify what happens during an event.
     *
     * event handlers are passed:
     *   function (target, source, effect)
     * although some of these can be blank.
     *
     * certain events have a relay variable, in which case they're passed:
     *   function (relayVar, target, source, effect)
     *
     * Relay variables are variables that give additional information about the
     * event. For instance, the damage event has a relayVar which is the amount
     * of damage dealt.
     *
     * If a relay variable isn't passed to runEvent, there will still be a secret
     * relayVar defaulting to `true`, but it won't get passed to any event
     * handlers.
     *
     * After an event handler is run, its return value helps determine what
     * happens next:
     * 1. If the return value isn't `undefined`, relayVar is set to the return
     *    value
     * 2. If relayVar is falsy, no more event handlers are run
     * 3. Otherwise, if there are more event handlers, the next one is run and
     *    we go back to step 1.
     * 4. Once all event handlers are run (or one of them results in a falsy
     *    relayVar), relayVar is returned by runEvent
     *
     * As a shortcut, an event handler that isn't a function will be interpreted
     * as a function that returns that value.
     *
     * You can have return values mean whatever you like, but in general, we
     * follow the convention that returning `false` or `null` means
     * stopping or interrupting the event.
     *
     * For instance, returning `false` from a TrySetStatus handler means that
     * the pokemon doesn't get statused.
     *
     * If a failed event usually results in a message like "But it failed!"
     * or "It had no effect!", returning `null` will suppress that message and
     * returning `false` will display it. Returning `null` is useful if your
     * event handler already gave its own custom failure message.
     *
     * Returning `undefined` means "don't change anything" or "keep going".
     * A function that does nothing but return `undefined` is the equivalent
     * of not having an event handler at all.
     *
     * Returning a value means that that value is the new `relayVar`. For
     * instance, if a Damage event handler returns 50, the damage event
     * will deal 50 damage instead of whatever it was going to deal before.
     *
     * Useful values
     * =============
     *
     * In addition to all the methods and attributes of Dex, Battle, and
     * Scripts, event handlers have some additional values they can access:
     *
     * this.effect:
     *   the Effect having the event handler
     * this.effectState:
     *   the data store associated with the above Effect. This is a plain Object
     *   and you can use it to store data for later event handlers.
     * this.effectState.target:
     *   the Pokemon, Side, or Battle that the event handler's effect was
     *   attached to.
     * this.event.id:
     *   the event ID
     * this.event.target, this.event.source, this.event.effect:
     *   the target, source, and effect of the event. These are the same
     *   variables that are passed as arguments to the event handler, but
     *   they're useful for functions called by the event handler.
     */
    Battle.prototype.runEvent = function (eventid, target, source, sourceEffect, relayVar, onEffect, fastExit) {
        // if (Battle.eventCounter) {
        // 	if (!Battle.eventCounter[eventid]) Battle.eventCounter[eventid] = 0;
        // 	Battle.eventCounter[eventid]++;
        // }
        if (this.eventDepth >= 8) {
            // oh fuck
            this.add('message', 'STACK LIMIT EXCEEDED');
            this.add('message', 'PLEASE REPORT IN BUG THREAD');
            this.add('message', 'Event: ' + eventid);
            this.add('message', 'Parent event: ' + this.event.id);
            throw new Error("Stack overflow");
        }
        if (!target)
            target = this;
        var effectSource = null;
        if (source instanceof pokemon_1.Pokemon)
            effectSource = source;
        var handlers = this.findEventHandlers(target, eventid, effectSource);
        if (onEffect) {
            if (!sourceEffect)
                throw new Error("onEffect passed without an effect");
            // @ts-ignore - dynamic lookup
            var callback = sourceEffect["on".concat(eventid)];
            if (callback !== undefined) {
                if (Array.isArray(target))
                    throw new Error("");
                handlers.unshift(this.resolvePriority({
                    effect: sourceEffect,
                    callback: callback,
                    state: {}, end: null, effectHolder: target,
                }, "on".concat(eventid)));
            }
        }
        if (['Invulnerability', 'TryHit', 'DamagingHit', 'EntryHazard'].includes(eventid)) {
            handlers.sort(Battle.compareLeftToRightOrder);
        }
        else if (fastExit) {
            handlers.sort(Battle.compareRedirectOrder);
        }
        else {
            this.speedSort(handlers);
        }
        var hasRelayVar = 1;
        var args = [target, source, sourceEffect];
        // console.log('Event: ' + eventid + ' (depth ' + this.eventDepth + ') t:' + target.id + ' s:' + (!source || source.id) + ' e:' + effect.id);
        if (relayVar === undefined || relayVar === null) {
            relayVar = true;
            hasRelayVar = 0;
        }
        else {
            args.unshift(relayVar);
        }
        var parentEvent = this.event;
        this.event = { id: eventid, target: target, source: source, effect: sourceEffect, modifier: 1 };
        this.eventDepth++;
        var targetRelayVars = [];
        if (Array.isArray(target)) {
            if (Array.isArray(relayVar)) {
                targetRelayVars = relayVar;
            }
            else {
                for (var i = 0; i < target.length; i++)
                    targetRelayVars[i] = true;
            }
        }
        for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
            var handler = handlers_1[_i];
            if (handler.index !== undefined) {
                // TODO: find a better way to do this
                if (!targetRelayVars[handler.index] && !(targetRelayVars[handler.index] === 0 &&
                    eventid === 'DamagingHit'))
                    continue;
                if (handler.target) {
                    args[hasRelayVar] = handler.target;
                    this.event.target = handler.target;
                }
                if (hasRelayVar)
                    args[0] = targetRelayVars[handler.index];
            }
            var effect = handler.effect;
            var effectHolder = handler.effectHolder;
            // this.debug('match ' + eventid + ': ' + status.id + ' ' + status.effectType);
            if (effect.effectType === 'Status' && effectHolder.status !== effect.id) {
                // it's changed; call it off
                continue;
            }
            if (effect.effectType === 'Ability' && effect.isBreakable !== false &&
                this.suppressingAbility(effectHolder)) {
                if (effect.isBreakable) {
                    this.debug(eventid + ' handler suppressed by Mold Breaker');
                    continue;
                }
                if (!effect.num) {
                    // ignore attacking events for custom abilities
                    var AttackingEvents = {
                        BeforeMove: 1,
                        BasePower: 1,
                        Immunity: 1,
                        RedirectTarget: 1,
                        Heal: 1,
                        SetStatus: 1,
                        CriticalHit: 1,
                        ModifyAtk: 1, ModifyDef: 1, ModifySpA: 1, ModifySpD: 1, ModifySpe: 1, ModifyAccuracy: 1,
                        ModifyBoost: 1,
                        ModifyDamage: 1,
                        ModifySecondaries: 1,
                        ModifyWeight: 1,
                        TryAddVolatile: 1,
                        TryHit: 1,
                        TryHitSide: 1,
                        TryMove: 1,
                        Boost: 1,
                        DragOut: 1,
                        Effectiveness: 1,
                    };
                    if (eventid in AttackingEvents) {
                        this.debug(eventid + ' handler suppressed by Mold Breaker');
                        continue;
                    }
                    else if (eventid === 'Damage' && sourceEffect && sourceEffect.effectType === 'Move') {
                        this.debug(eventid + ' handler suppressed by Mold Breaker');
                        continue;
                    }
                }
            }
            if (eventid !== 'Start' && eventid !== 'SwitchIn' && eventid !== 'TakeItem' &&
                effect.effectType === 'Item' && (effectHolder instanceof pokemon_1.Pokemon) && effectHolder.ignoringItem()) {
                if (eventid !== 'Update') {
                    this.debug(eventid + ' handler suppressed by Embargo, Klutz or Magic Room');
                }
                continue;
            }
            else if (eventid !== 'End' && effect.effectType === 'Ability' &&
                (effectHolder instanceof pokemon_1.Pokemon) && effectHolder.ignoringAbility()) {
                if (eventid !== 'Update') {
                    this.debug(eventid + ' handler suppressed by Gastro Acid or Neutralizing Gas');
                }
                continue;
            }
            if ((effect.effectType === 'Weather' || eventid === 'Weather') &&
                eventid !== 'Residual' && eventid !== 'End' && this.field.suppressingWeather()) {
                this.debug(eventid + ' handler suppressed by Air Lock');
                continue;
            }
            var returnVal = void 0;
            if (typeof handler.callback === 'function') {
                var parentEffect = this.effect;
                var parentEffectState = this.effectState;
                this.effect = handler.effect;
                this.effectState = handler.state || {};
                this.effectState.target = effectHolder;
                returnVal = handler.callback.apply(this, args);
                this.effect = parentEffect;
                this.effectState = parentEffectState;
            }
            else {
                returnVal = handler.callback;
            }
            if (returnVal !== undefined) {
                relayVar = returnVal;
                if (!relayVar || fastExit) {
                    if (handler.index !== undefined) {
                        targetRelayVars[handler.index] = relayVar;
                        if (targetRelayVars.every(function (val) { return !val; }))
                            break;
                    }
                    else {
                        break;
                    }
                }
                if (hasRelayVar) {
                    args[0] = relayVar;
                }
            }
        }
        this.eventDepth--;
        if (typeof relayVar === 'number' && relayVar === Math.abs(Math.floor(relayVar))) {
            // this.debug(eventid + ' modifier: 0x' +
            // 	('0000' + (this.event.modifier * 4096).toString(16)).slice(-4).toUpperCase());
            relayVar = this.modify(relayVar, this.event.modifier);
        }
        this.event = parentEvent;
        return Array.isArray(target) ? targetRelayVars : relayVar;
    };
    /**
     * priorityEvent works just like runEvent, except it exits and returns
     * on the first non-undefined value instead of only on null/false.
     */
    Battle.prototype.priorityEvent = function (eventid, target, source, effect, relayVar, onEffect) {
        return this.runEvent(eventid, target, source, effect, relayVar, onEffect, true);
    };
    Battle.prototype.resolvePriority = function (handler, callbackName) {
        // @ts-ignore
        handler.order = handler.effect["".concat(callbackName, "Order")] || false;
        // @ts-ignore
        handler.priority = handler.effect["".concat(callbackName, "Priority")] || 0;
        // @ts-ignore
        handler.subOrder = handler.effect["".concat(callbackName, "SubOrder")] || 0;
        if (handler.effectHolder && handler.effectHolder.getStat) {
            handler.speed = handler.effectHolder.speed;
        }
        return handler;
    };
    Battle.prototype.findEventHandlers = function (target, eventName, source) {
        var handlers = [];
        if (Array.isArray(target)) {
            for (var _i = 0, _a = target.entries(); _i < _a.length; _i++) {
                var _b = _a[_i], i = _b[0], pokemon = _b[1];
                // console.log(`Event: ${eventName}, Target: ${'' + pokemon}, ${i}`);
                var curHandlers = this.findEventHandlers(pokemon, eventName, source);
                for (var _c = 0, curHandlers_1 = curHandlers; _c < curHandlers_1.length; _c++) {
                    var handler = curHandlers_1[_c];
                    handler.target = pokemon; // Original "effectHolder"
                    handler.index = i;
                }
                handlers = handlers.concat(curHandlers);
            }
            return handlers;
        }
        // events usually run through EachEvent should never have any handlers besides `on${eventName}` so don't check for them
        var prefixedHandlers = !['BeforeTurn', 'Update', 'Weather', 'WeatherChange', 'TerrainChange'].includes(eventName);
        if (target instanceof pokemon_1.Pokemon && (target.isActive || (source === null || source === void 0 ? void 0 : source.isActive))) {
            handlers = this.findPokemonEventHandlers(target, "on".concat(eventName));
            if (prefixedHandlers) {
                for (var _d = 0, _e = target.alliesAndSelf(); _d < _e.length; _d++) {
                    var allyActive = _e[_d];
                    handlers.push.apply(handlers, this.findPokemonEventHandlers(allyActive, "onAlly".concat(eventName)));
                    handlers.push.apply(handlers, this.findPokemonEventHandlers(allyActive, "onAny".concat(eventName)));
                }
                for (var _f = 0, _g = target.foes(); _f < _g.length; _f++) {
                    var foeActive = _g[_f];
                    handlers.push.apply(handlers, this.findPokemonEventHandlers(foeActive, "onFoe".concat(eventName)));
                    handlers.push.apply(handlers, this.findPokemonEventHandlers(foeActive, "onAny".concat(eventName)));
                }
            }
            target = target.side;
        }
        if (source && prefixedHandlers) {
            handlers.push.apply(handlers, this.findPokemonEventHandlers(source, "onSource".concat(eventName)));
        }
        if (target instanceof side_1.Side) {
            for (var _h = 0, _j = this.sides; _h < _j.length; _h++) {
                var side = _j[_h];
                if (side.n >= 2 && side.allySide)
                    break;
                if (side === target || side === target.allySide) {
                    handlers.push.apply(handlers, this.findSideEventHandlers(side, "on".concat(eventName)));
                }
                else if (prefixedHandlers) {
                    handlers.push.apply(handlers, this.findSideEventHandlers(side, "onFoe".concat(eventName)));
                }
                if (prefixedHandlers)
                    handlers.push.apply(handlers, this.findSideEventHandlers(side, "onAny".concat(eventName)));
            }
        }
        handlers.push.apply(handlers, this.findFieldEventHandlers(this.field, "on".concat(eventName)));
        handlers.push.apply(handlers, this.findBattleEventHandlers("on".concat(eventName)));
        return handlers;
    };
    Battle.prototype.findPokemonEventHandlers = function (pokemon, callbackName, getKey) {
        var handlers = [];
        var status = pokemon.getStatus();
        // @ts-ignore - dynamic lookup
        var callback = status[callbackName];
        if (callback !== undefined || (getKey && pokemon.statusState[getKey])) {
            handlers.push(this.resolvePriority({
                effect: status,
                callback: callback,
                state: pokemon.statusState, end: pokemon.clearStatus, effectHolder: pokemon,
            }, callbackName));
        }
        for (var id in pokemon.volatiles) {
            var volatileState = pokemon.volatiles[id];
            var volatile = this.dex.conditions.getByID(id);
            // @ts-ignore - dynamic lookup
            callback = volatile[callbackName];
            if (callback !== undefined || (getKey && volatileState[getKey])) {
                handlers.push(this.resolvePriority({
                    effect: volatile,
                    callback: callback,
                    state: volatileState, end: pokemon.removeVolatile, effectHolder: pokemon,
                }, callbackName));
            }
        }
        var ability = pokemon.getAbility();
        // @ts-ignore - dynamic lookup
        callback = ability[callbackName];
        if (callback !== undefined || (getKey && pokemon.abilityState[getKey])) {
            handlers.push(this.resolvePriority({
                effect: ability,
                callback: callback,
                state: pokemon.abilityState, end: pokemon.clearAbility, effectHolder: pokemon,
            }, callbackName));
        }
        var item = pokemon.getItem();
        // @ts-ignore - dynamic lookup
        callback = item[callbackName];
        if (callback !== undefined || (getKey && pokemon.itemState[getKey])) {
            handlers.push(this.resolvePriority({
                effect: item,
                callback: callback,
                state: pokemon.itemState, end: pokemon.clearItem, effectHolder: pokemon,
            }, callbackName));
        }
        var species = pokemon.baseSpecies;
        // @ts-ignore - dynamic lookup
        callback = species[callbackName];
        if (callback !== undefined) {
            handlers.push(this.resolvePriority({
                effect: species,
                callback: callback,
                state: pokemon.speciesState,
                end: function () { },
                effectHolder: pokemon,
            }, callbackName));
        }
        var side = pokemon.side;
        for (var conditionid in side.slotConditions[pokemon.position]) {
            var slotConditionState = side.slotConditions[pokemon.position][conditionid];
            var slotCondition = this.dex.conditions.getByID(conditionid);
            // @ts-ignore - dynamic lookup
            callback = slotCondition[callbackName];
            if (callback !== undefined || (getKey && slotConditionState[getKey])) {
                handlers.push(this.resolvePriority({
                    effect: slotCondition,
                    callback: callback,
                    state: slotConditionState,
                    end: side.removeSlotCondition,
                    endCallArgs: [side, pokemon, slotCondition.id],
                    effectHolder: side,
                }, callbackName));
            }
        }
        return handlers;
    };
    Battle.prototype.findBattleEventHandlers = function (callbackName, getKey) {
        var handlers = [];
        var callback;
        var format = this.format;
        // @ts-ignore - dynamic lookup
        callback = format[callbackName];
        if (callback !== undefined || (getKey && this.formatData[getKey])) {
            handlers.push(this.resolvePriority({
                effect: format,
                callback: callback,
                state: this.formatData, end: null, effectHolder: this,
            }, callbackName));
        }
        if (this.events && (callback = this.events[callbackName]) !== undefined) {
            for (var _i = 0, callback_1 = callback; _i < callback_1.length; _i++) {
                var handler = callback_1[_i];
                var state = (handler.target.effectType === 'Format') ? this.formatData : null;
                handlers.push({
                    effect: handler.target, callback: handler.callback,
                    state: state,
                    end: null,
                    effectHolder: this, priority: handler.priority, order: handler.order, subOrder: handler.subOrder,
                });
            }
        }
        return handlers;
    };
    Battle.prototype.findFieldEventHandlers = function (field, callbackName, getKey, customHolder) {
        var handlers = [];
        var callback;
        for (var id in field.pseudoWeather) {
            var pseudoWeatherState = field.pseudoWeather[id];
            var pseudoWeather = this.dex.conditions.getByID(id);
            // @ts-ignore - dynamic lookup
            callback = pseudoWeather[callbackName];
            if (callback !== undefined || (getKey && pseudoWeatherState[getKey])) {
                handlers.push(this.resolvePriority({
                    effect: pseudoWeather,
                    callback: callback,
                    state: pseudoWeatherState,
                    end: customHolder ? null : field.removePseudoWeather, effectHolder: customHolder || field,
                }, callbackName));
            }
        }
        var weather = field.getWeather();
        // @ts-ignore - dynamic lookup
        callback = weather[callbackName];
        if (callback !== undefined || (getKey && this.field.weatherState[getKey])) {
            handlers.push(this.resolvePriority({
                effect: weather,
                callback: callback,
                state: this.field.weatherState,
                end: customHolder ? null : field.clearWeather, effectHolder: customHolder || field,
            }, callbackName));
        }
        var terrain = field.getTerrain();
        // @ts-ignore - dynamic lookup
        callback = terrain[callbackName];
        if (callback !== undefined || (getKey && field.terrainState[getKey])) {
            handlers.push(this.resolvePriority({
                effect: terrain,
                callback: callback,
                state: field.terrainState,
                end: customHolder ? null : field.clearTerrain, effectHolder: customHolder || field,
            }, callbackName));
        }
        return handlers;
    };
    Battle.prototype.findSideEventHandlers = function (side, callbackName, getKey, customHolder) {
        var handlers = [];
        for (var id in side.sideConditions) {
            var sideConditionData = side.sideConditions[id];
            var sideCondition = this.dex.conditions.getByID(id);
            // @ts-ignore - dynamic lookup
            var callback = sideCondition[callbackName];
            if (callback !== undefined || (getKey && sideConditionData[getKey])) {
                handlers.push(this.resolvePriority({
                    effect: sideCondition,
                    callback: callback,
                    state: sideConditionData,
                    end: customHolder ? null : side.removeSideCondition, effectHolder: customHolder || side,
                }, callbackName));
            }
        }
        return handlers;
    };
    /**
     * Use this function to attach custom event handlers to a battle. See Battle#runEvent for
     * more information on how to write callbacks for event handlers.
     *
     * Try to use this sparingly. Most event handlers can be simply placed in a format instead.
     *
     *     this.onEvent(eventid, target, callback)
     * will set the callback as an event handler for the target when eventid is called with the
     * default priority. Currently only valid formats are supported as targets but this will
     * eventually be expanded to support other target types.
     *
     *     this.onEvent(eventid, target, priority, callback)
     * will set the callback as an event handler for the target when eventid is called with the
     * provided priority. Priority can either be a number or an object that contains the priority,
     * order, and subOrder for the event handler as needed (undefined keys will use default values)
     */
    Battle.prototype.onEvent = function (eventid, target) {
        var rest = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            rest[_i - 2] = arguments[_i];
        }
        if (!eventid)
            throw new TypeError("Event handlers must have an event to listen to");
        if (!target)
            throw new TypeError("Event handlers must have a target");
        if (!rest.length)
            throw new TypeError("Event handlers must have a callback");
        if (target.effectType !== 'Format') {
            throw new TypeError("".concat(target.name, " is a ").concat(target.effectType, " but only Format targets are supported right now"));
        }
        var callback, priority, order, subOrder, data;
        if (rest.length === 1) {
            callback = rest[0];
            priority = 0;
            order = false;
            subOrder = 0;
        }
        else {
            data = rest[0], callback = rest[1];
            if (typeof data === 'object') {
                priority = data['priority'] || 0;
                order = data['order'] || false;
                subOrder = data['subOrder'] || 0;
            }
            else {
                priority = data || 0;
                order = false;
                subOrder = 0;
            }
        }
        var eventHandler = { callback: callback, target: target, priority: priority, order: order, subOrder: subOrder };
        if (!this.events)
            this.events = {};
        var callbackName = "on".concat(eventid);
        var eventHandlers = this.events[callbackName];
        if (eventHandlers === undefined) {
            this.events[callbackName] = [eventHandler];
        }
        else {
            eventHandlers.push(eventHandler);
        }
    };
    Battle.prototype.checkMoveMakesContact = function (move, attacker, defender, announcePads) {
        if (announcePads === void 0) { announcePads = false; }
        if (move.flags['contact'] && attacker.hasItem('protectivepads')) {
            if (announcePads) {
                this.add('-activate', defender, this.effect.fullname);
                this.add('-activate', attacker, 'item: Protective Pads');
            }
            return false;
        }
        return move.flags['contact'];
    };
    Battle.prototype.getPokemon = function (fullname) {
        if (typeof fullname !== 'string')
            fullname = fullname.fullname;
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            for (var _b = 0, _c = side.pokemon; _b < _c.length; _b++) {
                var pokemon = _c[_b];
                if (pokemon.fullname === fullname)
                    return pokemon;
            }
        }
        return null;
    };
    Battle.prototype.getAllPokemon = function () {
        var pokemonList = [];
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            pokemonList.push.apply(pokemonList, side.pokemon);
        }
        return pokemonList;
    };
    Battle.prototype.getAllActive = function () {
        var pokemonList = [];
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            for (var _b = 0, _c = side.active; _b < _c.length; _b++) {
                var pokemon = _c[_b];
                if (pokemon && !pokemon.fainted) {
                    pokemonList.push(pokemon);
                }
            }
        }
        return pokemonList;
    };
    Battle.prototype.makeRequest = function (type) {
        if (type) {
            this.requestState = type;
            for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
                var side = _a[_i];
                side.clearChoice();
            }
        }
        else {
            type = this.requestState;
        }
        for (var _b = 0, _c = this.sides; _b < _c.length; _b++) {
            var side = _c[_b];
            side.activeRequest = null;
        }
        if (type === 'teampreview') {
            // `pickedTeamSize = 6` means the format wants the user to select
            // the entire team order, unlike `pickedTeamSize = undefined` which
            // will only ask the user to select their lead(s).
            var pickedTeamSize = this.ruleTable.pickedTeamSize;
            this.add('teampreview' + (pickedTeamSize ? '|' + pickedTeamSize : ''));
        }
        var requests = this.getRequests(type);
        for (var i = 0; i < this.sides.length; i++) {
            this.sides[i].emitRequest(requests[i]);
        }
        if (this.sides.every(function (side) { return side.isChoiceDone(); })) {
            throw new Error("Choices are done immediately after a request");
        }
    };
    Battle.prototype.clearRequest = function () {
        this.requestState = '';
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            side.activeRequest = null;
            side.clearChoice();
        }
    };
    Battle.prototype.getRequests = function (type) {
        // default to no request
        var requests = Array(this.sides.length).fill(null);
        switch (type) {
            case 'switch':
                for (var i = 0; i < this.sides.length; i++) {
                    var side = this.sides[i];
                    if (!side.pokemonLeft)
                        continue;
                    var switchTable = side.active.map(function (pokemon) { return !!(pokemon === null || pokemon === void 0 ? void 0 : pokemon.switchFlag); });
                    if (switchTable.some(Boolean)) {
                        requests[i] = { forceSwitch: switchTable, side: side.getRequestData() };
                    }
                }
                break;
            case 'teampreview':
                for (var i = 0; i < this.sides.length; i++) {
                    var side = this.sides[i];
                    var maxChosenTeamSize = this.ruleTable.pickedTeamSize || undefined;
                    requests[i] = { teamPreview: true, maxChosenTeamSize: maxChosenTeamSize, side: side.getRequestData() };
                }
                break;
            default:
                for (var i = 0; i < this.sides.length; i++) {
                    var side = this.sides[i];
                    if (!side.pokemonLeft)
                        continue;
                    var activeData = side.active.map(function (pokemon) { return pokemon === null || pokemon === void 0 ? void 0 : pokemon.getMoveRequestData(); });
                    requests[i] = { active: activeData, side: side.getRequestData() };
                    if (side.allySide) {
                        requests[i].ally = side.allySide.getRequestData(true);
                    }
                }
                break;
        }
        var multipleRequestsExist = requests.filter(Boolean).length >= 2;
        for (var i = 0; i < this.sides.length; i++) {
            if (requests[i]) {
                if (!this.supportCancel || !multipleRequestsExist)
                    requests[i].noCancel = true;
            }
            else {
                requests[i] = { wait: true, side: this.sides[i].getRequestData() };
            }
        }
        return requests;
    };
    Battle.prototype.tiebreak = function () {
        if (this.ended)
            return false;
        this.inputLog.push(">tiebreak");
        this.add('message', "Time's up! Going to tiebreaker...");
        var notFainted = this.sides.map(function (side) { return (side.pokemon.filter(function (pokemon) { return !pokemon.fainted; }).length); });
        this.add('-message', this.sides.map(function (side, i) { return ("".concat(side.name, ": ").concat(notFainted[i], " Pokemon left")); }).join('; '));
        var maxNotFainted = Math.max.apply(Math, notFainted);
        var tiedSides = this.sides.filter(function (side, i) { return notFainted[i] === maxNotFainted; });
        if (tiedSides.length <= 1) {
            return this.win(tiedSides[0]);
        }
        var hpPercentage = tiedSides.map(function (side) { return (side.pokemon.map(function (pokemon) { return pokemon.hp / pokemon.maxhp; }).reduce(function (a, b) { return a + b; }) * 100 / 6); });
        this.add('-message', tiedSides.map(function (side, i) { return ("".concat(side.name, ": ").concat(Math.round(hpPercentage[i]), "% total HP left")); }).join('; '));
        var maxPercentage = Math.max.apply(Math, hpPercentage);
        tiedSides = tiedSides.filter(function (side, i) { return hpPercentage[i] === maxPercentage; });
        if (tiedSides.length <= 1) {
            return this.win(tiedSides[0]);
        }
        var hpTotal = tiedSides.map(function (side) { return (side.pokemon.map(function (pokemon) { return pokemon.hp; }).reduce(function (a, b) { return a + b; })); });
        this.add('-message', tiedSides.map(function (side, i) { return ("".concat(side.name, ": ").concat(Math.round(hpTotal[i]), " total HP left")); }).join('; '));
        var maxTotal = Math.max.apply(Math, hpTotal);
        tiedSides = tiedSides.filter(function (side, i) { return hpTotal[i] === maxTotal; });
        if (tiedSides.length <= 1) {
            return this.win(tiedSides[0]);
        }
        return this.tie();
    };
    Battle.prototype.forceWin = function (side) {
        if (side === void 0) { side = null; }
        if (this.ended)
            return false;
        this.inputLog.push(side ? ">forcewin ".concat(side) : ">forcetie");
        return this.win(side);
    };
    Battle.prototype.tie = function () {
        return this.win();
    };
    Battle.prototype.win = function (side) {
        if (this.ended)
            return false;
        if (side && typeof side === 'string') {
            side = this.getSide(side);
        }
        else if (!side || !this.sides.includes(side)) {
            side = null;
        }
        this.winner = side ? side.name : '';
        this.add('');
        if (side === null || side === void 0 ? void 0 : side.allySide) {
            this.add('win', side.name + ' & ' + side.allySide.name);
        }
        else if (side) {
            this.add('win', side.name);
        }
        else {
            this.add('tie');
        }
        this.ended = true;
        this.requestState = '';
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var s = _a[_i];
            if (s)
                s.activeRequest = null;
        }
        return true;
    };
    Battle.prototype.lose = function (side) {
        var _a;
        if (typeof side === 'string') {
            side = this.getSide(side);
        }
        if (!side)
            return; // can happen if a battle crashes
        if (this.gameType !== 'freeforall') {
            return this.win(side.foe);
        }
        if (!side.pokemonLeft)
            return;
        side.pokemonLeft = 0;
        (_a = side.active[0]) === null || _a === void 0 ? void 0 : _a.faint();
        this.faintMessages(false, true);
        if (!this.ended && side.requestState) {
            side.emitRequest({ wait: true, side: side.getRequestData() });
            side.clearChoice();
            if (this.allChoicesDone())
                this.commitDecisions();
        }
        return true;
    };
    Battle.prototype.canSwitch = function (side) {
        return this.possibleSwitches(side).length;
    };
    Battle.prototype.getRandomSwitchable = function (side) {
        var canSwitchIn = this.possibleSwitches(side);
        return canSwitchIn.length ? this.sample(canSwitchIn) : null;
    };
    Battle.prototype.possibleSwitches = function (side) {
        if (!side.pokemonLeft)
            return [];
        var canSwitchIn = [];
        for (var i = side.active.length; i < side.pokemon.length; i++) {
            var pokemon = side.pokemon[i];
            if (!pokemon.fainted) {
                canSwitchIn.push(pokemon);
            }
        }
        return canSwitchIn;
    };
    Battle.prototype.swapPosition = function (pokemon, newPosition, attributes) {
        if (newPosition >= pokemon.side.active.length) {
            throw new Error("Invalid swap position");
        }
        var target = pokemon.side.active[newPosition];
        if (newPosition !== 1 && (!target || target.fainted))
            return false;
        this.add('swap', pokemon, newPosition, attributes || '');
        var side = pokemon.side;
        side.pokemon[pokemon.position] = target;
        side.pokemon[newPosition] = pokemon;
        side.active[pokemon.position] = side.pokemon[pokemon.position];
        side.active[newPosition] = side.pokemon[newPosition];
        if (target)
            target.position = pokemon.position;
        pokemon.position = newPosition;
        this.runEvent('Swap', target, pokemon);
        this.runEvent('Swap', pokemon, target);
        return true;
    };
    Battle.prototype.getAtSlot = function (slot) {
        if (!slot)
            return null;
        var side = this.sides[slot.charCodeAt(1) - 49]; // 49 is '1'
        var position = slot.charCodeAt(2) - 97; // 97 is 'a'
        var positionOffset = Math.floor(side.n / 2) * side.active.length;
        return side.active[position - positionOffset];
    };
    Battle.prototype.faint = function (pokemon, source, effect) {
        pokemon.faint(source, effect);
    };
    Battle.prototype.nextTurn = function () {
        var _a, _b;
        this.turn++;
        this.lastSuccessfulMoveThisTurn = null;
        var dynamaxEnding = [];
        for (var _i = 0, _c = this.getAllActive(); _i < _c.length; _i++) {
            var pokemon = _c[_i];
            if (((_a = pokemon.volatiles['dynamax']) === null || _a === void 0 ? void 0 : _a.turns) === 3) {
                dynamaxEnding.push(pokemon);
            }
        }
        if (dynamaxEnding.length > 1) {
            this.updateSpeed();
            this.speedSort(dynamaxEnding);
        }
        for (var _d = 0, dynamaxEnding_1 = dynamaxEnding; _d < dynamaxEnding_1.length; _d++) {
            var pokemon = dynamaxEnding_1[_d];
            pokemon.removeVolatile('dynamax');
        }
        // Gen 1 partial trapping ends when either Pokemon or a switch in faints to residual damage
        if (this.gen === 1) {
            for (var _e = 0, _f = this.getAllActive(); _e < _f.length; _e++) {
                var pokemon = _f[_e];
                if (pokemon.volatiles['partialtrappinglock']) {
                    var target = pokemon.volatiles['partialtrappinglock'].locked;
                    if (target.hp <= 0 || !target.volatiles['partiallytrapped']) {
                        delete pokemon.volatiles['partialtrappinglock'];
                    }
                }
                if (pokemon.volatiles['partiallytrapped']) {
                    var source = pokemon.volatiles['partiallytrapped'].source;
                    if (source.hp <= 0 || !source.volatiles['partialtrappinglock']) {
                        delete pokemon.volatiles['partiallytrapped'];
                    }
                }
            }
        }
        var trappedBySide = [];
        var stalenessBySide = [];
        for (var _g = 0, _h = this.sides; _g < _h.length; _g++) {
            var side = _h[_g];
            var sideTrapped = true;
            var sideStaleness = void 0;
            for (var _j = 0, _k = side.active; _j < _k.length; _j++) {
                var pokemon = _k[_j];
                if (!pokemon)
                    continue;
                pokemon.moveThisTurn = '';
                pokemon.newlySwitched = false;
                pokemon.moveLastTurnResult = pokemon.moveThisTurnResult;
                pokemon.moveThisTurnResult = undefined;
                if (this.turn !== 1) {
                    pokemon.usedItemThisTurn = false;
                    pokemon.statsRaisedThisTurn = false;
                    pokemon.statsLoweredThisTurn = false;
                    // It shouldn't be possible in a normal battle for a Pokemon to be damaged before turn 1's move selection
                    // However, this could be potentially relevant in certain OMs
                    pokemon.hurtThisTurn = null;
                }
                pokemon.maybeDisabled = false;
                for (var _l = 0, _m = pokemon.moveSlots; _l < _m.length; _l++) {
                    var moveSlot = _m[_l];
                    moveSlot.disabled = false;
                    moveSlot.disabledSource = '';
                }
                this.runEvent('DisableMove', pokemon);
                for (var _o = 0, _p = pokemon.moveSlots; _o < _p.length; _o++) {
                    var moveSlot = _p[_o];
                    var activeMove = this.dex.getActiveMove(moveSlot.id);
                    this.singleEvent('DisableMove', activeMove, null, pokemon);
                    if (activeMove.flags['cantusetwice'] && ((_b = pokemon.lastMove) === null || _b === void 0 ? void 0 : _b.id) === moveSlot.id) {
                        pokemon.disableMove(pokemon.lastMove.id);
                    }
                }
                // If it was an illusion, it's not any more
                if (pokemon.getLastAttackedBy() && this.gen >= 7)
                    pokemon.knownType = true;
                for (var i = pokemon.attackedBy.length - 1; i >= 0; i--) {
                    var attack = pokemon.attackedBy[i];
                    if (attack.source.isActive) {
                        attack.thisTurn = false;
                    }
                    else {
                        pokemon.attackedBy.splice(pokemon.attackedBy.indexOf(attack), 1);
                    }
                }
                if (this.gen >= 7 && !pokemon.terastallized) {
                    // In Gen 7, the real type of every Pokemon is visible to all players via the bottom screen while making choices
                    var seenPokemon = pokemon.illusion || pokemon;
                    var realTypeString = seenPokemon.getTypes(true).join('/');
                    if (realTypeString !== seenPokemon.apparentType) {
                        this.add('-start', pokemon, 'typechange', realTypeString, '[silent]');
                        seenPokemon.apparentType = realTypeString;
                        if (pokemon.addedType) {
                            // The typechange message removes the added type, so put it back
                            this.add('-start', pokemon, 'typeadd', pokemon.addedType, '[silent]');
                        }
                    }
                }
                pokemon.trapped = pokemon.maybeTrapped = false;
                this.runEvent('TrapPokemon', pokemon);
                if (!pokemon.knownType || this.dex.getImmunity('trapped', pokemon)) {
                    this.runEvent('MaybeTrapPokemon', pokemon);
                }
                // canceling switches would leak information
                // if a foe might have a trapping ability
                if (this.gen > 2) {
                    for (var _q = 0, _r = pokemon.foes(); _q < _r.length; _q++) {
                        var source = _r[_q];
                        var species = (source.illusion || source).species;
                        if (!species.abilities)
                            continue;
                        for (var abilitySlot in species.abilities) {
                            var abilityName = species.abilities[abilitySlot];
                            if (abilityName === source.ability) {
                                // pokemon event was already run above so we don't need
                                // to run it again.
                                continue;
                            }
                            var ruleTable = this.ruleTable;
                            if ((ruleTable.has('+hackmons') || !ruleTable.has('obtainableabilities')) && !this.format.team) {
                                // hackmons format
                                continue;
                            }
                            else if (abilitySlot === 'H' && species.unreleasedHidden) {
                                // unreleased hidden ability
                                continue;
                            }
                            var ability = this.dex.abilities.get(abilityName);
                            if (ruleTable.has('-ability:' + ability.id))
                                continue;
                            if (pokemon.knownType && !this.dex.getImmunity('trapped', pokemon))
                                continue;
                            this.singleEvent('FoeMaybeTrapPokemon', ability, {}, pokemon, source);
                        }
                    }
                }
                if (pokemon.fainted)
                    continue;
                sideTrapped = sideTrapped && pokemon.trapped;
                var staleness = pokemon.volatileStaleness || pokemon.staleness;
                if (staleness)
                    sideStaleness = sideStaleness === 'external' ? sideStaleness : staleness;
                pokemon.activeTurns++;
            }
            trappedBySide.push(sideTrapped);
            stalenessBySide.push(sideStaleness);
            side.faintedLastTurn = side.faintedThisTurn;
            side.faintedThisTurn = null;
        }
        if (this.maybeTriggerEndlessBattleClause(trappedBySide, stalenessBySide))
            return;
        if (this.gameType === 'triples' && this.sides.every(function (side) { return side.pokemonLeft === 1; })) {
            // If both sides have one Pokemon left in triples and they are not adjacent, they are both moved to the center.
            var actives = this.getAllActive();
            if (actives.length > 1 && !actives[0].isAdjacent(actives[1])) {
                this.swapPosition(actives[0], 1, '[silent]');
                this.swapPosition(actives[1], 1, '[silent]');
                this.add('-center');
            }
        }
        this.add('turn', this.turn);
        if (this.gameType === 'multi') {
            for (var _s = 0, _t = this.sides; _s < _t.length; _s++) {
                var side = _t[_s];
                if (side.canDynamaxNow()) {
                    if (this.turn === 1) {
                        this.addSplit(side.id, ['-candynamax', side.id]);
                    }
                    else {
                        this.add('-candynamax', side.id);
                    }
                }
            }
        }
        if (this.gen === 2)
            this.quickClawRoll = this.randomChance(60, 256);
        if (this.gen === 3)
            this.quickClawRoll = this.randomChance(1, 5);
        // Crazyhouse Progress checker because sidebars has trouble keeping track of Pokemon.
        // Please remove me once there is client support.
        if (this.ruleTable.has('crazyhouserule')) {
            for (var _u = 0, _v = this.sides; _u < _v.length; _u++) {
                var side = _v[_u];
                var buf = "raw|".concat(side.name, "'s team:<br />");
                for (var _w = 0, _x = side.pokemon; _w < _x.length; _w++) {
                    var pokemon = _x[_w];
                    if (!buf.endsWith('<br />'))
                        buf += '/</span>&#8203;';
                    if (pokemon.fainted) {
                        buf += "<span style=\"white-space:nowrap;\"><span style=\"opacity:.3\"><psicon pokemon=\"".concat(pokemon.species.id, "\" /></span>");
                    }
                    else {
                        buf += "<span style=\"white-space:nowrap\"><psicon pokemon=\"".concat(pokemon.species.id, "\" />");
                    }
                }
                this.add("".concat(buf, "</span>"));
            }
        }
        this.makeRequest('move');
    };
    Battle.prototype.maybeTriggerEndlessBattleClause = function (trappedBySide, stalenessBySide) {
        var _this = this;
        // Gen 1 Endless Battle Clause triggers
        // These are checked before the 100 turn minimum as the battle cannot progress if they are true
        if (this.gen <= 1) {
            var noProgressPossible = this.sides.every(function (side) {
                var foeAllGhosts = side.foe.pokemon.every(function (pokemon) { return pokemon.fainted || pokemon.hasType('Ghost'); });
                var foeAllTransform = side.foe.pokemon.every(function (pokemon) { return (pokemon.fainted ||
                    // true if transforming into this pokemon would lead to an endless battle
                    // Transform will fail (depleting PP) if used against Ditto in Stadium 1
                    (_this.dex.currentMod !== 'gen1stadium' || pokemon.species.id !== 'ditto') &&
                        // there are some subtleties such as a Mew with only Transform and auto-fail moves,
                        // but it's unlikely to come up in a real game so there's no need to handle it
                        pokemon.moves.every(function (moveid) { return moveid === 'transform'; })); });
                return side.pokemon.every(function (pokemon) { return (pokemon.fainted ||
                    // frozen pokemon can't thaw in gen 1 without outside help
                    pokemon.status === 'frz' ||
                    // a pokemon can't lose PP if it Transforms into a pokemon with only Transform
                    (pokemon.moves.every(function (moveid) { return moveid === 'transform'; }) && foeAllTransform) ||
                    // Struggle can't damage yourself if every foe is a Ghost
                    (pokemon.moveSlots.every(function (slot) { return slot.pp === 0; }) && foeAllGhosts)); });
            });
            if (noProgressPossible) {
                this.add('-message', "This battle cannot progress. Endless Battle Clause activated!");
                return this.tie();
            }
        }
        if (this.turn <= 100)
            return;
        // the turn limit is not a part of Endless Battle Clause
        if (this.turn >= 1000) {
            this.add('message', "It is turn 1000. You have hit the turn limit!");
            this.tie();
            return true;
        }
        if ((this.turn >= 500 && this.turn % 100 === 0) || // every 100 turns past turn 500,
            (this.turn >= 900 && this.turn % 10 === 0) || // every 10 turns past turn 900,
            this.turn >= 990 // every turn past turn 990
        ) {
            var turnsLeft = 1000 - this.turn;
            var turnsLeftText = (turnsLeft === 1 ? "1 turn" : "".concat(turnsLeft, " turns"));
            this.add('bigerror', "You will auto-tie if the battle doesn't end in ".concat(turnsLeftText, " (on turn 1000)."));
        }
        if (!this.ruleTable.has('endlessbattleclause'))
            return;
        // for now, FFA doesn't support Endless Battle Clause
        if (this.format.gameType === 'freeforall')
            return;
        // Are all Pokemon on every side stale, with at least one side containing an externally stale Pokemon?
        if (!stalenessBySide.every(function (s) { return !!s; }) || !stalenessBySide.some(function (s) { return s === 'external'; }))
            return;
        // Can both sides switch to a non-stale Pokemon?
        var canSwitch = [];
        for (var _i = 0, _a = trappedBySide.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], trapped = _b[1];
            canSwitch[i] = false;
            if (trapped)
                break;
            var side = this.sides[i];
            for (var _c = 0, _d = side.pokemon; _c < _d.length; _c++) {
                var pokemon = _d[_c];
                if (!pokemon.fainted && !(pokemon.volatileStaleness || pokemon.staleness)) {
                    canSwitch[i] = true;
                    break;
                }
            }
        }
        if (canSwitch.every(function (s) { return s; }))
            return;
        // Endless Battle Clause activates - we determine the winner by looking at each side's sets.
        var losers = [];
        for (var _e = 0, _f = this.sides; _e < _f.length; _e++) {
            var side = _f[_e];
            var berry = false; // Restorative Berry
            var cycle = false; // Harvest or Recycle
            for (var _g = 0, _h = side.pokemon; _g < _h.length; _g++) {
                var pokemon = _h[_g];
                berry = pokemon_1.RESTORATIVE_BERRIES.has((0, dex_1.toID)(pokemon.set.item));
                if (['harvest', 'pickup'].includes((0, dex_1.toID)(pokemon.set.ability)) ||
                    pokemon.set.moves.map(dex_1.toID).includes('recycle')) {
                    cycle = true;
                }
                if (berry && cycle)
                    break;
            }
            if (berry && cycle)
                losers.push(side);
        }
        if (losers.length === 1) {
            var loser = losers[0];
            this.add('-message', "".concat(loser.name, "'s team started with the rudimentary means to perform restorative berry-cycling and thus loses."));
            return this.win(loser.foe);
        }
        if (losers.length === this.sides.length) {
            this.add('-message', "Each side's team started with the rudimentary means to perform restorative berry-cycling.");
        }
        return this.tie();
    };
    Battle.prototype.start = function () {
        // Deserialized games should use restart()
        if (this.deserialized)
            return;
        // need all players to start
        if (!this.sides.every(function (side) { return !!side; }))
            throw new Error("Missing sides: ".concat(this.sides));
        if (this.started)
            throw new Error("Battle already started");
        var format = this.format;
        this.started = true;
        if (this.gameType === 'multi') {
            this.sides[1].foe = this.sides[2];
            this.sides[0].foe = this.sides[3];
            this.sides[2].foe = this.sides[1];
            this.sides[3].foe = this.sides[0];
            this.sides[1].allySide = this.sides[3];
            this.sides[0].allySide = this.sides[2];
            this.sides[2].allySide = this.sides[0];
            this.sides[3].allySide = this.sides[1];
            // sync side conditions
            this.sides[2].sideConditions = this.sides[0].sideConditions;
            this.sides[3].sideConditions = this.sides[1].sideConditions;
        }
        else {
            this.sides[1].foe = this.sides[0];
            this.sides[0].foe = this.sides[1];
            if (this.sides.length > 2) { // ffa
                this.sides[2].foe = this.sides[3];
                this.sides[3].foe = this.sides[2];
            }
        }
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            this.add('teamsize', side.id, side.pokemon.length);
        }
        this.add('gen', this.gen);
        this.add('tier', format.name);
        if (this.rated) {
            if (this.rated === 'Rated battle')
                this.rated = true;
            this.add('rated', typeof this.rated === 'string' ? this.rated : '');
        }
        if (format.onBegin)
            format.onBegin.call(this);
        for (var _b = 0, _c = this.ruleTable.keys(); _b < _c.length; _b++) {
            var rule = _c[_b];
            if ('+*-!'.includes(rule.charAt(0)))
                continue;
            var subFormat = this.dex.formats.get(rule);
            if (subFormat.onBegin)
                subFormat.onBegin.call(this);
        }
        if (this.sides.some(function (side) { return !side.pokemon[0]; })) {
            throw new Error('Battle not started: A player has an empty team.');
        }
        if (this.debugMode) {
            this.checkEVBalance();
        }
        if (format.onTeamPreview)
            format.onTeamPreview.call(this);
        for (var _d = 0, _e = this.ruleTable.keys(); _d < _e.length; _d++) {
            var rule = _e[_d];
            if ('+*-!'.includes(rule.charAt(0)))
                continue;
            var subFormat = this.dex.formats.get(rule);
            if (subFormat.onTeamPreview)
                subFormat.onTeamPreview.call(this);
        }
        this.queue.addChoice({ choice: 'start' });
        this.midTurn = true;
        if (!this.requestState)
            this.go();
    };
    Battle.prototype.restart = function (send) {
        if (!this.deserialized)
            throw new Error('Attempt to restart a battle which has not been deserialized');
        this.send = send;
    };
    Battle.prototype.checkEVBalance = function () {
        var limitedEVs = null;
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            var sideLimitedEVs = !side.pokemon.some(function (pokemon) { return Object.values(pokemon.set.evs).reduce(function (a, b) { return a + b; }, 0) > 510; });
            if (limitedEVs === null) {
                limitedEVs = sideLimitedEVs;
            }
            else if (limitedEVs !== sideLimitedEVs) {
                this.add('bigerror', "Warning: One player isn't adhering to a 510 EV limit, and the other player is.");
            }
        }
    };
    Battle.prototype.boost = function (boost, target, source, effect, isSecondary, isSelf) {
        var _a;
        if (target === void 0) { target = null; }
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (isSecondary === void 0) { isSecondary = false; }
        if (isSelf === void 0) { isSelf = false; }
        if (this.event) {
            if (!target)
                target = this.event.target;
            if (!source)
                source = this.event.source;
            if (!effect)
                effect = this.effect;
        }
        if (!(target === null || target === void 0 ? void 0 : target.hp))
            return 0;
        if (!target.isActive)
            return false;
        if (this.gen > 5 && !target.side.foePokemonLeft())
            return false;
        boost = this.runEvent('ChangeBoost', target, source, effect, __assign({}, boost));
        boost = target.getCappedBoost(boost);
        boost = this.runEvent('TryBoost', target, source, effect, __assign({}, boost));
        var success = null;
        var boosted = isSecondary;
        var boostName;
        for (boostName in boost) {
            var currentBoost = (_a = {},
                _a[boostName] = boost[boostName],
                _a);
            var boostBy = target.boostBy(currentBoost);
            var msg = '-boost';
            if (boost[boostName] < 0 || target.boosts[boostName] === -6) {
                msg = '-unboost';
                boostBy = -boostBy;
            }
            if (boostBy) {
                success = true;
                switch (effect === null || effect === void 0 ? void 0 : effect.id) {
                    case 'bellydrum':
                    case 'angerpoint':
                        this.add('-setboost', target, 'atk', target.boosts['atk'], '[from] ' + effect.fullname);
                        break;
                    case 'bellydrum2':
                        this.add(msg, target, boostName, boostBy, '[silent]');
                        this.hint("In Gen 2, Belly Drum boosts by 2 when it fails.");
                        break;
                    case 'zpower':
                        this.add(msg, target, boostName, boostBy, '[zeffect]');
                        break;
                    default:
                        if (!effect)
                            break;
                        if (effect.effectType === 'Move') {
                            this.add(msg, target, boostName, boostBy);
                        }
                        else if (effect.effectType === 'Item') {
                            this.add(msg, target, boostName, boostBy, '[from] item: ' + effect.name);
                        }
                        else {
                            if (effect.effectType === 'Ability' && !boosted) {
                                this.add('-ability', target, effect.name, 'boost');
                                boosted = true;
                            }
                            this.add(msg, target, boostName, boostBy);
                        }
                        break;
                }
                this.runEvent('AfterEachBoost', target, source, effect, currentBoost);
            }
            else if ((effect === null || effect === void 0 ? void 0 : effect.effectType) === 'Ability') {
                if (isSecondary || isSelf)
                    this.add(msg, target, boostName, boostBy);
            }
            else if (!isSecondary && !isSelf) {
                this.add(msg, target, boostName, boostBy);
            }
        }
        this.runEvent('AfterBoost', target, source, effect, boost);
        if (success) {
            if (Object.values(boost).some(function (x) { return x > 0; }))
                target.statsRaisedThisTurn = true;
            if (Object.values(boost).some(function (x) { return x < 0; }))
                target.statsLoweredThisTurn = true;
        }
        return success;
    };
    Battle.prototype.spreadDamage = function (damage, targetArray, source, effect, instafaint) {
        if (targetArray === void 0) { targetArray = null; }
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (instafaint === void 0) { instafaint = false; }
        if (!targetArray)
            return [0];
        var retVals = [];
        if (typeof effect === 'string' || !effect)
            effect = this.dex.conditions.getByID((effect || ''));
        for (var _i = 0, _a = damage.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], curDamage = _b[1];
            var target = targetArray[i];
            var targetDamage = curDamage;
            if (!(targetDamage || targetDamage === 0)) {
                retVals[i] = targetDamage;
                continue;
            }
            if (!target || !target.hp) {
                retVals[i] = 0;
                continue;
            }
            if (!target.isActive) {
                retVals[i] = false;
                continue;
            }
            if (targetDamage !== 0)
                targetDamage = this.clampIntRange(targetDamage, 1);
            if (effect.id !== 'struggle-recoil') { // Struggle recoil is not affected by effects
                if (effect.effectType === 'Weather' && !target.runStatusImmunity(effect.id)) {
                    this.debug('weather immunity');
                    retVals[i] = 0;
                    continue;
                }
                targetDamage = this.runEvent('Damage', target, source, effect, targetDamage, true);
                if (!(targetDamage || targetDamage === 0)) {
                    this.debug('damage event failed');
                    retVals[i] = curDamage === true ? undefined : targetDamage;
                    continue;
                }
            }
            if (targetDamage !== 0)
                targetDamage = this.clampIntRange(targetDamage, 1);
            if (this.gen <= 1) {
                if (this.dex.currentMod === 'gen1stadium' ||
                    !['recoil', 'drain', 'leechseed'].includes(effect.id) && effect.effectType !== 'Status') {
                    this.lastDamage = targetDamage;
                }
            }
            retVals[i] = targetDamage = target.damage(targetDamage, source, effect);
            if (targetDamage !== 0)
                target.hurtThisTurn = target.hp;
            if (source && effect.effectType === 'Move')
                source.lastDamage = targetDamage;
            var name_1 = effect.fullname === 'tox' ? 'psn' : effect.fullname;
            switch (effect.id) {
                case 'partiallytrapped':
                    this.add('-damage', target, target.getHealth, '[from] ' + this.effectState.sourceEffect.fullname, '[partiallytrapped]');
                    break;
                case 'powder':
                    this.add('-damage', target, target.getHealth, '[silent]');
                    break;
                case 'confused':
                    this.add('-damage', target, target.getHealth, '[from] confusion');
                    break;
                default:
                    if (effect.effectType === 'Move' || !name_1) {
                        this.add('-damage', target, target.getHealth);
                    }
                    else if (source && (source !== target || effect.effectType === 'Ability')) {
                        this.add('-damage', target, target.getHealth, '[from] ' + name_1, '[of] ' + source);
                    }
                    else {
                        this.add('-damage', target, target.getHealth, '[from] ' + name_1);
                    }
                    break;
            }
            if (targetDamage && effect.effectType === 'Move') {
                if (this.gen <= 1 && effect.recoil && source) {
                    if (this.dex.currentMod !== 'gen1stadium' || target.hp > 0) {
                        var amount = this.clampIntRange(Math.floor(targetDamage * effect.recoil[0] / effect.recoil[1]), 1);
                        this.damage(amount, source, target, 'recoil');
                    }
                }
                if (this.gen <= 4 && effect.drain && source) {
                    var amount = this.clampIntRange(Math.floor(targetDamage * effect.drain[0] / effect.drain[1]), 1);
                    // Draining can be countered in gen 1
                    if (this.gen <= 1)
                        this.lastDamage = amount;
                    this.heal(amount, source, target, 'drain');
                }
                if (this.gen > 4 && effect.drain && source) {
                    var amount = Math.round(targetDamage * effect.drain[0] / effect.drain[1]);
                    this.heal(amount, source, target, 'drain');
                }
            }
        }
        if (instafaint) {
            for (var _c = 0, _d = targetArray.entries(); _c < _d.length; _c++) {
                var _e = _d[_c], i = _e[0], target = _e[1];
                if (!retVals[i] || !target)
                    continue;
                if (target.hp <= 0) {
                    this.debug('instafaint: ' + this.faintQueue.map(function (entry) { return entry.target.name; }));
                    this.faintMessages(true);
                    if (this.gen <= 2) {
                        target.faint();
                        if (this.gen <= 1) {
                            this.queue.clear();
                            // Fainting clears accumulated Bide damage
                            for (var _f = 0, _g = this.getAllActive(); _f < _g.length; _f++) {
                                var pokemon = _g[_f];
                                if (pokemon.volatiles['bide'] && pokemon.volatiles['bide'].damage) {
                                    pokemon.volatiles['bide'].damage = 0;
                                    this.hint("Desync Clause Mod activated!");
                                    this.hint("In Gen 1, Bide's accumulated damage is reset to 0 when a Pokemon faints.");
                                }
                            }
                        }
                    }
                }
            }
        }
        return retVals;
    };
    Battle.prototype.damage = function (damage, target, source, effect, instafaint) {
        if (target === void 0) { target = null; }
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (instafaint === void 0) { instafaint = false; }
        if (this.event) {
            if (!target)
                target = this.event.target;
            if (!source)
                source = this.event.source;
            if (!effect)
                effect = this.effect;
        }
        return this.spreadDamage([damage], [target], source, effect, instafaint)[0];
    };
    Battle.prototype.directDamage = function (damage, target, source, effect) {
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (this.event) {
            if (!target)
                target = this.event.target;
            if (!source)
                source = this.event.source;
            if (!effect)
                effect = this.effect;
        }
        if (!(target === null || target === void 0 ? void 0 : target.hp))
            return 0;
        if (!damage)
            return 0;
        damage = this.clampIntRange(damage, 1);
        if (typeof effect === 'string' || !effect)
            effect = this.dex.conditions.getByID((effect || ''));
        // In Gen 1 BUT NOT STADIUM, Substitute also takes confusion and HJK recoil damage
        if (this.gen <= 1 && this.dex.currentMod !== 'gen1stadium' &&
            ['confusion', 'jumpkick', 'highjumpkick'].includes(effect.id)) {
            // Confusion and recoil damage can be countered
            this.lastDamage = damage;
            if (target.volatiles['substitute']) {
                var hint = "In Gen 1, if a Pokemon with a Substitute hurts itself due to confusion or Jump Kick/Hi Jump Kick recoil and the target";
                if (source === null || source === void 0 ? void 0 : source.volatiles['substitute']) {
                    source.volatiles['substitute'].hp -= damage;
                    if (source.volatiles['substitute'].hp <= 0) {
                        source.removeVolatile('substitute');
                        source.subFainted = true;
                    }
                    else {
                        this.add('-activate', source, 'Substitute', '[damage]');
                    }
                    this.hint(hint + " has a Substitute, the target's Substitute takes the damage.");
                    return damage;
                }
                else {
                    this.hint(hint + " does not have a Substitute there is no damage dealt.");
                    return 0;
                }
            }
        }
        damage = target.damage(damage, source, effect);
        switch (effect.id) {
            case 'strugglerecoil':
                this.add('-damage', target, target.getHealth, '[from] recoil');
                break;
            case 'confusion':
                this.add('-damage', target, target.getHealth, '[from] confusion');
                break;
            default:
                this.add('-damage', target, target.getHealth);
                break;
        }
        if (target.fainted)
            this.faint(target);
        return damage;
    };
    Battle.prototype.heal = function (damage, target, source, effect) {
        if (source === void 0) { source = null; }
        if (effect === void 0) { effect = null; }
        if (this.event) {
            if (!target)
                target = this.event.target;
            if (!source)
                source = this.event.source;
            if (!effect)
                effect = this.effect;
        }
        if (effect === 'drain')
            effect = this.dex.conditions.getByID(effect);
        if (damage && damage <= 1)
            damage = 1;
        damage = this.trunc(damage);
        // for things like Liquid Ooze, the Heal event still happens when nothing is healed.
        damage = this.runEvent('TryHeal', target, source, effect, damage);
        if (!damage)
            return damage;
        if (!(target === null || target === void 0 ? void 0 : target.hp))
            return false;
        if (!target.isActive)
            return false;
        if (target.hp >= target.maxhp)
            return false;
        var finalDamage = target.heal(damage, source, effect);
        switch (effect === null || effect === void 0 ? void 0 : effect.id) {
            case 'leechseed':
            case 'rest':
                this.add('-heal', target, target.getHealth, '[silent]');
                break;
            case 'drain':
                this.add('-heal', target, target.getHealth, '[from] drain', '[of] ' + source);
                break;
            case 'wish':
                break;
            case 'zpower':
                this.add('-heal', target, target.getHealth, '[zeffect]');
                break;
            default:
                if (!effect)
                    break;
                if (effect.effectType === 'Move') {
                    this.add('-heal', target, target.getHealth);
                }
                else if (source && source !== target) {
                    this.add('-heal', target, target.getHealth, '[from] ' + effect.fullname, '[of] ' + source);
                }
                else {
                    this.add('-heal', target, target.getHealth, '[from] ' + effect.fullname);
                }
                break;
        }
        this.runEvent('Heal', target, source, effect, finalDamage);
        return finalDamage;
    };
    Battle.prototype.chain = function (previousMod, nextMod) {
        // previousMod or nextMod can be either a number or an array [numerator, denominator]
        if (Array.isArray(previousMod)) {
            previousMod = this.trunc(previousMod[0] * 4096 / previousMod[1]);
        }
        else {
            previousMod = this.trunc(previousMod * 4096);
        }
        if (Array.isArray(nextMod)) {
            nextMod = this.trunc(nextMod[0] * 4096 / nextMod[1]);
        }
        else {
            nextMod = this.trunc(nextMod * 4096);
        }
        return ((previousMod * nextMod + 2048) >> 12) / 4096; // M'' = ((M * M') + 0x800) >> 12
    };
    Battle.prototype.chainModify = function (numerator, denominator) {
        var previousMod = this.trunc(this.event.modifier * 4096);
        if (Array.isArray(numerator)) {
            denominator = numerator[1];
            numerator = numerator[0];
        }
        var nextMod = this.trunc(numerator * 4096 / (denominator || 1));
        this.event.modifier = ((previousMod * nextMod + 2048) >> 12) / 4096;
    };
    Battle.prototype.modify = function (value, numerator, denominator) {
        // You can also use:
        // modify(value, [numerator, denominator])
        // modify(value, fraction) - assuming you trust JavaScript's floating-point handler
        if (!denominator)
            denominator = 1;
        if (Array.isArray(numerator)) {
            denominator = numerator[1];
            numerator = numerator[0];
        }
        var tr = this.trunc;
        var modifier = tr(numerator * 4096 / denominator);
        return tr((tr(value * modifier) + 2048 - 1) / 4096);
    };
    /** Given a table of base stats and a pokemon set, return the actual stats. */
    Battle.prototype.spreadModify = function (baseStats, set) {
        var modStats = { atk: 10, def: 10, spa: 10, spd: 10, spe: 10 };
        var tr = this.trunc;
        var statName;
        for (statName in modStats) {
            var stat = baseStats[statName];
            modStats[statName] = tr(tr(2 * stat + set.ivs[statName] + tr(set.evs[statName] / 4)) * set.level / 100 + 5);
        }
        if ('hp' in baseStats) {
            var stat = baseStats['hp'];
            modStats['hp'] = tr(tr(2 * stat + set.ivs['hp'] + tr(set.evs['hp'] / 4) + 100) * set.level / 100 + 10);
        }
        return this.natureModify(modStats, set);
    };
    Battle.prototype.natureModify = function (stats, set) {
        // Natures are calculated with 16-bit truncation.
        // This only affects Eternatus-Eternamax in Pure Hackmons.
        var tr = this.trunc;
        var nature = this.dex.natures.get(set.nature);
        var s;
        if (nature.plus) {
            s = nature.plus;
            var stat = this.ruleTable.has('overflowstatmod') ? Math.min(stats[s], 595) : stats[s];
            stats[s] = tr(tr(stat * 110, 16) / 100);
        }
        if (nature.minus) {
            s = nature.minus;
            var stat = this.ruleTable.has('overflowstatmod') ? Math.min(stats[s], 728) : stats[s];
            stats[s] = tr(tr(stat * 90, 16) / 100);
        }
        return stats;
    };
    Battle.prototype.finalModify = function (relayVar) {
        relayVar = this.modify(relayVar, this.event.modifier);
        this.event.modifier = 1;
        return relayVar;
    };
    Battle.prototype.getCategory = function (move) {
        return this.dex.moves.get(move).category || 'Physical';
    };
    Battle.prototype.randomizer = function (baseDamage) {
        var tr = this.trunc;
        return tr(tr(baseDamage * (100 - this.random(16))) / 100);
    };
    /**
     * Returns whether a proposed target for a move is valid.
     */
    Battle.prototype.validTargetLoc = function (targetLoc, source, targetType) {
        if (targetLoc === 0)
            return true;
        var numSlots = this.activePerHalf;
        var sourceLoc = source.getLocOf(source);
        if (Math.abs(targetLoc) > numSlots)
            return false;
        var isSelf = (sourceLoc === targetLoc);
        var isFoe = (this.gameType === 'freeforall' ? !isSelf : targetLoc > 0);
        var acrossFromTargetLoc = -(numSlots + 1 - targetLoc);
        var isAdjacent = (targetLoc > 0 ?
            Math.abs(acrossFromTargetLoc - sourceLoc) <= 1 :
            Math.abs(targetLoc - sourceLoc) === 1);
        if (this.gameType === 'freeforall' && targetType === 'adjacentAlly') {
            // moves targeting one ally can instead target foes in Battle Royal
            return isAdjacent;
        }
        switch (targetType) {
            case 'randomNormal':
            case 'scripted':
            case 'normal':
                return isAdjacent;
            case 'adjacentAlly':
                return isAdjacent && !isFoe;
            case 'adjacentAllyOrSelf':
                return isAdjacent && !isFoe || isSelf;
            case 'adjacentFoe':
                return isAdjacent && isFoe;
            case 'any':
                return !isSelf;
        }
        return false;
    };
    Battle.prototype.validTarget = function (target, source, targetType) {
        return this.validTargetLoc(source.getLocOf(target), source, targetType);
    };
    Battle.prototype.getTarget = function (pokemon, move, targetLoc, originalTarget) {
        move = this.dex.moves.get(move);
        var tracksTarget = move.tracksTarget;
        // Stalwart sets trackTarget in ModifyMove, but ModifyMove happens after getTarget, so
        // we need to manually check for Stalwart here
        if (pokemon.hasAbility(['stalwart', 'propellertail']))
            tracksTarget = true;
        if (tracksTarget && originalTarget && originalTarget.isActive) {
            // smart-tracking move's original target is on the field: target it
            return originalTarget;
        }
        // banning Dragon Darts from directly targeting itself is done in side.ts, but
        // Dragon Darts can target itself if Ally Switch is used afterwards
        if (move.smartTarget) {
            var curTarget = pokemon.getAtLoc(targetLoc);
            return curTarget && !curTarget.fainted ? curTarget : this.getRandomTarget(pokemon, move);
        }
        // Fails if the target is the user and the move can't target its own position
        var selfLoc = pokemon.getLocOf(pokemon);
        if (['adjacentAlly', 'any', 'normal'].includes(move.target) && targetLoc === selfLoc &&
            !pokemon.volatiles['twoturnmove'] && !pokemon.volatiles['iceball'] && !pokemon.volatiles['rollout']) {
            return move.flags['futuremove'] ? pokemon : null;
        }
        if (move.target !== 'randomNormal' && this.validTargetLoc(targetLoc, pokemon, move.target)) {
            var target = pokemon.getAtLoc(targetLoc);
            if (target === null || target === void 0 ? void 0 : target.fainted) {
                if (this.gameType === 'freeforall') {
                    // Target is a fainted opponent in a free-for-all battle; attack shouldn't retarget
                    return target;
                }
                if (target.isAlly(pokemon)) {
                    // Target is a fainted ally: attack shouldn't retarget
                    return target;
                }
            }
            if (target && !target.fainted) {
                // Target is unfainted: use selected target location
                return target;
            }
            // Chosen target not valid,
            // retarget randomly with getRandomTarget
        }
        return this.getRandomTarget(pokemon, move);
    };
    Battle.prototype.getRandomTarget = function (pokemon, move) {
        // A move was used without a chosen target
        // For instance: Metronome chooses Ice Beam. Since the user didn't
        // choose a target when choosing Metronome, Ice Beam's target must
        // be chosen randomly.
        // The target is chosen randomly from possible targets, EXCEPT that
        // moves that can target either allies or foes will only target foes
        // when used without an explicit target.
        move = this.dex.moves.get(move);
        if (['self', 'all', 'allySide', 'allyTeam', 'adjacentAllyOrSelf'].includes(move.target)) {
            return pokemon;
        }
        else if (move.target === 'adjacentAlly') {
            if (this.gameType === 'singles')
                return null;
            var adjacentAllies = pokemon.adjacentAllies();
            return adjacentAllies.length ? this.sample(adjacentAllies) : null;
        }
        if (this.gameType === 'singles')
            return pokemon.side.foe.active[0];
        if (this.activePerHalf > 2) {
            if (move.target === 'adjacentFoe' || move.target === 'normal' || move.target === 'randomNormal') {
                // even if a move can target an ally, auto-resolution will never make it target an ally
                // i.e. if both your opponents faint before you use Flamethrower, it will fail instead of targeting your ally
                var adjacentFoes = pokemon.adjacentFoes();
                if (adjacentFoes.length)
                    return this.sample(adjacentFoes);
                // no valid target at all, return slot directly across for any possible redirection
                return pokemon.side.foe.active[pokemon.side.foe.active.length - 1 - pokemon.position];
            }
        }
        return pokemon.side.randomFoe() || pokemon.side.foe.active[0];
    };
    Battle.prototype.checkFainted = function () {
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            for (var _b = 0, _c = side.active; _b < _c.length; _b++) {
                var pokemon = _c[_b];
                if (pokemon.fainted) {
                    pokemon.status = 'fnt';
                    pokemon.switchFlag = true;
                }
            }
        }
    };
    Battle.prototype.faintMessages = function (lastFirst, forceCheck, checkWin) {
        if (lastFirst === void 0) { lastFirst = false; }
        if (forceCheck === void 0) { forceCheck = false; }
        if (checkWin === void 0) { checkWin = true; }
        if (this.ended)
            return;
        var length = this.faintQueue.length;
        if (!length) {
            if (forceCheck && this.checkWin())
                return true;
            return false;
        }
        if (lastFirst) {
            this.faintQueue.unshift(this.faintQueue[this.faintQueue.length - 1]);
            this.faintQueue.pop();
        }
        var faintQueueLeft, faintData;
        while (this.faintQueue.length) {
            faintQueueLeft = this.faintQueue.length;
            faintData = this.faintQueue.shift();
            var pokemon = faintData.target;
            if (!pokemon.fainted &&
                this.runEvent('BeforeFaint', pokemon, faintData.source, faintData.effect)) {
                this.add('faint', pokemon);
                if (pokemon.side.pokemonLeft)
                    pokemon.side.pokemonLeft--;
                if (pokemon.side.totalFainted < 100)
                    pokemon.side.totalFainted++;
                this.runEvent('Faint', pokemon, faintData.source, faintData.effect);
                this.singleEvent('End', pokemon.getAbility(), pokemon.abilityState, pokemon);
                pokemon.clearVolatile(false);
                pokemon.fainted = true;
                pokemon.illusion = null;
                pokemon.isActive = false;
                pokemon.isStarted = false;
                delete pokemon.terastallized;
                pokemon.side.faintedThisTurn = pokemon;
                if (this.faintQueue.length >= faintQueueLeft)
                    checkWin = true;
            }
        }
        if (this.gen <= 1) {
            // in gen 1, fainting skips the rest of the turn
            // residuals don't exist in gen 1
            this.queue.clear();
            // Fainting clears accumulated Bide damage
            for (var _i = 0, _a = this.getAllActive(); _i < _a.length; _i++) {
                var pokemon = _a[_i];
                if (pokemon.volatiles['bide'] && pokemon.volatiles['bide'].damage) {
                    pokemon.volatiles['bide'].damage = 0;
                    this.hint("Desync Clause Mod activated!");
                    this.hint("In Gen 1, Bide's accumulated damage is reset to 0 when a Pokemon faints.");
                }
            }
        }
        else if (this.gen <= 3 && this.gameType === 'singles') {
            // in gen 3 or earlier, fainting in singles skips to residuals
            for (var _b = 0, _c = this.getAllActive(); _b < _c.length; _b++) {
                var pokemon = _c[_b];
                if (this.gen <= 2) {
                    // in gen 2, fainting skips moves only
                    this.queue.cancelMove(pokemon);
                }
                else {
                    // in gen 3, fainting skips all moves and switches
                    this.queue.cancelAction(pokemon);
                }
            }
        }
        if (checkWin && this.checkWin(faintData))
            return true;
        if (faintData && length) {
            this.runEvent('AfterFaint', faintData.target, faintData.source, faintData.effect, length);
        }
        return false;
    };
    Battle.prototype.checkWin = function (faintData) {
        var team1PokemonLeft = this.sides[0].pokemonLeft;
        var team2PokemonLeft = this.sides[1].pokemonLeft;
        var team3PokemonLeft = this.gameType === 'freeforall' && this.sides[2].pokemonLeft;
        var team4PokemonLeft = this.gameType === 'freeforall' && this.sides[3].pokemonLeft;
        if (this.gameType === 'multi') {
            team1PokemonLeft += this.sides[2].pokemonLeft;
            team2PokemonLeft += this.sides[3].pokemonLeft;
        }
        if (!team1PokemonLeft && !team2PokemonLeft && !team3PokemonLeft && !team4PokemonLeft) {
            this.win(faintData && this.gen > 4 ? faintData.target.side : null);
            return true;
        }
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            if (!side.foePokemonLeft()) {
                this.win(side);
                return true;
            }
        }
    };
    Battle.prototype.getActionSpeed = function (action) {
        if (action.choice === 'move') {
            var move = action.move;
            if (action.zmove) {
                var zMoveName = this.actions.getZMove(action.move, action.pokemon, true);
                if (zMoveName) {
                    var zMove = this.dex.getActiveMove(zMoveName);
                    if (zMove.exists && zMove.isZ) {
                        move = zMove;
                    }
                }
            }
            if (action.maxMove) {
                var maxMoveName = this.actions.getMaxMove(action.maxMove, action.pokemon);
                if (maxMoveName) {
                    var maxMove = this.actions.getActiveMaxMove(action.move, action.pokemon);
                    if (maxMove.exists && maxMove.isMax) {
                        move = maxMove;
                    }
                }
            }
            // take priority from the base move, so abilities like Prankster only apply once
            // (instead of compounding every time `getActionSpeed` is called)
            var priority = this.dex.moves.get(move.id).priority;
            // Grassy Glide priority
            priority = this.singleEvent('ModifyPriority', move, null, action.pokemon, null, null, priority);
            priority = this.runEvent('ModifyPriority', action.pokemon, null, move, priority);
            action.priority = priority + action.fractionalPriority;
            // In Gen 6, Quick Guard blocks moves with artificially enhanced priority.
            if (this.gen > 5)
                action.move.priority = priority;
        }
        if (!action.pokemon) {
            action.speed = 1;
        }
        else {
            action.speed = action.pokemon.getActionSpeed();
        }
    };
    Battle.prototype.runAction = function (action) {
        var _a, _b, _c, _d;
        var pokemonOriginalHP = (_a = action.pokemon) === null || _a === void 0 ? void 0 : _a.hp;
        var residualPokemon = [];
        // returns whether or not we ended in a callback
        switch (action.choice) {
            case 'start': {
                for (var _i = 0, _e = this.sides; _i < _e.length; _i++) {
                    var side = _e[_i];
                    if (side.pokemonLeft)
                        side.pokemonLeft = side.pokemon.length;
                }
                this.add('start');
                // Change Zacian/Zamazenta into their Crowned formes
                for (var _f = 0, _g = this.getAllPokemon(); _f < _g.length; _f++) {
                    var pokemon = _g[_f];
                    var rawSpecies = null;
                    if (pokemon.species.id === 'zacian' && pokemon.item === 'rustedsword') {
                        rawSpecies = this.dex.species.get('Zacian-Crowned');
                    }
                    else if (pokemon.species.id === 'zamazenta' && pokemon.item === 'rustedshield') {
                        rawSpecies = this.dex.species.get('Zamazenta-Crowned');
                    }
                    if (!rawSpecies)
                        continue;
                    var species = pokemon.setSpecies(rawSpecies);
                    if (!species)
                        continue;
                    pokemon.baseSpecies = rawSpecies;
                    pokemon.details = species.name + (pokemon.level === 100 ? '' : ', L' + pokemon.level) +
                        (pokemon.gender === '' ? '' : ', ' + pokemon.gender) + (pokemon.set.shiny ? ', shiny' : '');
                    pokemon.setAbility(species.abilities['0'], null, true);
                    pokemon.baseAbility = pokemon.ability;
                    var behemothMove = {
                        'Zacian-Crowned': 'behemothblade', 'Zamazenta-Crowned': 'behemothbash',
                    };
                    var ironHead = pokemon.baseMoves.indexOf('ironhead');
                    if (ironHead >= 0) {
                        var move = this.dex.moves.get(behemothMove[rawSpecies.name]);
                        pokemon.baseMoveSlots[ironHead] = {
                            move: move.name,
                            id: move.id,
                            pp: (move.noPPBoosts || move.isZ) ? move.pp : move.pp * 8 / 5,
                            maxpp: (move.noPPBoosts || move.isZ) ? move.pp : move.pp * 8 / 5,
                            target: move.target,
                            disabled: false,
                            disabledSource: '',
                            used: false,
                        };
                        pokemon.moveSlots = pokemon.baseMoveSlots.slice();
                    }
                }
                if (this.format.onBattleStart)
                    this.format.onBattleStart.call(this);
                for (var _h = 0, _j = this.ruleTable.keys(); _h < _j.length; _h++) {
                    var rule = _j[_h];
                    if ('+*-!'.includes(rule.charAt(0)))
                        continue;
                    var subFormat = this.dex.formats.get(rule);
                    if (subFormat.onBattleStart)
                        subFormat.onBattleStart.call(this);
                }
                for (var _k = 0, _l = this.sides; _k < _l.length; _k++) {
                    var side = _l[_k];
                    for (var i = 0; i < side.active.length; i++) {
                        if (!side.pokemonLeft) {
                            // forfeited before starting
                            side.active[i] = side.pokemon[i];
                            side.active[i].fainted = true;
                            side.active[i].hp = 0;
                        }
                        else {
                            this.actions.switchIn(side.pokemon[i], i);
                        }
                    }
                }
                for (var _m = 0, _o = this.getAllPokemon(); _m < _o.length; _m++) {
                    var pokemon = _o[_m];
                    this.singleEvent('Start', this.dex.conditions.getByID(pokemon.species.id), pokemon.speciesState, pokemon);
                }
                this.midTurn = true;
                break;
            }
            case 'move':
                if (!action.pokemon.isActive)
                    return false;
                if (action.pokemon.fainted)
                    return false;
                this.actions.runMove(action.move, action.pokemon, action.targetLoc, action.sourceEffect, action.zmove, undefined, action.maxMove, action.originalTarget);
                break;
            case 'megaEvo':
                this.actions.runMegaEvo(action.pokemon);
                break;
            case 'runDynamax':
                action.pokemon.addVolatile('dynamax');
                action.pokemon.side.dynamaxUsed = true;
                if (action.pokemon.side.allySide)
                    action.pokemon.side.allySide.dynamaxUsed = true;
                break;
            case 'terastallize':
                this.actions.terastallize(action.pokemon);
                break;
            case 'beforeTurnMove':
                if (!action.pokemon.isActive)
                    return false;
                if (action.pokemon.fainted)
                    return false;
                this.debug('before turn callback: ' + action.move.id);
                var target = this.getTarget(action.pokemon, action.move, action.targetLoc);
                if (!target)
                    return false;
                if (!action.move.beforeTurnCallback)
                    throw new Error("beforeTurnMove has no beforeTurnCallback");
                action.move.beforeTurnCallback.call(this, action.pokemon, target);
                break;
            case 'priorityChargeMove':
                if (!action.pokemon.isActive)
                    return false;
                if (action.pokemon.fainted)
                    return false;
                this.debug('priority charge callback: ' + action.move.id);
                if (!action.move.priorityChargeCallback)
                    throw new Error("priorityChargeMove has no priorityChargeCallback");
                action.move.priorityChargeCallback.call(this, action.pokemon);
                break;
            case 'event':
                this.runEvent(action.event, action.pokemon);
                break;
            case 'team':
                if (action.index === 0) {
                    action.pokemon.side.pokemon = [];
                }
                action.pokemon.side.pokemon.push(action.pokemon);
                action.pokemon.position = action.index;
                // we return here because the update event would crash since there are no active pokemon yet
                return;
            case 'pass':
                return;
            case 'instaswitch':
            case 'switch':
                if (action.choice === 'switch' && action.pokemon.status) {
                    this.singleEvent('CheckShow', this.dex.abilities.getByID('naturalcure'), null, action.pokemon);
                }
                if (this.actions.switchIn(action.target, action.pokemon.position, action.sourceEffect) === 'pursuitfaint') {
                    // a pokemon fainted from Pursuit before it could switch
                    if (this.gen <= 4) {
                        // in gen 2-4, the switch still happens
                        this.hint("Previously chosen switches continue in Gen 2-4 after a Pursuit target faints.");
                        action.priority = -101;
                        this.queue.unshift(action);
                        break;
                    }
                    else {
                        // in gen 5+, the switch is cancelled
                        this.hint("A Pokemon can't switch between when it runs out of HP and when it faints");
                        break;
                    }
                }
                break;
            case 'revivalblessing':
                action.pokemon.side.pokemonLeft++;
                if (action.target.position < action.pokemon.side.active.length) {
                    this.queue.addChoice({
                        choice: 'instaswitch',
                        pokemon: action.target,
                        target: action.target,
                    });
                }
                action.target.fainted = false;
                action.target.faintQueued = false;
                action.target.subFainted = false;
                action.target.status = '';
                action.target.hp = 1; // Needed so hp functions works
                action.target.sethp(action.target.maxhp / 2);
                this.add('-heal', action.target, action.target.getHealth, '[from] move: Revival Blessing');
                action.pokemon.side.removeSlotCondition(action.pokemon, 'revivalblessing');
                break;
            case 'runUnnerve':
                this.singleEvent('PreStart', action.pokemon.getAbility(), action.pokemon.abilityState, action.pokemon);
                break;
            case 'runSwitch':
                this.actions.runSwitch(action.pokemon);
                break;
            case 'runPrimal':
                if (!action.pokemon.transformed) {
                    this.singleEvent('Primal', action.pokemon.getItem(), action.pokemon.itemState, action.pokemon);
                }
                break;
            case 'shift':
                if (!action.pokemon.isActive)
                    return false;
                if (action.pokemon.fainted)
                    return false;
                this.swapPosition(action.pokemon, 1);
                break;
            case 'beforeTurn':
                this.eachEvent('BeforeTurn');
                break;
            case 'residual':
                this.add('');
                this.clearActiveMove(true);
                this.updateSpeed();
                residualPokemon = this.getAllActive().map(function (pokemon) { return [pokemon, pokemon.getUndynamaxedHP()]; });
                this.residualEvent('Residual');
                this.add('upkeep');
                break;
        }
        // phazing (Roar, etc)
        for (var _p = 0, _q = this.sides; _p < _q.length; _p++) {
            var side = _q[_p];
            for (var _r = 0, _s = side.active; _r < _s.length; _r++) {
                var pokemon = _s[_r];
                if (pokemon.forceSwitchFlag) {
                    if (pokemon.hp)
                        this.actions.dragIn(pokemon.side, pokemon.position);
                    pokemon.forceSwitchFlag = false;
                }
            }
        }
        this.clearActiveMove();
        // fainting
        this.faintMessages();
        if (this.ended)
            return true;
        // switching (fainted pokemon, U-turn, Baton Pass, etc)
        if (!this.queue.peek() || (this.gen <= 3 && ['move', 'residual'].includes(this.queue.peek().choice))) {
            // in gen 3 or earlier, switching in fainted pokemon is done after
            // every move, rather than only at the end of the turn.
            this.checkFainted();
        }
        else if (action.choice === 'megaEvo' && this.gen === 7) {
            this.eachEvent('Update');
            // In Gen 7, the action order is recalculated for a Pokémon that mega evolves.
            for (var _t = 0, _u = this.queue.list.entries(); _t < _u.length; _t++) {
                var _v = _u[_t], i = _v[0], queuedAction = _v[1];
                if (queuedAction.pokemon === action.pokemon && queuedAction.choice === 'move') {
                    this.queue.list.splice(i, 1);
                    queuedAction.mega = 'done';
                    this.queue.insertChoice(queuedAction, true);
                    break;
                }
            }
            return false;
        }
        else if (((_b = this.queue.peek()) === null || _b === void 0 ? void 0 : _b.choice) === 'instaswitch') {
            return false;
        }
        if (this.gen >= 5) {
            this.eachEvent('Update');
            for (var _w = 0, residualPokemon_1 = residualPokemon; _w < residualPokemon_1.length; _w++) {
                var _x = residualPokemon_1[_w], pokemon = _x[0], originalHP = _x[1];
                var maxhp = pokemon.getUndynamaxedHP(pokemon.maxhp);
                if (pokemon.hp && pokemon.getUndynamaxedHP() <= maxhp / 2 && originalHP > maxhp / 2) {
                    this.runEvent('EmergencyExit', pokemon);
                }
            }
        }
        if (action.choice === 'runSwitch') {
            var pokemon = action.pokemon;
            if (pokemon.hp && pokemon.hp <= pokemon.maxhp / 2 && pokemonOriginalHP > pokemon.maxhp / 2) {
                this.runEvent('EmergencyExit', pokemon);
            }
        }
        var switches = this.sides.map(function (side) { return side.active.some(function (pokemon) { return pokemon && !!pokemon.switchFlag; }); });
        for (var i = 0; i < this.sides.length; i++) {
            var reviveSwitch = false; // Used to ignore the fake switch for Revival Blessing
            if (switches[i] && !this.canSwitch(this.sides[i])) {
                for (var _y = 0, _z = this.sides[i].active; _y < _z.length; _y++) {
                    var pokemon = _z[_y];
                    if (this.sides[i].slotConditions[pokemon.position]['revivalblessing']) {
                        reviveSwitch = true;
                        continue;
                    }
                    pokemon.switchFlag = false;
                }
                if (!reviveSwitch)
                    switches[i] = false;
            }
            else if (switches[i]) {
                for (var _0 = 0, _1 = this.sides[i].active; _0 < _1.length; _0++) {
                    var pokemon = _1[_0];
                    if (pokemon.hp && pokemon.switchFlag && pokemon.switchFlag !== 'revivalblessing' &&
                        !pokemon.skipBeforeSwitchOutEventFlag) {
                        this.runEvent('BeforeSwitchOut', pokemon);
                        pokemon.skipBeforeSwitchOutEventFlag = true;
                        this.faintMessages(); // Pokemon may have fainted in BeforeSwitchOut
                        if (this.ended)
                            return true;
                        if (pokemon.fainted) {
                            switches[i] = this.sides[i].active.some(function (sidePokemon) { return sidePokemon && !!sidePokemon.switchFlag; });
                        }
                    }
                }
            }
        }
        for (var _2 = 0, switches_1 = switches; _2 < switches_1.length; _2++) {
            var playerSwitch = switches_1[_2];
            if (playerSwitch) {
                this.makeRequest('switch');
                return true;
            }
        }
        if (this.gen < 5)
            this.eachEvent('Update');
        if (this.gen >= 8 && (((_c = this.queue.peek()) === null || _c === void 0 ? void 0 : _c.choice) === 'move' || ((_d = this.queue.peek()) === null || _d === void 0 ? void 0 : _d.choice) === 'runDynamax')) {
            // In gen 8, speed is updated dynamically so update the queue's speed properties and sort it.
            this.updateSpeed();
            for (var _3 = 0, _4 = this.queue.list; _3 < _4.length; _3++) {
                var queueAction = _4[_3];
                if (queueAction.pokemon)
                    this.getActionSpeed(queueAction);
            }
            this.queue.sort();
        }
        return false;
    };
    Battle.prototype.go = function () {
        this.add('');
        this.add('t:', Math.floor(Date.now() / 1000));
        if (this.requestState)
            this.requestState = '';
        if (!this.midTurn) {
            this.queue.insertChoice({ choice: 'beforeTurn' });
            this.queue.addChoice({ choice: 'residual' });
            this.midTurn = true;
        }
        var action;
        while ((action = this.queue.shift())) {
            this.runAction(action);
            if (this.requestState || this.ended)
                return;
        }
        this.nextTurn();
        this.midTurn = false;
        this.queue.clear();
    };
    /**
     * Takes a choice string passed from the client. Starts the next
     * turn if all required choices have been made.
     */
    Battle.prototype.choose = function (sideid, input) {
        var side = this.getSide(sideid);
        if (!side.choose(input))
            return false;
        if (!side.isChoiceDone()) {
            side.emitChoiceError("Incomplete choice: ".concat(input, " - missing other pokemon"));
            return false;
        }
        if (this.allChoicesDone())
            this.commitDecisions();
        return true;
    };
    /**
     * Convenience method for easily making choices.
     */
    Battle.prototype.makeChoices = function () {
        var inputs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
        }
        if (inputs.length) {
            for (var _a = 0, _b = inputs.entries(); _a < _b.length; _a++) {
                var _c = _b[_a], i = _c[0], input = _c[1];
                if (input)
                    this.sides[i].choose(input);
            }
        }
        else {
            for (var _d = 0, _e = this.sides; _d < _e.length; _d++) {
                var side = _e[_d];
                side.autoChoose();
            }
        }
        this.commitDecisions();
    };
    Battle.prototype.commitDecisions = function () {
        var _a;
        this.updateSpeed();
        var oldQueue = this.queue.list;
        this.queue.clear();
        if (!this.allChoicesDone())
            throw new Error("Not all choices done");
        for (var _i = 0, _b = this.sides; _i < _b.length; _i++) {
            var side = _b[_i];
            var choice = side.getChoice();
            if (choice)
                this.inputLog.push(">".concat(side.id, " ").concat(choice));
        }
        for (var _c = 0, _d = this.sides; _c < _d.length; _c++) {
            var side = _d[_c];
            this.queue.addChoice(side.choice.actions);
        }
        this.clearRequest();
        this.queue.sort();
        (_a = this.queue.list).push.apply(_a, oldQueue);
        this.requestState = '';
        for (var _e = 0, _f = this.sides; _e < _f.length; _e++) {
            var side = _f[_e];
            side.activeRequest = null;
        }
        this.go();
        if (this.log.length - this.sentLogPos > 500)
            this.sendUpdates();
    };
    Battle.prototype.undoChoice = function (sideid) {
        var side = this.getSide(sideid);
        if (!side.requestState)
            return;
        if (side.choice.cantUndo) {
            side.emitChoiceError("Can't undo: A trapping/disabling effect would cause undo to leak information");
            return;
        }
        side.clearChoice();
    };
    /**
     * returns true if both decisions are complete
     */
    Battle.prototype.allChoicesDone = function () {
        var totalActions = 0;
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            if (side.isChoiceDone()) {
                if (!this.supportCancel)
                    side.choice.cantUndo = true;
                totalActions++;
            }
        }
        return totalActions >= this.sides.length;
    };
    Battle.prototype.hint = function (hint, once, side) {
        if (this.hints.has(hint))
            return;
        if (side) {
            this.addSplit(side.id, ['-hint', hint]);
        }
        else {
            this.add('-hint', hint);
        }
        if (once)
            this.hints.add(hint);
    };
    Battle.prototype.addSplit = function (side, secret, shared) {
        this.log.push("|split|".concat(side));
        this.add.apply(this, secret);
        if (shared) {
            this.add.apply(this, shared);
        }
        else {
            this.log.push('');
        }
    };
    Battle.prototype.add = function () {
        var parts = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            parts[_i] = arguments[_i];
        }
        if (!parts.some(function (part) { return typeof part === 'function'; })) {
            this.log.push("|".concat(parts.join('|')));
            return;
        }
        var side = null;
        var secret = [];
        var shared = [];
        for (var _a = 0, parts_1 = parts; _a < parts_1.length; _a++) {
            var part = parts_1[_a];
            if (typeof part === 'function') {
                var split = part();
                if (side && side !== split.side)
                    throw new Error("Multiple sides passed to add");
                side = split.side;
                secret.push(split.secret);
                shared.push(split.shared);
            }
            else {
                secret.push(part);
                shared.push(part);
            }
        }
        this.addSplit(side, secret, shared);
    };
    // eslint-disable-next-line @typescript-eslint/ban-types
    Battle.prototype.addMove = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.lastMoveLine = this.log.length;
        this.log.push("|".concat(args.join('|')));
    };
    // eslint-disable-next-line @typescript-eslint/ban-types
    Battle.prototype.attrLastMove = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.lastMoveLine < 0)
            return;
        if (this.log[this.lastMoveLine].startsWith('|-anim|')) {
            if (args.includes('[still]')) {
                this.log.splice(this.lastMoveLine, 1);
                this.lastMoveLine = -1;
                return;
            }
        }
        else if (args.includes('[still]')) {
            // If no animation plays, the target should never be known
            var parts = this.log[this.lastMoveLine].split('|');
            parts[4] = '';
            this.log[this.lastMoveLine] = parts.join('|');
        }
        this.log[this.lastMoveLine] += "|".concat(args.join('|'));
    };
    Battle.prototype.retargetLastMove = function (newTarget) {
        if (this.lastMoveLine < 0)
            return;
        var parts = this.log[this.lastMoveLine].split('|');
        parts[4] = newTarget.toString();
        this.log[this.lastMoveLine] = parts.join('|');
    };
    Battle.prototype.debug = function (activity) {
        if (this.debugMode) {
            this.add('debug', activity);
        }
    };
    Battle.prototype.getDebugLog = function () {
        var channelMessages = extractChannelMessages(this.log.join('\n'), [-1]);
        return channelMessages[-1].join('\n');
    };
    Battle.prototype.debugError = function (activity) {
        this.add('debug', activity);
    };
    // players
    Battle.prototype.getTeam = function (options) {
        var team = options.team;
        if (typeof team === 'string')
            team = teams_1.Teams.unpack(team);
        if (team)
            return team;
        if (!options.seed) {
            options.seed = prng_1.PRNG.generateSeed();
        }
        if (!this.teamGenerator) {
            this.teamGenerator = teams_1.Teams.getGenerator(this.format, options.seed);
        }
        else {
            this.teamGenerator.setSeed(options.seed);
        }
        team = this.teamGenerator.getTeam(options);
        return team;
    };
    Battle.prototype.showOpenTeamSheets = function (hideFromSpectators) {
        var _this = this;
        if (hideFromSpectators === void 0) { hideFromSpectators = false; }
        if (this.turn !== 0)
            return;
        for (var _i = 0, _a = this.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            var team = side.team.map(function (set) {
                var newSet = __assign(__assign({}, set), { shiny: false, evs: null, ivs: null, nature: '' });
                // Only display Hidden Power type if the Pokemon has Hidden Power
                // This is based on how team sheets were written in past VGC formats
                if (!set.moves.some(function (m) { return _this.dex.moves.get(m).id === 'hiddenpower'; }))
                    delete newSet.hpType;
                // This is done so the client doesn't flag Zacian/Zamazenta as illusions
                // when they use their signature move
                if (((0, dex_1.toID)(set.species) === 'zacian' && (0, dex_1.toID)(set.item) === 'rustedsword') ||
                    ((0, dex_1.toID)(set.species) === 'zamazenta' && (0, dex_1.toID)(set.item) === 'rustedshield')) {
                    newSet.species = dex_1.Dex.species.get(set.species + 'crowned').name;
                    var crowned = {
                        'Zacian-Crowned': 'behemothblade', 'Zamazenta-Crowned': 'behemothbash',
                    };
                    var ironHead = set.moves.map(dex_1.toID).indexOf('ironhead');
                    if (ironHead >= 0) {
                        newSet.moves[ironHead] = crowned[newSet.species];
                    }
                }
                return newSet;
            });
            if (hideFromSpectators) {
                for (var _b = 0, _c = this.sides; _b < _c.length; _b++) {
                    var s = _c[_b];
                    this.addSplit(s.id, ['showteam', side.id, teams_1.Teams.pack(team)]);
                }
            }
            else {
                this.add('showteam', side.id, teams_1.Teams.pack(team));
            }
        }
    };
    Battle.prototype.setPlayer = function (slot, options) {
        var side;
        var didSomething = true;
        var slotNum = parseInt(slot[1]) - 1;
        if (!this.sides[slotNum]) {
            // create player
            var team = this.getTeam(options);
            side = new side_1.Side(options.name || "Player ".concat(slotNum + 1), this, slotNum, team);
            if (options.avatar)
                side.avatar = '' + options.avatar;
            this.sides[slotNum] = side;
        }
        else {
            // edit player
            side = this.sides[slotNum];
            didSomething = false;
            if (options.name && side.name !== options.name) {
                side.name = options.name;
                didSomething = true;
            }
            if (options.avatar && side.avatar !== '' + options.avatar) {
                side.avatar = '' + options.avatar;
                didSomething = true;
            }
            if (options.team)
                throw new Error("Player ".concat(slot, " already has a team!"));
        }
        if (options.team && typeof options.team !== 'string') {
            options.team = teams_1.Teams.pack(options.team);
        }
        if (!didSomething)
            return;
        this.inputLog.push(">player ".concat(slot, " ") + JSON.stringify(options));
        this.add('player', side.id, side.name, side.avatar, options.rating || '');
        // Start the battle if it's ready to start
        if (this.sides.every(function (playerSide) { return !!playerSide; }) && !this.started)
            this.start();
    };
    /** @deprecated */
    Battle.prototype.join = function (slot, name, avatar, team) {
        this.setPlayer(slot, { name: name, avatar: avatar, team: team });
        return this.getSide(slot);
    };
    Battle.prototype.sendUpdates = function () {
        if (this.sentLogPos >= this.log.length)
            return;
        this.send('update', this.log.slice(this.sentLogPos));
        this.sentLogPos = this.log.length;
        if (!this.sentEnd && this.ended) {
            var log = {
                winner: this.winner,
                seed: this.prngSeed,
                turns: this.turn,
                p1: this.sides[0].name,
                p2: this.sides[1].name,
                p3: this.sides[2] && this.sides[2].name,
                p4: this.sides[3] && this.sides[3].name,
                p1team: this.sides[0].team,
                p2team: this.sides[1].team,
                p3team: this.sides[2] && this.sides[2].team,
                p4team: this.sides[3] && this.sides[3].team,
                score: [this.sides[0].pokemonLeft, this.sides[1].pokemonLeft],
                inputLog: this.inputLog,
            };
            if (this.sides[2]) {
                log.score.push(this.sides[2].pokemonLeft);
            }
            else {
                delete log.p3;
                delete log.p3team;
            }
            if (this.sides[3]) {
                log.score.push(this.sides[3].pokemonLeft);
            }
            else {
                delete log.p4;
                delete log.p4team;
            }
            this.send('end', JSON.stringify(log));
            this.sentEnd = true;
        }
    };
    Battle.prototype.getSide = function (sideid) {
        return this.sides[parseInt(sideid[1]) - 1];
    };
    Battle.prototype.destroy = function () {
        // deallocate ourself
        // deallocate children and get rid of references to them
        this.field.destroy();
        this.field = null;
        for (var i = 0; i < this.sides.length; i++) {
            if (this.sides[i]) {
                this.sides[i].destroy();
                this.sides[i] = null;
            }
        }
        for (var _i = 0, _a = this.queue.list; _i < _a.length; _i++) {
            var action = _a[_i];
            delete action.pokemon;
        }
        this.queue.battle = null;
        this.queue = null;
        // in case the garbage collector really sucks, at least deallocate the log
        this.log = [];
    };
    return Battle;
}());
exports.Battle = Battle;
