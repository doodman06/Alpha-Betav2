"use strict";
/**
 * Main file
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This is the main Pokemon Showdown app, and the file that the
 * `pokemon-showdown` script runs if you start Pokemon Showdown normally.
 *
 * This file sets up our SockJS server, which handles communication
 * between users and your server, and also sets up globals. You can
 * see details in their corresponding files, but here's an overview:
 *
 * Users - from users.ts
 *
 *   Most of the communication with users happens in users.ts, we just
 *   forward messages between the sockets.js and users.ts.
 *
 *   It exports the global tables `Users.users` and `Users.connections`.
 *
 * Rooms - from rooms.ts
 *
 *   Every chat room and battle is a room, and what they do is done in
 *   rooms.ts. There's also a global room which every user is in, and
 *   handles miscellaneous things like welcoming the user.
 *
 *   It exports the global table `Rooms.rooms`.
 *
 * Dex - from sim/dex.ts
 *
 *   Handles getting data about Pokemon, items, etc.
 *
 * Ladders - from ladders.ts and ladders-remote.ts
 *
 *   Handles Elo rating tracking for players.
 *
 * Chat - from chat.ts
 *
 *   Handles chat and parses chat commands like /me and /ban
 *
 * Sockets - from sockets.js
 *
 *   Used to abstract out network connections. sockets.js handles
 *   the actual server and connection set-up.
 *
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listen = void 0;
// NOTE: This file intentionally doesn't use too many modern JavaScript
// features, so that it doesn't crash old versions of Node.js, so we
// can successfully print the "We require Node.js 16+" message.
// Check for version
var nodeVersion = parseInt(process.versions.node);
if (isNaN(nodeVersion) || nodeVersion < 16) {
    throw new Error("We require Node.js version 16 or later; you're using " + process.version);
}
var lib_1 = require("../lib");
/*********************************************************
 * Set up most of our globals
 * This is in a function because swc runs `import` before any code,
 * and many of our imports require the `Config` global to be set up.
 *********************************************************/
function setupGlobals() {
    var ConfigLoader = require('./config-loader');
    global.Config = ConfigLoader.Config;
    var Monitor = require('./monitor').Monitor;
    global.Monitor = Monitor;
    global.__version = { head: '' };
    void Monitor.version().then(function (hash) {
        global.__version.tree = hash;
    });
    if (Config.watchconfig) {
        (0, lib_1.FS)('config/config.js').onModify(function () {
            var _a;
            try {
                global.Config = ConfigLoader.load(true);
                // ensure that battle prefixes configured via the chat plugin are not overwritten
                // by battle prefixes manually specified in config.js
                (_a = Chat.plugins['username-prefixes']) === null || _a === void 0 ? void 0 : _a.prefixManager.refreshConfig(true);
                Monitor.notice('Reloaded ../config/config.js');
            }
            catch (e) {
                Monitor.adminlog("Error reloading ../config/config.js: " + e.stack);
            }
        });
    }
    var Dex = require('../sim/dex').Dex;
    global.Dex = Dex;
    global.toID = Dex.toID;
    var Teams = require('../sim/teams').Teams;
    global.Teams = Teams;
    var LoginServer = require('./loginserver').LoginServer;
    global.LoginServer = LoginServer;
    var Ladders = require('./ladders').Ladders;
    global.Ladders = Ladders;
    var Chat = require('./chat').Chat;
    global.Chat = Chat;
    var Users = require('./users').Users;
    global.Users = Users;
    var Punishments = require('./punishments').Punishments;
    global.Punishments = Punishments;
    var Rooms = require('./rooms').Rooms;
    global.Rooms = Rooms;
    // We initialize the global room here because roomlogs.ts needs the Rooms global
    Rooms.global = new Rooms.GlobalRoomState();
    var Verifier = require('./verifier');
    global.Verifier = Verifier;
    Verifier.PM.spawn();
    var Tournaments = require('./tournaments').Tournaments;
    global.Tournaments = Tournaments;
    var IPTools = require('./ip-tools').IPTools;
    global.IPTools = IPTools;
    void IPTools.loadHostsAndRanges();
}
setupGlobals();
if (Config.crashguard) {
    // graceful crash - allow current battles to finish before restarting
    process.on('uncaughtException', function (err) {
        Monitor.crashlog(err, 'The main process');
    });
    process.on('unhandledRejection', function (err) {
        Monitor.crashlog(err, 'A main process Promise');
    });
}
/*********************************************************
 * Start networking processes to be connected to
 *********************************************************/
var sockets_1 = require("./sockets");
global.Sockets = sockets_1.Sockets;
function listen(port, bindAddress, workerCount) {
    sockets_1.Sockets.listen(port, bindAddress, workerCount);
}
exports.listen = listen;
if (require.main === module) {
    // Launch the server directly when app.js is the main module. Otherwise,
    // in the case of app.js being imported as a module (e.g. unit tests),
    // postpone launching until app.listen() is called.
    var port = void 0;
    for (var _i = 0, _a = process.argv; _i < _a.length; _i++) {
        var arg = _a[_i];
        if (/^[0-9]+$/.test(arg)) {
            port = parseInt(arg);
            break;
        }
    }
    sockets_1.Sockets.listen(port);
}
/*********************************************************
 * Set up our last global
 *********************************************************/
var TeamValidatorAsync = require("./team-validator-async");
global.TeamValidatorAsync = TeamValidatorAsync;
TeamValidatorAsync.PM.spawn();
/*********************************************************
 * Start up the REPL server
 *********************************************************/
// eslint-disable-next-line no-eval
lib_1.Repl.start('app', function (cmd) { return eval(cmd); });
/*********************************************************
 * Fully initialized, run startup hook
 *********************************************************/
if (Config.startuphook) {
    process.nextTick(Config.startuphook);
}
if (Config.ofemain) {
    try {
        require.resolve('node-oom-heapdump');
    }
    catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND')
            throw e; // should never happen
        throw new Error('node-oom-heapdump is not installed, but it is a required dependency if Config.ofe is set to true! ' +
            'Run npm install node-oom-heapdump and restart the server.');
    }
    // Create a heapdump if the process runs out of memory.
    global.nodeOomHeapdump = require('node-oom-heapdump')({
        addTimestamp: true,
    });
}
