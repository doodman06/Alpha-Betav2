/**
 * Attribution:
 * Part of this config.js file (Liness 8 - 49) is from https://github.com/TalkTakesTime/Pokemon-Showdown-Bot/blob/master/config-example.js
 * It was taken from this project to simplify the process of connecting to the server.
 * Is was edited to connect using the bot's credentials.
 */

// The WEBSOCKET server and port the bot should connect to.
// Most of the time this isn't the same as the URL, check the `Request URL` of
// the websocket.
// If you really don't know how to do this... Run `node getserver.js URL`.
// Fill in the URL of the client where `URL` is.
// For example: `node getserver.js http://example-server.psim.us/`
//Local Server:
//exports.server = 'localhost';
//exports.port = 8000;
exports.server = 'sim.psim.us';
exports.port = 8000;

// This is the server id.
// To know this one, you should check where the AJAX call 'goes' to when you
// log in.
// For example, on the Smogon server, it will say somewhere in the URL
// ~~showdown, meaning that the server id is 'showdown'.
// If you really don't know how to check this... run the said script above.
//Local Server:
//exports.serverid = 'localhost:8000';
exports.serverid = 'showdown';

// The nick and password to log in with
// If no password is required, leave pass empty
//exports.nick = 'boty6969';
//exports.pass = '123456';
exports.nick = 'randobot1234';
exports.pass = '12345';


// Secondary websocket protocols should be defined here, however, Showdown
// doesn't support that yet, so it's best to leave this empty.
exports.secprotocols = [];

// What should be logged?
// 0 = error, ok, info, debug, recv, send
// 1 = error, ok, info, debug, cmdr, send
// 2 = error, ok, info, debug (recommended for development)
// 3 = error, ok, info (recommended for production)
// 4 = error, ok
// 5 = error
exports.debuglevel = 3;

exports.depth = 4;
exports.transpositionTable = false;
exports.moveOrdering = false;
exports.deterministic = false;

