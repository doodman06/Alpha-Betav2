"use strict";
/**
 * Process Manager
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * This file abstract out multiprocess logic involved in several tasks.
 *
 * Child processes can be queried.
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawProcessManager = exports.StreamProcessManager = exports.QueryProcessManager = exports.ProcessManager = exports.RawProcessWrapper = exports.StreamWorker = exports.StreamProcessWrapper = exports.QueryProcessWrapper = exports.exec = exports.processManagers = void 0;
var child_process = require("child_process");
var cluster = require("cluster");
var path = require("path");
var Streams = require("./streams");
var fs_1 = require("./fs");
exports.processManagers = [];
function exec(args, execOptions) {
    if (Array.isArray(args)) {
        var cmd_1 = args.shift();
        if (!cmd_1)
            throw new Error("You must pass a command to ProcessManager.exec.");
        return new Promise(function (resolve, reject) {
            child_process.execFile(cmd_1, args, execOptions, function (err, stdout, stderr) {
                if (err)
                    reject(err);
                if (typeof stdout !== 'string')
                    stdout = stdout.toString();
                if (typeof stderr !== 'string')
                    stderr = stderr.toString();
                resolve({ stdout: stdout, stderr: stderr });
            });
        });
    }
    else {
        return new Promise(function (resolve, reject) {
            child_process.exec(args, execOptions, function (error, stdout, stderr) {
                if (error)
                    reject(error);
                if (typeof stdout !== 'string')
                    stdout = stdout.toString();
                resolve(stdout);
            });
        });
    }
}
exports.exec = exec;
var SubprocessStream = /** @class */ (function (_super) {
    __extends(SubprocessStream, _super);
    function SubprocessStream(process, taskId) {
        var _this = _super.call(this) || this;
        _this.process = process;
        _this.taskId = taskId;
        _this.process.process.send("".concat(taskId, "\nNEW"));
        return _this;
    }
    SubprocessStream.prototype._write = function (message) {
        if (!this.process.process.connected) {
            this.pushError(new Error("Process disconnected (possibly crashed?)"));
            return;
        }
        this.process.process.send("".concat(this.taskId, "\nWRITE\n").concat(message));
        // responses are handled in ProcessWrapper
    };
    SubprocessStream.prototype._writeEnd = function () {
        this.process.process.send("".concat(this.taskId, "\nWRITEEND"));
    };
    SubprocessStream.prototype._destroy = function () {
        if (!this.process.process.connected)
            return;
        this.process.process.send("".concat(this.taskId, "\nDESTROY"));
        this.process.deleteStream(this.taskId);
        this.process = null;
    };
    return SubprocessStream;
}(Streams.ObjectReadWriteStream));
var RawSubprocessStream = /** @class */ (function (_super) {
    __extends(RawSubprocessStream, _super);
    function RawSubprocessStream(process) {
        var _this = _super.call(this) || this;
        _this.process = process;
        return _this;
    }
    RawSubprocessStream.prototype._write = function (message) {
        if (!this.process.getProcess().connected) {
            // no error because the crash handler should already have shown an error, and
            // sometimes harmless messages are sent during cleanup
            return;
        }
        this.process.process.send(message);
        // responses are handled in ProcessWrapper
    };
    return RawSubprocessStream;
}(Streams.ObjectReadWriteStream));
/** Wraps the process object in the PARENT process. */
var QueryProcessWrapper = /** @class */ (function () {
    function QueryProcessWrapper(file, messageCallback) {
        var _this = this;
        this.process = child_process.fork(file, [], { cwd: fs_1.FS.ROOT_PATH });
        this.taskId = 0;
        this.file = file;
        this.pendingTasks = new Map();
        this.pendingRelease = null;
        this.resolveRelease = null;
        this.messageCallback = messageCallback || null;
        this.process.on('message', function (message) {
            if (message.startsWith('THROW\n')) {
                var error = new Error();
                error.stack = message.slice(6);
                throw error;
            }
            if (message.startsWith('DEBUG\n')) {
                _this.debug = message.slice(6);
                return;
            }
            if (_this.messageCallback && message.startsWith("CALLBACK\n")) {
                _this.messageCallback(message.slice(9));
                return;
            }
            var nlLoc = message.indexOf('\n');
            if (nlLoc <= 0)
                throw new Error("Invalid response ".concat(message));
            var taskId = parseInt(message.slice(0, nlLoc));
            var resolve = _this.pendingTasks.get(taskId);
            if (!resolve)
                throw new Error("Invalid taskId ".concat(message.slice(0, nlLoc)));
            _this.pendingTasks.delete(taskId);
            var resp = _this.safeJSON(message.slice(nlLoc + 1));
            resolve(resp);
            if (_this.resolveRelease && !_this.getLoad())
                _this.destroy();
        });
    }
    QueryProcessWrapper.prototype.safeJSON = function (obj) {
        var _a, _b;
        // special cases? undefined should strictly be fine
        // so let's just return it since we can't parse it
        if (obj === "undefined") {
            return undefined;
        }
        try {
            return JSON.parse(obj);
        }
        catch (e) {
            // this is in the parent, so it should usually exist, but it's possible
            // it's also futureproofing in case other external modfules require this
            // we also specifically do not throw here because this json might be sensitive,
            // so we only want it to go to emails
            (_b = (_a = global.Monitor) === null || _a === void 0 ? void 0 : _a.crashlog) === null || _b === void 0 ? void 0 : _b.call(_a, e, "a ".concat(path.basename(this.file), " process"), { result: obj });
            return undefined;
        }
    };
    QueryProcessWrapper.prototype.getProcess = function () {
        return this.process;
    };
    QueryProcessWrapper.prototype.getLoad = function () {
        return this.pendingTasks.size;
    };
    QueryProcessWrapper.prototype.query = function (input) {
        var _this = this;
        this.taskId++;
        var taskId = this.taskId;
        this.process.send("".concat(taskId, "\n").concat(JSON.stringify(input)));
        return new Promise(function (resolve) {
            _this.pendingTasks.set(taskId, resolve);
        });
    };
    QueryProcessWrapper.prototype.release = function () {
        var _this = this;
        if (this.pendingRelease)
            return this.pendingRelease;
        if (!this.getLoad()) {
            this.destroy();
        }
        else {
            this.pendingRelease = new Promise(function (resolve) {
                _this.resolveRelease = resolve;
            });
        }
        return this.pendingRelease;
    };
    QueryProcessWrapper.prototype.destroy = function () {
        if (this.pendingRelease && !this.resolveRelease) {
            // already destroyed
            return;
        }
        this.process.disconnect();
        for (var _i = 0, _a = this.pendingTasks.values(); _i < _a.length; _i++) {
            var resolver = _a[_i];
            // maybe we should track reject functions too...
            resolver('');
        }
        this.pendingTasks.clear();
        if (this.resolveRelease) {
            this.resolveRelease();
            this.resolveRelease = null;
        }
        else if (!this.pendingRelease) {
            this.pendingRelease = Promise.resolve();
        }
    };
    return QueryProcessWrapper;
}());
exports.QueryProcessWrapper = QueryProcessWrapper;
/** Wraps the process object in the PARENT process. */
var StreamProcessWrapper = /** @class */ (function () {
    function StreamProcessWrapper(file, messageCallback) {
        var _this = this;
        this.taskId = 0;
        this.activeStreams = new Map();
        this.pendingRelease = null;
        this.resolveRelease = null;
        this.process = child_process.fork(file, [], { cwd: fs_1.FS.ROOT_PATH });
        this.messageCallback = messageCallback;
        this.process.on('message', function (message) {
            if (message.startsWith('THROW\n')) {
                var error = new Error();
                error.stack = message.slice(6);
                throw error;
            }
            if (_this.messageCallback && message.startsWith("CALLBACK\n")) {
                _this.messageCallback(message.slice(9));
                return;
            }
            if (message.startsWith('DEBUG\n')) {
                _this.setDebug(message.slice(6));
                return;
            }
            var nlLoc = message.indexOf('\n');
            if (nlLoc <= 0)
                throw new Error("Invalid response ".concat(message));
            var taskId = parseInt(message.slice(0, nlLoc));
            var stream = _this.activeStreams.get(taskId);
            if (!stream)
                return; // stream already destroyed
            message = message.slice(nlLoc + 1);
            nlLoc = message.indexOf('\n');
            if (nlLoc < 0)
                nlLoc = message.length;
            var messageType = message.slice(0, nlLoc);
            message = message.slice(nlLoc + 1);
            if (messageType === 'END') {
                stream.pushEnd();
                _this.deleteStream(taskId);
                return;
            }
            else if (messageType === 'PUSH') {
                stream.push(message);
            }
            else if (messageType === 'THROW') {
                var error = new Error();
                error.stack = message;
                stream.pushError(error, true);
            }
            else {
                throw new Error("Unrecognized messageType ".concat(messageType));
            }
        });
    }
    StreamProcessWrapper.prototype.setDebug = function (message) {
        this.debug = (this.debug || '').slice(-32768) + '\n=====\n' + message;
    };
    StreamProcessWrapper.prototype.getLoad = function () {
        return this.activeStreams.size;
    };
    StreamProcessWrapper.prototype.getProcess = function () {
        return this.process;
    };
    StreamProcessWrapper.prototype.deleteStream = function (taskId) {
        this.activeStreams.delete(taskId);
        // try to release
        if (this.resolveRelease && !this.getLoad())
            void this.destroy();
    };
    StreamProcessWrapper.prototype.createStream = function () {
        this.taskId++;
        var taskId = this.taskId;
        var stream = new SubprocessStream(this, taskId);
        this.activeStreams.set(taskId, stream);
        return stream;
    };
    StreamProcessWrapper.prototype.release = function () {
        var _this = this;
        if (this.pendingRelease)
            return this.pendingRelease;
        if (!this.getLoad()) {
            void this.destroy();
        }
        else {
            this.pendingRelease = new Promise(function (resolve) {
                _this.resolveRelease = resolve;
            });
        }
        return this.pendingRelease;
    };
    StreamProcessWrapper.prototype.destroy = function () {
        if (this.pendingRelease && !this.resolveRelease) {
            // already destroyed
            return;
        }
        this.process.disconnect();
        var destroyed = [];
        for (var _i = 0, _a = this.activeStreams.values(); _i < _a.length; _i++) {
            var stream = _a[_i];
            destroyed.push(stream.destroy());
        }
        this.activeStreams.clear();
        if (this.resolveRelease) {
            this.resolveRelease();
            this.resolveRelease = null;
        }
        else if (!this.pendingRelease) {
            this.pendingRelease = Promise.resolve();
        }
        return Promise.all(destroyed);
    };
    return StreamProcessWrapper;
}());
exports.StreamProcessWrapper = StreamProcessWrapper;
/**
 * A container for a RawProcessManager stream. This is usually the
 * RawProcessWrapper, but it can also be a fake RawProcessWrapper if the PM is
 * told to spawn 0 worker processes.
 */
