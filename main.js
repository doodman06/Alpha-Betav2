/**
 * Attribution:
 * The whole of this main.js file is from https://github.com/TalkTakesTime/Pokemon-Showdown-Bot/blob/master/main.js
 * It was taken from this project to simplify the process of connecting to the server.
 */

/**
 * 
 * 
 * 
 * This is the main file of Pokémon Showdown Bot
 *
 * Some parts of this code are taken from the Pokémon Showdown server code, so
 * credits also go to Guangcong Luo and other Pokémon Showdown contributors.
 * https://github.com/Zarel/Pokemon-Showdown
 *
 * @license MIT license
 */

const MESSAGE_THROTTLE = 650;

// First dependencies and welcome message

global.colors = require('colors');

global.info = function (text) {
	if (Config.debuglevel > 3) return;
	console.log('info'.cyan + '  ' + text);
};

global.debug = function (text) {
	if (Config.debuglevel > 2) return;
	console.log('debug'.blue + ' ' + text);
};

global.recv = function (text) {
	if (Config.debuglevel > 0) return;
	console.log('recv'.grey + '  ' + text);
};

global.cmdr = function (text) { // receiving commands
	if (Config.debuglevel !== 1) return;
	console.log('cmdr'.grey + '  ' + text);
};

global.dsend = function (text) {
	if (Config.debuglevel > 1) return;
	console.log('send'.grey + '  ' + text);
};

global.error = function (text) {
	console.log('error'.red + ' ' + text);
};

global.ok = function (text) {
	if (Config.debuglevel > 4) return;
	console.log('ok'.green + '    ' + text);
};

console.log('------------------------------------'.yellow);
console.log('| Welcome to Pokemon Showdown Bot! |'.yellow);
console.log('------------------------------------'.yellow);
console.log('');

global.toId = function (text) {
	return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};



// Config and config.js watching...
try {
	global.Config = require('./config.js');
} catch (e) {
	error('config.js doesn\'t exist; are you sure you copied config-example.js to config.js?');
	process.exit(-1);
}


// And now comes the real stuff...
info('starting server');

var WebSocketClient = require('websocket').client;
global.Parse = require('./parser.js').parse;
global.BattleManager = require('./battleManager.js');
global.gameState = require('./gameState.js');
global.myPokemon = require('./myPokemon.js');
global.enemyPokemon = require('./enemyPokemon.js');
global.TranspositionTable = require('./transpositionTable.js');
global.Connection = null;
global.generation = 6;
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');



var queue = [];
var dequeueTimeout = null;
var lastSentAt = 0;

global.send = function (data) {
	if (!data || !Connection.connected) return false;
	
	var now = Date.now();
	if (now < lastSentAt + MESSAGE_THROTTLE - 5) {
		queue.push(data);
		if (!dequeueTimeout) {
			dequeueTimeout = setTimeout(dequeue, now - lastSentAt + MESSAGE_THROTTLE);
		}
		return false;
	}

	if (!Array.isArray(data)) data = [data.toString()];
	data = JSON.stringify(data);
	dsend(data);
	Connection.send(data);

	lastSentAt = now;
	if (dequeueTimeout) {
		if (queue.length) {
			dequeueTimeout = setTimeout(dequeue, MESSAGE_THROTTLE);
		} else {
			dequeueTimeout = null;
		}
	}
};

function dequeue() {
	send(queue.shift());
}

var connect = function (retry) {
	if (retry) {
		info('retrying...');
	}

	var ws = new WebSocketClient();

	ws.on('connectFailed', function (err) {
		error('Could not connect to server ' + Config.server + ': ' + err.stack);
		info('retrying in one minute');

		setTimeout(function () {
			connect(true);
		}, 60000);
	});

	ws.on('connect', function (con) {
		Connection = con;
		ok('connected to server ' + Config.server);

		con.on('error', function (err) {
			error('connection error: ' + err.stack);
		});

		con.on('close', function (code, reason) {
			// Is this always error or can this be intended...?
			error('connection closed: ' + reason + ' (' + code + ')');
			info('retrying in one minute');

			
			setTimeout(function () {
				connect(true);
			}, 60000);
		});

		con.on('message', function (response) {
			if (response.type !== 'utf8') return false;
			var message = response.utf8Data;
			recv(message);

			// SockJS messages sent from the server begin with 'a'
			// this filters out other SockJS response types (heartbeats in particular)
			if (message.charAt(0) !== 'a') return false;
			Parse.data(message);
		});
	});

	// The connection itself
	var id = ~~(Math.random() * 1000);
	var chars = 'abcdefghijklmnopqrstuvwxyz0123456789_';
	var str = '';
	for (var i = 0, l = chars.length; i < 8; i++) {
		str += chars.charAt(~~(Math.random() * l));
	}

	var conStr = 'ws://' + Config.server + ':' + Config.port + '/showdown/' + id + '/' + str + '/websocket';
	info('connecting to ' + conStr + ' - secondary protocols: ' + (Config.secprotocols.join(', ') || 'none'));
	ws.connect(conStr, Config.secprotocols);
};

connect();
