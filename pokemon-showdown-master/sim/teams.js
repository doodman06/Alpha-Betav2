"use strict";
/**
 * Teams
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Functions for converting and generating teams.
 *
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Teams = void 0;
var dex_1 = require("./dex");
exports.Teams = new /** @class */ (function () {
    function Teams() {
    }
    Teams.prototype.pack = function (team) {
        if (!team)
            return '';
        function getIv(ivs, s) {
            return ivs[s] === 31 || ivs[s] === undefined ? '' : ivs[s].toString();
        }
        var buf = '';
        for (var _i = 0, team_1 = team; _i < team_1.length; _i++) {
            var set = team_1[_i];
            if (buf)
                buf += ']';
            // name
            buf += (set.name || set.species);
            // species
            var id = this.packName(set.species || set.name);
            buf += '|' + (this.packName(set.name || set.species) === id ? '' : id);
            // item
            buf += '|' + this.packName(set.item);
            // ability
            buf += '|' + this.packName(set.ability);
            // moves
            buf += '|' + set.moves.map(this.packName).join(',');
            // nature
            buf += '|' + (set.nature || '');
            // evs
            var evs = '|';
            if (set.evs) {
                evs = '|' + (set.evs['hp'] || '') + ',' + (set.evs['atk'] || '') + ',' + (set.evs['def'] || '') + ',' + (set.evs['spa'] || '') + ',' + (set.evs['spd'] || '') + ',' + (set.evs['spe'] || '');
            }
            if (evs === '|,,,,,') {
                buf += '|';
            }
            else {
                buf += evs;
            }
            // gender
            if (set.gender) {
                buf += '|' + set.gender;
            }
            else {
                buf += '|';
            }
            // ivs
            var ivs = '|';
            if (set.ivs) {
                ivs = '|' + getIv(set.ivs, 'hp') + ',' + getIv(set.ivs, 'atk') + ',' + getIv(set.ivs, 'def') +
                    ',' + getIv(set.ivs, 'spa') + ',' + getIv(set.ivs, 'spd') + ',' + getIv(set.ivs, 'spe');
            }
            if (ivs === '|,,,,,') {
                buf += '|';
            }
            else {
                buf += ivs;
            }
            // shiny
            if (set.shiny) {
                buf += '|S';
            }
            else {
                buf += '|';
            }
            // level
            if (set.level && set.level !== 100) {
                buf += '|' + set.level;
            }
            else {
                buf += '|';
            }
            // happiness
            if (set.happiness !== undefined && set.happiness !== 255) {
                buf += '|' + set.happiness;
            }
            else {
                buf += '|';
            }
            if (set.pokeball || set.hpType || set.gigantamax ||
                (set.dynamaxLevel !== undefined && set.dynamaxLevel !== 10) || set.teraType) {
                buf += ',' + (set.hpType || '');
                buf += ',' + this.packName(set.pokeball || '');
                buf += ',' + (set.gigantamax ? 'G' : '');
                buf += ',' + (set.dynamaxLevel !== undefined && set.dynamaxLevel !== 10 ? set.dynamaxLevel : '');
                buf += ',' + (set.teraType || '');
            }
        }
        return buf;
    };
    Teams.prototype.unpack = function (buf) {
        var _this = this;
        if (!buf)
            return null;
        if (typeof buf !== 'string')
            return buf;
        if (buf.startsWith('[') && buf.endsWith(']')) {
            try {
                buf = this.pack(JSON.parse(buf));
            }
            catch (_a) {
                return null;
            }
        }
        var team = [];
        var i = 0;
        var j = 0;
        // limit to 24
        for (var count = 0; count < 24; count++) {
            var set = {};
            team.push(set);
            // name
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            set.name = buf.substring(i, j);
            i = j + 1;
            // species
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            set.species = this.unpackName(buf.substring(i, j), dex_1.Dex.species) || set.name;
            i = j + 1;
            // item
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            set.item = this.unpackName(buf.substring(i, j), dex_1.Dex.items);
            i = j + 1;
            // ability
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            var ability = buf.substring(i, j);
            var species = dex_1.Dex.species.get(set.species);
            set.ability = ['', '0', '1', 'H', 'S'].includes(ability) ?
                species.abilities[ability || '0'] || (ability === '' ? '' : '!!!ERROR!!!') :
                this.unpackName(ability, dex_1.Dex.abilities);
            i = j + 1;
            // moves
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            set.moves = buf.substring(i, j).split(',', 24).map(function (name) { return _this.unpackName(name, dex_1.Dex.moves); });
            i = j + 1;
            // nature
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            set.nature = this.unpackName(buf.substring(i, j), dex_1.Dex.natures);
            i = j + 1;
            // evs
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            if (j !== i) {
                var evs = buf.substring(i, j).split(',', 6);
                set.evs = {
                    hp: Number(evs[0]) || 0,
                    atk: Number(evs[1]) || 0,
                    def: Number(evs[2]) || 0,
                    spa: Number(evs[3]) || 0,
                    spd: Number(evs[4]) || 0,
                    spe: Number(evs[5]) || 0,
                };
            }
            i = j + 1;
            // gender
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            if (i !== j)
                set.gender = buf.substring(i, j);
            i = j + 1;
            // ivs
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            if (j !== i) {
                var ivs = buf.substring(i, j).split(',', 6);
                set.ivs = {
                    hp: ivs[0] === '' ? 31 : Number(ivs[0]) || 0,
                    atk: ivs[1] === '' ? 31 : Number(ivs[1]) || 0,
                    def: ivs[2] === '' ? 31 : Number(ivs[2]) || 0,
                    spa: ivs[3] === '' ? 31 : Number(ivs[3]) || 0,
                    spd: ivs[4] === '' ? 31 : Number(ivs[4]) || 0,
                    spe: ivs[5] === '' ? 31 : Number(ivs[5]) || 0,
                };
            }
            i = j + 1;
            // shiny
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            if (i !== j)
                set.shiny = true;
            i = j + 1;
            // level
            j = buf.indexOf('|', i);
            if (j < 0)
                return null;
            if (i !== j)
                set.level = parseInt(buf.substring(i, j));
            i = j + 1;
            // happiness
            j = buf.indexOf(']', i);
            var misc = void 0;
            if (j < 0) {
                if (i < buf.length)
                    misc = buf.substring(i).split(',', 6);
            }
            else {
                if (i !== j)
                    misc = buf.substring(i, j).split(',', 6);
            }
            if (misc) {
                set.happiness = (misc[0] ? Number(misc[0]) : 255);
                set.hpType = misc[1] || '';
                set.pokeball = this.unpackName(misc[2] || '', dex_1.Dex.items);
                set.gigantamax = !!misc[3];
                set.dynamaxLevel = (misc[4] ? Number(misc[4]) : 10);
                set.teraType = misc[5];
            }
            if (j < 0)
                break;
            i = j + 1;
        }
        return team;
    };
    /** Very similar to toID but without the lowercase conversion */
    Teams.prototype.packName = function (name) {
        if (!name)
            return '';
        return name.replace(/[^A-Za-z0-9]+/g, '');
    };
    /** Will not entirely recover a packed name, but will be a pretty readable guess */
    Teams.prototype.unpackName = function (name, dexTable) {
        if (!name)
            return '';
        if (dexTable) {
            var obj = dexTable.get(name);
            if (obj.exists)
                return obj.name;
        }
        return name.replace(/([0-9]+)/g, ' $1 ').replace(/([A-Z])/g, ' $1').replace(/[ ][ ]/g, ' ').trim();
    };
    /**
     * Exports a team in human-readable PS export format
     */
    Teams.prototype.export = function (team, options) {
        var output = '';
        for (var _i = 0, team_2 = team; _i < team_2.length; _i++) {
            var set = team_2[_i];
            output += this.exportSet(set, options) + "\n";
        }
        return output;
    };
    Teams.prototype.exportSet = function (set, _a) {
        var _b = _a === void 0 ? {} : _a, hideStats = _b.hideStats;
        var out = "";
        // core
        if (set.name && set.name !== set.species) {
            out += "".concat(set.name, " (").concat(set.species, ")");
        }
        else {
            out += set.species;
        }
        if (set.gender === 'M')
            out += " (M)";
        if (set.gender === 'F')
            out += " (F)";
        if (set.item)
            out += " @ ".concat(set.item);
        out += "  \n";
        if (set.ability) {
            out += "Ability: ".concat(set.ability, "  \n");
        }
        // details
        if (set.level && set.level !== 100) {
            out += "Level: ".concat(set.level, "  \n");
        }
        if (set.shiny) {
            out += "Shiny: Yes  \n";
        }
        if (typeof set.happiness === 'number' && set.happiness !== 255 && !isNaN(set.happiness)) {
            out += "Happiness: ".concat(set.happiness, "  \n");
        }
        if (set.pokeball) {
            out += "Pokeball: ".concat(set.pokeball, "  \n");
        }
        if (set.hpType) {
            out += "Hidden Power: ".concat(set.hpType, "  \n");
        }
        if (typeof set.dynamaxLevel === 'number' && set.dynamaxLevel !== 10 && !isNaN(set.dynamaxLevel)) {
            out += "Dynamax Level: ".concat(set.dynamaxLevel, "  \n");
        }
        if (set.gigantamax) {
            out += "Gigantamax: Yes  \n";
        }
        if (set.teraType) {
            out += "Tera Type: ".concat(set.teraType, "  \n");
        }
        // stats
        if (!hideStats) {
            if (set.evs) {
                var stats = dex_1.Dex.stats.ids().map(function (stat) { return set.evs[stat] ?
                    "".concat(set.evs[stat], " ").concat(dex_1.Dex.stats.shortNames[stat]) : ""; }).filter(Boolean);
                if (stats.length) {
                    out += "EVs: ".concat(stats.join(" / "), "  \n");
                }
            }
            if (set.nature) {
                out += "".concat(set.nature, " Nature  \n");
            }
            if (set.ivs) {
                var stats = dex_1.Dex.stats.ids().map(function (stat) { return (set.ivs[stat] !== 31 && set.ivs[stat] !== undefined) ?
                    "".concat(set.ivs[stat] || 0, " ").concat(dex_1.Dex.stats.shortNames[stat]) : ""; }).filter(Boolean);
                if (stats.length) {
                    out += "IVs: ".concat(stats.join(" / "), "  \n");
                }
            }
        }
        // moves
        for (var _i = 0, _c = set.moves; _i < _c.length; _i++) {
            var move = _c[_i];
            if (move.startsWith("Hidden Power ") && move.charAt(13) !== '[') {
                move = "Hidden Power [".concat(move.slice(13), "]");
            }
            out += "- ".concat(move, "  \n");
        }
        return out;
    };
    Teams.prototype.parseExportedTeamLine = function (line, isFirstLine, set, aggressive) {
        var _a;
        if (isFirstLine) {
            var item = void 0;
            _a = line.split(' @ '), line = _a[0], item = _a[1];
            if (item) {
                set.item = item;
                if ((0, dex_1.toID)(set.item) === 'noitem')
                    set.item = '';
            }
            if (line.endsWith(' (M)')) {
                set.gender = 'M';
                line = line.slice(0, -4);
            }
            if (line.endsWith(' (F)')) {
                set.gender = 'F';
                line = line.slice(0, -4);
            }
            if (line.endsWith(')') && line.includes('(')) {
                var _b = line.slice(0, -1).split('('), name_1 = _b[0], species = _b[1];
                set.species = dex_1.Dex.species.get(species).name;
                set.name = name_1.trim();
            }
            else {
                set.species = dex_1.Dex.species.get(line).name;
                set.name = '';
            }
        }
        else if (line.startsWith('Trait: ')) {
            line = line.slice(7);
            set.ability = aggressive ? (0, dex_1.toID)(line) : line;
        }
        else if (line.startsWith('Ability: ')) {
            line = line.slice(9);
            set.ability = aggressive ? (0, dex_1.toID)(line) : line;
        }
        else if (line === 'Shiny: Yes') {
            set.shiny = true;
        }
        else if (line.startsWith('Level: ')) {
            line = line.slice(7);
            set.level = +line;
        }
        else if (line.startsWith('Happiness: ')) {
            line = line.slice(11);
            set.happiness = +line;
        }
        else if (line.startsWith('Pokeball: ')) {
            line = line.slice(10);
            set.pokeball = aggressive ? (0, dex_1.toID)(line) : line;
        }
        else if (line.startsWith('Hidden Power: ')) {
            line = line.slice(14);
            set.hpType = aggressive ? (0, dex_1.toID)(line) : line;
        }
        else if (line.startsWith('Tera Type: ')) {
            line = line.slice(11);
            set.teraType = aggressive ? line.replace(/[^a-zA-Z0-9]/g, '') : line;
        }
        else if (line === 'Gigantamax: Yes') {
            set.gigantamax = true;
        }
        else if (line.startsWith('EVs: ')) {
            line = line.slice(5);
            var evLines = line.split('/');
            set.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
            for (var _i = 0, evLines_1 = evLines; _i < evLines_1.length; _i++) {
                var evLine = evLines_1[_i];
                var _c = evLine.trim().split(' '), statValue = _c[0], statName = _c[1];
                var statid = dex_1.Dex.stats.getID(statName);
                if (!statid)
                    continue;
                var value = parseInt(statValue);
                set.evs[statid] = value;
            }
        }
        else if (line.startsWith('IVs: ')) {
            line = line.slice(5);
            var ivLines = line.split('/');
            set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
            for (var _d = 0, ivLines_1 = ivLines; _d < ivLines_1.length; _d++) {
                var ivLine = ivLines_1[_d];
                var _e = ivLine.trim().split(' '), statValue = _e[0], statName = _e[1];
                var statid = dex_1.Dex.stats.getID(statName);
                if (!statid)
                    continue;
                var value = parseInt(statValue);
                if (isNaN(value))
                    value = 31;
                set.ivs[statid] = value;
            }
        }
        else if (/^[A-Za-z]+ (N|n)ature/.test(line)) {
            var natureIndex = line.indexOf(' Nature');
            if (natureIndex === -1)
                natureIndex = line.indexOf(' nature');
            if (natureIndex === -1)
                return;
            line = line.substr(0, natureIndex);
            if (line !== 'undefined')
                set.nature = aggressive ? (0, dex_1.toID)(line) : line;
        }
        else if (line.startsWith('-') || line.startsWith('~')) {
            line = line.slice(line.charAt(1) === ' ' ? 2 : 1);
            if (line.startsWith('Hidden Power [')) {
                var hpType = line.slice(14, -1);
                line = 'Hidden Power ' + hpType;
                if (!set.ivs && dex_1.Dex.types.isName(hpType)) {
                    set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
                    var hpIVs = dex_1.Dex.types.get(hpType).HPivs || {};
                    for (var statid in hpIVs) {
                        set.ivs[statid] = hpIVs[statid];
                    }
                }
            }
            if (line === 'Frustration' && set.happiness === undefined) {
                set.happiness = 0;
            }
            set.moves.push(line);
        }
    };
    /** Accepts a team in any format (JSON, packed, or exported) */
    Teams.prototype.import = function (buffer, aggressive) {
        var sanitize = aggressive ? dex_1.toID : dex_1.Dex.getName;
        if (buffer.startsWith('[')) {
            try {
                var team = JSON.parse(buffer);
                if (!Array.isArray(team))
                    throw new Error("Team should be an Array but isn't");
                for (var _i = 0, team_3 = team; _i < team_3.length; _i++) {
                    var set = team_3[_i];
                    set.name = sanitize(set.name);
                    set.species = sanitize(set.species);
                    set.item = sanitize(set.item);
                    set.ability = sanitize(set.ability);
                    set.gender = sanitize(set.gender);
                    set.nature = sanitize(set.nature);
                    var evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
                    if (set.evs) {
                        for (var statid in evs) {
                            if (typeof set.evs[statid] === 'number')
                                evs[statid] = set.evs[statid];
                        }
                    }
                    set.evs = evs;
                    var ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
                    if (set.ivs) {
                        for (var statid in ivs) {
                            if (typeof set.ivs[statid] === 'number')
                                ivs[statid] = set.ivs[statid];
                        }
                    }
                    set.ivs = ivs;
                    if (!Array.isArray(set.moves)) {
                        set.moves = [];
                    }
                    else {
                        set.moves = set.moves.map(sanitize);
                    }
                }
                return team;
            }
            catch (_a) { }
        }
        var lines = buffer.split("\n");
        var sets = [];
        var curSet = null;
        while (lines.length && !lines[0])
            lines.shift();
        while (lines.length && !lines[lines.length - 1])
            lines.pop();
        if (lines.length === 1 && lines[0].includes('|')) {
            return this.unpack(lines[0]);
        }
        for (var _b = 0, lines_1 = lines; _b < lines_1.length; _b++) {
            var line = lines_1[_b];
            line = line.trim();
            if (line === '' || line === '---') {
                curSet = null;
            }
            else if (line.startsWith('===')) {
                // team backup format; ignore
            }
            else if (!curSet) {
                curSet = {
                    name: '', species: '', item: '', ability: '', gender: '',
                    nature: '',
                    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
                    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
                    level: 100,
                    moves: [],
                };
                sets.push(curSet);
                this.parseExportedTeamLine(line, true, curSet, aggressive);
            }
            else {
                this.parseExportedTeamLine(line, false, curSet, aggressive);
            }
        }
        return sets;
    };
    Teams.prototype.getGenerator = function (format, seed) {
        if (seed === void 0) { seed = null; }
        var TeamGenerator;
        if ((0, dex_1.toID)(format).includes('gen9computergeneratedteams')) {
            TeamGenerator = require(dex_1.Dex.forFormat(format).dataDir + '/cg-teams').default;
        }
        else if ((0, dex_1.toID)(format).includes('gen7randomdoublesbattle')) {
            TeamGenerator = require(dex_1.Dex.forFormat(format).dataDir + '/random-doubles-teams').default;
        }
        else {
            TeamGenerator = require(dex_1.Dex.forFormat(format).dataDir + '/random-teams').default;
        }
        return new TeamGenerator(format, seed);
    };
    Teams.prototype.generate = function (format, options) {
        if (options === void 0) { options = null; }
        return this.getGenerator(format, options === null || options === void 0 ? void 0 : options.seed).getTeam(options);
    };
    return Teams;
}());
exports.default = exports.Teams;
