/**
 * Attribution:
 * Part of this config.js file (Liness 8 - 49) is from https://github.com/TalkTakesTime/Pokemon-Showdown-Bot/blob/master/config-example.js
 * It was taken from this project to simplify the process of connecting to the server.
 * Is was edited to connect using the bot's credentials.
 */


//Global Server:
//exports.server = 'sim.psim.us';
//exports.port = 8000;
//Local Server:
/**
 * @type {string} server - The websocket server the bot should connect to.
 */
exports.server = 'localhost';
/**
 * @type {number} port - The websocket port the bot should connect to.
 */
exports.port = 8000;


//Gloval Server:
//exports.serverid = 'showdown';
//Local Server:
/**
 * @type {string} serverid - The server id.
 */
exports.serverid = 'localhost:8000';

// The nick and password to log in with
// If no password is required, leave pass empty
//exports.nick = 'boty6969';
//exports.pass = '123456';
/**
 * @type {string} nick - The username of the account the bot should use to connect to the server.
 */
exports.nick = 'randobot1234';
/**
 * @type {string?} pass - The password of the account the bot should use to connect to the server, can be left empty if no password is required.
 */
exports.pass = '12345';


/**
 * @type {string[]} secprotocols - Secondary websocket protocols should be defined here, not needed, however might be needed in the future. Leave empty for now
 
 */
exports.secprotocols = [];

/**
 * @type {number} debuglevel - The debug level of the bot, determines what messages are logged to the console. 0 is all messages, 5 is only errors.
 */
exports.debuglevel = 3;

/**
 * @type {number} depth - The depth of the Alpha-Beta search algorithm, determines how many moves the bot will look ahead.
 */
exports.depth = 4;

/**
 * @type {boolean} transpositionTable - Whether or not to use a transposition table to store previously calculated positions.
 */
exports.transpositionTable = true;

/**
 * @type {boolean} moveOrdering - Whether or not to use move ordering to improve the efficiency of the Alpha-Beta search algorithm.
 
 */
exports.moveOrdering = true;

/**
 * @type {boolean} deterministic - Whether or not the bot should use deterministic simulations when simulation the effects of moves on game states.
 */
exports.deterministic = true;

/**
 * @type {number} heuristic - The id of the heristic to use when evaluating game states.
 * 0 - HP Heuristic
 * 1 - Living Pokemon Heuristic
 * 2 - Offensive Focus Heuristic
 * 3 - Defensive Focus Heuristic
 */
exports.heuristic = 1;

/**
 * @type {boolean} logging - Whether or not to log the time taken to make each move into a file
 */
exports.logging = false;

