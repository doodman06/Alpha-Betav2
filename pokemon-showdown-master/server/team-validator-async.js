"use strict";
/**
 * Team Validator
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Spawns a child process to validate teams.
 *
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PM = exports.get = exports.TeamValidatorAsync = void 0;
var team_validator_1 = require("../sim/team-validator");
var TeamValidatorAsync = /** @class */ (function () {
    function TeamValidatorAsync(format) {
        this.format = Dex.formats.get(format);
    }
    TeamValidatorAsync.prototype.validateTeam = function (team, options) {
        var formatid = this.format.id;
        if (this.format.customRules)
            formatid += '@@@' + this.format.customRules.join(',');
        if (team.length > (25 * 1024 - 6)) { // don't even let it go to the child process
            return Promise.resolve('0Your team is over 25KB. Please use a smaller team.');
        }
        return exports.PM.query({ formatid: formatid, options: options, team: team });
    };
    TeamValidatorAsync.get = function (format) {
        return new TeamValidatorAsync(format);
    };
    return TeamValidatorAsync;
}());
exports.TeamValidatorAsync = TeamValidatorAsync;
exports.get = TeamValidatorAsync.get;
/*********************************************************
 * Process manager
 *********************************************************/
var process_manager_1 = require("../lib/process-manager");
exports.PM = new process_manager_1.QueryProcessManager(module, function (message) {
    var formatid = message.formatid, options = message.options, team = message.team;
    var parsedTeam = Teams.unpack(team);
    if (Config.debugvalidatorprocesses && process.send) {
        process.send('DEBUG\n' + JSON.stringify(message));
    }
    var problems;
    try {
        problems = team_validator_1.TeamValidator.get(formatid).validateTeam(parsedTeam, options);
    }
    catch (err) {
        Monitor.crashlog(err, 'A team validation', {
            formatid: formatid,
            team: team,
        });
        problems = [
            "Your team crashed the validator. We'll fix this crash within a few hours (we're automatically notified)," +
                " but if you don't want to wait, just use a different team for now.",
        ];
    }
    if (problems === null || problems === void 0 ? void 0 : problems.length) {
        return '0' + problems.join('\n');
    }
    var packedTeam = Teams.pack(parsedTeam);
    // console.log('FROM: ' + message.substr(pipeIndex2 + 1));
    // console.log('TO: ' + packedTeam);
    return '1' + packedTeam;
}, 2 * 60 * 1000);
if (!exports.PM.isParentProcess) {
    // This is a child process!
    global.Config = require('./config-loader').Config;
    global.Monitor = {
        crashlog: function (error, source, details) {
            if (source === void 0) { source = 'A team validator process'; }
            if (details === void 0) { details = null; }
            var repr = JSON.stringify([error.name, error.message, source, details]);
            process.send("THROW\n@!!@".concat(repr, "\n").concat(error.stack));
        },
    };
    if (Config.crashguard) {
        process.on('uncaughtException', function (err) {
            Monitor.crashlog(err, "A team validator process");
        });
        process.on('unhandledRejection', function (err) {
            Monitor.crashlog(err || {}, 'A team validator process Promise');
        });
    }
    global.Dex = require('../sim/dex').Dex.includeData();
    global.Teams = require('../sim/teams').Teams;
    // eslint-disable-next-line no-eval
    require('../lib/repl').Repl.start("team-validator-".concat(process.pid), function (cmd) { return eval(cmd); });
}
else {
    exports.PM.spawn(global.Config ? Config.validatorprocesses : 1);
}
