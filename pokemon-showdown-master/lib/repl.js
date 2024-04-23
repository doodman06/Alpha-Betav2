"use strict";
/**
 * REPL
 *
 * Documented in logs/repl/README.md
 * https://github.com/smogon/pokemon-showdown/blob/master/logs/repl/README.md
 *
 * @author kota
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repl = void 0;
var fs = require("fs");
var net = require("net");
var path = require("path");
var repl = require("repl");
var crashlogger_1 = require("./crashlogger");
var fs_1 = require("./fs");
exports.Repl = new /** @class */ (function () {
    function class_1() {
        /**
         * Contains the pathnames of all active REPL sockets.
         */
        this.socketPathnames = new Set();
        this.listenersSetup = false;
    }
    class_1.prototype.setupListeners = function (filename) {
        if (exports.Repl.listenersSetup)
            return;
        exports.Repl.listenersSetup = true;
        // Clean up REPL sockets and child processes on forced exit.
        process.once('exit', function (code) {
            for (var _i = 0, _a = exports.Repl.socketPathnames; _i < _a.length; _i++) {
                var s = _a[_i];
                try {
                    fs.unlinkSync(s);
                }
                catch (_b) { }
            }
            if (code === 129 || code === 130) {
                process.exitCode = 0;
            }
        });
        if (!process.listeners('SIGHUP').length) {
            process.once('SIGHUP', function () { return process.exit(128 + 1); });
        }
        if (!process.listeners('SIGINT').length) {
            process.once('SIGINT', function () { return process.exit(128 + 2); });
        }
        global.heapdump = function (targetPath) {
            if (!targetPath)
                targetPath = "".concat(filename, "-").concat(new Date().toISOString());
            var handler;
            try {
                handler = require('node-oom-heapdump')();
            }
            catch (e) {
                if (e.code !== 'MODULE_NOT_FOUND')
                    throw e;
                throw new Error("node-oom-heapdump is not installed. Run `npm install --no-save node-oom-heapdump` and try again.");
            }
            return handler.createHeapSnapshot(targetPath);
        };
    };
    /**
     * Starts a REPL server, using a UNIX socket for IPC. The eval function
     * parametre is passed in because there is no other way to access a file's
     * non-global context.
     */
    class_1.prototype.start = function (filename, evalFunction) {
        var config = typeof Config !== 'undefined' ? Config : {};
        if (config.repl !== undefined && !config.repl)
            return;
        // TODO: Windows does support the REPL when using named pipes. For now,
        // this only supports UNIX sockets.
        exports.Repl.setupListeners(filename);
        if (filename === 'app') {
            // Clean up old REPL sockets.
            var directory = path.dirname(path.resolve(fs_1.FS.ROOT_PATH, config.replsocketprefix || 'logs/repl', 'app'));
            var files = void 0;
            try {
                files = fs.readdirSync(directory);
            }
            catch (_a) { }
            if (files) {
                var _loop_1 = function (file) {
                    var pathname_1 = path.resolve(directory, file);
                    var stat = fs.statSync(pathname_1);
                    if (!stat.isSocket())
                        return "continue";
                    var socket = net.connect(pathname_1, function () {
                        socket.end();
                        socket.destroy();
                    }).on('error', function () {
                        fs.unlink(pathname_1, function () { });
                    });
                };
                for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                    var file = files_1[_i];
                    _loop_1(file);
                }
            }
        }
        var server = net.createServer(function (socket) {
            repl.start({
                input: socket,
                output: socket,
                eval: function (cmd, context, unusedFilename, callback) {
                    try {
                        return callback(null, evalFunction(cmd));
                    }
                    catch (e) {
                        return callback(e, undefined);
                    }
                },
            }).on('exit', function () { return socket.end(); });
            socket.on('error', function () { return socket.destroy(); });
        });
        var pathname = path.resolve(fs_1.FS.ROOT_PATH, Config.replsocketprefix || 'logs/repl', filename);
        try {
            server.listen(pathname, function () {
                fs.chmodSync(pathname, Config.replsocketmode || 384);
                exports.Repl.socketPathnames.add(pathname);
            });
            server.once('error', function (err) {
                server.close();
                if (err.code === "EADDRINUSE") {
                    fs.unlink(pathname, function (_err) {
                        if (_err && _err.code !== "ENOENT") {
                            (0, crashlogger_1.crashlogger)(_err, "REPL: ".concat(filename));
                        }
                    });
                }
                else if (err.code === "EACCES") {
                    if (process.platform !== 'win32') {
                        console.error("Could not start REPL server \"".concat(filename, "\": Your filesystem doesn't support Unix sockets (everything else will still work)"));
                    }
                }
                else {
                    (0, crashlogger_1.crashlogger)(err, "REPL: ".concat(filename));
                }
            });
            server.once('close', function () {
                exports.Repl.socketPathnames.delete(pathname);
            });
        }
        catch (err) {
            console.error("Could not start REPL server \"".concat(filename, "\": ").concat(err));
        }
    };
    return class_1;
}());
