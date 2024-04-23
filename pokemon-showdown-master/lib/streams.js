"use strict";
/**
 * Streams
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * The Node.js standard library's Streams are really hard to use. This
 * offers a better stream API.
 *
 * Documented in STREAMS.md.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.stdpipe = exports.stdout = exports.stdin = exports.readAll = exports.ObjectReadWriteStream = exports.ObjectWriteStream = exports.ObjectReadStream = exports.ReadWriteStream = exports.WriteStream = exports.ReadStream = void 0;
var BUF_SIZE = 65536 * 4;
var ReadStream = /** @class */ (function () {
    function ReadStream(optionsOrStreamLike) {
        var _this = this;
        if (optionsOrStreamLike === void 0) { optionsOrStreamLike = {}; }
        this.buf = Buffer.allocUnsafe(BUF_SIZE);
        this.bufStart = 0;
        this.bufEnd = 0;
        this.bufCapacity = BUF_SIZE;
        this.readSize = 0;
        this.atEOF = false;
        this.errorBuf = null;
        this.encoding = 'utf8';
        this.isReadable = true;
        this.isWritable = false;
        this.nodeReadableStream = null;
        this.nextPushResolver = null;
        this.nextPush = new Promise(function (resolve) {
            _this.nextPushResolver = resolve;
        });
        this.awaitingPush = false;
        var options;
        if (typeof optionsOrStreamLike === 'string') {
            options = { buffer: optionsOrStreamLike };
        }
        else if (optionsOrStreamLike instanceof Buffer) {
            options = { buffer: optionsOrStreamLike };
        }
        else if (typeof optionsOrStreamLike._readableState === 'object') {
            options = { nodeStream: optionsOrStreamLike };
        }
        else {
            options = optionsOrStreamLike;
        }
        if (options.nodeStream) {
            var nodeStream = options.nodeStream;
            this.nodeReadableStream = nodeStream;
            nodeStream.on('data', function (data) {
                _this.push(data);
            });
            nodeStream.on('end', function () {
                _this.pushEnd();
            });
            options.read = function (unusedBytes) {
                this.nodeReadableStream.resume();
            };
            options.pause = function (unusedBytes) {
                this.nodeReadableStream.pause();
            };
        }
        if (options.read)
            this._read = options.read;
        if (options.pause)
            this._pause = options.pause;
        if (options.destroy)
            this._destroy = options.destroy;
        if (options.encoding)
            this.encoding = options.encoding;
        if (options.buffer !== undefined) {
            this.push(options.buffer);
            this.pushEnd();
        }
    }
    Object.defineProperty(ReadStream.prototype, "bufSize", {
        get: function () {
            return this.bufEnd - this.bufStart;
        },
        enumerable: false,
        configurable: true
    });
    ReadStream.prototype.moveBuf = function () {
        if (this.bufStart !== this.bufEnd) {
            this.buf.copy(this.buf, 0, this.bufStart, this.bufEnd);
        }
        this.bufEnd -= this.bufStart;
        this.bufStart = 0;
    };
    ReadStream.prototype.expandBuf = function (newCapacity) {
        if (newCapacity === void 0) { newCapacity = this.bufCapacity * 2; }
        var newBuf = Buffer.allocUnsafe(newCapacity);
        this.buf.copy(newBuf, 0, this.bufStart, this.bufEnd);
        this.bufEnd -= this.bufStart;
        this.bufStart = 0;
        this.bufCapacity = newCapacity;
        this.buf = newBuf;
    };
    ReadStream.prototype.ensureCapacity = function (additionalCapacity) {
        if (this.bufEnd + additionalCapacity <= this.bufCapacity)
            return;
        var capacity = this.bufEnd - this.bufStart + additionalCapacity;
        if (capacity <= this.bufCapacity) {
            return this.moveBuf();
        }
        var newCapacity = this.bufCapacity * 2;
        while (newCapacity < capacity)
            newCapacity *= 2;
        this.expandBuf(newCapacity);
    };
    ReadStream.prototype.push = function (buf, encoding) {
        if (encoding === void 0) { encoding = this.encoding; }
        var size;
        if (this.atEOF)
            return;
        if (typeof buf === 'string') {
            size = Buffer.byteLength(buf, encoding);
            this.ensureCapacity(size);
            this.buf.write(buf, this.bufEnd);
        }
        else {
            size = buf.length;
            this.ensureCapacity(size);
            buf.copy(this.buf, this.bufEnd);
        }
        this.bufEnd += size;
        if (this.bufSize > this.readSize && size * 2 < this.bufSize)
            this._pause();
        this.resolvePush();
    };
    ReadStream.prototype.pushEnd = function () {
        this.atEOF = true;
        this.resolvePush();
    };
    ReadStream.prototype.pushError = function (err, recoverable) {
        if (!this.errorBuf)
            this.errorBuf = [];
        this.errorBuf.push(err);
        if (!recoverable)
            this.atEOF = true;
        this.resolvePush();
    };
    ReadStream.prototype.readError = function () {
        if (this.errorBuf) {
            var err = this.errorBuf.shift();
            if (!this.errorBuf.length)
                this.errorBuf = null;
            throw err;
        }
    };
    ReadStream.prototype.peekError = function () {
        if (this.errorBuf) {
            throw this.errorBuf[0];
        }
    };
    ReadStream.prototype.resolvePush = function () {
        var _this = this;
        if (!this.nextPushResolver)
            throw new Error("Push after end of read stream");
        this.nextPushResolver();
        if (this.atEOF) {
            this.nextPushResolver = null;
            return;
        }
        this.nextPush = new Promise(function (resolve) {
            _this.nextPushResolver = resolve;
        });
    };
    ReadStream.prototype._read = function (size) {
        if (size === void 0) { size = 0; }
        throw new Error("ReadStream needs to be subclassed and the _read function needs to be implemented.");
    };
    ReadStream.prototype._destroy = function () { };
    ReadStream.prototype._pause = function () { };
    /**
     * Reads until the internal buffer is non-empty. Does nothing if the
     * internal buffer is already non-empty.
     *
     * If `byteCount` is a number, instead read until the internal buffer
     * contains at least `byteCount` bytes.
     *
     * If `byteCount` is `true`, reads even if the internal buffer is
     * non-empty.
     */
    ReadStream.prototype.loadIntoBuffer = function (byteCount, readError) {
        if (byteCount === void 0) { byteCount = null; }
        this[readError ? 'readError' : 'peekError']();
        if (byteCount === 0)
            return;
        this.readSize = Math.max(byteCount === true ? this.bufSize + 1 : byteCount === null ? 1 : byteCount, this.readSize);
        if (!this.errorBuf && !this.atEOF && this.bufSize < this.readSize) {
            var bytes = this.readSize - this.bufSize;
            if (bytes === Infinity || byteCount === null || byteCount === true)
                bytes = null;
            return this.doLoad(bytes, readError);
        }
    };
    ReadStream.prototype.doLoad = function (chunkSize, readError) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(!this.errorBuf && !this.atEOF && this.bufSize < this.readSize)) return [3 /*break*/, 2];
                        if (chunkSize)
                            void this._read(chunkSize);
                        else
                            void this._read();
                        return [4 /*yield*/, this.nextPush];
                    case 1:
                        _a.sent();
                        this[readError ? 'readError' : 'peekError']();
                        return [3 /*break*/, 0];
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    ReadStream.prototype.peek = function (byteCount, encoding) {
        var _this = this;
        if (byteCount === void 0) { byteCount = null; }
        if (encoding === void 0) { encoding = this.encoding; }
        if (typeof byteCount === 'string') {
            encoding = byteCount;
            byteCount = null;
        }
        var maybeLoad = this.loadIntoBuffer(byteCount);
        if (maybeLoad)
            return maybeLoad.then(function () { return _this.peek(byteCount, encoding); });
        if (!this.bufSize && byteCount !== 0)
            return null;
        if (byteCount === null)
            return this.buf.toString(encoding, this.bufStart, this.bufEnd);
        if (byteCount > this.bufSize)
            byteCount = this.bufSize;
        return this.buf.toString(encoding, this.bufStart, this.bufStart + byteCount);
    };
    ReadStream.prototype.peekBuffer = function (byteCount) {
        var _this = this;
        if (byteCount === void 0) { byteCount = null; }
        var maybeLoad = this.loadIntoBuffer(byteCount);
        if (maybeLoad)
            return maybeLoad.then(function () { return _this.peekBuffer(byteCount); });
        if (!this.bufSize && byteCount !== 0)
            return null;
        if (byteCount === null)
            return this.buf.slice(this.bufStart, this.bufEnd);
        if (byteCount > this.bufSize)
            byteCount = this.bufSize;
        return this.buf.slice(this.bufStart, this.bufStart + byteCount);
    };
    ReadStream.prototype.read = function (byteCount, encoding) {
        if (byteCount === void 0) { byteCount = null; }
        if (encoding === void 0) { encoding = this.encoding; }
        return __awaiter(this, void 0, void 0, function () {
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (typeof byteCount === 'string') {
                            encoding = byteCount;
                            byteCount = null;
                        }
                        return [4 /*yield*/, this.loadIntoBuffer(byteCount, true)];
                    case 1:
                        _a.sent();
                        out = this.peek(byteCount, encoding);
                        if (out && typeof out !== 'string') {
                            throw new Error("Race condition; you must not read before a previous read has completed");
                        }
                        if (byteCount === null || byteCount >= this.bufSize) {
                            this.bufStart = 0;
                            this.bufEnd = 0;
                            this.readSize = 0;
                        }
                        else {
                            this.bufStart += byteCount;
                            this.readSize -= byteCount;
                        }
                        return [2 /*return*/, out];
                }
            });
        });
    };
    ReadStream.prototype.byChunk = function (byteCount) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var byteStream = this;
        return new ObjectReadStream({
            read: function () {
                return __awaiter(this, void 0, void 0, function () {
                    var next;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, byteStream.read(byteCount)];
                            case 1:
                                next = _a.sent();
                                if (typeof next === 'string')
                                    this.push(next);
                                else
                                    this.pushEnd();
                                return [2 /*return*/];
                        }
                    });
                });
            },
        });
    };
    ReadStream.prototype.byLine = function () {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var byteStream = this;
        return new ObjectReadStream({
            read: function () {
                return __awaiter(this, void 0, void 0, function () {
                    var next;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, byteStream.readLine()];
                            case 1:
                                next = _a.sent();
                                if (typeof next === 'string')
                                    this.push(next);
                                else
                                    this.pushEnd();
                                return [2 /*return*/];
                        }
                    });
                });
            },
        });
    };
    ReadStream.prototype.delimitedBy = function (delimiter) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var byteStream = this;
        return new ObjectReadStream({
            read: function () {
                return __awaiter(this, void 0, void 0, function () {
                    var next;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, byteStream.readDelimitedBy(delimiter)];
                            case 1:
                                next = _a.sent();
                                if (typeof next === 'string')
                                    this.push(next);
                                else
                                    this.pushEnd();
                                return [2 /*return*/];
                        }
                    });
                });
            },
        });
    };
    ReadStream.prototype.readBuffer = function (byteCount) {
        if (byteCount === void 0) { byteCount = null; }
        return __awaiter(this, void 0, void 0, function () {
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadIntoBuffer(byteCount, true)];
                    case 1:
                        _a.sent();
                        out = this.peekBuffer(byteCount);
                        if (out && out.then) {
                            throw new Error("Race condition; you must not read before a previous read has completed");
                        }
                        if (byteCount === null || byteCount >= this.bufSize) {
                            this.bufStart = 0;
                            this.bufEnd = 0;
                        }
                        else {
                            this.bufStart += byteCount;
                        }
                        return [2 /*return*/, out];
                }
            });
        });
    };
    ReadStream.prototype.indexOf = function (symbol, encoding) {
        if (encoding === void 0) { encoding = this.encoding; }
        return __awaiter(this, void 0, void 0, function () {
            var idx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        idx = this.buf.indexOf(symbol, this.bufStart, encoding);
                        _a.label = 1;
                    case 1:
                        if (!(!this.atEOF && (idx >= this.bufEnd || idx < 0))) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.loadIntoBuffer(true)];
                    case 2:
                        _a.sent();
                        idx = this.buf.indexOf(symbol, this.bufStart, encoding);
                        return [3 /*break*/, 1];
                    case 3:
                        if (idx >= this.bufEnd)
                            return [2 /*return*/, -1];
                        return [2 /*return*/, idx - this.bufStart];
                }
            });
        });
    };
    ReadStream.prototype.readAll = function (encoding) {
        if (encoding === void 0) { encoding = this.encoding; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.read(Infinity, encoding)];
                    case 1: return [2 /*return*/, (_a.sent()) || ''];
                }
            });
        });
    };
    ReadStream.prototype.peekAll = function (encoding) {
        if (encoding === void 0) { encoding = this.encoding; }
        return this.peek(Infinity, encoding);
    };
    ReadStream.prototype.readDelimitedBy = function (symbol, encoding) {
        if (encoding === void 0) { encoding = this.encoding; }
        return __awaiter(this, void 0, void 0, function () {
            var idx, out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.atEOF && !this.bufSize)
                            return [2 /*return*/, null];
                        return [4 /*yield*/, this.indexOf(symbol, encoding)];
                    case 1:
                        idx = _a.sent();
                        if (!(idx < 0)) return [3 /*break*/, 2];
                        return [2 /*return*/, this.readAll(encoding)];
                    case 2: return [4 /*yield*/, this.read(idx, encoding)];
                    case 3:
                        out = _a.sent();
                        this.bufStart += Buffer.byteLength(symbol, 'utf8');
                        return [2 /*return*/, out];
                }
            });
        });
    };
    ReadStream.prototype.readLine = function (encoding) {
        if (encoding === void 0) { encoding = this.encoding; }
        return __awaiter(this, void 0, void 0, function () {
            var line;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!encoding)
                            throw new Error("readLine must have an encoding");
                        return [4 /*yield*/, this.readDelimitedBy('\n', encoding)];
                    case 1:
                        line = _a.sent();
                        if (line === null || line === void 0 ? void 0 : line.endsWith('\r'))
                            line = line.slice(0, -1);
                        return [2 /*return*/, line];
                }
            });
        });
    };
    ReadStream.prototype.destroy = function () {
        this.atEOF = true;
        this.bufStart = 0;
        this.bufEnd = 0;
        if (this.nextPushResolver)
            this.resolvePush();
        return this._destroy();
    };
    ReadStream.prototype.next = function (byteCount) {
        if (byteCount === void 0) { byteCount = null; }
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.read(byteCount)];
                    case 1:
                        value = _a.sent();
                        return [2 /*return*/, { value: value, done: value === null }];
                }
            });
        });
    };
    ReadStream.prototype.pipeTo = function (outStream, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var value, done;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.next()];
                    case 1:
                        if (!(_a = _b.sent(), value = _a.value, done = _a.done, !done)) return [3 /*break*/, 3];
                        return [4 /*yield*/, outStream.write(value)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 0];
                    case 3:
                        if (!options.noEnd)
                            return [2 /*return*/, outStream.writeEnd()];
                        return [2 /*return*/];
                }
            });
        });
    };
    return ReadStream;
}());
exports.ReadStream = ReadStream;
var WriteStream = /** @class */ (function () {
    function WriteStream(optionsOrStream) {
        if (optionsOrStream === void 0) { optionsOrStream = {}; }
        this.isReadable = false;
        this.isWritable = true;
        this.encoding = 'utf8';
        this.nodeWritableStream = null;
        this.drainListeners = [];
        var options = optionsOrStream;
        if (options._writableState) {
            options = { nodeStream: optionsOrStream };
        }
        if (options.nodeStream) {
            var nodeStream = options.nodeStream;
            this.nodeWritableStream = nodeStream;
            options.write = function (data) {
                var _this = this;
                var result = this.nodeWritableStream.write(data);
                if (result !== false)
                    return undefined;
                if (!this.drainListeners.length) {
                    this.nodeWritableStream.once('drain', function () {
                        for (var _i = 0, _a = _this.drainListeners; _i < _a.length; _i++) {
                            var listener = _a[_i];
                            listener();
                        }
                        _this.drainListeners = [];
                    });
                }
                return new Promise(function (resolve) {
                    // `as () => void` is necessary because TypeScript thinks that it should be a function
                    // that takes an undefined value as its only parameter: `(value: PromiseLike<undefined> | undefined) => void`
                    _this.drainListeners.push(resolve);
                });
            };
            // Prior to Node v10.12.0, attempting to close STDOUT or STDERR will throw
            if (nodeStream !== process.stdout && nodeStream !== process.stderr) {
                options.writeEnd = function () {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.nodeWritableStream.end(function () { return resolve(); });
                    });
                };
            }
        }
        if (options.write)
            this._write = options.write;
        if (options.writeEnd)
            this._writeEnd = options.writeEnd;
    }
    WriteStream.prototype.write = function (chunk) {
        return this._write(chunk);
    };
    WriteStream.prototype.writeLine = function (chunk) {
        if (chunk === null) {
            return this.writeEnd();
        }
        return this.write(chunk + '\n');
    };
    WriteStream.prototype._write = function (chunk) {
        throw new Error("WriteStream needs to be subclassed and the _write function needs to be implemented.");
    };
    WriteStream.prototype._writeEnd = function () { };
    WriteStream.prototype.writeEnd = function (chunk) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!chunk) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.write(chunk)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, this._writeEnd()];
                }
            });
        });
    };
    return WriteStream;
}());
exports.WriteStream = WriteStream;
var ReadWriteStream = /** @class */ (function (_super) {
    __extends(ReadWriteStream, _super);
    function ReadWriteStream(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, options) || this;
        _this.isReadable = true;
        _this.isWritable = true;
        _this.nodeWritableStream = null;
        _this.drainListeners = [];
        if (options.nodeStream) {
            var nodeStream = options.nodeStream;
            _this.nodeWritableStream = nodeStream;
            options.write = function (data) {
                var _this = this;
                var result = this.nodeWritableStream.write(data);
                if (result !== false)
                    return undefined;
                if (!this.drainListeners.length) {
                    this.nodeWritableStream.once('drain', function () {
                        for (var _i = 0, _a = _this.drainListeners; _i < _a.length; _i++) {
                            var listener = _a[_i];
                            listener();
                        }
                        _this.drainListeners = [];
                    });
                }
                return new Promise(function (resolve) {
                    _this.drainListeners.push(resolve);
                });
            };
            // Prior to Node v10.12.0, attempting to close STDOUT or STDERR will throw
            if (nodeStream !== process.stdout && nodeStream !== process.stderr) {
                options.writeEnd = function () {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.nodeWritableStream.end(function () { return resolve(); });
                    });
                };
            }
        }
        if (options.write)
            _this._write = options.write;
        if (options.writeEnd)
            _this._writeEnd = options.writeEnd;
        return _this;
    }
    ReadWriteStream.prototype.write = function (chunk) {
        return this._write(chunk);
    };
    ReadWriteStream.prototype.writeLine = function (chunk) {
        return this.write(chunk + '\n');
    };
    ReadWriteStream.prototype._write = function (chunk) {
        throw new Error("WriteStream needs to be subclassed and the _write function needs to be implemented.");
    };
    /**
     * In a ReadWriteStream, `_read` does not need to be implemented,
     * because it's valid for the read stream buffer to be filled only by
     * `_write`.
     */
    ReadWriteStream.prototype._read = function (size) { };
    ReadWriteStream.prototype._writeEnd = function () { };
    ReadWriteStream.prototype.writeEnd = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._writeEnd()];
            });
        });
    };
    return ReadWriteStream;
}(ReadStream));
exports.ReadWriteStream = ReadWriteStream;
var ObjectReadStream = /** @class */ (function () {
    function ObjectReadStream(optionsOrStreamLike) {
        var _this = this;
        if (optionsOrStreamLike === void 0) { optionsOrStreamLike = {}; }
        this.buf = [];
        this.readSize = 0;
        this.atEOF = false;
        this.errorBuf = null;
        this.isReadable = true;
        this.isWritable = false;
        this.nodeReadableStream = null;
        this.nextPushResolver = null;
        this.nextPush = new Promise(function (resolve) {
            _this.nextPushResolver = resolve;
        });
        this.awaitingPush = false;
        var options;
        if (Array.isArray(optionsOrStreamLike)) {
            options = { buffer: optionsOrStreamLike };
        }
        else if (typeof optionsOrStreamLike._readableState === 'object') {
            options = { nodeStream: optionsOrStreamLike };
        }
        else {
            options = optionsOrStreamLike;
        }
        if (options.nodeStream) {
            var nodeStream = options.nodeStream;
            this.nodeReadableStream = nodeStream;
            nodeStream.on('data', function (data) {
                _this.push(data);
            });
            nodeStream.on('end', function () {
                _this.pushEnd();
            });
            options = {
                read: function () {
                    this.nodeReadableStream.resume();
                },
                pause: function () {
                    this.nodeReadableStream.pause();
                },
            };
        }
        if (options.read)
            this._read = options.read;
        if (options.pause)
            this._pause = options.pause;
        if (options.destroy)
            this._destroy = options.destroy;
        if (options.buffer !== undefined) {
            this.buf = options.buffer.slice();
            this.pushEnd();
        }
    }
    ObjectReadStream.prototype.push = function (elem) {
        if (this.atEOF)
            return;
        this.buf.push(elem);
        if (this.buf.length > this.readSize && this.buf.length >= 16)
            void this._pause();
        this.resolvePush();
    };
    ObjectReadStream.prototype.pushEnd = function () {
        this.atEOF = true;
        this.resolvePush();
    };
    ObjectReadStream.prototype.pushError = function (err, recoverable) {
        if (!this.errorBuf)
            this.errorBuf = [];
        this.errorBuf.push(err);
        if (!recoverable)
            this.atEOF = true;
        this.resolvePush();
    };
    ObjectReadStream.prototype.readError = function () {
        if (this.errorBuf) {
            var err = this.errorBuf.shift();
            if (!this.errorBuf.length)
                this.errorBuf = null;
            throw err;
        }
    };
    ObjectReadStream.prototype.peekError = function () {
        if (this.errorBuf) {
            throw this.errorBuf[0];
        }
    };
    ObjectReadStream.prototype.resolvePush = function () {
        var _this = this;
        if (!this.nextPushResolver)
            throw new Error("Push after end of read stream");
        this.nextPushResolver();
        if (this.atEOF) {
            this.nextPushResolver = null;
            return;
        }
        this.nextPush = new Promise(function (resolve) {
            _this.nextPushResolver = resolve;
        });
    };
    ObjectReadStream.prototype._read = function (size) {
        if (size === void 0) { size = 0; }
        throw new Error("ReadStream needs to be subclassed and the _read function needs to be implemented.");
    };
    ObjectReadStream.prototype._destroy = function () { };
    ObjectReadStream.prototype._pause = function () { };
    ObjectReadStream.prototype.loadIntoBuffer = function (count, readError) {
        if (count === void 0) { count = 1; }
        return __awaiter(this, void 0, void 0, function () {
            var readResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this[readError ? 'readError' : 'peekError']();
                        if (count === true)
                            count = this.buf.length + 1;
                        if (this.buf.length >= count)
                            return [2 /*return*/];
                        this.readSize = Math.max(count, this.readSize);
                        _a.label = 1;
                    case 1:
                        if (!(!this.errorBuf && !this.atEOF && this.buf.length < this.readSize)) return [3 /*break*/, 6];
                        readResult = this._read();
                        if (!readResult) return [3 /*break*/, 3];
                        return [4 /*yield*/, readResult];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.nextPush];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        this[readError ? 'readError' : 'peekError']();
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ObjectReadStream.prototype.peek = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.buf.length)
                            return [2 /*return*/, this.buf[0]];
                        return [4 /*yield*/, this.loadIntoBuffer()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.buf[0]];
                }
            });
        });
    };
    ObjectReadStream.prototype.read = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.buf.length)
                            return [2 /*return*/, this.buf.shift()];
                        return [4 /*yield*/, this.loadIntoBuffer(1, true)];
                    case 1:
                        _a.sent();
                        if (!this.buf.length)
                            return [2 /*return*/, null];
                        return [2 /*return*/, this.buf.shift()];
                }
            });
        });
    };
    ObjectReadStream.prototype.peekArray = function (count) {
        if (count === void 0) { count = null; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadIntoBuffer(count === null ? 1 : count)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.buf.slice(0, count === null ? Infinity : count)];
                }
            });
        });
    };
    ObjectReadStream.prototype.readArray = function (count) {
        if (count === void 0) { count = null; }
        return __awaiter(this, void 0, void 0, function () {
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadIntoBuffer(count === null ? 1 : count, true)];
                    case 1:
                        _a.sent();
                        out = this.buf.slice(0, count === null ? Infinity : count);
                        this.buf = this.buf.slice(out.length);
                        return [2 /*return*/, out];
                }
            });
        });
    };
    ObjectReadStream.prototype.readAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var out;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadIntoBuffer(Infinity, true)];
                    case 1:
                        _a.sent();
                        out = this.buf;
                        this.buf = [];
                        return [2 /*return*/, out];
                }
            });
        });
    };
    ObjectReadStream.prototype.peekAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadIntoBuffer(Infinity)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.buf.slice()];
                }
            });
        });
    };
    ObjectReadStream.prototype.destroy = function () {
        this.atEOF = true;
        this.buf = [];
        this.resolvePush();
        return this._destroy();
    };
    // eslint-disable-next-line no-restricted-globals
    ObjectReadStream.prototype[Symbol.asyncIterator] = function () { return this; };
    ObjectReadStream.prototype.next = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.buf.length)
                            return [2 /*return*/, { value: this.buf.shift(), done: false }];
                        return [4 /*yield*/, this.loadIntoBuffer(1, true)];
                    case 1:
                        _a.sent();
                        if (!this.buf.length)
                            return [2 /*return*/, { value: undefined, done: true }];
                        return [2 /*return*/, { value: this.buf.shift(), done: false }];
                }
            });
        });
    };
    ObjectReadStream.prototype.pipeTo = function (outStream, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var value, done;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.next()];
                    case 1:
                        if (!(_a = _b.sent(), value = _a.value, done = _a.done, !done)) return [3 /*break*/, 3];
                        return [4 /*yield*/, outStream.write(value)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 0];
                    case 3:
                        if (!options.noEnd)
                            return [2 /*return*/, outStream.writeEnd()];
                        return [2 /*return*/];
                }
            });
        });
    };
    return ObjectReadStream;
}());
exports.ObjectReadStream = ObjectReadStream;
var ObjectWriteStream = /** @class */ (function () {
    function ObjectWriteStream(optionsOrStream) {
        if (optionsOrStream === void 0) { optionsOrStream = {}; }
        this.isReadable = false;
        this.isWritable = true;
        this.nodeWritableStream = null;
        var options = optionsOrStream;
        if (options._writableState) {
            options = { nodeStream: optionsOrStream };
        }
        if (options.nodeStream) {
            var nodeStream = options.nodeStream;
            this.nodeWritableStream = nodeStream;
            options.write = function (data) {
                var _this = this;
                var result = this.nodeWritableStream.write(data);
                if (result === false) {
                    return new Promise(function (resolve) {
                        _this.nodeWritableStream.once('drain', function () {
                            resolve();
                        });
                    });
                }
            };
            // Prior to Node v10.12.0, attempting to close STDOUT or STDERR will throw
            if (nodeStream !== process.stdout && nodeStream !== process.stderr) {
                options.writeEnd = function () {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.nodeWritableStream.end(function () { return resolve(); });
                    });
                };
            }
        }
        if (options.write)
            this._write = options.write;
        if (options.writeEnd)
            this._writeEnd = options.writeEnd;
    }
    ObjectWriteStream.prototype.write = function (elem) {
        if (elem === null) {
            return this.writeEnd();
        }
        return this._write(elem);
    };
    ObjectWriteStream.prototype._write = function (elem) {
        throw new Error("WriteStream needs to be subclassed and the _write function needs to be implemented.");
    };
    ObjectWriteStream.prototype._writeEnd = function () { };
    ObjectWriteStream.prototype.writeEnd = function (elem) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(elem !== undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.write(elem)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, this._writeEnd()];
                }
            });
        });
    };
    return ObjectWriteStream;
}());
exports.ObjectWriteStream = ObjectWriteStream;
var ObjectReadWriteStream = /** @class */ (function (_super) {
    __extends(ObjectReadWriteStream, _super);
    function ObjectReadWriteStream(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, options) || this;
        _this.isReadable = true;
        _this.isWritable = true;
        _this.nodeWritableStream = null;
        if (options.write)
            _this._write = options.write;
        if (options.writeEnd)
            _this._writeEnd = options.writeEnd;
        return _this;
    }
    ObjectReadWriteStream.prototype.write = function (elem) {
        return this._write(elem);
    };
    ObjectReadWriteStream.prototype._write = function (elem) {
        throw new Error("WriteStream needs to be subclassed and the _write function needs to be implemented.");
    };
    /** In a ReadWriteStream, _read does not need to be implemented. */
    ObjectReadWriteStream.prototype._read = function () { };
    ObjectReadWriteStream.prototype._writeEnd = function () { };
    ObjectReadWriteStream.prototype.writeEnd = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._writeEnd()];
            });
        });
    };
    return ObjectReadWriteStream;
}(ObjectReadStream));
exports.ObjectReadWriteStream = ObjectReadWriteStream;
function readAll(nodeStream, encoding) {
    return new ReadStream(nodeStream).readAll(encoding);
}
exports.readAll = readAll;
function stdin() {
    return new ReadStream(process.stdin);
}
exports.stdin = stdin;
function stdout() {
    return new WriteStream(process.stdout);
}
exports.stdout = stdout;
function stdpipe(stream) {
    var promises = [];
    if (stream.pipeTo) {
        promises.push(stream.pipeTo(stdout()));
    }
    if (stream.write) {
        promises.push(stdin().pipeTo(stream));
    }
    return Promise.all(promises);
}
exports.stdpipe = stdpipe;