var StreamWorker = /** @class */ (function () {
    function StreamWorker(stream) {
        this.load = 0;
        this.workerid = 0;
        this.stream = stream;
    }
    return StreamWorker;
}());
exports.StreamWorker = StreamWorker;
/** Wraps the process object in the PARENT process. */
var RawProcessWrapper = /** @class */ (function () {
    function RawProcessWrapper(file, isCluster, env) {
        var _this = this;
        this.taskId = 0;
        this.pendingRelease = null;
        this.resolveRelease = null;
        this.workerid = 0;
        /** Not managed by RawProcessWrapper itself */
        this.load = 0;
        if (isCluster) {
            this.process = cluster.fork(env);
            this.workerid = this.process.id;
        }
        else {
            this.process = child_process.fork(file, [], { cwd: fs_1.FS.ROOT_PATH, env: env });
        }
        this.process.on('message', function (message) {
            _this.stream.push(message);
        });
        this.stream = new RawSubprocessStream(this);
    }
    RawProcessWrapper.prototype.setDebug = function (message) {
        this.debug = (this.debug || '').slice(-32768) + '\n=====\n' + message;
    };
    RawProcessWrapper.prototype.getLoad = function () {
        return this.load;
    };
    RawProcessWrapper.prototype.getProcess = function () {
        return this.process.process ? this.process.process : this.process;
    };
    RawProcessWrapper.prototype.release = function () {
        var _this = this;
        if (this.pendingRelease)
            return this.pendingRelease;
        if (!this.getLoad()) {
            void this.destroy();
        }
        else {
            this.pendingRelease = new Promise(function (resolve) {
                _this.resolveRelease = resolve;
            });
        }
        return this.pendingRelease;
    };
    RawProcessWrapper.prototype.destroy = function () {
        if (this.pendingRelease && !this.resolveRelease) {
            // already destroyed
            return;
        }
        void this.stream.destroy();
        this.process.disconnect();
        return;
    };
    return RawProcessWrapper;
}());
exports.RawProcessWrapper = RawProcessWrapper;
/**
 * A ProcessManager wraps a query function: A function that takes a
 * string and returns a string or Promise<string>.
 */
