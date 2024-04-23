"use strict";
/**
 * Library made to simplify accessing / connecting to postgres databases,
 * and to cleanly handle when the pg module isn't installed.
 * @author mia-pi-git
 */
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
exports.PostgresDatabase = void 0;
var Streams = require("./streams");
var fs_1 = require("./fs");
var Utils = require("./utils");
var PostgresDatabase = /** @class */ (function () {
    function PostgresDatabase(config) {
        if (config === void 0) { config = PostgresDatabase.getConfig(); }
        try {
            this.pool = new (require('pg').Pool)(config);
        }
        catch (e) {
            this.pool = null;
        }
    }
    PostgresDatabase.prototype.destroy = function () {
        return this.pool.end();
    };
    PostgresDatabase.prototype.query = function (statement, values) {
        return __awaiter(this, void 0, void 0, function () {
            var result, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pool) {
                            throw new Error("Attempting to use postgres without 'pg' installed");
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.pool.query(statement, values)];
                    case 2:
                        result = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        // postgres won't give accurate stacks unless we do this
                        throw new Error(e_1.message);
                    case 4: return [2 /*return*/, (result === null || result === void 0 ? void 0 : result.rows) || []];
                }
            });
        });
    };
    PostgresDatabase.getConfig = function () {
        var config = {};
        try {
            config = require(fs_1.FS.ROOT_PATH + '/config/config').usepostgres;
            if (!config)
                throw new Error('Missing config for pg database');
        }
        catch (e) { }
        return config;
    };
    PostgresDatabase.prototype.transaction = function (callback, depth) {
        if (depth === void 0) { depth = 0; }
        return __awaiter(this, void 0, void 0, function () {
            var conn, result, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pool.connect()];
                    case 1:
                        conn = _a.sent();
                        return [4 /*yield*/, conn.query("BEGIN")];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 7]);
                        return [4 /*yield*/, callback(conn)];
                    case 4:
                        // eslint-disable-next-line callback-return
                        result = _a.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        e_2 = _a.sent();
                        return [4 /*yield*/, conn.query("ROLLBACK")];
                    case 6:
                        _a.sent();
                        // two concurrent transactions conflicted, try again
                        if (e_2.code === '40001' && depth <= 10) {
                            return [2 /*return*/, this.transaction(callback, depth + 1)];
                            // There is a bug in Postgres that causes some
                            // serialization failures to be reported as failed
                            // unique constraint checks. Only retrying once since
                            // it could be our fault (thanks chaos for this info / the first half of this comment)
                        }
                        else if (e_2.code === '23505' && !depth) {
                            return [2 /*return*/, this.transaction(callback, depth + 1)];
                        }
                        else {
                            throw e_2;
                        }
                        return [3 /*break*/, 7];
                    case 7: return [4 /*yield*/, conn.query("COMMIT")];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    PostgresDatabase.prototype.stream = function (query) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var db = this;
        return new Streams.ObjectReadStream({
            read: function () {
                return __awaiter(this, void 0, void 0, function () {
                    var result;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0: return [4 /*yield*/, db.query(query)];
                            case 1:
                                result = _b.sent();
                                if (!result.length)
                                    return [2 /*return*/, this.pushEnd()];
                                // getting one row at a time means some slower queries
                                // might help with performance
                                (_a = this.buf).push.apply(_a, result);
                                return [2 /*return*/];
                        }
                    });
                });
            },
        });
    };
    PostgresDatabase.prototype.ensureMigrated = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            var value, stored, e_3, files, curVer, _a, _i, files_1, n;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 4]);
                        return [4 /*yield*/, this.query("SELECT value FROM db_info WHERE key = 'version' AND name = $1", [opts.table])];
                    case 1:
                        stored = _b.sent();
                        if (stored.length) {
                            value = stored[0].value || "0";
                        }
                        return [3 /*break*/, 4];
                    case 2:
                        e_3 = _b.sent();
                        return [4 /*yield*/, this.query("CREATE TABLE db_info (name TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL)")];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        if (!!value) return [3 /*break*/, 6];
                        value = "0";
                        return [4 /*yield*/, this.query('INSERT INTO db_info (name, key, value) VALUES ($1, $2, $3)', [opts.table, 'version', value])];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        value = Number(value);
                        files = (0, fs_1.FS)(opts.migrationsFolder)
                            .readdirSync()
                            .filter(function (f) { return f.endsWith('.sql'); })
                            .map(function (f) { return Number(f.slice(1).split('.')[0]); });
                        Utils.sortBy(files, function (f) { return f; });
                        curVer = files[files.length - 1] || 0;
                        if (!(curVer !== value)) return [3 /*break*/, 16];
                        if (!!value) return [3 /*break*/, 11];
                        _b.label = 7;
                    case 7:
                        _b.trys.push([7, 9, , 11]);
                        return [4 /*yield*/, this.query("SELECT * FROM ".concat(opts.table, " LIMIT 1"))];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 9:
                        _a = _b.sent();
                        return [4 /*yield*/, this.query((0, fs_1.FS)(opts.baseSchemaFile).readSync())];
                    case 10:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 11:
                        _i = 0, files_1 = files;
                        _b.label = 12;
                    case 12:
                        if (!(_i < files_1.length)) return [3 /*break*/, 16];
                        n = files_1[_i];
                        if (n <= value)
                            return [3 /*break*/, 15];
                        return [4 /*yield*/, this.query((0, fs_1.FS)("".concat(opts.migrationsFolder, "/v").concat(n, ".sql")).readSync())];
                    case 13:
                        _b.sent();
                        return [4 /*yield*/, this.query("UPDATE db_info SET value = $1 WHERE key = 'version' AND name = $2", ["".concat(n), opts.table])];
                    case 14:
                        _b.sent();
                        _b.label = 15;
                    case 15:
                        _i++;
                        return [3 /*break*/, 12];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    return PostgresDatabase;
}());
exports.PostgresDatabase = PostgresDatabase;
