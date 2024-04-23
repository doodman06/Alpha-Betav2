"use strict";
/**
 * Connections
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Abstraction layer for multi-process SockJS connections.
 *
 * This file handles all the communications between the users'
 * browsers, the networking processes, and users.ts in the
 * main process.
 *
 * @license MIT
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PM = exports.ServerStream = exports.Sockets = void 0;
var fs = require("fs");
var http = require("http");
var https = require("https");
var path = require("path");
var lib_1 = require("../lib");
var ip_tools_1 = require("./ip-tools");
var battle_1 = require("../sim/battle");
exports.Sockets = new /** @class */ (function () {
    function class_1() {
    }
    class_1.prototype.onSpawn = function (worker) {
        var _a, e_1, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var id, _d, _e, _f, data, _g, socketid, ip, protocol, socketid, idx, socketid, message, e_1_1;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        id = worker.workerid;
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 6, 7, 12]);
                        _d = true, _e = __asyncValues(worker.stream);
                        _h.label = 2;
                    case 2: return [4 /*yield*/, _e.next()];
                    case 3:
                        if (!(_f = _h.sent(), _a = _f.done, !_a)) return [3 /*break*/, 5];
                        _c = _f.value;
                        _d = false;
                        data = _c;
                        switch (data.charAt(0)) {
                            case '*': {
                                // *socketid, ip, protocol
                                // connect
                                worker.load++;
                                _g = data.substr(1).split('\n'), socketid = _g[0], ip = _g[1], protocol = _g[2];
                                Users.socketConnect(worker, id, socketid, ip, protocol);
                                break;
                            }
                            case '!': {
                                // !socketid
                                // disconnect
                                worker.load--;
                                socketid = data.substr(1);
                                Users.socketDisconnect(worker, id, socketid);
                                break;
                            }
                            case '<': {
                                idx = data.indexOf('\n');
                                socketid = data.substr(1, idx - 1);
                                message = data.substr(idx + 1);
                                Users.socketReceive(worker, id, socketid, message);
                                break;
                            }
                            default:
                            // unhandled
                        }
                        _h.label = 4;
                    case 4:
                        _d = true;
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 12];
                    case 6:
                        e_1_1 = _h.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 12];
                    case 7:
                        _h.trys.push([7, , 10, 11]);
                        if (!(!_d && !_a && (_b = _e.return))) return [3 /*break*/, 9];
                        return [4 /*yield*/, _b.call(_e)];
                    case 8:
                        _h.sent();
                        _h.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 11: return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    class_1.prototype.onUnspawn = function (worker) {
        Users.socketDisconnectAll(worker, worker.workerid);
    };
    class_1.prototype.listen = function (port, bindAddress, workerCount) {
        var _this = this;
        if (port !== undefined && !isNaN(port)) {
            Config.port = port;
            Config.ssl = null;
        }
        else {
            port = Config.port;
            // Autoconfigure when running in cloud environments.
            try {
                var cloudenv = require('cloud-env');
                bindAddress = cloudenv.get('IP', bindAddress);
                port = cloudenv.get('PORT', port);
            }
            catch (_a) { }
        }
        if (bindAddress !== undefined) {
            Config.bindaddress = bindAddress;
        }
        if (port !== undefined) {
            Config.port = port;
        }
        if (workerCount === undefined) {
            workerCount = (Config.workers !== undefined ? Config.workers : 1);
        }
        exports.PM.env = { PSPORT: Config.port, PSBINDADDR: Config.bindaddress || '0.0.0.0', PSNOSSL: Config.ssl ? 0 : 1 };
        exports.PM.subscribeSpawn(function (worker) { return void _this.onSpawn(worker); });
        exports.PM.subscribeUnspawn(this.onUnspawn);
        exports.PM.spawn(workerCount);
    };
    class_1.prototype.socketSend = function (worker, socketid, message) {
        void worker.stream.write(">".concat(socketid, "\n").concat(message));
    };
    class_1.prototype.socketDisconnect = function (worker, socketid) {
        void worker.stream.write("!".concat(socketid));
    };
    class_1.prototype.roomBroadcast = function (roomid, message) {
        for (var _i = 0, _a = exports.PM.workers; _i < _a.length; _i++) {
            var worker = _a[_i];
            void worker.stream.write("#".concat(roomid, "\n").concat(message));
        }
    };
    class_1.prototype.roomAdd = function (worker, roomid, socketid) {
        void worker.stream.write("+".concat(roomid, "\n").concat(socketid));
    };
    class_1.prototype.roomRemove = function (worker, roomid, socketid) {
        void worker.stream.write("-".concat(roomid, "\n").concat(socketid));
    };
    class_1.prototype.channelBroadcast = function (roomid, message) {
        for (var _i = 0, _a = exports.PM.workers; _i < _a.length; _i++) {
            var worker = _a[_i];
            void worker.stream.write(":".concat(roomid, "\n").concat(message));
        }
    };
    class_1.prototype.channelMove = function (worker, roomid, channelid, socketid) {
        void worker.stream.write(".".concat(roomid, "\n").concat(channelid, "\n").concat(socketid));
    };
    class_1.prototype.eval = function (worker, query) {
        void worker.stream.write("$".concat(query));
    };
    return class_1;
}());
var ServerStream = /** @class */ (function (_super) {
    __extends(ServerStream, _super);
    function ServerStream(config) {
        var _this = _super.call(this) || this;
        /** socketid:Connection */
        _this.sockets = new Map();
        /** roomid:socketid:Connection */
        _this.rooms = new Map();
        /** roomid:socketid:channelid */
        _this.roomChannels = new Map();
        _this.socketCounter = 0;
        _this.receivers = {
            '$': function (data) {
                // $code
                // eslint-disable-next-line no-eval
                eval(data.substr(1));
            },
            '!': function (data) {
                // !socketid
                // destroy
                var socketid = data.substr(1);
                var socket = this.sockets.get(socketid);
                if (!socket)
                    return;
                socket.destroy();
                this.sockets.delete(socketid);
                for (var _i = 0, _a = this.rooms; _i < _a.length; _i++) {
                    var _b = _a[_i], curRoomid = _b[0], curRoom = _b[1];
                    curRoom.delete(socketid);
                    var roomChannel = this.roomChannels.get(curRoomid);
                    if (roomChannel)
                        roomChannel.delete(socketid);
                    if (!curRoom.size) {
                        this.rooms.delete(curRoomid);
                        if (roomChannel)
                            this.roomChannels.delete(curRoomid);
                    }
                }
            },
            '>': function (data) {
                // >socketid, message
                // message to single connection
                var nlLoc = data.indexOf('\n');
                var socketid = data.substr(1, nlLoc - 1);
                var socket = this.sockets.get(socketid);
                if (!socket)
                    return;
                var message = data.substr(nlLoc + 1);
                socket.write(message);
            },
            '#': function (data) {
                // #roomid, message
                // message to all connections in room
                // #, message
                // message to all connections
                var nlLoc = data.indexOf('\n');
                var roomid = data.substr(1, nlLoc - 1);
                var room = roomid ? this.rooms.get(roomid) : this.sockets;
                if (!room)
                    return;
                var message = data.substr(nlLoc + 1);
                for (var _i = 0, _a = room.values(); _i < _a.length; _i++) {
                    var curSocket = _a[_i];
                    curSocket.write(message);
                }
            },
            '+': function (data) {
                // +roomid, socketid
                // join room with connection
                var nlLoc = data.indexOf('\n');
                var socketid = data.substr(nlLoc + 1);
                var socket = this.sockets.get(socketid);
                if (!socket)
                    return;
                var roomid = data.substr(1, nlLoc - 1);
                var room = this.rooms.get(roomid);
                if (!room) {
                    room = new Map();
                    this.rooms.set(roomid, room);
                }
                room.set(socketid, socket);
            },
            '-': function (data) {
                // -roomid, socketid
                // leave room with connection
                var nlLoc = data.indexOf('\n');
                var roomid = data.slice(1, nlLoc);
                var room = this.rooms.get(roomid);
                if (!room)
                    return;
                var socketid = data.slice(nlLoc + 1);
                room.delete(socketid);
                var roomChannel = this.roomChannels.get(roomid);
                if (roomChannel)
                    roomChannel.delete(socketid);
                if (!room.size) {
                    this.rooms.delete(roomid);
                    if (roomChannel)
                        this.roomChannels.delete(roomid);
                }
            },
            '.': function (data) {
                // .roomid, channelid, socketid
                // move connection to different channel in room
                var nlLoc = data.indexOf('\n');
                var roomid = data.slice(1, nlLoc);
                var nlLoc2 = data.indexOf('\n', nlLoc + 1);
                var channelid = Number(data.slice(nlLoc + 1, nlLoc2));
                var socketid = data.slice(nlLoc2 + 1);
                var roomChannel = this.roomChannels.get(roomid);
                if (!roomChannel) {
                    roomChannel = new Map();
                    this.roomChannels.set(roomid, roomChannel);
                }
                if (channelid === 0) {
                    roomChannel.delete(socketid);
                }
                else {
                    roomChannel.set(socketid, channelid);
                }
            },
            ':': function (data) {
                // :roomid, message
                // message to a room, splitting `|split` by channel
                var nlLoc = data.indexOf('\n');
                var roomid = data.slice(1, nlLoc);
                var room = this.rooms.get(roomid);
                if (!room)
                    return;
                var messages = [
                    null, null, null, null, null,
                ];
                var message = data.substr(nlLoc + 1);
                var channelMessages = (0, battle_1.extractChannelMessages)(message, [0, 1, 2, 3, 4]);
                var roomChannel = this.roomChannels.get(roomid);
                for (var _i = 0, room_1 = room; _i < room_1.length; _i++) {
                    var _a = room_1[_i], curSocketid = _a[0], curSocket = _a[1];
                    var channelid = (roomChannel === null || roomChannel === void 0 ? void 0 : roomChannel.get(curSocketid)) || 0;
                    if (!messages[channelid])
                        messages[channelid] = channelMessages[channelid].join('\n');
                    curSocket.write(messages[channelid]);
                }
            },
        };
        if (!config.bindaddress)
            config.bindaddress = '0.0.0.0';
        _this.isTrustedProxyIp = config.proxyip ? ip_tools_1.IPTools.checker(config.proxyip) : function () { return false; };
        // Static HTTP server
        // This handles the custom CSS and custom avatar features, and also
        // redirects yourserver:8001 to yourserver-8001.psim.us
        // It's optional if you don't need these features.
        _this.server = http.createServer();
        _this.serverSsl = null;
        if (config.ssl) {
            var key = void 0;
            try {
                key = path.resolve(__dirname, config.ssl.options.key);
                if (!fs.statSync(key).isFile())
                    throw new Error();
                try {
                    key = fs.readFileSync(key);
                }
                catch (e) {
                    (0, lib_1.crashlogger)(new Error("Failed to read the configured SSL private key PEM file:\n".concat(e.stack)), "Socket process ".concat(process.pid));
                }
            }
            catch (_a) {
                console.warn('SSL private key config values will not support HTTPS server option values in the future. Please set it to use the absolute path of its PEM file.');
                key = config.ssl.options.key;
            }
            var cert = void 0;
            try {
                cert = path.resolve(__dirname, config.ssl.options.cert);
                if (!fs.statSync(cert).isFile())
                    throw new Error();
                try {
                    cert = fs.readFileSync(cert);
                }
                catch (e) {
                    (0, lib_1.crashlogger)(new Error("Failed to read the configured SSL certificate PEM file:\n".concat(e.stack)), "Socket process ".concat(process.pid));
                }
            }
            catch (e) {
                console.warn('SSL certificate config values will not support HTTPS server option values in the future. Please set it to use the absolute path of its PEM file.');
                cert = config.ssl.options.cert;
            }
            if (key && cert) {
                try {
                    // In case there are additional SSL config settings besides the key and cert...
                    _this.serverSsl = https.createServer(__assign(__assign({}, config.ssl.options), { key: key, cert: cert }));
                }
                catch (e) {
                    (0, lib_1.crashlogger)(new Error("The SSL settings are misconfigured:\n".concat(e.stack)), "Socket process ".concat(process.pid));
                }
            }
        }
        // Static server
        try {
            if (config.disablenodestatic)
                throw new Error("disablenodestatic");
            var StaticServer = require('node-static').Server;
            var roomidRegex_1 = /^\/(?:[A-Za-z0-9][A-Za-z0-9-]*)\/?$/;
            var cssServer_1 = new StaticServer('./config');
            var avatarServer_1 = new StaticServer('./config/avatars');
            var staticServer_1 = new StaticServer('./server/static');
            var staticRequestHandler = function (req, res) {
                // console.log(`static rq: ${req.socket.remoteAddress}:${req.socket.remotePort} -> ${req.socket.localAddress}:${req.socket.localPort} - ${req.method} ${req.url} ${req.httpVersion} - ${req.rawHeaders.join('|')}`);
                req.resume();
                req.addListener('end', function () {
                    if (config.customhttpresponse &&
                        config.customhttpresponse(req, res)) {
                        return;
                    }
                    var server = staticServer_1;
                    if (req.url) {
                        if (req.url === '/custom.css') {
                            server = cssServer_1;
                        }
                        else if (req.url.startsWith('/avatars/')) {
                            req.url = req.url.substr(8);
                            server = avatarServer_1;
                        }
                        else if (roomidRegex_1.test(req.url)) {
                            req.url = '/';
                        }
                    }
                    server.serve(req, res, function (e) {
                        if (e && e.status === 404) {
                            staticServer_1.serveFile('404.html', 404, {}, req, res);
                        }
                    });
                });
            };
            _this.server.on('request', staticRequestHandler);
            if (_this.serverSsl)
                _this.serverSsl.on('request', staticRequestHandler);
        }
        catch (e) {
            if (e.message === 'disablenodestatic') {
                console.log('node-static is disabled');
            }
            else {
                console.log('Could not start node-static - try `npm install` if you want to use it');
            }
        }
        // SockJS server
        // This is the main server that handles users connecting to our server
        // and doing things on our server.
        var sockjs = require('sockjs');
        var options = {
            sockjs_url: "//play.pokemonshowdown.com/js/lib/sockjs-1.4.0-nwjsfix.min.js",
            prefix: '/showdown',
            log: function (severity, message) {
                if (severity === 'error')
                    console.log("ERROR: ".concat(message));
            },
        };
        if (config.wsdeflate !== null) {
            try {
                var deflate = require('permessage-deflate').configure(config.wsdeflate);
                options.faye_server_options = { extensions: [deflate] };
            }
            catch (_b) {
                (0, lib_1.crashlogger)(new Error("Dependency permessage-deflate is not installed or is otherwise unaccessable. No message compression will take place until server restart."), "Sockets");
            }
        }
        var server = sockjs.createServer(options);
        process.once('disconnect', function () { return _this.cleanup(); });
        process.once('exit', function () { return _this.cleanup(); });
        // this is global so it can be hotpatched if necessary
        server.on('connection', function (connection) { return _this.onConnection(connection); });
        server.installHandlers(_this.server, {});
        _this.server.listen(config.port, config.bindaddress);
        console.log("Worker ".concat(exports.PM.workerid, " now listening on ").concat(config.bindaddress, ":").concat(config.port));
        if (_this.serverSsl) {
            server.installHandlers(_this.serverSsl, {});
            // @ts-ignore - if appssl exists, then `config.ssl` must also exist
            _this.serverSsl.listen(config.ssl.port, config.bindaddress);
            // @ts-ignore - if appssl exists, then `config.ssl` must also exist
            console.log("Worker ".concat(exports.PM.workerid, " now listening for SSL on port ").concat(config.ssl.port));
        }
        console.log("Test your server at http://".concat(config.bindaddress === '0.0.0.0' ? 'localhost' : config.bindaddress, ":").concat(config.port));
        return _this;
    }
    /**
     * Clean up any remaining connections on disconnect. If this isn't done,
     * the process will not exit until any remaining connections have been destroyed.
     * Afterwards, the worker process will die on its own
     */
    ServerStream.prototype.cleanup = function () {
        for (var _i = 0, _a = this.sockets.values(); _i < _a.length; _i++) {
            var socket = _a[_i];
            try {
                socket.destroy();
            }
            catch (_b) { }
        }
        this.sockets.clear();
        this.rooms.clear();
        this.roomChannels.clear();
        this.server.close();
        if (this.serverSsl)
            this.serverSsl.close();
        // Let the server(s) finish closing.
        setImmediate(function () { return process.exit(0); });
    };
    ServerStream.prototype.onConnection = function (socket) {
        var _this = this;
        // For reasons that are not entirely clear, SockJS sometimes triggers
        // this event with a null `socket` argument.
        if (!socket)
            return;
        if (!socket.remoteAddress) {
            // SockJS sometimes fails to be able to cache the IP, port, and
            // address from connection request headers.
            try {
                socket.destroy();
            }
            catch (_a) { }
            return;
        }
        var socketid = '' + (++this.socketCounter);
        this.sockets.set(socketid, socket);
        var socketip = socket.remoteAddress;
        if (this.isTrustedProxyIp(socketip)) {
            var ips = (socket.headers['x-forwarded-for'] || '').split(',').reverse();
            for (var _i = 0, ips_1 = ips; _i < ips_1.length; _i++) {
                var ip = ips_1[_i];
                var proxy = ip.trim();
                if (!this.isTrustedProxyIp(proxy)) {
                    socketip = proxy;
                    break;
                }
            }
        }
        this.push("*".concat(socketid, "\n").concat(socketip, "\n").concat(socket.protocol));
        socket.on('data', function (message) {
            // drop empty messages (DDoS?)
            if (!message)
                return;
            // drop messages over 100KB
            if (message.length > (100 * 1024)) {
                socket.write("|popup|Your message must be below 100KB");
                console.log("Dropping client message ".concat(message.length / 1024, " KB..."));
                console.log(message.slice(0, 160));
                return;
            }
            // drop legacy JSON messages
            if (typeof message !== 'string' || message.startsWith('{'))
                return;
            // drop blank messages (DDoS?)
            var pipeIndex = message.indexOf('|');
            if (pipeIndex < 0 || pipeIndex === message.length - 1)
                return;
            _this.push("<".concat(socketid, "\n").concat(message));
        });
        socket.once('close', function () {
            _this.push("!".concat(socketid));
            _this.sockets.delete(socketid);
            for (var _i = 0, _a = _this.rooms.values(); _i < _a.length; _i++) {
                var room = _a[_i];
                room.delete(socketid);
            }
        });
    };
    ServerStream.prototype._write = function (data) {
        // console.log('worker received: ' + data);
        var receiver = this.receivers[data.charAt(0)];
        if (receiver)
            receiver.call(this, data);
    };
    return ServerStream;
}(lib_1.Streams.ObjectReadWriteStream));
exports.ServerStream = ServerStream;
/*********************************************************
 * Process manager
 *********************************************************/
