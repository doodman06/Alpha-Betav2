"use strict";
/**
 * Net - abstraction layer around Node's HTTP/S request system.
 * Advantages:
 * - easier acquiring of data
 * - mass disabling of outgoing requests via Config.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Net = exports.NetRequest = exports.NetStream = exports.HttpError = void 0;
var https = require("https");
var http = require("http");
var url = require("url");
var Streams = require("./streams");
var HttpError = /** @class */ (function (_super) {
    __extends(HttpError, _super);
    function HttpError(message, statusCode, body) {
        var _this = _super.call(this, message) || this;
        _this.name = 'HttpError';
        _this.statusCode = statusCode;
        _this.body = body;
        Error.captureStackTrace(_this, HttpError);
        return _this;
    }
    return HttpError;
}(Error));
exports.HttpError = HttpError;
var NetStream = /** @class */ (function (_super) {
    __extends(NetStream, _super);
    function NetStream(uri, opts) {
        if (opts === void 0) { opts = null; }
        var _this = _super.call(this) || this;
        _this.statusCode = null;
        _this.headers = null;
        _this.uri = uri;
        _this.opts = opts;
        // make request
        _this.response = null;
        _this.state = 'pending';
        _this.request = _this.makeRequest(opts);
        return _this;
    }
    NetStream.prototype.makeRequest = function (opts) {
        var _this = this;
        if (!opts)
            opts = {};
        var body = opts.body;
        if (body && typeof body !== 'string') {
            if (!opts.headers)
                opts.headers = {};
            if (!opts.headers['Content-Type']) {
                opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            body = NetStream.encodeQuery(body);
        }
        if (opts.query) {
            this.uri += (this.uri.includes('?') ? '&' : '?') + NetStream.encodeQuery(opts.query);
        }
        if (body) {
            if (!opts.headers)
                opts.headers = {};
            if (!opts.headers['Content-Length']) {
                opts.headers['Content-Length'] = Buffer.byteLength(body);
            }
        }
        var protocol = url.parse(this.uri).protocol;
        var net = protocol === 'https:' ? https : http;
        var resolveResponse;
        this.response = new Promise(function (resolve) {
            resolveResponse = resolve;
        });
        var request = net.request(this.uri, opts, function (response) {
            _this.state = 'open';
            _this.nodeReadableStream = response;
            _this.response = response;
            _this.statusCode = response.statusCode || null;
            _this.headers = response.headers;
            response.setEncoding('utf-8');
            resolveResponse(response);
            resolveResponse = null;
            response.on('data', function (data) {
                _this.push(data);
            });
            response.on('end', function () {
                if (_this.state === 'open')
                    _this.state = 'success';
                if (!_this.atEOF)
                    _this.pushEnd();
            });
        });
        request.on('close', function () {
            if (!_this.atEOF) {
                _this.state = 'error';
                _this.pushError(new Error("Unexpected connection close"));
            }
            if (resolveResponse) {
                _this.response = null;
                resolveResponse(null);
                resolveResponse = null;
            }
        });
        request.on('error', function (error) {
            if (!_this.atEOF)
                _this.pushError(error, true);
        });
        if (opts.timeout || opts.timeout === undefined) {
            request.setTimeout(opts.timeout || 5000, function () {
                _this.state = 'timeout';
                _this.pushError(new Error("Request timeout"));
                request.abort();
            });
        }
        if (body) {
            request.write(body);
            request.end();
            if (opts.writable) {
                throw new Error("options.body is what you would have written to a NetStream - you must choose one or the other");
            }
        }
        else if (opts.writable) {
            this.nodeWritableStream = request;
        }
        else {
            request.end();
        }
        return request;
    };
    NetStream.encodeQuery = function (data) {
        var out = '';
        for (var key in data) {
            if (out)
                out += "&";
            out += "".concat(key, "=").concat(encodeURIComponent('' + data[key]));
        }
        return out;
    };
    NetStream.prototype._write = function (data) {
        var _this = this;
        if (!this.nodeWritableStream) {
            throw new Error("You must specify opts.writable to write to a request.");
        }
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
    NetStream.prototype._read = function () {
        var _a;
        (_a = this.nodeReadableStream) === null || _a === void 0 ? void 0 : _a.resume();
    };
    NetStream.prototype._pause = function () {
        var _a;
        (_a = this.nodeReadableStream) === null || _a === void 0 ? void 0 : _a.pause();
    };
    return NetStream;
}(Streams.ReadWriteStream));
exports.NetStream = NetStream;
var NetRequest = /** @class */ (function () {
    function NetRequest(uri) {
        this.uri = uri;
    }
    /**
     * Makes a http/https get request to the given link and returns a stream.
     * The request data itself can be read with ReadStream#readAll().
     * The NetStream class also holds headers and statusCode as a property.
     *
     * @param opts request opts - headers, etc.
     * @param body POST body
     */
    NetRequest.prototype.getStream = function (opts) {
        if (opts === void 0) { opts = {}; }
        if (typeof Config !== 'undefined' && Config.noNetRequests) {
            throw new Error("Net requests are disabled.");
        }
        var stream = new NetStream(this.uri, opts);
        return stream;
    };
    /**
     * Makes a basic http/https request to the URI.
     * Returns the response data.
     *
     * Will throw if the response code isn't 200 OK.
     *
     * @param opts request opts - headers, etc.
     */
    NetRequest.prototype.get = function (opts) {
        if (opts === void 0) { opts = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var stream, response, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        stream = this.getStream(opts);
                        return [4 /*yield*/, stream.response];
                    case 1:
                        response = _c.sent();
                        if (!(response && response.statusCode !== 200)) return [3 /*break*/, 3];
                        _a = HttpError.bind;
                        _b = [void 0, response.statusMessage || "Connection error", response.statusCode];
                        return [4 /*yield*/, stream.readAll()];
                    case 2: throw new (_a.apply(HttpError, _b.concat([_c.sent()])))();
                    case 3: return [2 /*return*/, stream.readAll()];
                }
            });
        });
    };
    NetRequest.prototype.post = function (opts, body) {
        if (opts === void 0) { opts = {}; }
        if (!body)
            body = opts.body;
        return this.get(__assign(__assign({}, opts), { method: 'POST', body: body }));
    };
    return NetRequest;
}());
exports.NetRequest = NetRequest;
exports.Net = Object.assign(function (path) { return new NetRequest(path); }, {
    NetRequest: NetRequest,
    NetStream: NetStream,
});
