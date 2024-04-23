"use strict";
/**
 * Simulator Field
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Field = void 0;
var state_1 = require("./state");
var dex_1 = require("./dex");
var Field = /** @class */ (function () {
    function Field(battle) {
        this.battle = battle;
        var fieldScripts = this.battle.format.field || this.battle.dex.data.Scripts.field;
        if (fieldScripts)
            Object.assign(this, fieldScripts);
        this.id = '';
        this.weather = '';
        this.weatherState = { id: '' };
        this.terrain = '';
        this.terrainState = { id: '' };
        this.pseudoWeather = {};
    }
    Field.prototype.toJSON = function () {
        return state_1.State.serializeField(this);
    };
    Field.prototype.setWeather = function (status, source, sourceEffect) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        status = this.battle.dex.conditions.get(status);
        if (!sourceEffect && this.battle.effect)
            sourceEffect = this.battle.effect;
        if (!source && this.battle.event && this.battle.event.target)
            source = this.battle.event.target;
        if (source === 'debug')
            source = this.battle.sides[0].active[0];
        if (this.weather === status.id) {
            if (sourceEffect && sourceEffect.effectType === 'Ability') {
                if (this.battle.gen > 5 || this.weatherState.duration === 0) {
                    return false;
                }
            }
            else if (this.battle.gen > 2 || status.id === 'sandstorm') {
                return false;
            }
        }
        if (source) {
            var result = this.battle.runEvent('SetWeather', source, source, status);
            if (!result) {
                if (result === false) {
                    if (sourceEffect === null || sourceEffect === void 0 ? void 0 : sourceEffect.weather) {
                        this.battle.add('-fail', source, sourceEffect, '[from] ' + this.weather);
                    }
                    else if (sourceEffect && sourceEffect.effectType === 'Ability') {
                        this.battle.add('-ability', source, sourceEffect, '[from] ' + this.weather, '[fail]');
                    }
                }
                return null;
            }
        }
        var prevWeather = this.weather;
        var prevWeatherState = this.weatherState;
        this.weather = status.id;
        this.weatherState = { id: status.id };
        if (source) {
            this.weatherState.source = source;
            this.weatherState.sourceSlot = source.getSlot();
        }
        if (status.duration) {
            this.weatherState.duration = status.duration;
        }
        if (status.durationCallback) {
            if (!source)
                throw new Error("setting weather without a source");
            this.weatherState.duration = status.durationCallback.call(this.battle, source, source, sourceEffect);
        }
        if (!this.battle.singleEvent('FieldStart', status, this.weatherState, this, source, sourceEffect)) {
            this.weather = prevWeather;
            this.weatherState = prevWeatherState;
            return false;
        }
        this.battle.eachEvent('WeatherChange', sourceEffect);
        return true;
    };
    Field.prototype.clearWeather = function () {
        if (!this.weather)
            return false;
        var prevWeather = this.getWeather();
        this.battle.singleEvent('FieldEnd', prevWeather, this.weatherState, this);
        this.weather = '';
        this.weatherState = { id: '' };
        this.battle.eachEvent('WeatherChange');
        return true;
    };
    Field.prototype.effectiveWeather = function () {
        if (this.suppressingWeather())
            return '';
        return this.weather;
    };
    Field.prototype.suppressingWeather = function () {
        for (var _i = 0, _a = this.battle.sides; _i < _a.length; _i++) {
            var side = _a[_i];
            for (var _b = 0, _c = side.active; _b < _c.length; _b++) {
                var pokemon = _c[_b];
                if (pokemon && !pokemon.fainted && !pokemon.ignoringAbility() && pokemon.getAbility().suppressWeather) {
                    return true;
                }
            }
        }
        return false;
    };
    Field.prototype.isWeather = function (weather) {
        var ourWeather = this.effectiveWeather();
        if (!Array.isArray(weather)) {
            return ourWeather === (0, dex_1.toID)(weather);
        }
        return weather.map(dex_1.toID).includes(ourWeather);
    };
    Field.prototype.getWeather = function () {
        return this.battle.dex.conditions.getByID(this.weather);
    };
    Field.prototype.setTerrain = function (status, source, sourceEffect) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        status = this.battle.dex.conditions.get(status);
        if (!sourceEffect && this.battle.effect)
            sourceEffect = this.battle.effect;
        if (!source && this.battle.event && this.battle.event.target)
            source = this.battle.event.target;
        if (source === 'debug')
            source = this.battle.sides[0].active[0];
        if (!source)
            throw new Error("setting terrain without a source");
        if (this.terrain === status.id)
            return false;
        var prevTerrain = this.terrain;
        var prevTerrainState = this.terrainState;
        this.terrain = status.id;
        this.terrainState = {
            id: status.id,
            source: source,
            sourceSlot: source.getSlot(),
            duration: status.duration,
        };
        if (status.durationCallback) {
            this.terrainState.duration = status.durationCallback.call(this.battle, source, source, sourceEffect);
        }
        if (!this.battle.singleEvent('FieldStart', status, this.terrainState, this, source, sourceEffect)) {
            this.terrain = prevTerrain;
            this.terrainState = prevTerrainState;
            return false;
        }
        this.battle.eachEvent('TerrainChange', sourceEffect);
        return true;
    };
    Field.prototype.clearTerrain = function () {
        if (!this.terrain)
            return false;
        var prevTerrain = this.getTerrain();
        this.battle.singleEvent('FieldEnd', prevTerrain, this.terrainState, this);
        this.terrain = '';
        this.terrainState = { id: '' };
        this.battle.eachEvent('TerrainChange');
        return true;
    };
    Field.prototype.effectiveTerrain = function (target) {
        if (this.battle.event && !target)
            target = this.battle.event.target;
        return this.battle.runEvent('TryTerrain', target) ? this.terrain : '';
    };
    Field.prototype.isTerrain = function (terrain, target) {
        var ourTerrain = this.effectiveTerrain(target);
        if (!Array.isArray(terrain)) {
            return ourTerrain === (0, dex_1.toID)(terrain);
        }
        return terrain.map(dex_1.toID).includes(ourTerrain);
    };
    Field.prototype.getTerrain = function () {
        return this.battle.dex.conditions.getByID(this.terrain);
    };
    Field.prototype.addPseudoWeather = function (status, source, sourceEffect) {
        if (source === void 0) { source = null; }
        if (sourceEffect === void 0) { sourceEffect = null; }
        if (!source && this.battle.event && this.battle.event.target)
            source = this.battle.event.target;
        if (source === 'debug')
            source = this.battle.sides[0].active[0];
        status = this.battle.dex.conditions.get(status);
        var state = this.pseudoWeather[status.id];
        if (state) {
            if (!status.onFieldRestart)
                return false;
            return this.battle.singleEvent('FieldRestart', status, state, this, source, sourceEffect);
        }
        state = this.pseudoWeather[status.id] = {
            id: status.id,
            source: source,
            sourceSlot: source === null || source === void 0 ? void 0 : source.getSlot(),
            duration: status.duration,
        };
        if (status.durationCallback) {
            if (!source)
                throw new Error("setting fieldcond without a source");
            state.duration = status.durationCallback.call(this.battle, source, source, sourceEffect);
        }
        if (!this.battle.singleEvent('FieldStart', status, state, this, source, sourceEffect)) {
            delete this.pseudoWeather[status.id];
            return false;
        }
        this.battle.runEvent('PseudoWeatherChange', source, source, status);
        return true;
    };
    Field.prototype.getPseudoWeather = function (status) {
        status = this.battle.dex.conditions.get(status);
        return this.pseudoWeather[status.id] ? status : null;
    };
    Field.prototype.removePseudoWeather = function (status) {
        status = this.battle.dex.conditions.get(status);
        var state = this.pseudoWeather[status.id];
        if (!state)
            return false;
        this.battle.singleEvent('FieldEnd', status, state, this);
        delete this.pseudoWeather[status.id];
        return true;
    };
    Field.prototype.destroy = function () {
        // deallocate ourself
        // get rid of some possibly-circular references
        this.battle = null;
    };
    return Field;
}());
exports.Field = Field;
