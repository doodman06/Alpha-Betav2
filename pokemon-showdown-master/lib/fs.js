"use strict";
/**
 * FS
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * An abstraction layer around Node's filesystem.
 *
 * Advantages:
 * - write() etc do nothing in unit tests
 * - paths are always relative to PS's base directory
 * - Promises (seriously wtf Node Core what are you thinking)
 * - PS-style API: FS("foo.txt").write("bar") for easier argument order
 * - mkdirp
 *
 * FS is used nearly everywhere, but exceptions include:
 * - crashlogger.js - in case the crash is in here
 * - repl.js - which use Unix sockets out of this file's scope
 * - launch script - happens before modules are loaded
 * - sim/ - intended to be self-contained
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FS = exports.FSPath = void 0;
var fs = require("fs");
var pathModule = require("path");
var streams_1 = require("./streams");
// not sure why it's necessary to use path.sep, but testing with Windows showed it was
var DIST = "".concat(pathModule.sep, "dist").concat(pathModule.sep);
// account for pwd/dist/lib
var ROOT_PATH = pathModule.resolve(__dirname, __dirname.includes(DIST) ? '..' : '', '..');
if (!global.__fsState) {
    global.__fsState = {
        pendingUpdates: new Map(),
    };
}
var FSPath = /** @class */ (function () {
    function FSPath(path) {
        this.path = pathModule.resolve(ROOT_PATH, path);
    }
    FSPath.prototype.parentDir = function () {
        return new FSPath(pathModule.dirname(this.path));
    };
    FSPath.prototype.read = function (options) {
        var _this = this;
        if (options === void 0) { options = 'utf8'; }
        if (typeof options !== 'string' && options.encoding === undefined) {
            options.encoding = 'utf8';
        }
        return new Promise(function (resolve, reject) {
            fs.readFile(_this.path, options, function (err, data) {
                err ? reject(err) : resolve(data);
            });
        });
    };
    FSPath.prototype.readSync = function (options) {
        if (options === void 0) { options = 'utf8'; }
        if (typeof options !== 'string' && options.encoding === undefined) {
            options.encoding = 'utf8';
        }
        return fs.readFileSync(this.path, options);
    };
    FSPath.prototype.readBuffer = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        return new Promise(function (resolve, reject) {
            fs.readFile(_this.path, options, function (err, data) {
                err ? reject(err) : resolve(data);
            });
        });
    };
    FSPath.prototype.readBufferSync = function (options) {
        if (options === void 0) { options = {}; }
        return fs.readFileSync(this.path, options);
    };
    FSPath.prototype.exists = function () {
        var _this = this;
        return new Promise(function (resolve) {
            fs.exists(_this.path, function (exists) {
                resolve(exists);
            });
        });
    };
    FSPath.prototype.existsSync = function () {
        return fs.existsSync(this.path);
    };
    FSPath.prototype.readIfExists = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            fs.readFile(_this.path, 'utf8', function (err, data) {
                if (err && err.code === 'ENOENT')
                    return resolve('');
                err ? reject(err) : resolve(data);
            });
        });
    };
    FSPath.prototype.readIfExistsSync = function () {
        try {
            return fs.readFileSync(this.path, 'utf8');
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
        return '';
    };
    FSPath.prototype.write = function (data, options) {
        var _this = this;
        var _a;
        if (options === void 0) { options = {}; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.writeFile(_this.path, data, options, function (err) {
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.writeSync = function (data, options) {
        var _a;
        if (options === void 0) { options = {}; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        return fs.writeFileSync(this.path, data, options);
    };
    /**
     * Writes to a new file before renaming to replace an old file. If
     * the process crashes while writing, the old file won't be lost.
     * Does not protect against simultaneous writing; use writeUpdate
     * for that.
     */
    FSPath.prototype.safeWrite = function (data, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, exports.FS)(this.path + '.NEW').write(data, options)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, (0, exports.FS)(this.path + '.NEW').rename(this.path)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FSPath.prototype.safeWriteSync = function (data, options) {
        if (options === void 0) { options = {}; }
        (0, exports.FS)(this.path + '.NEW').writeSync(data, options);
        (0, exports.FS)(this.path + '.NEW').renameSync(this.path);
    };
    /**
     * Safest way to update a file with in-memory state. Pass a callback
     * that fetches the data to be written. It will write an update,
     * avoiding race conditions. The callback may not necessarily be
     * called, if `writeUpdate` is called many times in a short period.
     *
     * `options.throttle`, if it exists, will make sure updates are not
     * written more than once every `options.throttle` milliseconds.
     *
     * No synchronous version because there's no risk of race conditions
     * with synchronous code; just use `safeWriteSync`.
     */
    FSPath.prototype.writeUpdate = function (dataFetcher, options) {
        var _this = this;
        var _a;
        if (options === void 0) { options = {}; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        var pendingUpdate = __fsState.pendingUpdates.get(this.path);
        var throttleTime = options.throttle ? Date.now() + options.throttle : 0;
        if (pendingUpdate) {
            pendingUpdate.pendingDataFetcher = dataFetcher;
            pendingUpdate.pendingOptions = options;
            if (pendingUpdate.throttleTimer && throttleTime < pendingUpdate.throttleTime) {
                pendingUpdate.throttleTime = throttleTime;
                clearTimeout(pendingUpdate.throttleTimer);
                pendingUpdate.throttleTimer = setTimeout(function () { return _this.checkNextUpdate(); }, throttleTime - Date.now());
            }
            return;
        }
        if (!throttleTime) {
            this.writeUpdateNow(dataFetcher, options);
            return;
        }
        var update = {
            isWriting: false,
            pendingDataFetcher: dataFetcher,
            pendingOptions: options,
            throttleTime: throttleTime,
            throttleTimer: setTimeout(function () { return _this.checkNextUpdate(); }, throttleTime - Date.now()),
        };
        __fsState.pendingUpdates.set(this.path, update);
    };
    FSPath.prototype.writeUpdateNow = function (dataFetcher, options) {
        var _this = this;
        var throttleTime = options.throttle ? Date.now() + options.throttle : 0;
        var update = {
            isWriting: true,
            pendingDataFetcher: null,
            pendingOptions: null,
            throttleTime: throttleTime,
            throttleTimer: null,
        };
        __fsState.pendingUpdates.set(this.path, update);
        void this.safeWrite(dataFetcher(), options).then(function () { return _this.finishUpdate(); });
    };
    FSPath.prototype.checkNextUpdate = function () {
        var pendingUpdate = __fsState.pendingUpdates.get(this.path);
        if (!pendingUpdate)
            throw new Error("FS: Pending update not found");
        if (pendingUpdate.isWriting)
            throw new Error("FS: Conflicting update");
        var dataFetcher = pendingUpdate.pendingDataFetcher, options = pendingUpdate.pendingOptions;
        if (!dataFetcher || !options) {
            // no pending update
            __fsState.pendingUpdates.delete(this.path);
            return;
        }
        this.writeUpdateNow(dataFetcher, options);
    };
    FSPath.prototype.finishUpdate = function () {
        var _this = this;
        var pendingUpdate = __fsState.pendingUpdates.get(this.path);
        if (!pendingUpdate)
            throw new Error("FS: Pending update not found");
        if (!pendingUpdate.isWriting)
            throw new Error("FS: Conflicting update");
        pendingUpdate.isWriting = false;
        var throttleTime = pendingUpdate.throttleTime;
        if (!throttleTime || throttleTime < Date.now()) {
            this.checkNextUpdate();
            return;
        }
        pendingUpdate.throttleTimer = setTimeout(function () { return _this.checkNextUpdate(); }, throttleTime - Date.now());
    };
    FSPath.prototype.append = function (data, options) {
        var _this = this;
        var _a;
        if (options === void 0) { options = {}; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.appendFile(_this.path, data, options, function (err) {
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.appendSync = function (data, options) {
        var _a;
        if (options === void 0) { options = {}; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        return fs.appendFileSync(this.path, data, options);
    };
    FSPath.prototype.symlinkTo = function (target) {
        var _this = this;
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.symlink(target, _this.path, function (err) {
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.symlinkToSync = function (target) {
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        return fs.symlinkSync(target, this.path);
    };
    FSPath.prototype.copyFile = function (dest) {
        var _this = this;
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.copyFile(_this.path, dest, function (err) {
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.rename = function (target) {
        var _this = this;
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.rename(_this.path, target, function (err) {
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.renameSync = function (target) {
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        return fs.renameSync(this.path, target);
    };
    FSPath.prototype.readdir = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            fs.readdir(_this.path, function (err, data) {
                err ? reject(err) : resolve(data);
            });
        });
    };
    FSPath.prototype.readdirSync = function () {
        return fs.readdirSync(this.path);
    };
    FSPath.prototype.readdirIfExists = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.exists()];
                    case 1:
                        if (_a.sent())
                            return [2 /*return*/, this.readdir()];
                        return [2 /*return*/, Promise.resolve([])];
                }
            });
        });
    };
    FSPath.prototype.readdirIfExistsSync = function () {
        if (this.existsSync())
            return this.readdirSync();
        return [];
    };
    FSPath.prototype.createReadStream = function () {
        return new FileReadStream(this.path);
    };
    FSPath.prototype.createWriteStream = function (options) {
        var _a;
        if (options === void 0) { options = {}; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting) {
            // @ts-ignore
            return new streams_1.WriteStream({ write: function () { } });
        }
        // @ts-ignore
        return new streams_1.WriteStream(fs.createWriteStream(this.path, options));
    };
    FSPath.prototype.createAppendStream = function (options) {
        var _a;
        if (options === void 0) { options = {}; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting) {
            // @ts-ignore
            return new streams_1.WriteStream({ write: function () { } });
        }
        // @ts-ignore
        options.flags = options.flags || 'a';
        // @ts-ignore
        return new streams_1.WriteStream(fs.createWriteStream(this.path, options));
    };
    FSPath.prototype.unlinkIfExists = function () {
        var _this = this;
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.unlink(_this.path, function (err) {
                if (err && err.code === 'ENOENT')
                    return resolve();
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.unlinkIfExistsSync = function () {
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        try {
            fs.unlinkSync(this.path);
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
    };
    FSPath.prototype.rmdir = function (recursive) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
                    return [2 /*return*/, Promise.resolve()];
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        fs.rmdir(_this.path, { recursive: recursive }, function (err) {
                            err ? reject(err) : resolve();
                        });
                    })];
            });
        });
    };
    FSPath.prototype.rmdirSync = function (recursive) {
        var _a;
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        return fs.rmdirSync(this.path, { recursive: recursive });
    };
    FSPath.prototype.mkdir = function (mode) {
        var _this = this;
        var _a;
        if (mode === void 0) { mode = 493; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.mkdir(_this.path, mode, function (err) {
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.mkdirSync = function (mode) {
        var _a;
        if (mode === void 0) { mode = 493; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        return fs.mkdirSync(this.path, mode);
    };
    FSPath.prototype.mkdirIfNonexistent = function (mode) {
        var _this = this;
        var _a;
        if (mode === void 0) { mode = 493; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return Promise.resolve();
        return new Promise(function (resolve, reject) {
            fs.mkdir(_this.path, mode, function (err) {
                if (err && err.code === 'EEXIST')
                    return resolve();
                err ? reject(err) : resolve();
            });
        });
    };
    FSPath.prototype.mkdirIfNonexistentSync = function (mode) {
        var _a;
        if (mode === void 0) { mode = 493; }
        if ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.nofswriting)
            return;
        try {
            fs.mkdirSync(this.path, mode);
        }
        catch (err) {
            if (err.code !== 'EEXIST')
                throw err;
        }
    };
    /**
     * Creates the directory (and any parent directories if necessary).
     * Does not throw if the directory already exists.
     */
    FSPath.prototype.mkdirp = function (mode) {
        if (mode === void 0) { mode = 493; }
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 5]);
                        return [4 /*yield*/, this.mkdirIfNonexistent(mode)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 2:
                        err_1 = _a.sent();
                        if (err_1.code !== 'ENOENT')
                            throw err_1;
                        return [4 /*yield*/, this.parentDir().mkdirp(mode)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.mkdirIfNonexistent(mode)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates the directory (and any parent directories if necessary).
     * Does not throw if the directory already exists. Synchronous.
     */
    FSPath.prototype.mkdirpSync = function (mode) {
        if (mode === void 0) { mode = 493; }
        try {
            this.mkdirIfNonexistentSync(mode);
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
            this.parentDir().mkdirpSync(mode);
            this.mkdirIfNonexistentSync(mode);
        }
    };
    /** Calls the callback if the file is modified. */
    FSPath.prototype.onModify = function (callback) {
        fs.watchFile(this.path, function (curr, prev) {
            if (curr.mtime > prev.mtime)
                return callback();
        });
    };
    /** Clears callbacks added with onModify(). */
    FSPath.prototype.unwatch = function () {
        fs.unwatchFile(this.path);
    };
    FSPath.prototype.isFile = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        fs.stat(_this.path, function (err, stats) {
                            err ? reject(err) : resolve(stats.isFile());
                        });
                    })];
            });
        });
    };
    FSPath.prototype.isFileSync = function () {
        return fs.statSync(this.path).isFile();
    };
    FSPath.prototype.isDirectory = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        fs.stat(_this.path, function (err, stats) {
                            err ? reject(err) : resolve(stats.isDirectory());
                        });
                    })];
            });
        });
    };
    FSPath.prototype.isDirectorySync = function () {
        return fs.statSync(this.path).isDirectory();
    };
    FSPath.prototype.realpath = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        fs.realpath(_this.path, function (err, path) {
                            err ? reject(err) : resolve(path);
                        });
                    })];
            });
        });
    };
    FSPath.prototype.realpathSync = function () {
        return fs.realpathSync(this.path);
    };
    return FSPath;
}());
exports.FSPath = FSPath;
var FileReadStream = /** @class */ (function (_super) {
    __extends(FileReadStream, _super);
    function FileReadStream(file) {
        var _this = _super.call(this) || this;
        _this.fd = new Promise(function (resolve, reject) {
            fs.open(file, 'r', function (err, fd) { return err ? reject(err) : resolve(fd); });
        });
        _this.atEOF = false;
        return _this;
    }
    FileReadStream.prototype._read = function (size) {
        var _this = this;
        if (size === void 0) { size = 16384; }
        return new Promise(function (resolve, reject) {
            if (_this.atEOF)
                return resolve();
            _this.ensureCapacity(size);
            void _this.fd.then(function (fd) {
                fs.read(fd, _this.buf, _this.bufEnd, size, null, function (err, bytesRead, buf) {
                    if (err)
                        return reject(err);
                    if (!bytesRead) {
                        _this.atEOF = true;
                        _this.resolvePush();
                        return resolve();
                    }
                    _this.bufEnd += bytesRead;
                    // throw new Error([...this.buf].map(x => x.toString(16)).join(' '));
                    _this.resolvePush();
                    resolve();
                });
            });
        });
    };
    FileReadStream.prototype._destroy = function () {
        var _this = this;
        return new Promise(function (resolve) {
            void _this.fd.then(function (fd) {
                fs.close(fd, function () { return resolve(); });
            });
        });
    };
    return FileReadStream;
}(streams_1.ReadStream));
function getFs(path) {
    return new FSPath(path);
}
exports.FS = Object.assign(getFs, {
    FileReadStream: FileReadStream,
    FSPath: FSPath,
    ROOT_PATH: ROOT_PATH,
});