exports.PM = new lib_1.ProcessManager.RawProcessManager({
    module: module,
    setupChild: function () { return new ServerStream(Config); },
    isCluster: true,
});
if (!exports.PM.isParentProcess) {
    // This is a child process!
    global.Config = require('./config-loader').Config;
    if (Config.crashguard) {
        // graceful crash - allow current battles to finish before restarting
        process.on('uncaughtException', function (err) {
            (0, lib_1.crashlogger)(err, "Socket process ".concat(exports.PM.workerid, " (").concat(process.pid, ")"));
        });
        process.on('unhandledRejection', function (err) {
            (0, lib_1.crashlogger)(err || {}, "Socket process ".concat(exports.PM.workerid, " (").concat(process.pid, ") Promise"));
        });
    }
    if (Config.sockets) {
        try {
            require.resolve('node-oom-heapdump');
        }
        catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND')
                throw e; // should never happen
            throw new Error('node-oom-heapdump is not installed, but it is a required dependency if Config.ofesockets is set to true! ' +
                'Run npm install node-oom-heapdump and restart the server.');
        }
        // Create a heapdump if the process runs out of memory.
        global.nodeOomHeapdump = require('node-oom-heapdump')({
            addTimestamp: true,
        });
    }
    // setup worker
    if (process.env.PSPORT)
        Config.port = +process.env.PSPORT;
    if (process.env.PSBINDADDR)
        Config.bindaddress = process.env.PSBINDADDR;
    if (process.env.PSNOSSL && parseInt(process.env.PSNOSSL))
        Config.ssl = null;
    // eslint-disable-next-line no-eval
    lib_1.Repl.start("sockets-".concat(exports.PM.workerid, "-").concat(process.pid), function (cmd) { return eval(cmd); });
}
