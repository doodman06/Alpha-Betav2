"use strict";
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
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
exports.SQL = exports.DatabaseTable = exports.tables = exports.SQLDatabaseManager = exports.Statement = exports.DB_NOT_FOUND = void 0;
/**
 * Async worker thread wrapper around SQLite, written to improve concurrent performance.
 * @author mia-pi-git
 */
var process_manager_1 = require("./process-manager");
var fs_1 = require("./fs");
exports.DB_NOT_FOUND = null;
function getModule() {
    try {
        return require('better-sqlite3');
    }
    catch (_a) {
        return null;
    }
}
var Statement = /** @class */ (function () {
    function Statement(statement, db) {
        this.db = db;
        this.statement = statement;
    }
    Statement.prototype.run = function (data) {
        return this.db.run(this.statement, data);
    };
    Statement.prototype.all = function (data) {
        return this.db.all(this.statement, data);
    };
    Statement.prototype.get = function (data) {
        return this.db.get(this.statement, data);
    };
    Statement.prototype.toString = function () {
        return this.statement;
    };
    Statement.prototype.toJSON = function () {
        return this.statement;
    };
    return Statement;
}());
exports.Statement = Statement;
var SQLDatabaseManager = /** @class */ (function (_super) {
    __extends(SQLDatabaseManager, _super);
    function SQLDatabaseManager(module, options) {
        var _this = _super.call(this, module, function (query) {
            if (!_this.dbReady) {
                _this.setupDatabase();
            }
            try {
                switch (query.type) {
                    case 'load-extension': {
                        if (!_this.database)
                            return null;
                        _this.loadExtensionFile(query.data);
                        return true;
                    }
                    case 'transaction': {
                        var transaction = _this.state.transactions.get(query.name);
                        // !transaction covers db not existing, typically, but this is just to appease ts
                        if (!transaction || !_this.database) {
                            return null;
                        }
                        var env = {
                            db: _this.database,
                            statements: _this.state.statements,
                        };
                        return transaction(query.data, env) || null;
                    }
                    case 'exec': {
                        if (!_this.database)
                            return { changes: 0 };
                        _this.database.exec(query.data);
                        return true;
                    }
                    case 'get': {
                        if (!_this.database) {
                            return null;
                        }
                        return _this.extractStatement(query).get(query.data);
                    }
                    case 'run': {
                        if (!_this.database) {
                            return null;
                        }
                        return _this.extractStatement(query).run(query.data);
                    }
                    case 'all': {
                        if (!_this.database) {
                            return null;
                        }
                        return _this.extractStatement(query).all(query.data);
                    }
                    case 'prepare':
                        if (!_this.database) {
                            return null;
                        }
                        _this.state.statements.set(query.data, _this.database.prepare(query.data));
                        return query.data;
                }
            }
            catch (error) {
                return _this.onError(error, query);
            }
        }) || this;
        _this.database = null;
        _this.dbReady = false;
        _this.options = options;
        _this.state = {
            transactions: new Map(),
            statements: new Map(),
        };
        if (!_this.isParentProcess)
            _this.setupDatabase();
        return _this;
    }
    SQLDatabaseManager.prototype.onError = function (err, query) {
        if (this.options.onError) {
            var result = this.options.onError(err, query, false);
            if (result)
                return result;
        }
        return {
            queryError: {
                stack: err.stack,
                message: err.message,
                query: query,
            },
        };
    };
    SQLDatabaseManager.prototype.cacheStatement = function (source) {
        source = source.trim();
        var statement = this.state.statements.get(source);
        if (!statement) {
            statement = this.database.prepare(source);
            this.state.statements.set(source, statement);
        }
        return statement;
    };
    SQLDatabaseManager.prototype.extractStatement = function (query) {
        query.statement = query.statement.trim();
        var statement = query.noPrepare ?
            this.state.statements.get(query.statement) :
            this.cacheStatement(query.statement);
        if (!statement)
            throw new Error("Missing cached statement \"".concat(query.statement, "\" where required"));
        return statement;
    };
    SQLDatabaseManager.prototype.setupDatabase = function () {
        if (this.dbReady)
            return;
        this.dbReady = true;
        var _a = this.options, file = _a.file, extension = _a.extension;
        var Database = getModule();
        this.database = Database ? new Database(file) : null;
        if (extension)
            this.loadExtensionFile(extension);
    };
    SQLDatabaseManager.prototype.loadExtensionFile = function (extension) {
        if (!this.database)
            return;
        var _a = require("../".concat(extension)), functions = _a.functions, storedTransactions = _a.transactions, storedStatements = _a.statements, onDatabaseStart = _a.onDatabaseStart;
        if (functions) {
            for (var k in functions) {
                this.database.function(k, functions[k]);
            }
        }
        if (storedTransactions) {
            for (var t in storedTransactions) {
                var transaction = this.database.transaction(storedTransactions[t]);
                this.state.transactions.set(t, transaction);
            }
        }
        if (storedStatements) {
            for (var k in storedStatements) {
                var statement = this.database.prepare(storedStatements[k]);
                this.state.statements.set(statement.source, statement);
            }
        }
        if (onDatabaseStart) {
            onDatabaseStart(this.database);
        }
    };
    SQLDatabaseManager.prototype.query = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var result, err, errResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.query.call(this, input)];
                    case 1:
                        result = _a.sent();
                        if (result === null || result === void 0 ? void 0 : result.queryError) {
                            err = new Error(result.queryError.message);
                            err.stack = result.queryError.stack;
                            if (this.options.onError) {
                                errResult = this.options.onError(err, result.queryError.query, true);
                                if (errResult)
                                    return [2 /*return*/, errResult];
                            }
                            throw err;
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    SQLDatabaseManager.prototype.all = function (statement, data, noPrepare) {
        if (data === void 0) { data = []; }
        if (typeof statement !== 'string')
            statement = statement.toString();
        return this.query({ type: 'all', statement: statement, data: data, noPrepare: noPrepare });
    };
    SQLDatabaseManager.prototype.get = function (statement, data, noPrepare) {
        if (data === void 0) { data = []; }
        if (typeof statement !== 'string')
            statement = statement.toString();
        return this.query({ type: 'get', statement: statement, data: data, noPrepare: noPrepare });
    };
    SQLDatabaseManager.prototype.run = function (statement, data, noPrepare) {
        if (data === void 0) { data = []; }
        if (typeof statement !== 'string')
            statement = statement.toString();
        return this.query({ type: 'run', statement: statement, data: data, noPrepare: noPrepare });
    };
    SQLDatabaseManager.prototype.transaction = function (name, data) {
        if (data === void 0) { data = []; }
        return this.query({ type: 'transaction', name: name, data: data });
    };
    SQLDatabaseManager.prototype.prepare = function (statement) {
        return __awaiter(this, void 0, void 0, function () {
            var source;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query({ type: 'prepare', data: statement })];
                    case 1:
                        source = _a.sent();
                        if (!source)
                            return [2 /*return*/, null];
                        return [2 /*return*/, new Statement(source, this)];
                }
            });
        });
    };
    SQLDatabaseManager.prototype.exec = function (data) {
        return this.query({ type: 'exec', data: data });
    };
    SQLDatabaseManager.prototype.loadExtension = function (filepath) {
        return this.query({ type: 'load-extension', data: filepath });
    };
    SQLDatabaseManager.prototype.runFile = function (file) {
        return __awaiter(this, void 0, void 0, function () {
            var contents;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, fs_1.FS)(file).read()];
                    case 1:
                        contents = _a.sent();
                        return [2 /*return*/, this.query({ type: 'exec', data: contents })];
                }
            });
        });
    };
    return SQLDatabaseManager;
}(process_manager_1.QueryProcessManager));
exports.SQLDatabaseManager = SQLDatabaseManager;
exports.tables = new Map();
var DatabaseTable = /** @class */ (function () {
    function DatabaseTable(name, primaryKeyName, database) {
        this.name = name;
        this.database = database;
        this.primaryKeyName = primaryKeyName;
        exports.tables.set(this.name, this);
    }
    DatabaseTable.prototype.selectOne = function (entries, where) {
        return __awaiter(this, void 0, void 0, function () {
            var query, rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = where || exports.SQL.SQL(templateObject_1 || (templateObject_1 = __makeTemplateObject([""], [""])));
                        query.append(' LIMIT 1');
                        return [4 /*yield*/, this.selectAll(entries, query)];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, (rows === null || rows === void 0 ? void 0 : rows[0]) || null];
                }
            });
        });
    };
    DatabaseTable.prototype.selectAll = function (entries, where) {
        var query = exports.SQL.SQL(templateObject_2 || (templateObject_2 = __makeTemplateObject(["SELECT "], ["SELECT "])));
        if (typeof entries === 'string') {
            query.append(" ".concat(entries, " "));
        }
        else {
            for (var i = 0; i < entries.length; i++) {
                query.append(entries[i]);
                if (typeof entries[i + 1] !== 'undefined')
                    query.append(', ');
            }
            query.append(' ');
        }
        query.append("FROM ".concat(this.name, " "));
        if (where) {
            query.append(' WHERE ');
            query.append(where);
        }
        return this.all(query);
    };
    DatabaseTable.prototype.get = function (entries, keyId) {
        var query = exports.SQL.SQL(templateObject_3 || (templateObject_3 = __makeTemplateObject([""], [""])));
        query.append(this.primaryKeyName);
        query.append(exports.SQL.SQL(templateObject_4 || (templateObject_4 = __makeTemplateObject([" = ", ""], [" = ", ""])), keyId));
        return this.selectOne(entries, query);
    };
    DatabaseTable.prototype.updateAll = function (toParams, where, limit) {
        var to = Object.entries(toParams);
        var query = exports.SQL.SQL(templateObject_5 || (templateObject_5 = __makeTemplateObject(["UPDATE "], ["UPDATE "])));
        query.append(this.name + ' SET ');
        for (var i = 0; i < to.length; i++) {
            var _a = to[i], k = _a[0], v = _a[1];
            query.append("".concat(k, " = "));
            query.append(exports.SQL.SQL(templateObject_6 || (templateObject_6 = __makeTemplateObject(["", ""], ["", ""])), v));
            if (typeof to[i + 1] !== 'undefined') {
                query.append(', ');
            }
        }
        if (where) {
            query.append(" WHERE ");
            query.append(where);
        }
        if (limit)
            query.append(exports.SQL.SQL(templateObject_7 || (templateObject_7 = __makeTemplateObject([" LIMIT ", ""], [" LIMIT ", ""])), limit));
        return this.run(query);
    };
    DatabaseTable.prototype.updateOne = function (to, where) {
        return this.updateAll(to, where, 1);
    };
    DatabaseTable.prototype.deleteAll = function (where, limit) {
        var query = exports.SQL.SQL(templateObject_8 || (templateObject_8 = __makeTemplateObject(["DELETE FROM "], ["DELETE FROM "])));
        query.append(this.name);
        if (where) {
            query.append(' WHERE ');
            query.append(where);
        }
        if (limit) {
            query.append(exports.SQL.SQL(templateObject_9 || (templateObject_9 = __makeTemplateObject([" LIMIT ", ""], [" LIMIT ", ""])), limit));
        }
        return this.run(query);
    };
    DatabaseTable.prototype.delete = function (keyEntry) {
        var query = exports.SQL.SQL(templateObject_10 || (templateObject_10 = __makeTemplateObject([""], [""])));
        query.append(this.primaryKeyName);
        query.append(exports.SQL.SQL(templateObject_11 || (templateObject_11 = __makeTemplateObject([" = ", ""], [" = ", ""])), keyEntry));
        return this.deleteOne(query);
    };
    DatabaseTable.prototype.deleteOne = function (where) {
        return this.deleteAll(where, 1);
    };
    DatabaseTable.prototype.insert = function (colMap, rest, isReplace) {
        if (isReplace === void 0) { isReplace = false; }
        var query = exports.SQL.SQL(templateObject_12 || (templateObject_12 = __makeTemplateObject([""], [""])));
        query.append("".concat(isReplace ? 'REPLACE' : 'INSERT', " INTO ").concat(this.name, " ("));
        var keys = Object.keys(colMap);
        for (var i = 0; i < keys.length; i++) {
            query.append(keys[i]);
            if (typeof keys[i + 1] !== 'undefined')
                query.append(', ');
        }
        query.append(') VALUES (');
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            query.append(exports.SQL.SQL(templateObject_13 || (templateObject_13 = __makeTemplateObject(["", ""], ["", ""])), colMap[key]));
            if (typeof keys[i + 1] !== 'undefined')
                query.append(', ');
        }
        query.append(') ');
        if (rest)
            query.append(rest);
        return this.database.run(query.sql, query.values);
    };
    DatabaseTable.prototype.replace = function (cols, rest) {
        return this.insert(cols, rest, true);
    };
    DatabaseTable.prototype.update = function (primaryKey, data) {
        var query = exports.SQL.SQL(templateObject_14 || (templateObject_14 = __makeTemplateObject([""], [""])));
        query.append(this.primaryKeyName + ' = ');
        query.append(exports.SQL.SQL(templateObject_15 || (templateObject_15 = __makeTemplateObject(["", ""], ["", ""])), primaryKey));
        return this.updateOne(data, query);
    };
    // catch-alls for "we can't fit this query into any of the wrapper functions"
    DatabaseTable.prototype.run = function (sql) {
        return this.database.run(sql.sql, sql.values);
    };
    DatabaseTable.prototype.all = function (sql) {
        return this.database.all(sql.sql, sql.values);
    };
    return DatabaseTable;
}());
exports.DatabaseTable = DatabaseTable;
function getSQL(module, input) {
    var processes = input.processes;
    var PM = new SQLDatabaseManager(module, input);
    if (PM.isParentProcess) {
        if (processes)
            PM.spawn(processes);
    }
    return PM;
}
exports.SQL = Object.assign(getSQL, {
    DatabaseTable: DatabaseTable,
    SQLDatabaseManager: SQLDatabaseManager,
    tables: exports.tables,
    SQL: (function () {
        try {
            return require('sql-template-strings');
        }
        catch (_a) {
            return function () {
                throw new Error("Using SQL-template-strings without it installed");
            };
        }
    })(),
});
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15;