var ProcessManager = /** @class */ (function () {
    function ProcessManager(module) {
        this.processes = [];
        this.releasingProcesses = [];
        this.crashedProcesses = [];
        this.crashTime = 0;
        this.crashRespawnCount = 0;
        this.module = module;
        this.filename = module.filename;
        this.basename = path.basename(module.filename);
        this.isParentProcess = (process.mainModule !== module || !process.send);
        this.listen();
    }
    ProcessManager.prototype.acquire = function () {
        if (!this.processes.length) {
            return null;
        }
        var lowestLoad = this.processes[0];
        for (var _i = 0, _a = this.processes; _i < _a.length; _i++) {
            var process = _a[_i];
            if (process.getLoad() < lowestLoad.getLoad()) {
                lowestLoad = process;
            }
        }
        return lowestLoad;
    };
    ProcessManager.prototype.releaseCrashed = function (process) {
        var _this = this;
        var index = this.processes.indexOf(process);
        // The process was shut down sanely, not crashed
        if (index < 0)
            return;
        this.processes.splice(index, 1);
        this.destroyProcess(process);
        void process.release().then(function () {
            var releasingIndex = _this.releasingProcesses.indexOf(process);
            if (releasingIndex >= 0) {
                _this.releasingProcesses.splice(releasingIndex, 1);
            }
        });
        var now = Date.now();
        if (this.crashTime && now - this.crashTime > 30 * 60 * 1000) {
            this.crashTime = 0;
            this.crashRespawnCount = 0;
        }
        if (!this.crashTime)
            this.crashTime = now;
        this.crashRespawnCount += 1;
        // Notify any global crash logger
        void Promise.reject(new Error("Process ".concat(this.basename, " ").concat(process.getProcess().pid, " crashed and had to be restarted")));
        this.releasingProcesses.push(process);
        this.crashedProcesses.push(process);
        // only respawn processes if there have been fewer than 5 crashes in 30 minutes
        if (this.crashRespawnCount <= 5) {
            this.spawn(this.processes.length + 1);
        }
    };
    ProcessManager.prototype.unspawn = function () {
        var _this = this;
        return Promise.all(__spreadArray([], this.processes, true).map(function (process) { return _this.unspawnOne(process); }));
    };
    ProcessManager.prototype.unspawnOne = function (process) {
        return __awaiter(this, void 0, void 0, function () {
            var processIndex, index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!process)
                            return [2 /*return*/];
                        this.destroyProcess(process);
                        processIndex = this.processes.indexOf(process);
                        if (processIndex < 0)
                            throw new Error('Process inactive');
                        this.processes.splice(this.processes.indexOf(process), 1);
                        this.releasingProcesses.push(process);
                        return [4 /*yield*/, process.release()];
                    case 1:
                        _a.sent();
                        index = this.releasingProcesses.indexOf(process);
                        if (index < 0)
                            return [2 /*return*/]; // can happen if process crashed while releasing
                        this.releasingProcesses.splice(index, 1);
                        return [2 /*return*/];
                }
            });
        });
    };
    ProcessManager.prototype.spawn = function (count, force) {
        if (count === void 0) { count = 1; }
        if (!this.isParentProcess)
            return;
        if (ProcessManager.disabled && !force)
            return;
        var spawnCount = count - this.processes.length;
        for (var i = 0; i < spawnCount; i++) {
            this.spawnOne(force);
        }
    };
    ProcessManager.prototype.spawnOne = function (force) {
        var _this = this;
        if (!this.isParentProcess)
            throw new Error('Must use in parent process');
        if (ProcessManager.disabled && !force)
            return null;
        var process = this.createProcess();
        process.process.on('disconnect', function () { return _this.releaseCrashed(process); });
        this.processes.push(process);
        return process;
    };
    ProcessManager.prototype.respawn = function (count) {
        if (count === void 0) { count = null; }
        if (count === null)
            count = this.processes.length;
        var unspawned = this.unspawn();
        this.spawn(count);
        return unspawned;
    };
    ProcessManager.prototype.destroyProcess = function (process) { };
    ProcessManager.prototype.destroy = function () {
        var index = exports.processManagers.indexOf(this);
        if (index >= 0)
            exports.processManagers.splice(index, 1);
        return this.unspawn();
    };
    ProcessManager.disabled = false;
    return ProcessManager;
}());
exports.ProcessManager = ProcessManager;
var QueryProcessManager = /** @class */ (function (_super) {
    __extends(QueryProcessManager, _super);
    /**
     * @param timeout The number of milliseconds to wait before terminating a query. Defaults to 900000 ms (15 minutes).
     */
    function QueryProcessManager(module, query, timeout, debugCallback) {
        if (timeout === void 0) { timeout = 15 * 60 * 1000; }
        var _this = _super.call(this, module) || this;
        _this._query = query;
        _this.timeout = timeout;
        _this.messageCallback = debugCallback;
        exports.processManagers.push(_this);
        return _this;
    }
    QueryProcessManager.prototype.query = function (input, process) {
        if (process === void 0) { process = this.acquire(); }
        return __awaiter(this, void 0, void 0, function () {
            var timeout, result;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!process)
                            return [2 /*return*/, this._query(input)];
                        timeout = setTimeout(function () {
                            var debugInfo = process.debug || "No debug information found.";
                            process.destroy();
                            _this.spawnOne();
                            throw new Error("A query originating in ".concat(_this.basename, " took too long to complete; the process has been respawned.\n").concat(debugInfo));
                        }, this.timeout);
                        return [4 /*yield*/, process.query(input)];
                    case 1:
                        result = _a.sent();
                        clearTimeout(timeout);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    QueryProcessManager.prototype.queryTemporaryProcess = function (input, force) {
        var process = this.spawnOne(force);
        var result = this.query(input, process);
        void this.unspawnOne(process);
        return result;
    };
    QueryProcessManager.prototype.createProcess = function () {
        return new QueryProcessWrapper(this.filename, this.messageCallback);
    };
    QueryProcessManager.prototype.listen = function () {
        var _this = this;
        if (this.isParentProcess)
            return;
        // child process
        process.on('message', function (message) {
            var nlLoc = message.indexOf('\n');
            if (nlLoc <= 0)
                throw new Error("Invalid response ".concat(message));
            var taskId = message.slice(0, nlLoc);
            message = message.slice(nlLoc + 1);
            if (taskId.startsWith('EVAL')) {
                // eslint-disable-next-line no-eval
                process.send("".concat(taskId, "\n") + eval(message));
                return;
            }
            void Promise.resolve(_this._query(JSON.parse(message))).then(function (response) { return process.send("".concat(taskId, "\n").concat(JSON.stringify(response))); });
        });
        process.on('disconnect', function () {
            process.exit();
        });
    };
    return QueryProcessManager;
}(ProcessManager));
exports.QueryProcessManager = QueryProcessManager;
var StreamProcessManager = /** @class */ (function (_super) {
    __extends(StreamProcessManager, _super);
    function StreamProcessManager(module, createStream, messageCallback) {
        var _this = _super.call(this, module) || this;
        _this.activeStreams = new Map();
        _this._createStream = createStream;
        _this.messageCallback = messageCallback;
        exports.processManagers.push(_this);
        return _this;
    }
    StreamProcessManager.prototype.createStream = function () {
        var process = this.acquire();
        if (!process)
            return this._createStream();
        return process.createStream();
    };
    StreamProcessManager.prototype.createProcess = function () {
        return new StreamProcessWrapper(this.filename, this.messageCallback);
    };
    StreamProcessManager.prototype.pipeStream = function (taskId, stream) {
        return __awaiter(this, void 0, void 0, function () {
            var done, value, err_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        done = false;
                        _b.label = 1;
                    case 1:
                        if (!!done) return [3 /*break*/, 6];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        value = void 0;
                        return [4 /*yield*/, stream.next()];
                    case 3:
                        (_a = _b.sent(), value = _a.value, done = _a.done);
                        process.send("".concat(taskId, "\nPUSH\n").concat(value));
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _b.sent();
                        process.send("".concat(taskId, "\nTHROW\n").concat(err_1.stack));
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 1];
                    case 6:
                        if (!this.activeStreams.has(taskId)) {
                            // stream.destroy() was called, don't send an END message
                            return [2 /*return*/];
                        }
                        process.send("".concat(taskId, "\nEND"));
                        this.activeStreams.delete(taskId);
                        return [2 /*return*/];
                }
            });
        });
    };
    StreamProcessManager.prototype.listen = function () {
        var _this = this;
        if (this.isParentProcess)
            return;
        // child process
        process.on('message', function (message) {
            var nlLoc = message.indexOf('\n');
            if (nlLoc <= 0)
                throw new Error("Invalid request ".concat(message));
            var taskId = message.slice(0, nlLoc);
            var stream = _this.activeStreams.get(taskId);
            message = message.slice(nlLoc + 1);
            nlLoc = message.indexOf('\n');
            if (nlLoc < 0)
                nlLoc = message.length;
            var messageType = message.slice(0, nlLoc);
            message = message.slice(nlLoc + 1);
            if (taskId.startsWith('EVAL')) {
                // eslint-disable-next-line no-eval
                process.send("".concat(taskId, "\n") + eval(message));
                return;
            }
            if (messageType === 'NEW') {
                if (stream)
                    throw new Error("NEW: taskId ".concat(taskId, " already exists"));
                var newStream = _this._createStream();
                _this.activeStreams.set(taskId, newStream);
                void _this.pipeStream(taskId, newStream);
            }
            else if (messageType === 'DESTROY') {
                if (!stream)
                    throw new Error("DESTROY: Invalid taskId ".concat(taskId));
                void stream.destroy();
                _this.activeStreams.delete(taskId);
            }
            else if (messageType === 'WRITE') {
                if (!stream)
                    throw new Error("WRITE: Invalid taskId ".concat(taskId));
                void stream.write(message);
            }
            else if (messageType === 'WRITEEND') {
                if (!stream)
                    throw new Error("WRITEEND: Invalid taskId ".concat(taskId));
                void stream.writeEnd();
            }
            else {
                throw new Error("Unrecognized messageType ".concat(messageType));
            }
        });
        process.on('disconnect', function () {
            process.exit();
        });
    };
    return StreamProcessManager;
}(ProcessManager));
exports.StreamProcessManager = StreamProcessManager;
var RawProcessManager = /** @class */ (function (_super) {
    __extends(RawProcessManager, _super);
    function RawProcessManager(options) {
        var _a;
        var _this = _super.call(this, options.module) || this;
        /** full list of processes - parent process only */
        _this.workers = [];
        /** if spawning 0 worker processes, the worker is instead stored here in the parent process */
        _this.masterWorker = null;
        /** stream used only in the child process */
        _this.activeStream = null;
        _this.spawnSubscription = null;
        _this.unspawnSubscription = null;
        /** worker ID of cluster worker - cluster child process only (0 otherwise) */
        _this.workerid = ((_a = cluster.worker) === null || _a === void 0 ? void 0 : _a.id) || 0;
        _this.isCluster = !!options.isCluster;
        _this._setupChild = options.setupChild;
        _this.env = options.env;
        if (_this.isCluster && _this.isParentProcess) {
            cluster.setupMaster({
                exec: _this.filename,
                // @ts-ignore TODO: update type definition
                cwd: fs_1.FS.ROOT_PATH,
            });
        }
        exports.processManagers.push(_this);
        return _this;
    }
    RawProcessManager.prototype.subscribeSpawn = function (callback) {
        this.spawnSubscription = callback;
    };
    RawProcessManager.prototype.subscribeUnspawn = function (callback) {
        this.unspawnSubscription = callback;
    };
    RawProcessManager.prototype.spawn = function (count) {
        var _a;
        _super.prototype.spawn.call(this, count);
        if (!this.workers.length) {
            this.masterWorker = new StreamWorker(this._setupChild());
            this.workers.push(this.masterWorker);
            (_a = this.spawnSubscription) === null || _a === void 0 ? void 0 : _a.call(this, this.masterWorker);
        }
    };
    RawProcessManager.prototype.createProcess = function () {
        var _a;
        var process = new RawProcessWrapper(this.filename, this.isCluster, this.env);
        this.workers.push(process);
        (_a = this.spawnSubscription) === null || _a === void 0 ? void 0 : _a.call(this, process);
        return process;
    };
    RawProcessManager.prototype.destroyProcess = function (process) {
        var _a;
        var index = this.workers.indexOf(process);
        if (index >= 0)
            this.workers.splice(index, 1);
        (_a = this.unspawnSubscription) === null || _a === void 0 ? void 0 : _a.call(this, process);
    };
    RawProcessManager.prototype.pipeStream = function (stream) {
        return __awaiter(this, void 0, void 0, function () {
            var done, value, err_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        done = false;
                        _b.label = 1;
                    case 1:
                        if (!!done) return [3 /*break*/, 6];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        value = void 0;
                        return [4 /*yield*/, stream.next()];
                    case 3:
                        (_a = _b.sent(), value = _a.value, done = _a.done);
                        process.send(value);
                        return [3 /*break*/, 5];
                    case 4:
                        err_2 = _b.sent();
                        process.send("THROW\n".concat(err_2.stack));
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    RawProcessManager.prototype.listen = function () {
        var _this = this;
        if (this.isParentProcess)
            return;
        setImmediate(function () {
            _this.activeStream = _this._setupChild();
            void _this.pipeStream(_this.activeStream);
        });
        // child process
        process.on('message', function (message) {
            void _this.activeStream.write(message);
        });
        process.on('disconnect', function () {
            process.exit();
        });
    };
    return RawProcessManager;
}(ProcessManager));
exports.RawProcessManager = RawProcessManager;
