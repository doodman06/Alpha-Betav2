/**
 * Attribution:
 * Part of this parser.js file is from https://github.com/TalkTakesTime/Pokemon-Showdown-Bot
 * It was taken from this project to simplify the process of logging in to an account.
 * The code for splitting a message and using the challstr to log in was taken from https://github.com/TalkTakesTime/Pokemon-Showdown-Bot/blob/master/parser.js 
 * The rest of the code was written by me.
 */

/**
 * This is the file where commands get parsed
 *
 * Some parts of this code are taken from the Pokémon Showdown server code, so
 * credits also go to Guangcong Luo and other Pokémon Showdown contributors.
 * https://github.com/Zarel/Pokemon-Showdown
 *
 * @license MIT license
 */

var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
const {Teams} = require('pokemon-showdown');
const team = require('./Team1.json');
var battlestarted = false;
var enemysaved = false;
var enemyName = [];
var roomId;
var gen;
var pokemonManager = null;




exports.parse = {
	actionUrl: url.parse('https://play.pokemonshowdown.com/~~' + Config.serverid + '/action.php'),


	data: function (data) {
		if (data.charAt(0) !== 'a') return false;
		data = JSON.parse(data.substr(1));
		console.log(data);
		if (Array.isArray(data)) {
			for (let i = 0, len = data.length; i < len; i++) {
				this.splitMessage(data[i]);
			}
		} else {
			this.splitMessage(data);
		}
	},
	splitMessage: function (message) {
		if (!message) return;

		

		var spl = message.split('\n');

		for (let i = 0, len = spl.length; i < len; i++) {
			this.message(spl[i]);
		}
	},
	message: function (message) {
		var spl = message.split('|');
		if(!battlestarted){
			for (let i = 0; i < spl.length; i++) {
				if(spl[i] == 'poke' && spl[i + 1] == 'p1' ){
					console.log(spl[i + 2]);
					enemyName.push(spl[i + 2]);
				}
			}
			if(enemyName.length == 6) {
				pokemonManager.initializeEnemy(enemyName);
				battlestarted = true;
			}
		}
		for(let i = 0; i < spl.length; i++){
			if(spl[i] == '-damage' && spl[i + 1].includes('p1')){
				//pokemonManager.updateEnemy(spl[i + 1].split(' ')[1], spl[i + 2].split('/')[0]);
				pokemonManager.updateFromTurn('-damage', spl[i + 1].split(' ')[1], spl[i + 2].split('/')[0]);
				
			}
			if(spl[i] == "switch" && spl[i + 1].includes('p1')){
				//pokemonManager.updateActiveEnemy(spl[i + 1].split(' ')[1]);
				pokemonManager.updateFromTurn("switch", spl[i + 1].split(' ')[1]);
				
			}
			if(spl[i] == "-boost" && spl[i + 1].includes('p1')){
				//pokemonManager.updateEnemyBoost(spl[i + 1].split(' ')[1], spl[i + 2], spl[i + 3].split('/')[0]);
				pokemonManager.updateFromTurn("-boost", spl[i + 1].split(' ')[1], spl[i + 2], spl[i + 3].split('/')[0]);
			}

			if(spl[i] == "turn") {
				var move = pokemonManager.chooseMove();
					console.log(roomId  + move);
					if(move) {
						send(roomId  + move);
					}
			}
		}

		switch (spl[1]) {
			case 'pm':
				if(spl[4].includes("challenge") && spl[4].includes("gen")){
					gen = parseInt(spl[4].split('gen')[1].slice(0, 1));
					console.log(gen);
					console.log("Start Battle");
					send('|/utm ' + Teams.pack(team));
					send('|/accept ' + spl[2]);
				}
				break;
			case 'request':
				if(spl[2]){
					console.log()
					if(!pokemonManager){
						pokemonManager = new PokemonManager(JSON.parse(spl[2]), gen);
					}
					else{
						pokemonManager.updateData(JSON.parse(spl[2]));
					}
					if(JSON.parse(spl[2]).wait) return;
					var move = pokemonManager.chooseRandomMove();
					console.log(roomId  + move);
					if(move) {
						send(roomId  + move);
					}
				}
				break;
			case 'error':
				if(spl[2].includes("[Invalid choice]")){
					var move = pokemonManager.chooseRandomMove();
					console.log(roomId  + move);
					send(roomId  +move);
				}
				break;
			case 'updatesearch':
				var jsondata = JSON.parse(spl[2]);
				if(jsondata.games){
					var keys = Object.keys(jsondata.games);
					roomId = keys[0];
				}
				break;
			case 'challstr':
				info('received challstr, logging in...');
				var id = spl[2];
				var str = spl[3];

				var requestOptions = {
					hostname: this.actionUrl.hostname,
					port: this.actionUrl.port,
					path: this.actionUrl.pathname,
					agent: false
				};

				var data;
				if (!Config.pass) {
					requestOptions.method = 'GET';
					requestOptions.path += '?act=getassertion&userid=' + toId(Config.nick) + '&challengekeyid=' + id + '&challenge=' + str;
				} else {
					requestOptions.method = 'POST';
					data = 'act=login&name=' + Config.nick + '&pass=' + Config.pass + '&challengekeyid=' + id + '&challenge=' + str;
					requestOptions.headers = {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Content-Length': data.length
					};
				}
				//requestOptions.path = encodeURI(requestOptions.path);

				var req = https.request(requestOptions, function (res) {
					res.setEncoding('utf8');
					var data = '';
					res.on('data', function (chunk) {
						data += chunk;
					});
					res.on('end', function () {
						if (data === ';') {
							error('failed to log in; nick is registered - invalid or no password given');
							process.exit(-1);
						}
						if (data.length < 50) {
							error('failed to log in: ' + data);
							process.exit(-1);
						}

						if (data.indexOf('heavy load') !== -1) {
							error('the login server is under heavy load; trying again in one minute');
							setTimeout(function () {
								this.message(message);
							}.bind(this), 60 * 1000);
							return;
						}

						if (data.substr(0, 16) === '<!DOCTYPE html>') {
							error('Connection error 522; trying agian in one minute');
							setTimeout(function () {
								this.message(message);
							}.bind(this), 60 * 1000);
							return;
						}

						try {
							data = JSON.parse(data.substr(1));
							if (data.actionsuccess) {
								data = data.assertion;
							} else {
								error('could not log in; action was not successful: ' + JSON.stringify(data));
								process.exit(-1);
							}
						} catch (e) {}
						send('|/trn ' + Config.nick + ',0,' + data);
					}.bind(this));
				}.bind(this));

				req.on('error', function (err) {
					error('login error: ' + err.stack);
				});

				if (data) req.write(data);
				req.end();
				break;
			case 'updateuser':
				if (spl[2] !== " " + Config.nick) return;

				if (spl[3] !== '1') {
					error('failed to log in, still guest');
					process.exit(-1);
				}

				ok('logged in as ' + spl[2]);

				
				break;
		}
	}
};
