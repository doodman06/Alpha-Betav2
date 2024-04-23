"use strict";
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
exports.BattleActions = void 0;
var dex_1 = require("./dex");
var CHOOSABLE_TARGETS = new Set(['normal', 'any', 'adjacentAlly', 'adjacentAllyOrSelf', 'adjacentFoe']);
var BattleActions = /** @class */ (function () {
    function BattleActions(battle) {
        this.MAX_MOVES = {
            Flying: 'Max Airstream',
            Dark: 'Max Darkness',
            Fire: 'Max Flare',
            Bug: 'Max Flutterby',
            Water: 'Max Geyser',
            Status: 'Max Guard',
            Ice: 'Max Hailstorm',
            Fighting: 'Max Knuckle',
            Electric: 'Max Lightning',
            Psychic: 'Max Mindstorm',
            Poison: 'Max Ooze',
            Grass: 'Max Overgrowth',
            Ghost: 'Max Phantasm',
            Ground: 'Max Quake',
            Rock: 'Max Rockfall',
            Fairy: 'Max Starfall',
            Steel: 'Max Steelspike',
            Normal: 'Max Strike',
            Dragon: 'Max Wyrmwind',
        };
        this.Z_MOVES = {
            Poison: "Acid Downpour",
            Fighting: "All-Out Pummeling",
            Dark: "Black Hole Eclipse",
            Grass: "Bloom Doom",
            Normal: "Breakneck Blitz",
            Rock: "Continental Crush",
            Steel: "Corkscrew Crash",
            Dragon: "Devastating Drake",
            Electric: "Gigavolt Havoc",
            Water: "Hydro Vortex",
            Fire: "Inferno Overdrive",
            Ghost: "Never-Ending Nightmare",
            Bug: "Savage Spin-Out",
            Psychic: "Shattered Psyche",
            Ice: "Subzero Slammer",
            Flying: "Supersonic Skystrike",
            Ground: "Tectonic Rage",
            Fairy: "Twinkle Tackle",
        };
        this.battle = battle;
        this.dex = battle.dex;
        if (this.dex.data.Scripts.actions)
            Object.assign(this, this.dex.data.Scripts.actions);
        if (battle.format.actions)
            Object.assign(this, battle.format.actions);
    }
    // #region SWITCH
    // ==================================================================
    BattleActions.prototype.switchIn = function (pokemon, pos, sourceEffect, isDrag) {
        if (sourceEffect === void 0) { sourceEffect = null; }
        if (!pokemon || pokemon.isActive) {
            this.battle.hint("A switch failed because the Pokémon trying to switch in is already in.");
            return false;
        }
        var side = pokemon.side;
        if (pos >= side.active.length) {
            throw new Error("Invalid switch position ".concat(pos, " / ").concat(side.active.length));
        }
        var oldActive = side.active[pos];
        var unfaintedActive = (oldActive === null || oldActive === void 0 ? void 0 : oldActive.hp) ? oldActive : null;
        if (unfaintedActive) {
            oldActive.beingCalledBack = true;
            var switchCopyFlag = false;
            if (sourceEffect && typeof sourceEffect.selfSwitch === 'string') {
                switchCopyFlag = sourceEffect.selfSwitch;
            }
            if (!oldActive.skipBeforeSwitchOutEventFlag && !isDrag) {
                this.battle.runEvent('BeforeSwitchOut', oldActive);
                if (this.battle.gen >= 5) {
                    this.battle.eachEvent('Update');
                }
            }
            oldActive.skipBeforeSwitchOutEventFlag = false;
            if (!this.battle.runEvent('SwitchOut', oldActive)) {
                // Warning: DO NOT interrupt a switch-out if you just want to trap a pokemon.
                // To trap a pokemon and prevent it from switching out, (e.g. Mean Look, Magnet Pull)
                // use the 'trapped' flag instead.
                // Note: Nothing in the real games can interrupt a switch-out (except Pursuit KOing,
                // which is handled elsewhere); this is just for custom formats.
                return false;
            }
            if (!oldActive.hp) {
                // a pokemon fainted from Pursuit before it could switch
                return 'pursuitfaint';
            }
            // will definitely switch out at this point
            oldActive.illusion = null;
            this.battle.singleEvent('End', oldActive.getAbility(), oldActive.abilityState, oldActive);
            // if a pokemon is forced out by Whirlwind/etc or Eject Button/Pack, it can't use its chosen move
            this.battle.queue.cancelAction(oldActive);
            var newMove = null;
            if (this.battle.gen === 4 && sourceEffect) {
                newMove = oldActive.lastMove;
            }
            if (switchCopyFlag) {
                pokemon.copyVolatileFrom(oldActive, switchCopyFlag);
            }
            if (newMove)
                pokemon.lastMove = newMove;
            oldActive.clearVolatile();
        }
        if (oldActive) {
            oldActive.isActive = false;
            oldActive.isStarted = false;
            oldActive.usedItemThisTurn = false;
            oldActive.statsRaisedThisTurn = false;
            oldActive.statsLoweredThisTurn = false;
            oldActive.position = pokemon.position;
            pokemon.position = pos;
            side.pokemon[pokemon.position] = pokemon;
            side.pokemon[oldActive.position] = oldActive;
        }
        pokemon.isActive = true;
        side.active[pos] = pokemon;
        pokemon.activeTurns = 0;
        pokemon.activeMoveActions = 0;
        for (var _i = 0, _a = pokemon.moveSlots; _i < _a.length; _i++) {
            var moveSlot = _a[_i];
            moveSlot.used = false;
        }
        this.battle.runEvent('BeforeSwitchIn', pokemon);
        if (sourceEffect) {
            this.battle.add(isDrag ? 'drag' : 'switch', pokemon, pokemon.getDetails, '[from] ' + sourceEffect);
        }
        else {
            this.battle.add(isDrag ? 'drag' : 'switch', pokemon, pokemon.getDetails);
        }
        pokemon.abilityOrder = this.battle.abilityOrder++;
        if (isDrag && this.battle.gen === 2)
            pokemon.draggedIn = this.battle.turn;
        pokemon.previouslySwitchedIn++;
        if (isDrag && this.battle.gen >= 5) {
            // runSwitch happens immediately so that Mold Breaker can make hazards bypass Clear Body and Levitate
            this.battle.singleEvent('PreStart', pokemon.getAbility(), pokemon.abilityState, pokemon);
            this.runSwitch(pokemon);
        }
        else {
            this.battle.queue.insertChoice({ choice: 'runUnnerve', pokemon: pokemon });
            this.battle.queue.insertChoice({ choice: 'runSwitch', pokemon: pokemon });
        }
        return true;
    };
    BattleActions.prototype.dragIn = function (side, pos) {
        var pokemon = this.battle.getRandomSwitchable(side);
        if (!pokemon || pokemon.isActive)
            return false;
        var oldActive = side.active[pos];
        if (!oldActive)
            throw new Error("nothing to drag out");
        if (!oldActive.hp)
            return false;
        if (!this.battle.runEvent('DragOut', oldActive)) {
            return false;
        }
        if (!this.switchIn(pokemon, pos, null, true))
            return false;
        return true;
    };
    BattleActions.prototype.runSwitch = function (pokemon) {
        this.battle.runEvent('Swap', pokemon);
        if (this.battle.gen >= 5) {
            this.battle.runEvent('SwitchIn', pokemon);
        }
        this.battle.runEvent('EntryHazard', pokemon);
        if (this.battle.gen <= 4) {
            this.battle.runEvent('SwitchIn', pokemon);
        }
        if (this.battle.gen <= 2) {
            // pokemon.lastMove is reset for all Pokemon on the field after a switch. This affects Mirror Move.
            for (var _i = 0, _a = this.battle.getAllActive(); _i < _a.length; _i++) {
                var poke = _a[_i];
                poke.lastMove = null;
            }
            if (!pokemon.side.faintedThisTurn && pokemon.draggedIn !== this.battle.turn) {
                this.battle.runEvent('AfterSwitchInSelf', pokemon);
            }
        }
        if (!pokemon.hp)
            return false;
        pokemon.isStarted = true;
        if (!pokemon.fainted) {
            this.battle.singleEvent('Start', pokemon.getAbility(), pokemon.abilityState, pokemon);
            this.battle.singleEvent('Start', pokemon.getItem(), pokemon.itemState, pokemon);
        }
        if (this.battle.gen === 4) {
            for (var _b = 0, _c = pokemon.foes(); _b < _c.length; _b++) {
                var foeActive = _c[_b];
                foeActive.removeVolatile('substitutebroken');
            }
        }
        pokemon.draggedIn = null;
        return true;
    };
    // #endregion
    // #region MOVES
    // ==================================================================
    /**
     * runMove is the "outside" move caller. It handles deducting PP,
     * flinching, full paralysis, etc. All the stuff up to and including
     * the "POKEMON used MOVE" message.
     *
     * For details of the difference between runMove and useMove, see
     * useMove's info.
     *
     * externalMove skips LockMove and PP deduction, mostly for use by
     * Dancer.
     */
    BattleActions.prototype.runMove = function (moveOrMoveName, pokemon, targetLoc, sourceEffect, zMove, externalMove, maxMove, originalTarget) {
        var _a;
        pokemon.activeMoveActions++;
        var target = this.battle.getTarget(pokemon, maxMove || zMove || moveOrMoveName, targetLoc, originalTarget);
        var baseMove = this.dex.getActiveMove(moveOrMoveName);
        var pranksterBoosted = baseMove.pranksterBoosted;
        if (baseMove.id !== 'struggle' && !zMove && !maxMove && !externalMove) {
            var changedMove = this.battle.runEvent('OverrideAction', pokemon, target, baseMove);
            if (changedMove && changedMove !== true) {
                baseMove = this.dex.getActiveMove(changedMove);
                if (pranksterBoosted)
                    baseMove.pranksterBoosted = pranksterBoosted;
                target = this.battle.getRandomTarget(pokemon, baseMove);
            }
        }
        var move = baseMove;
        if (zMove) {
            move = this.getActiveZMove(baseMove, pokemon);
        }
        else if (maxMove) {
            move = this.getActiveMaxMove(baseMove, pokemon);
        }
        move.isExternal = externalMove;
        this.battle.setActiveMove(move, pokemon, target);
        /* if (pokemon.moveThisTurn) {
            // THIS IS PURELY A SANITY CHECK
            // DO NOT TAKE ADVANTAGE OF THIS TO PREVENT A POKEMON FROM MOVING;
            // USE this.queue.cancelMove INSTEAD
            this.battle.debug('' + pokemon.id + ' INCONSISTENT STATE, ALREADY MOVED: ' + pokemon.moveThisTurn);
            this.battle.clearActiveMove(true);
            return;
        } */
        var willTryMove = this.battle.runEvent('BeforeMove', pokemon, target, move);
        if (!willTryMove) {
            this.battle.runEvent('MoveAborted', pokemon, target, move);
            this.battle.clearActiveMove(true);
            // The event 'BeforeMove' could have returned false or null
            // false indicates that this counts as a move failing for the purpose of calculating Stomping Tantrum's base power
            // null indicates the opposite, as the Pokemon didn't have an option to choose anything
            pokemon.moveThisTurnResult = willTryMove;
            return;
        }
        // Used exclusively for a hint later
        if (move.flags['cantusetwice'] && ((_a = pokemon.lastMove) === null || _a === void 0 ? void 0 : _a.id) === move.id) {
            pokemon.addVolatile(move.id);
        }
        if (move.beforeMoveCallback) {
            if (move.beforeMoveCallback.call(this.battle, pokemon, target, move)) {
                this.battle.clearActiveMove(true);
                pokemon.moveThisTurnResult = false;
                return;
            }
        }
        pokemon.lastDamage = 0;
        var lockedMove;
        if (!externalMove) {
            lockedMove = this.battle.runEvent('LockMove', pokemon);
            if (lockedMove === true)
                lockedMove = false;
            if (!lockedMove) {
                if (!pokemon.deductPP(baseMove, null, target) && (move.id !== 'struggle')) {
                    this.battle.add('cant', pokemon, 'nopp', move);
                    this.battle.clearActiveMove(true);
                    pokemon.moveThisTurnResult = false;
                    return;
                }
            }
            else {
                sourceEffect = this.dex.conditions.get('lockedmove');
            }
            pokemon.moveUsed(move, targetLoc);
        }
        // Dancer Petal Dance hack
        // TODO: implement properly
        var noLock = externalMove && !pokemon.volatiles['lockedmove'];
        if (zMove) {
            if (pokemon.illusion) {
                this.battle.singleEvent('End', this.dex.abilities.get('Illusion'), pokemon.abilityState, pokemon);
            }
            this.battle.add('-zpower', pokemon);
            pokemon.side.zMoveUsed = true;
        }
        var oldActiveMove = move;
        var moveDidSomething = this.useMove(baseMove, pokemon, target, sourceEffect, zMove, maxMove);
        this.battle.lastSuccessfulMoveThisTurn = moveDidSomething ? this.battle.activeMove && this.battle.activeMove.id : null;
        if (this.battle.activeMove)
            move = this.battle.activeMove;
        this.battle.singleEvent('AfterMove', move, null, pokemon, target, move);
        this.battle.runEvent('AfterMove', pokemon, target, move);
        if (move.flags['cantusetwice'] && pokemon.removeVolatile(move.id)) {
            this.battle.add('-hint', "Some effects can force a Pokemon to use ".concat(move.name, " again in a row."));
        }
        // Dancer's activation order is completely different from any other event, so it's handled separately
        if (move.flags['dance'] && moveDidSomething && !move.isExternal) {
            var dancers = [];
            for (var _i = 0, _b = this.battle.getAllActive(); _i < _b.length; _i++) {
                var currentPoke = _b[_i];
                if (pokemon === currentPoke)
                    continue;
                if (currentPoke.hasAbility('dancer') && !currentPoke.isSemiInvulnerable()) {
                    dancers.push(currentPoke);
                }
            }
            // Dancer activates in order of lowest speed stat to highest
            // Note that the speed stat used is after any volatile replacements like Speed Swap,
            // but before any multipliers like Agility or Choice Scarf
            // Ties go to whichever Pokemon has had the ability for the least amount of time
            dancers.sort(function (a, b) { return -(b.storedStats['spe'] - a.storedStats['spe']) || b.abilityOrder - a.abilityOrder; });
            var targetOf1stDance = this.battle.activeTarget;
            for (var _c = 0, dancers_1 = dancers; _c < dancers_1.length; _c++) {
                var dancer = dancers_1[_c];
                if (this.battle.faintMessages())
                    break;
                if (dancer.fainted)
                    continue;
                this.battle.add('-activate', dancer, 'ability: Dancer');
                var dancersTarget = !targetOf1stDance.isAlly(dancer) && pokemon.isAlly(dancer) ?
                    targetOf1stDance :
                    pokemon;
                var dancersTargetLoc = dancer.getLocOf(dancersTarget);
                this.runMove(move.id, dancer, dancersTargetLoc, this.dex.abilities.get('dancer'), undefined, true);
            }
        }
        if (noLock && pokemon.volatiles['lockedmove'])
            delete pokemon.volatiles['lockedmove'];
        this.battle.faintMessages();
        this.battle.checkWin();
        if (this.battle.gen <= 4) {
            // In gen 4, the outermost move is considered the last move for Copycat
            this.battle.activeMove = oldActiveMove;
        }
    };
    /**
     * useMove is the "inside" move caller. It handles effects of the
     * move itself, but not the idea of using the move.
     *
     * Most caller effects, like Sleep Talk, Nature Power, Magic Bounce,
     * etc use useMove.
     *
     * The only ones that use runMove are Instruct, Pursuit, and
     * Dancer.
     */
    BattleActions.prototype.useMove = function (move, pokemon, target, sourceEffect, zMove, maxMove) {
        pokemon.moveThisTurnResult = undefined;
        var oldMoveResult = pokemon.moveThisTurnResult;
        var moveResult = this.useMoveInner(move, pokemon, target, sourceEffect, zMove, maxMove);
        if (oldMoveResult === pokemon.moveThisTurnResult)
            pokemon.moveThisTurnResult = moveResult;
        return moveResult;
    };
    BattleActions.prototype.useMoveInner = function (moveOrMoveName, pokemon, target, sourceEffect, zMove, maxMove) {
        if (!sourceEffect && this.battle.effect.id)
            sourceEffect = this.battle.effect;
        if (sourceEffect && ['instruct', 'custapberry'].includes(sourceEffect.id))
            sourceEffect = null;
        var move = this.dex.getActiveMove(moveOrMoveName);
        pokemon.lastMoveUsed = move;
        if (move.id === 'weatherball' && zMove) {
            // Z-Weather Ball only changes types if it's used directly,
            // not if it's called by Z-Sleep Talk or something.
            this.battle.singleEvent('ModifyType', move, null, pokemon, target, move, move);
            if (move.type !== 'Normal')
                sourceEffect = move;
        }
        if (zMove || (move.category !== 'Status' && sourceEffect && sourceEffect.isZ)) {
            move = this.getActiveZMove(move, pokemon);
        }
        if (maxMove && move.category !== 'Status') {
            // Max move outcome is dependent on the move type after type modifications from ability and the move itself
            this.battle.singleEvent('ModifyType', move, null, pokemon, target, move, move);
            this.battle.runEvent('ModifyType', pokemon, target, move, move);
        }
        if (maxMove || (move.category !== 'Status' && sourceEffect && sourceEffect.isMax)) {
            move = this.getActiveMaxMove(move, pokemon);
        }
        if (this.battle.activeMove) {
            move.priority = this.battle.activeMove.priority;
            if (!move.hasBounced)
                move.pranksterBoosted = this.battle.activeMove.pranksterBoosted;
        }
        var baseTarget = move.target;
        var targetRelayVar = { target: target };
        targetRelayVar = this.battle.runEvent('ModifyTarget', pokemon, target, move, targetRelayVar, true);
        if (targetRelayVar.target !== undefined)
            target = targetRelayVar.target;
        if (target === undefined)
            target = this.battle.getRandomTarget(pokemon, move);
        if (move.target === 'self' || move.target === 'allies') {
            target = pokemon;
        }
        if (sourceEffect) {
            move.sourceEffect = sourceEffect.id;
            move.ignoreAbility = sourceEffect.ignoreAbility;
        }
        var moveResult = false;
        this.battle.setActiveMove(move, pokemon, target);
        this.battle.singleEvent('ModifyType', move, null, pokemon, target, move, move);
        this.battle.singleEvent('ModifyMove', move, null, pokemon, target, move, move);
        if (baseTarget !== move.target) {
            // Target changed in ModifyMove, so we must adjust it here
            // Adjust before the next event so the correct target is passed to the
            // event
            target = this.battle.getRandomTarget(pokemon, move);
        }
        move = this.battle.runEvent('ModifyType', pokemon, target, move, move);
        move = this.battle.runEvent('ModifyMove', pokemon, target, move, move);
        if (baseTarget !== move.target) {
            // Adjust again
            target = this.battle.getRandomTarget(pokemon, move);
        }
        if (!move || pokemon.fainted) {
            return false;
        }
        var attrs = '';
        var movename = move.name;
        if (move.id === 'hiddenpower')
            movename = 'Hidden Power';
        if (sourceEffect)
            attrs += "|[from]".concat(sourceEffect.fullname);
        if (zMove && move.isZ === true) {
            attrs = '|[anim]' + movename + attrs;
            movename = 'Z-' + movename;
        }
        this.battle.addMove('move', pokemon, movename, target + attrs);
        if (zMove)
            this.runZPower(move, pokemon);
        if (!target) {
            this.battle.attrLastMove('[notarget]');
            this.battle.add(this.battle.gen >= 5 ? '-fail' : '-notarget', pokemon);
            return false;
        }
        var _a = pokemon.getMoveTargets(move, target), targets = _a.targets, pressureTargets = _a.pressureTargets;
        if (targets.length) {
            target = targets[targets.length - 1]; // in case of redirection
        }
        var callerMoveForPressure = sourceEffect && sourceEffect.pp ? sourceEffect : null;
        if (!sourceEffect || callerMoveForPressure || sourceEffect.id === 'pursuit') {
            var extraPP = 0;
            for (var _i = 0, pressureTargets_1 = pressureTargets; _i < pressureTargets_1.length; _i++) {
                var source = pressureTargets_1[_i];
                var ppDrop = this.battle.runEvent('DeductPP', source, pokemon, move);
                if (ppDrop !== true) {
                    extraPP += ppDrop || 0;
                }
            }
            if (extraPP > 0) {
                pokemon.deductPP(callerMoveForPressure || moveOrMoveName, extraPP);
            }
        }
        if (!this.battle.singleEvent('TryMove', move, null, pokemon, target, move) ||
            !this.battle.runEvent('TryMove', pokemon, target, move)) {
            move.mindBlownRecoil = false;
            return false;
        }
        this.battle.singleEvent('UseMoveMessage', move, null, pokemon, target, move);
        if (move.ignoreImmunity === undefined) {
            move.ignoreImmunity = (move.category === 'Status');
        }
        if (this.battle.gen !== 4 && move.selfdestruct === 'always') {
            this.battle.faint(pokemon, pokemon, move);
        }
        var damage = false;
        if (move.target === 'all' || move.target === 'foeSide' || move.target === 'allySide' || move.target === 'allyTeam') {
            damage = this.tryMoveHit(targets, pokemon, move);
            if (damage === this.battle.NOT_FAIL)
                pokemon.moveThisTurnResult = null;
            if (damage || damage === 0 || damage === undefined)
                moveResult = true;
        }
        else {
            if (!targets.length) {
                this.battle.attrLastMove('[notarget]');
                this.battle.add(this.battle.gen >= 5 ? '-fail' : '-notarget', pokemon);
                return false;
            }
            if (this.battle.gen === 4 && move.selfdestruct === 'always') {
                this.battle.faint(pokemon, pokemon, move);
            }
            moveResult = this.trySpreadMoveHit(targets, pokemon, move);
        }
        if (move.selfBoost && moveResult)
            this.moveHit(pokemon, pokemon, move, move.selfBoost, false, true);
        if (!pokemon.hp) {
            this.battle.faint(pokemon, pokemon, move);
        }
        if (!moveResult) {
            this.battle.singleEvent('MoveFail', move, null, target, pokemon, move);
            return false;
        }
        if (!move.negateSecondary &&
            !(move.hasSheerForce && pokemon.hasAbility('sheerforce')) &&
            !move.flags['futuremove']) {
            var originalHp = pokemon.hp;
            this.battle.singleEvent('AfterMoveSecondarySelf', move, null, pokemon, target, move);
            this.battle.runEvent('AfterMoveSecondarySelf', pokemon, target, move);
            if (pokemon && pokemon !== target && move.category !== 'Status') {
                if (pokemon.hp <= pokemon.maxhp / 2 && originalHp > pokemon.maxhp / 2) {
                    this.battle.runEvent('EmergencyExit', pokemon, pokemon);
                }
            }
        }
        return true;
    };
    /** NOTE: includes single-target moves */
    BattleActions.prototype.trySpreadMoveHit = function (targets, pokemon, move, notActive) {
        var _a, _b;
        if (targets.length > 1 && !move.smartTarget)
            move.spreadHit = true;
        var moveSteps = [
            // 0. check for semi invulnerability
            this.hitStepInvulnerabilityEvent,
            // 1. run the 'TryHit' event (Protect, Magic Bounce, Volt Absorb, etc.) (this is step 2 in gens 5 & 6, and step 4 in gen 4)
            this.hitStepTryHitEvent,
            // 2. check for type immunity (this is step 1 in gens 4-6)
            this.hitStepTypeImmunity,
            // 3. check for various move-specific immunities
            this.hitStepTryImmunity,
            // 4. check accuracy
            this.hitStepAccuracy,
            // 5. break protection effects
            this.hitStepBreakProtect,
            // 6. steal positive boosts (Spectral Thief)
            this.hitStepStealBoosts,
            // 7. loop that processes each hit of the move (has its own steps per iteration)
            this.hitStepMoveHitLoop,
        ];
        if (this.battle.gen <= 6) {
            // Swap step 1 with step 2
            _a = [moveSteps[2], moveSteps[1]], moveSteps[1] = _a[0], moveSteps[2] = _a[1];
        }
        if (this.battle.gen === 4) {
            // Swap step 4 with new step 2 (old step 1)
            _b = [moveSteps[4], moveSteps[2]], moveSteps[2] = _b[0], moveSteps[4] = _b[1];
        }
        if (notActive)
            this.battle.setActiveMove(move, pokemon, targets[0]);
        var hitResult = this.battle.singleEvent('Try', move, null, pokemon, targets[0], move) &&
            this.battle.singleEvent('PrepareHit', move, {}, targets[0], pokemon, move) &&
            this.battle.runEvent('PrepareHit', pokemon, targets[0], move);
        if (!hitResult) {
            if (hitResult === false) {
                this.battle.add('-fail', pokemon);
                this.battle.attrLastMove('[still]');
            }
            return hitResult === this.battle.NOT_FAIL;
        }
        var atLeastOneFailure = false;
        var _loop_1 = function (step) {
            var hitResults = step.call(this_1, targets, pokemon, move);
            if (!hitResults)
                return "continue";
            targets = targets.filter(function (val, i) { return hitResults[i] || hitResults[i] === 0; });
            atLeastOneFailure = atLeastOneFailure || hitResults.some(function (val) { return val === false; });
            if (!targets.length) {
                return "break";
            }
        };
        var this_1 = this;
        for (var _i = 0, moveSteps_1 = moveSteps; _i < moveSteps_1.length; _i++) {
            var step = moveSteps_1[_i];
            var state_1 = _loop_1(step);
            if (state_1 === "break")
                break;
        }
        var moveResult = !!targets.length;
        if (!moveResult && !atLeastOneFailure)
            pokemon.moveThisTurnResult = null;
        var hitSlot = targets.map(function (p) { return p.getSlot(); });
        if (move.spreadHit)
            this.battle.attrLastMove('[spread] ' + hitSlot.join(','));
        return moveResult;
    };
    BattleActions.prototype.hitStepInvulnerabilityEvent = function (targets, pokemon, move) {
        if (move.id === 'helpinghand' || (this.battle.gen >= 8 && move.id === 'toxic' && pokemon.hasType('Poison'))) {
            return new Array(targets.length).fill(true);
        }
        var hitResults = this.battle.runEvent('Invulnerability', targets, pokemon, move);
        for (var _i = 0, _a = targets.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], target = _b[1];
            if (hitResults[i] === false) {
                if (move.smartTarget) {
                    move.smartTarget = false;
                }
                else {
                    if (!move.spreadHit)
                        this.battle.attrLastMove('[miss]');
                    this.battle.add('-miss', pokemon, target);
                }
            }
        }
        return hitResults;
    };
    BattleActions.prototype.hitStepTryHitEvent = function (targets, pokemon, move) {
        var hitResults = this.battle.runEvent('TryHit', targets, pokemon, move);
        if (!hitResults.includes(true) && hitResults.includes(false)) {
            this.battle.add('-fail', pokemon);
            this.battle.attrLastMove('[still]');
        }
        for (var _i = 0, _a = targets.keys(); _i < _a.length; _i++) {
            var i = _a[_i];
            if (hitResults[i] !== this.battle.NOT_FAIL)
                hitResults[i] = hitResults[i] || false;
        }
        return hitResults;
    };
    BattleActions.prototype.hitStepTypeImmunity = function (targets, pokemon, move) {
        if (move.ignoreImmunity === undefined) {
            move.ignoreImmunity = (move.category === 'Status');
        }
        var hitResults = [];
        for (var _i = 0, _a = targets.keys(); _i < _a.length; _i++) {
            var i = _a[_i];
            hitResults[i] = (move.ignoreImmunity && (move.ignoreImmunity === true || move.ignoreImmunity[move.type])) ||
                targets[i].runImmunity(move.type, !move.smartTarget);
            if (move.smartTarget && !hitResults[i])
                move.smartTarget = false;
        }
        return hitResults;
    };
    BattleActions.prototype.hitStepTryImmunity = function (targets, pokemon, move) {
        var hitResults = [];
        for (var _i = 0, _a = targets.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], target = _b[1];
            if (this.battle.gen >= 6 && move.flags['powder'] && target !== pokemon && !this.dex.getImmunity('powder', target)) {
                this.battle.debug('natural powder immunity');
                this.battle.add('-immune', target);
                hitResults[i] = false;
            }
            else if (!this.battle.singleEvent('TryImmunity', move, {}, target, pokemon, move)) {
                this.battle.add('-immune', target);
                hitResults[i] = false;
            }
            else if (this.battle.gen >= 7 && move.pranksterBoosted && pokemon.hasAbility('prankster') &&
                !targets[i].isAlly(pokemon) && !this.dex.getImmunity('prankster', target)) {
                this.battle.debug('natural prankster immunity');
                if (!target.illusion)
                    this.battle.hint("Since gen 7, Dark is immune to Prankster moves.");
                this.battle.add('-immune', target);
                hitResults[i] = false;
            }
            else {
                hitResults[i] = true;
            }
        }
        return hitResults;
    };
    BattleActions.prototype.hitStepAccuracy = function (targets, pokemon, move) {
        var hitResults = [];
        for (var _i = 0, _a = targets.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], target = _b[1];
            this.battle.activeTarget = target;
            // calculate true accuracy
            var accuracy = move.accuracy;
            if (move.ohko) { // bypasses accuracy modifiers
                if (!target.isSemiInvulnerable()) {
                    accuracy = 30;
                    if (move.ohko === 'Ice' && this.battle.gen >= 7 && !pokemon.hasType('Ice')) {
                        accuracy = 20;
                    }
                    if (!target.volatiles['dynamax'] && pokemon.level >= target.level &&
                        (move.ohko === true || !target.hasType(move.ohko))) {
                        accuracy += (pokemon.level - target.level);
                    }
                    else {
                        this.battle.add('-immune', target, '[ohko]');
                        hitResults[i] = false;
                        continue;
                    }
                }
            }
            else {
                accuracy = this.battle.runEvent('ModifyAccuracy', target, pokemon, move, accuracy);
                if (accuracy !== true) {
                    var boost = 0;
                    if (!move.ignoreAccuracy) {
                        var boosts = this.battle.runEvent('ModifyBoost', pokemon, null, null, __assign({}, pokemon.boosts));
                        boost = this.battle.clampIntRange(boosts['accuracy'], -6, 6);
                    }
                    if (!move.ignoreEvasion) {
                        var boosts = this.battle.runEvent('ModifyBoost', target, null, null, __assign({}, target.boosts));
                        boost = this.battle.clampIntRange(boost - boosts['evasion'], -6, 6);
                    }
                    if (boost > 0) {
                        accuracy = this.battle.trunc(accuracy * (3 + boost) / 3);
                    }
                    else if (boost < 0) {
                        accuracy = this.battle.trunc(accuracy * 3 / (3 - boost));
                    }
                }
            }
            if (move.alwaysHit || (move.id === 'toxic' && this.battle.gen >= 8 && pokemon.hasType('Poison')) ||
                (move.target === 'self' && move.category === 'Status' && !target.isSemiInvulnerable())) {
                accuracy = true; // bypasses ohko accuracy modifiers
            }
            else {
                accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
            }
            if (accuracy !== true && !this.battle.randomChance(accuracy, 100)) {
                if (move.smartTarget) {
                    move.smartTarget = false;
                }
                else {
                    if (!move.spreadHit)
                        this.battle.attrLastMove('[miss]');
                    this.battle.add('-miss', pokemon, target);
                }
                if (!move.ohko && pokemon.hasItem('blunderpolicy') && pokemon.useItem()) {
                    this.battle.boost({ spe: 2 }, pokemon);
                }
                hitResults[i] = false;
                continue;
            }
            hitResults[i] = true;
        }
        return hitResults;
    };
    BattleActions.prototype.hitStepBreakProtect = function (targets, pokemon, move) {
        if (move.breaksProtect) {
            for (var _i = 0, targets_1 = targets; _i < targets_1.length; _i++) {
                var target = targets_1[_i];
                var broke = false;
                for (var _a = 0, _b = ['banefulbunker', 'kingsshield', 'obstruct', 'protect', 'silktrap', 'spikyshield']; _a < _b.length; _a++) {
                    var effectid = _b[_a];
                    if (target.removeVolatile(effectid))
                        broke = true;
                }
                if (this.battle.gen >= 6 || !target.isAlly(pokemon)) {
                    for (var _c = 0, _d = ['craftyshield', 'matblock', 'quickguard', 'wideguard']; _c < _d.length; _c++) {
                        var effectid = _d[_c];
                        if (target.side.removeSideCondition(effectid))
                            broke = true;
                    }
                }
                if (broke) {
                    if (move.id === 'feint') {
                        this.battle.add('-activate', target, 'move: Feint');
                    }
                    else {
                        this.battle.add('-activate', target, 'move: ' + move.name, '[broken]');
                    }
                    if (this.battle.gen >= 6)
                        delete target.volatiles['stall'];
                }
            }
        }
        return undefined;
    };
    BattleActions.prototype.hitStepStealBoosts = function (targets, pokemon, move) {
        var target = targets[0]; // hardcoded
        if (move.stealsBoosts) {
            var boosts = {};
            var stolen = false;
            var statName = void 0;
            for (statName in target.boosts) {
                var stage = target.boosts[statName];
                if (stage > 0) {
                    boosts[statName] = stage;
                    stolen = true;
                }
            }
            if (stolen) {
                this.battle.attrLastMove('[still]');
                this.battle.add('-clearpositiveboost', target, pokemon, 'move: ' + move.name);
                this.battle.boost(boosts, pokemon, pokemon);
                var statName2 = void 0;
                for (statName2 in boosts) {
                    boosts[statName2] = 0;
                }
                target.setBoost(boosts);
                this.battle.addMove('-anim', pokemon, "Spectral Thief", target);
            }
        }
        return undefined;
    };
    BattleActions.prototype.afterMoveSecondaryEvent = function (targets, pokemon, move) {
        // console.log(`${targets}, ${pokemon}, ${move}`)
        if (!move.negateSecondary && !(move.hasSheerForce && pokemon.hasAbility('sheerforce'))) {
            this.battle.singleEvent('AfterMoveSecondary', move, null, targets[0], pokemon, move);
            this.battle.runEvent('AfterMoveSecondary', targets, pokemon, move);
        }
        return undefined;
    };
    /** NOTE: used only for moves that target sides/fields rather than pokemon */
    BattleActions.prototype.tryMoveHit = function (targetOrTargets, pokemon, move) {
        var target = Array.isArray(targetOrTargets) ? targetOrTargets[0] : targetOrTargets;
        var targets = Array.isArray(targetOrTargets) ? targetOrTargets : [target];
        this.battle.setActiveMove(move, pokemon, targets[0]);
        var hitResult = this.battle.singleEvent('Try', move, null, pokemon, target, move) &&
            this.battle.singleEvent('PrepareHit', move, {}, target, pokemon, move) &&
            this.battle.runEvent('PrepareHit', pokemon, target, move);
        if (!hitResult) {
            if (hitResult === false) {
                this.battle.add('-fail', pokemon);
                this.battle.attrLastMove('[still]');
            }
            return false;
        }
        var isFFAHazard = move.target === 'foeSide' && this.battle.gameType === 'freeforall';
        if (move.target === 'all') {
            hitResult = this.battle.runEvent('TryHitField', target, pokemon, move);
        }
        else if (isFFAHazard) {
            var hitResults = this.battle.runEvent('TryHitSide', targets, pokemon, move);
            // if some side blocked the move, prevent the move from executing against any other sides
            if (hitResults.some(function (result) { return !result; }))
                return false;
            hitResult = true;
        }
        else {
            hitResult = this.battle.runEvent('TryHitSide', target, pokemon, move);
        }
        if (!hitResult) {
            if (hitResult === false) {
                this.battle.add('-fail', pokemon);
                this.battle.attrLastMove('[still]');
            }
            return false;
        }
        return this.moveHit(isFFAHazard ? targets : target, pokemon, move);
    };
    BattleActions.prototype.hitStepMoveHitLoop = function (targets, pokemon, move) {
        var _a;
        var damage = [];
        for (var _i = 0, _b = targets.keys(); _i < _b.length; _i++) {
            var i = _b[_i];
            damage[i] = 0;
        }
        move.totalDamage = 0;
        pokemon.lastDamage = 0;
        var targetHits = move.multihit || 1;
        if (Array.isArray(targetHits)) {
            // yes, it's hardcoded... meh
            if (targetHits[0] === 2 && targetHits[1] === 5) {
                if (this.battle.gen >= 5) {
                    // 35-35-15-15 out of 100 for 2-3-4-5 hits
                    targetHits = this.battle.sample([2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5]);
                    if (targetHits < 4 && pokemon.hasItem('loadeddice')) {
                        targetHits = 5 - this.battle.random(2);
                    }
                }
                else {
                    targetHits = this.battle.sample([2, 2, 2, 3, 3, 3, 4, 5]);
                }
            }
            else {
                targetHits = this.battle.random(targetHits[0], targetHits[1] + 1);
            }
        }
        if (targetHits === 10 && pokemon.hasItem('loadeddice'))
            targetHits -= this.battle.random(7);
        targetHits = Math.floor(targetHits);
        var nullDamage = true;
        var moveDamage = [];
        // There is no need to recursively check the ´sleepUsable´ flag as Sleep Talk can only be used while asleep.
        var isSleepUsable = move.sleepUsable || this.dex.moves.get(move.sourceEffect).sleepUsable;
        var targetsCopy = targets.slice(0);
        var hit;
        for (hit = 1; hit <= targetHits; hit++) {
            if (damage.includes(false))
                break;
            if (hit > 1 && pokemon.status === 'slp' && (!isSleepUsable || this.battle.gen === 4))
                break;
            if (targets.every(function (target) { return !(target === null || target === void 0 ? void 0 : target.hp); }))
                break;
            move.hit = hit;
            if (move.smartTarget && targets.length > 1) {
                targetsCopy = [targets[hit - 1]];
                damage = [damage[hit - 1]];
            }
            else {
                targetsCopy = targets.slice(0);
            }
            var target = targetsCopy[0]; // some relevant-to-single-target-moves-only things are hardcoded
            if (target && typeof move.smartTarget === 'boolean') {
                if (hit > 1) {
                    this.battle.addMove('-anim', pokemon, move.name, target);
                }
                else {
                    this.battle.retargetLastMove(target);
                }
            }
            // like this (Triple Kick)
            if (target && move.multiaccuracy && hit > 1) {
                var accuracy = move.accuracy;
                var boostTable = [1, 4 / 3, 5 / 3, 2, 7 / 3, 8 / 3, 3];
                if (accuracy !== true) {
                    if (!move.ignoreAccuracy) {
                        var boosts = this.battle.runEvent('ModifyBoost', pokemon, null, null, __assign({}, pokemon.boosts));
                        var boost = this.battle.clampIntRange(boosts['accuracy'], -6, 6);
                        if (boost > 0) {
                            accuracy *= boostTable[boost];
                        }
                        else {
                            accuracy /= boostTable[-boost];
                        }
                    }
                    if (!move.ignoreEvasion) {
                        var boosts = this.battle.runEvent('ModifyBoost', target, null, null, __assign({}, target.boosts));
                        var boost = this.battle.clampIntRange(boosts['evasion'], -6, 6);
                        if (boost > 0) {
                            accuracy /= boostTable[boost];
                        }
                        else if (boost < 0) {
                            accuracy *= boostTable[-boost];
                        }
                    }
                }
                accuracy = this.battle.runEvent('ModifyAccuracy', target, pokemon, move, accuracy);
                if (!move.alwaysHit) {
                    accuracy = this.battle.runEvent('Accuracy', target, pokemon, move, accuracy);
                    if (accuracy !== true && !this.battle.randomChance(accuracy, 100))
                        break;
                }
            }
            var moveData = move;
            if (!moveData.flags)
                moveData.flags = {};
            // Modifies targetsCopy (which is why it's a copy)
            _a = this.spreadMoveHit(targetsCopy, pokemon, move, moveData), moveDamage = _a[0], targetsCopy = _a[1];
            if (!moveDamage.some(function (val) { return val !== false; }))
                break;
            nullDamage = false;
            for (var _c = 0, _d = moveDamage.entries(); _c < _d.length; _c++) {
                var _e = _d[_c], i = _e[0], md = _e[1];
                // Damage from each hit is individually counted for the
                // purposes of Counter, Metal Burst, and Mirror Coat.
                damage[i] = md === true || !md ? 0 : md;
                // Total damage dealt is accumulated for the purposes of recoil (Parental Bond).
                move.totalDamage += damage[i];
            }
            if (move.mindBlownRecoil) {
                var hpBeforeRecoil = pokemon.hp;
                this.battle.damage(Math.round(pokemon.maxhp / 2), pokemon, pokemon, this.dex.conditions.get(move.id), true);
                move.mindBlownRecoil = false;
                if (pokemon.hp <= pokemon.maxhp / 2 && hpBeforeRecoil > pokemon.maxhp / 2) {
                    this.battle.runEvent('EmergencyExit', pokemon, pokemon);
                }
            }
            this.battle.eachEvent('Update');
            if (!pokemon.hp && targets.length === 1) {
                hit++; // report the correct number of hits for multihit moves
                break;
            }
        }
        // hit is 1 higher than the actual hit count
        if (hit === 1)
            return damage.fill(false);
        if (nullDamage)
            damage.fill(false);
        this.battle.faintMessages(false, false, !pokemon.hp);
        if (move.multihit && typeof move.smartTarget !== 'boolean') {
            this.battle.add('-hitcount', targets[0], hit - 1);
        }
        if ((move.recoil || move.id === 'chloroblast') && move.totalDamage) {
            var hpBeforeRecoil = pokemon.hp;
            this.battle.damage(this.calcRecoilDamage(move.totalDamage, move, pokemon), pokemon, pokemon, 'recoil');
            if (pokemon.hp <= pokemon.maxhp / 2 && hpBeforeRecoil > pokemon.maxhp / 2) {
                this.battle.runEvent('EmergencyExit', pokemon, pokemon);
            }
        }
        if (move.struggleRecoil) {
            var hpBeforeRecoil = pokemon.hp;
            var recoilDamage = void 0;
            if (this.dex.gen >= 5) {
                recoilDamage = this.battle.clampIntRange(Math.round(pokemon.baseMaxhp / 4), 1);
            }
            else {
                recoilDamage = this.battle.clampIntRange(this.battle.trunc(pokemon.maxhp / 4), 1);
            }
            this.battle.directDamage(recoilDamage, pokemon, pokemon, { id: 'strugglerecoil' });
            if (pokemon.hp <= pokemon.maxhp / 2 && hpBeforeRecoil > pokemon.maxhp / 2) {
                this.battle.runEvent('EmergencyExit', pokemon, pokemon);
            }
        }
        // smartTarget messes up targetsCopy, but smartTarget should in theory ensure that targets will never fail, anyway
        if (move.smartTarget) {
            if (move.smartTarget && targets.length > 1) {
                targetsCopy = [targets[hit - 1]];
            }
            else {
                targetsCopy = targets.slice(0);
            }
        }
        for (var _f = 0, _g = targetsCopy.entries(); _f < _g.length; _f++) {
            var _h = _g[_f], i = _h[0], target = _h[1];
            if (target && pokemon !== target) {
                target.gotAttacked(move, moveDamage[i], pokemon);
                if (typeof moveDamage[i] === 'number') {
                    target.timesAttacked += hit - 1;
                }
            }
        }
        if (move.ohko && !targets[0].hp)
            this.battle.add('-ohko');
        if (!damage.some(function (val) { return !!val || val === 0; }))
            return damage;
        this.battle.eachEvent('Update');
        this.afterMoveSecondaryEvent(targetsCopy.filter(function (val) { return !!val; }), pokemon, move);
        if (!move.negateSecondary && !(move.hasSheerForce && pokemon.hasAbility('sheerforce'))) {
            for (var _j = 0, _k = damage.entries(); _j < _k.length; _j++) {
                var _l = _k[_j], i = _l[0], d = _l[1];
                // There are no multihit spread moves, so it's safe to use move.totalDamage for multihit moves
                // The previous check was for `move.multihit`, but that fails for Dragon Darts
                var curDamage = targets.length === 1 ? move.totalDamage : d;
                if (typeof curDamage === 'number' && targets[i].hp) {
                    var targetHPBeforeDamage = (targets[i].hurtThisTurn || 0) + curDamage;
                    if (targets[i].hp <= targets[i].maxhp / 2 && targetHPBeforeDamage > targets[i].maxhp / 2) {
                        this.battle.runEvent('EmergencyExit', targets[i], pokemon);
                    }
                }
            }
        }
        return damage;
    };
    BattleActions.prototype.spreadMoveHit = function (targets, pokemon, moveOrMoveName, hitEffect, isSecondary, isSelf) {
        // Hardcoded for single-target purposes
        // (no spread moves have any kind of onTryHit handler)
        var target = targets[0];
        var damage = [];
        for (var _i = 0, _a = targets.keys(); _i < _a.length; _i++) {
            var i = _a[_i];
            damage[i] = true;
        }
        var move = this.dex.getActiveMove(moveOrMoveName);
        var hitResult = true;
        var moveData = hitEffect;
        if (!moveData)
            moveData = move;
        if (!moveData.flags)
            moveData.flags = {};
        if (move.target === 'all' && !isSelf) {
            hitResult = this.battle.singleEvent('TryHitField', moveData, {}, target || null, pokemon, move);
        }
        else if ((move.target === 'foeSide' || move.target === 'allySide' || move.target === 'allyTeam') && !isSelf) {
            hitResult = this.battle.singleEvent('TryHitSide', moveData, {}, target || null, pokemon, move);
        }
        else if (target) {
            hitResult = this.battle.singleEvent('TryHit', moveData, {}, target, pokemon, move);
        }
        if (!hitResult) {
            if (hitResult === false) {
                this.battle.add('-fail', pokemon);
                this.battle.attrLastMove('[still]');
            }
            return [[false], targets]; // single-target only
        }
        // 0. check for substitute
        if (!isSecondary && !isSelf) {
            if (move.target !== 'all' && move.target !== 'allyTeam' && move.target !== 'allySide' && move.target !== 'foeSide') {
                damage = this.tryPrimaryHitEvent(damage, targets, pokemon, move, moveData, isSecondary);
            }
        }
        for (var _b = 0, _c = targets.keys(); _b < _c.length; _b++) {
            var i = _c[_b];
            if (damage[i] === this.battle.HIT_SUBSTITUTE) {
                damage[i] = true;
                targets[i] = null;
            }
            if (targets[i] && isSecondary && !moveData.self) {
                damage[i] = true;
            }
            if (!damage[i])
                targets[i] = false;
        }
        // 1. call to this.battle.getDamage
        damage = this.getSpreadDamage(damage, targets, pokemon, move, moveData, isSecondary, isSelf);
        for (var _d = 0, _e = targets.keys(); _d < _e.length; _d++) {
            var i = _e[_d];
            if (damage[i] === false)
                targets[i] = false;
        }
        // 2. call to this.battle.spreadDamage
        damage = this.battle.spreadDamage(damage, targets, pokemon, move);
        for (var _f = 0, _g = targets.keys(); _f < _g.length; _f++) {
            var i = _g[_f];
            if (damage[i] === false)
                targets[i] = false;
        }
        // 3. onHit event happens here
        damage = this.runMoveEffects(damage, targets, pokemon, move, moveData, isSecondary, isSelf);
        for (var _h = 0, _j = targets.keys(); _h < _j.length; _h++) {
            var i = _j[_h];
            if (!damage[i] && damage[i] !== 0)
                targets[i] = false;
        }
        // steps 4 and 5 can mess with this.battle.activeTarget, which needs to be preserved for Dancer
        var activeTarget = this.battle.activeTarget;
        // 4. self drops (start checking for targets[i] === false here)
        if (moveData.self && !move.selfDropped)
            this.selfDrops(targets, pokemon, move, moveData, isSecondary);
        // 5. secondary effects
        if (moveData.secondaries)
            this.secondaries(targets, pokemon, move, moveData, isSelf);
        this.battle.activeTarget = activeTarget;
        // 6. force switch
        if (moveData.forceSwitch)
            damage = this.forceSwitch(damage, targets, pokemon, move);
        for (var _k = 0, _l = targets.keys(); _k < _l.length; _k++) {
            var i = _l[_k];
            if (!damage[i] && damage[i] !== 0)
                targets[i] = false;
        }
        var damagedTargets = [];
        var damagedDamage = [];
        for (var _m = 0, _o = targets.entries(); _m < _o.length; _m++) {
            var _p = _o[_m], i = _p[0], t = _p[1];
            if (typeof damage[i] === 'number' && t) {
                damagedTargets.push(t);
                damagedDamage.push(damage[i]);
            }
        }
        var pokemonOriginalHP = pokemon.hp;
        if (damagedDamage.length && !isSecondary && !isSelf) {
            this.battle.runEvent('DamagingHit', damagedTargets, pokemon, move, damagedDamage);
            if (moveData.onAfterHit) {
                for (var _q = 0, damagedTargets_1 = damagedTargets; _q < damagedTargets_1.length; _q++) {
                    var t = damagedTargets_1[_q];
                    this.battle.singleEvent('AfterHit', moveData, {}, t, pokemon, move);
                }
            }
            if (pokemon.hp && pokemon.hp <= pokemon.maxhp / 2 && pokemonOriginalHP > pokemon.maxhp / 2) {
                this.battle.runEvent('EmergencyExit', pokemon);
            }
        }
        return [damage, targets];
    };
    BattleActions.prototype.tryPrimaryHitEvent = function (damage, targets, pokemon, move, moveData, isSecondary) {
        for (var _i = 0, _a = targets.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], target = _b[1];
            if (!target)
                continue;
            damage[i] = this.battle.runEvent('TryPrimaryHit', target, pokemon, moveData);
        }
        return damage;
    };
    BattleActions.prototype.getSpreadDamage = function (damage, targets, source, move, moveData, isSecondary, isSelf) {
        for (var _i = 0, _a = targets.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], target = _b[1];
            if (!target)
                continue;
            this.battle.activeTarget = target;
            damage[i] = undefined;
            var curDamage = this.getDamage(source, target, moveData);
            // getDamage has several possible return values:
            //
            //   a number:
            //     means that much damage is dealt (0 damage still counts as dealing
            //     damage for the purposes of things like Static)
            //   false:
            //     gives error message: "But it failed!" and move ends
            //   null:
            //     the move ends, with no message (usually, a custom fail message
            //     was already output by an event handler)
            //   undefined:
            //     means no damage is dealt and the move continues
            //
            // basically, these values have the same meanings as they do for event
            // handlers.
            if (curDamage === false || curDamage === null) {
                if (damage[i] === false && !isSecondary && !isSelf) {
                    this.battle.add('-fail', source);
                    this.battle.attrLastMove('[still]');
                }
                this.battle.debug('damage calculation interrupted');
                damage[i] = false;
                continue;
            }
            damage[i] = curDamage;
        }
        return damage;
    };
    BattleActions.prototype.runMoveEffects = function (damage, targets, source, move, moveData, isSecondary, isSelf) {
        var didAnything = damage.reduce(this.combineResults);
        for (var _i = 0, _a = targets.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], target = _b[1];
            if (target === false)
                continue;
            var hitResult = void 0;
            var didSomething = undefined;
            if (target) {
                if (moveData.boosts && !target.fainted) {
                    hitResult = this.battle.boost(moveData.boosts, target, source, move, isSecondary, isSelf);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.heal && !target.fainted) {
                    if (target.hp >= target.maxhp) {
                        this.battle.add('-fail', target, 'heal');
                        this.battle.attrLastMove('[still]');
                        damage[i] = this.combineResults(damage[i], false);
                        didAnything = this.combineResults(didAnything, null);
                        continue;
                    }
                    var amount = target.baseMaxhp * moveData.heal[0] / moveData.heal[1];
                    var d = target.heal((this.battle.gen < 5 ? Math.floor : Math.round)(amount));
                    if (!d && d !== 0) {
                        this.battle.add('-fail', source);
                        this.battle.attrLastMove('[still]');
                        this.battle.debug('heal interrupted');
                        damage[i] = this.combineResults(damage[i], false);
                        didAnything = this.combineResults(didAnything, null);
                        continue;
                    }
                    this.battle.add('-heal', target, target.getHealth);
                    didSomething = true;
                }
                if (moveData.status) {
                    hitResult = target.trySetStatus(moveData.status, source, moveData.ability ? moveData.ability : move);
                    if (!hitResult && move.status) {
                        damage[i] = this.combineResults(damage[i], false);
                        didAnything = this.combineResults(didAnything, null);
                        continue;
                    }
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.forceStatus) {
                    hitResult = target.setStatus(moveData.forceStatus, source, move);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.volatileStatus) {
                    hitResult = target.addVolatile(moveData.volatileStatus, source, move);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.sideCondition) {
                    hitResult = target.side.addSideCondition(moveData.sideCondition, source, move);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.slotCondition) {
                    hitResult = target.side.addSlotCondition(target, moveData.slotCondition, source, move);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.weather) {
                    hitResult = this.battle.field.setWeather(moveData.weather, source, move);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.terrain) {
                    hitResult = this.battle.field.setTerrain(moveData.terrain, source, move);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.pseudoWeather) {
                    hitResult = this.battle.field.addPseudoWeather(moveData.pseudoWeather, source, move);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                if (moveData.forceSwitch) {
                    hitResult = !!this.battle.canSwitch(target.side);
                    didSomething = this.combineResults(didSomething, hitResult);
                }
                // Hit events
                //   These are like the TryHit events, except we don't need a FieldHit event.
                //   Scroll up for the TryHit event documentation, and just ignore the "Try" part. ;)
                if (move.target === 'all' && !isSelf) {
                    if (moveData.onHitField) {
                        hitResult = this.battle.singleEvent('HitField', moveData, {}, target, source, move);
                        didSomething = this.combineResults(didSomething, hitResult);
                    }
                }
                else if ((move.target === 'foeSide' || move.target === 'allySide') && !isSelf) {
                    if (moveData.onHitSide) {
                        hitResult = this.battle.singleEvent('HitSide', moveData, {}, target.side, source, move);
                        didSomething = this.combineResults(didSomething, hitResult);
                    }
                }
                else {
                    if (moveData.onHit) {
                        hitResult = this.battle.singleEvent('Hit', moveData, {}, target, source, move);
                        didSomething = this.combineResults(didSomething, hitResult);
                    }
                    if (!isSelf && !isSecondary) {
                        this.battle.runEvent('Hit', target, source, move);
                    }
                }
            }
            if (moveData.selfdestruct === 'ifHit' && damage[i] !== false) {
                this.battle.faint(source, source, move);
            }
            if (moveData.selfSwitch) {
                if (this.battle.canSwitch(source.side) && !source.volatiles['commanded']) {
                    didSomething = true;
                }
                else {
                    didSomething = this.combineResults(didSomething, false);
                }
            }
            // Move didn't fail because it didn't try to do anything
            if (didSomething === undefined)
                didSomething = true;
            damage[i] = this.combineResults(damage[i], didSomething === null ? false : didSomething);
            didAnything = this.combineResults(didAnything, didSomething);
        }
        if (!didAnything && didAnything !== 0 && !moveData.self && !moveData.selfdestruct) {
            if (!isSelf && !isSecondary) {
                if (didAnything === false) {
                    this.battle.add('-fail', source);
                    this.battle.attrLastMove('[still]');
                }
            }
            this.battle.debug('move failed because it did nothing');
        }
        else if (move.selfSwitch && source.hp && !source.volatiles['commanded']) {
            source.switchFlag = move.id;
        }
        return damage;
    };
    BattleActions.prototype.selfDrops = function (targets, source, move, moveData, isSecondary) {
        for (var _i = 0, targets_2 = targets; _i < targets_2.length; _i++) {
            var target = targets_2[_i];
            if (target === false)
                continue;
            if (moveData.self && !move.selfDropped) {
                if (!isSecondary && moveData.self.boosts) {
                    var secondaryRoll = this.battle.random(100);
                    if (typeof moveData.self.chance === 'undefined' || secondaryRoll < moveData.self.chance) {
                        this.moveHit(source, source, move, moveData.self, isSecondary, true);
                    }
                    if (!move.multihit)
                        move.selfDropped = true;
                }
                else {
                    this.moveHit(source, source, move, moveData.self, isSecondary, true);
                }
            }
        }
    };
    BattleActions.prototype.secondaries = function (targets, source, move, moveData, isSelf) {
        if (!moveData.secondaries)
            return;
        for (var _i = 0, targets_3 = targets; _i < targets_3.length; _i++) {
            var target = targets_3[_i];
            if (target === false)
                continue;
            var secondaries = this.battle.runEvent('ModifySecondaries', target, source, moveData, moveData.secondaries.slice());
            for (var _a = 0, secondaries_1 = secondaries; _a < secondaries_1.length; _a++) {
                var secondary = secondaries_1[_a];
                var secondaryRoll = this.battle.random(100);
                // User stat boosts or target stat drops can possibly overflow if it goes beyond 256 in Gen 8 or prior
                var secondaryOverflow = (secondary.boosts || secondary.self) && this.battle.gen <= 8;
                if (typeof secondary.chance === 'undefined' ||
                    secondaryRoll < (secondaryOverflow ? secondary.chance % 256 : secondary.chance)) {
                    this.moveHit(target, source, move, secondary, true, isSelf);
                }
            }
        }
    };
    BattleActions.prototype.forceSwitch = function (damage, targets, source, move) {
        for (var _i = 0, _a = targets.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], target = _b[1];
            if (target && target.hp > 0 && source.hp > 0 && this.battle.canSwitch(target.side)) {
                var hitResult = this.battle.runEvent('DragOut', target, source, move);
                if (hitResult) {
                    target.forceSwitchFlag = true;
                }
                else if (hitResult === false && move.category === 'Status') {
                    this.battle.add('-fail', source);
                    this.battle.attrLastMove('[still]');
                    damage[i] = false;
                }
            }
        }
        return damage;
    };
    BattleActions.prototype.moveHit = function (targets, pokemon, moveOrMoveName, moveData, isSecondary, isSelf) {
        if (!Array.isArray(targets))
            targets = [targets];
        var retVal = this.spreadMoveHit(targets, pokemon, moveOrMoveName, moveData, isSecondary, isSelf)[0][0];
        return retVal === true ? undefined : retVal;
    };
    BattleActions.prototype.calcRecoilDamage = function (damageDealt, move, pokemon) {
        if (move.id === 'chloroblast')
            return Math.round(pokemon.maxhp / 2);
        return this.battle.clampIntRange(Math.round(damageDealt * move.recoil[0] / move.recoil[1]), 1);
    };
    BattleActions.prototype.getZMove = function (move, pokemon, skipChecks) {
        var _a;
        var item = pokemon.getItem();
        if (!skipChecks) {
            if (pokemon.side.zMoveUsed)
                return;
            if (!item.zMove)
                return;
            if (item.itemUser && !item.itemUser.includes(pokemon.species.name))
                return;
            var moveData = pokemon.getMoveData(move);
            // Draining the PP of the base move prevents the corresponding Z-move from being used.
            if (!(moveData === null || moveData === void 0 ? void 0 : moveData.pp))
                return;
        }
        if (item.zMoveFrom) {
            if (move.name === item.zMoveFrom)
                return item.zMove;
        }
        else if (item.zMove === true) {
            if (move.type === item.zMoveType) {
                if (move.category === "Status") {
                    return move.name;
                }
                else if ((_a = move.zMove) === null || _a === void 0 ? void 0 : _a.basePower) {
                    return this.Z_MOVES[move.type];
                }
            }
        }
    };
    BattleActions.prototype.getActiveZMove = function (move, pokemon) {
        if (pokemon) {
            var item = pokemon.getItem();
            if (move.name === item.zMoveFrom) {
                var zMove_1 = this.dex.getActiveMove(item.zMove);
                zMove_1.isZOrMaxPowered = true;
                return zMove_1;
            }
        }
        if (move.category === 'Status') {
            var zMove_2 = this.dex.getActiveMove(move);
            zMove_2.isZ = true;
            zMove_2.isZOrMaxPowered = true;
            return zMove_2;
        }
        var zMove = this.dex.getActiveMove(this.Z_MOVES[move.type]);
        zMove.basePower = move.zMove.basePower;
        zMove.category = move.category;
        // copy the priority for Quick Guard
        zMove.priority = move.priority;
        zMove.isZOrMaxPowered = true;
        return zMove;
    };
    BattleActions.prototype.canZMove = function (pokemon) {
        if (pokemon.side.zMoveUsed ||
            (pokemon.transformed &&
                (pokemon.species.isMega || pokemon.species.isPrimal || pokemon.species.forme === "Ultra")))
            return;
        var item = pokemon.getItem();
        if (!item.zMove)
            return;
        if (item.itemUser && !item.itemUser.includes(pokemon.species.name))
            return;
        var atLeastOne = false;
        var mustStruggle = true;
        var zMoves = [];
        for (var _i = 0, _a = pokemon.moveSlots; _i < _a.length; _i++) {
            var moveSlot = _a[_i];
            if (moveSlot.pp <= 0) {
                zMoves.push(null);
                continue;
            }
            if (!moveSlot.disabled) {
                mustStruggle = false;
            }
            var move = this.dex.moves.get(moveSlot.move);
            var zMoveName = this.getZMove(move, pokemon, true) || '';
            if (zMoveName) {
                var zMove = this.dex.moves.get(zMoveName);
                if (!zMove.isZ && zMove.category === 'Status')
                    zMoveName = "Z-" + zMoveName;
                zMoves.push({ move: zMoveName, target: zMove.target });
            }
            else {
                zMoves.push(null);
            }
            if (zMoveName)
                atLeastOne = true;
        }
        if (atLeastOne && !mustStruggle)
            return zMoves;
    };
    BattleActions.prototype.getMaxMove = function (move, pokemon) {
        if (typeof move === 'string')
            move = this.dex.moves.get(move);
        if (move.name === 'Struggle')
            return move;
        if (pokemon.gigantamax && pokemon.canGigantamax && move.category !== 'Status') {
            var gMaxMove = this.dex.moves.get(pokemon.canGigantamax);
            if (gMaxMove.exists && gMaxMove.type === move.type)
                return gMaxMove;
        }
        var maxMove = this.dex.moves.get(this.MAX_MOVES[move.category === 'Status' ? move.category : move.type]);
        if (maxMove.exists)
            return maxMove;
    };
    BattleActions.prototype.getActiveMaxMove = function (move, pokemon) {
        var _a;
        if (typeof move === 'string')
            move = this.dex.getActiveMove(move);
        if (move.name === 'Struggle')
            return this.dex.getActiveMove(move);
        var maxMove = this.dex.getActiveMove(this.MAX_MOVES[move.category === 'Status' ? move.category : move.type]);
        if (move.category !== 'Status') {
            if (pokemon.gigantamax && pokemon.canGigantamax) {
                var gMaxMove = this.dex.getActiveMove(pokemon.canGigantamax);
                if (gMaxMove.exists && gMaxMove.type === move.type)
                    maxMove = gMaxMove;
            }
            if (!((_a = move.maxMove) === null || _a === void 0 ? void 0 : _a.basePower))
                throw new Error("".concat(move.name, " doesn't have a maxMove basePower"));
            if (!['gmaxdrumsolo', 'gmaxfireball', 'gmaxhydrosnipe'].includes(maxMove.id)) {
                maxMove.basePower = move.maxMove.basePower;
            }
            maxMove.category = move.category;
        }
        maxMove.baseMove = move.id;
        // copy the priority for Psychic Terrain, Quick Guard
        maxMove.priority = move.priority;
        maxMove.isZOrMaxPowered = true;
        return maxMove;
    };
    BattleActions.prototype.runZPower = function (move, pokemon) {
        var _a, _b;
        var zPower = this.dex.conditions.get('zpower');
        if (move.category !== 'Status') {
            this.battle.attrLastMove('[zeffect]');
        }
        else if ((_a = move.zMove) === null || _a === void 0 ? void 0 : _a.boost) {
            this.battle.boost(move.zMove.boost, pokemon, pokemon, zPower);
        }
        else if ((_b = move.zMove) === null || _b === void 0 ? void 0 : _b.effect) {
            switch (move.zMove.effect) {
                case 'heal':
                    this.battle.heal(pokemon.maxhp, pokemon, pokemon, zPower);
                    break;
                case 'healreplacement':
                    pokemon.side.addSlotCondition(pokemon, 'healreplacement', pokemon, move);
                    break;
                case 'clearnegativeboost':
                    var boosts = {};
                    var i = void 0;
                    for (i in pokemon.boosts) {
                        if (pokemon.boosts[i] < 0) {
                            boosts[i] = 0;
                        }
                    }
                    pokemon.setBoost(boosts);
                    this.battle.add('-clearnegativeboost', pokemon, '[zeffect]');
                    break;
                case 'redirect':
                    pokemon.addVolatile('followme', pokemon, zPower);
                    break;
                case 'crit2':
                    pokemon.addVolatile('focusenergy', pokemon, zPower);
                    break;
                case 'curse':
                    if (pokemon.hasType('Ghost')) {
                        this.battle.heal(pokemon.maxhp, pokemon, pokemon, zPower);
                    }
                    else {
                        this.battle.boost({ atk: 1 }, pokemon, pokemon, zPower);
                    }
            }
        }
    };
    BattleActions.prototype.targetTypeChoices = function (targetType) {
        return CHOOSABLE_TARGETS.has(targetType);
    };
    BattleActions.prototype.combineResults = function (left, right) {
        var NOT_FAILURE = 'string';
        var NULL = 'object';
        var resultsPriorities = ['undefined', NOT_FAILURE, NULL, 'boolean', 'number'];
        if (resultsPriorities.indexOf(typeof left) > resultsPriorities.indexOf(typeof right)) {
            return left;
        }
        else if (left && !right && right !== 0) {
            return left;
        }
        else if (typeof left === 'number' && typeof right === 'number') {
            return (left + right);
        }
        else {
            return right;
        }
    };
    /**
     * 0 is a success dealing 0 damage, such as from False Swipe at 1 HP.
     *
     * Normal PS return value rules apply:
     * undefined = success, null = silent failure, false = loud failure
     */
    BattleActions.prototype.getDamage = function (source, target, move, suppressMessages) {
        if (suppressMessages === void 0) { suppressMessages = false; }
        if (typeof move === 'string')
            move = this.dex.getActiveMove(move);
        if (typeof move === 'number') {
            var basePower_1 = move;
            move = new dex_1.Dex.Move({
                basePower: basePower_1,
                type: '???',
                category: 'Physical',
                willCrit: false,
            });
            move.hit = 0;
        }
        if (!move.ignoreImmunity || (move.ignoreImmunity !== true && !move.ignoreImmunity[move.type])) {
            if (!target.runImmunity(move.type, !suppressMessages)) {
                return false;
            }
        }
        if (move.ohko)
            return target.maxhp;
        if (move.damageCallback)
            return move.damageCallback.call(this.battle, source, target);
        if (move.damage === 'level') {
            return source.level;
        }
        else if (move.damage) {
            return move.damage;
        }
        var category = this.battle.getCategory(move);
        var basePower = move.basePower;
        if (move.basePowerCallback) {
            basePower = move.basePowerCallback.call(this.battle, source, target, move);
        }
        if (!basePower)
            return basePower === 0 ? undefined : basePower;
        basePower = this.battle.clampIntRange(basePower, 1);
        var critMult;
        var critRatio = this.battle.runEvent('ModifyCritRatio', source, target, move, move.critRatio || 0);
        if (this.battle.gen <= 5) {
            critRatio = this.battle.clampIntRange(critRatio, 0, 5);
            critMult = [0, 16, 8, 4, 3, 2];
        }
        else {
            critRatio = this.battle.clampIntRange(critRatio, 0, 4);
            if (this.battle.gen === 6) {
                critMult = [0, 16, 8, 2, 1];
            }
            else {
                critMult = [0, 24, 8, 2, 1];
            }
        }
        var moveHit = target.getMoveHitData(move);
        moveHit.crit = move.willCrit || false;
        if (move.willCrit === undefined) {
            if (critRatio) {
                moveHit.crit = this.battle.randomChance(1, critMult[critRatio]);
            }
        }
        if (moveHit.crit) {
            moveHit.crit = this.battle.runEvent('CriticalHit', target, null, move);
        }
        // happens after crit calculation
        basePower = this.battle.runEvent('BasePower', source, target, move, basePower, true);
        if (!basePower)
            return 0;
        basePower = this.battle.clampIntRange(basePower, 1);
        // Hacked Max Moves have 0 base power, even if you Dynamax
        if ((!source.volatiles['dynamax'] && move.isMax) || (move.isMax && this.dex.moves.get(move.baseMove).isMax)) {
            basePower = 0;
        }
        if (basePower < 60 && source.getTypes(true).includes(move.type) && source.terastallized && move.priority <= 0 &&
            // Hard move.basePower check for moves like Dragon Energy that have variable BP
            !move.multihit && !((move.basePower === 0 || move.basePower === 150) && move.basePowerCallback)) {
            basePower = 60;
        }
        var level = source.level;
        var attacker = move.overrideOffensivePokemon === 'target' ? target : source;
        var defender = move.overrideDefensivePokemon === 'source' ? source : target;
        var isPhysical = move.category === 'Physical';
        var attackStat = move.overrideOffensiveStat || (isPhysical ? 'atk' : 'spa');
        var defenseStat = move.overrideDefensiveStat || (isPhysical ? 'def' : 'spd');
        var statTable = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
        var atkBoosts = attacker.boosts[attackStat];
        var defBoosts = defender.boosts[defenseStat];
        var ignoreNegativeOffensive = !!move.ignoreNegativeOffensive;
        var ignorePositiveDefensive = !!move.ignorePositiveDefensive;
        if (moveHit.crit) {
            ignoreNegativeOffensive = true;
            ignorePositiveDefensive = true;
        }
        var ignoreOffensive = !!(move.ignoreOffensive || (ignoreNegativeOffensive && atkBoosts < 0));
        var ignoreDefensive = !!(move.ignoreDefensive || (ignorePositiveDefensive && defBoosts > 0));
        if (ignoreOffensive) {
            this.battle.debug('Negating (sp)atk boost/penalty.');
            atkBoosts = 0;
        }
        if (ignoreDefensive) {
            this.battle.debug('Negating (sp)def boost/penalty.');
            defBoosts = 0;
        }
        var attack = attacker.calculateStat(attackStat, atkBoosts, 1, source);
        var defense = defender.calculateStat(defenseStat, defBoosts, 1, target);
        attackStat = (category === 'Physical' ? 'atk' : 'spa');
        // Apply Stat Modifiers
        attack = this.battle.runEvent('Modify' + statTable[attackStat], source, target, move, attack);
        defense = this.battle.runEvent('Modify' + statTable[defenseStat], target, source, move, defense);
        if (this.battle.gen <= 4 && ['explosion', 'selfdestruct'].includes(move.id) && defenseStat === 'def') {
            defense = this.battle.clampIntRange(Math.floor(defense / 2), 1);
        }
        var tr = this.battle.trunc;
        // int(int(int(2 * L / 5 + 2) * A * P / D) / 50);
        var baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50);
        // Calculate damage modifiers separately (order differs between generations)
        return this.modifyDamage(baseDamage, source, target, move, suppressMessages);
    };
    BattleActions.prototype.modifyDamage = function (baseDamage, pokemon, target, move, suppressMessages) {
        if (suppressMessages === void 0) { suppressMessages = false; }
        var tr = this.battle.trunc;
        if (!move.type)
            move.type = '???';
        var type = move.type;
        baseDamage += 2;
        if (move.spreadHit) {
            // multi-target modifier (doubles only)
            var spreadModifier = move.spreadModifier || (this.battle.gameType === 'freeforall' ? 0.5 : 0.75);
            this.battle.debug('Spread modifier: ' + spreadModifier);
            baseDamage = this.battle.modify(baseDamage, spreadModifier);
        }
        else if (move.multihitType === 'parentalbond' && move.hit > 1) {
            // Parental Bond modifier
            var bondModifier = this.battle.gen > 6 ? 0.25 : 0.5;
            this.battle.debug("Parental Bond modifier: ".concat(bondModifier));
            baseDamage = this.battle.modify(baseDamage, bondModifier);
        }
        // weather modifier
        baseDamage = this.battle.runEvent('WeatherModifyDamage', pokemon, target, move, baseDamage);
        // crit - not a modifier
        var isCrit = target.getMoveHitData(move).crit;
        if (isCrit) {
            baseDamage = tr(baseDamage * (move.critModifier || (this.battle.gen >= 6 ? 1.5 : 2)));
        }
        // random factor - also not a modifier
        baseDamage = this.battle.randomizer(baseDamage);
        // STAB
        if (move.forceSTAB || (type !== '???' &&
            (pokemon.hasType(type) || (pokemon.terastallized && pokemon.getTypes(false, true).includes(type))))) {
            // The "???" type never gets STAB
            // Not even if you Roost in Gen 4 and somehow manage to use
            // Struggle in the same turn.
            // (On second thought, it might be easier to get a MissingNo.)
            var stab = move.stab || 1.5;
            if (type === pokemon.terastallized && pokemon.getTypes(false, true).includes(type)) {
                // In my defense, the game hardcodes the Adaptability check like this, too.
                stab = stab === 2 ? 2.25 : 2;
            }
            else if (pokemon.terastallized && type !== pokemon.terastallized) {
                stab = 1.5;
            }
            baseDamage = this.battle.modify(baseDamage, stab);
        }
        // types
        var typeMod = target.runEffectiveness(move);
        typeMod = this.battle.clampIntRange(typeMod, -6, 6);
        target.getMoveHitData(move).typeMod = typeMod;
        if (typeMod > 0) {
            if (!suppressMessages)
                this.battle.add('-supereffective', target);
            for (var i = 0; i < typeMod; i++) {
                baseDamage *= 2;
            }
        }
        if (typeMod < 0) {
            if (!suppressMessages)
                this.battle.add('-resisted', target);
            for (var i = 0; i > typeMod; i--) {
                baseDamage = tr(baseDamage / 2);
            }
        }
        if (isCrit && !suppressMessages)
            this.battle.add('-crit', target);
        if (pokemon.status === 'brn' && move.category === 'Physical' && !pokemon.hasAbility('guts')) {
            if (this.battle.gen < 6 || move.id !== 'facade') {
                baseDamage = this.battle.modify(baseDamage, 0.5);
            }
        }
        // Generation 5, but nothing later, sets damage to 1 before the final damage modifiers
        if (this.battle.gen === 5 && !baseDamage)
            baseDamage = 1;
        // Final modifier. Modifiers that modify damage after min damage check, such as Life Orb.
        baseDamage = this.battle.runEvent('ModifyDamage', pokemon, target, move, baseDamage);
        if (move.isZOrMaxPowered && target.getMoveHitData(move).zBrokeProtect) {
            baseDamage = this.battle.modify(baseDamage, 0.25);
            this.battle.add('-zbroken', target);
        }
        // Generation 6-7 moves the check for minimum 1 damage after the final modifier...
        if (this.battle.gen !== 5 && !baseDamage)
            return 1;
        // ...but 16-bit truncation happens even later, and can truncate to 0
        return tr(baseDamage, 16);
    };
    /**
     * Confusion damage is unique - most typical modifiers that get run when calculating
     * damage (e.g. Huge Power, Life Orb, critical hits) don't apply. It also uses a 16-bit
     * context for its damage, unlike the regular damage formula (though this only comes up
     * for base damage).
     */
    BattleActions.prototype.getConfusionDamage = function (pokemon, basePower) {
        var tr = this.battle.trunc;
        var attack = pokemon.calculateStat('atk', pokemon.boosts['atk']);
        var defense = pokemon.calculateStat('def', pokemon.boosts['def']);
        var level = pokemon.level;
        var baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50) + 2;
        // Damage is 16-bit context in self-hit confusion damage
        var damage = tr(baseDamage, 16);
        damage = this.battle.randomizer(damage);
        return Math.max(1, damage);
    };
    // #endregion
    // #region MEGA EVOLUTION
    // ==================================================================
    BattleActions.prototype.canMegaEvo = function (pokemon) {
        var species = pokemon.baseSpecies;
        var altForme = species.otherFormes && this.dex.species.get(species.otherFormes[0]);
        var item = pokemon.getItem();
        // Mega Rayquaza
        if ((this.battle.gen <= 7 || this.battle.ruleTable.has('+pokemontag:past')) &&
            (altForme === null || altForme === void 0 ? void 0 : altForme.isMega) && (altForme === null || altForme === void 0 ? void 0 : altForme.requiredMove) &&
            pokemon.baseMoves.includes((0, dex_1.toID)(altForme.requiredMove)) && !item.zMove) {
            return altForme.name;
        }
        // a hacked-in Megazard X can mega evolve into Megazard Y, but not into Megazard X
        if (item.megaEvolves === species.baseSpecies && item.megaStone !== species.name) {
            return item.megaStone;
        }
        return null;
    };
    BattleActions.prototype.canUltraBurst = function (pokemon) {
        if (['Necrozma-Dawn-Wings', 'Necrozma-Dusk-Mane'].includes(pokemon.baseSpecies.name) &&
            pokemon.getItem().id === 'ultranecroziumz') {
            return "Necrozma-Ultra";
        }
        return null;
    };
    BattleActions.prototype.runMegaEvo = function (pokemon) {
        var speciesid = pokemon.canMegaEvo || pokemon.canUltraBurst;
        if (!speciesid)
            return false;
        pokemon.formeChange(speciesid, pokemon.getItem(), true);
        // Limit one mega evolution
        var wasMega = pokemon.canMegaEvo;
        for (var _i = 0, _a = pokemon.side.pokemon; _i < _a.length; _i++) {
            var ally = _a[_i];
            if (wasMega) {
                ally.canMegaEvo = null;
            }
            else {
                ally.canUltraBurst = null;
            }
        }
        this.battle.runEvent('AfterMega', pokemon);
        return true;
    };
    BattleActions.prototype.canTerastallize = function (pokemon) {
        if (pokemon.getItem().zMove || pokemon.canMegaEvo || this.dex.gen !== 9) {
            return null;
        }
        return pokemon.teraType;
    };
    BattleActions.prototype.terastallize = function (pokemon) {
        var _a;
        if (((_a = pokemon.illusion) === null || _a === void 0 ? void 0 : _a.species.baseSpecies) === 'Ogerpon') {
            this.battle.singleEvent('End', this.dex.abilities.get('Illusion'), pokemon.abilityState, pokemon);
        }
        var type = pokemon.teraType;
        this.battle.add('-terastallize', pokemon, type);
        pokemon.terastallized = type;
        for (var _i = 0, _b = pokemon.side.pokemon; _i < _b.length; _i++) {
            var ally = _b[_i];
            ally.canTerastallize = null;
        }
        pokemon.addedType = '';
        pokemon.knownType = true;
        pokemon.apparentType = type;
        if (pokemon.species.baseSpecies === 'Ogerpon') {
            var tera = pokemon.species.id === 'ogerpon' ? 'tealtera' : 'tera';
            pokemon.formeChange(pokemon.species.id + tera, pokemon.getItem(), true);
        }
        this.battle.runEvent('AfterTerastallization', pokemon);
    };
    return BattleActions;
}());
exports.BattleActions = BattleActions;
