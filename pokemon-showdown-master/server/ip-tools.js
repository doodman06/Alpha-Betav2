"use strict";
/**
 * IP Tools
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * IPTools file has various tools for IP parsing and IP-based blocking.
 *
 * These include DNSBLs: DNS-based blackhole lists, which list IPs known for
 * running proxies, spamming, or other abuse.
 *
 * We also maintain our own database of datacenter IP ranges (usually
 * proxies). These are taken from https://github.com/client9/ipcat
 * but include our own database as well.
 *
 * @license MIT
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
exports.IPTools = void 0;
var BLOCKLISTS = ['sbl.spamhaus.org', 'rbl.efnetrbl.org'];
var HOSTS_FILE = 'config/hosts.csv';
var PROXIES_FILE = 'config/proxies.csv';
var dns = require("dns");
var lib_1 = require("../lib");
function removeNohost(hostname) {
    // Convert from old domain.tld.type-nohost format to new domain.tld?/type format
    if (hostname === null || hostname === void 0 ? void 0 : hostname.includes('-nohost')) {
        var parts = hostname.split('.');
        var suffix = parts.pop();
        return "".concat(parts.join('.'), "?/").concat(suffix === null || suffix === void 0 ? void 0 : suffix.replace('-nohost', ''));
    }
    return hostname;
}
exports.IPTools = new /** @class */ (function () {
    function class_1() {
        this.dnsblCache = new Map([
            ['127.0.0.1', null],
        ]);
        this.connectionTestCache = new Map();
        this.ipRegex = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/;
        this.ipRangeRegex = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9]|\*)){0,2}\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9]|\*)$/;
        this.hostRegex = /^.+\..{2,}$/;
        /**
         * Proxy and host management functions
         */
        this.ranges = [];
        this.singleIPOpenProxies = new Set();
        this.torProxyIps = new Set();
        this.proxyHosts = new Set();
        this.residentialHosts = new Set();
        this.mobileHosts = new Set();
    }
    class_1.prototype.lookup = function (ip) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, dnsbl, host, shortHost, hostType;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            exports.IPTools.queryDnsbl(ip),
                            exports.IPTools.getHost(ip),
                        ])];
                    case 1:
                        _a = _b.sent(), dnsbl = _a[0], host = _a[1];
                        shortHost = this.shortenHost(host);
                        hostType = this.getHostType(shortHost, ip);
                        return [2 /*return*/, { dnsbl: dnsbl, host: host, shortHost: shortHost, hostType: hostType }];
                }
            });
        });
    };
    class_1.prototype.queryDnsblLoop = function (ip, callback, reversedIpDot, index) {
        if (index >= BLOCKLISTS.length) {
            // not in any blocklist
            exports.IPTools.dnsblCache.set(ip, null);
            callback(null);
            return;
        }
        var blocklist = BLOCKLISTS[index];
        dns.lookup(reversedIpDot + blocklist, 4, function (err, res) {
            if (!err) {
                // blocked
                exports.IPTools.dnsblCache.set(ip, blocklist);
                callback(blocklist);
                return;
            }
            // not blocked, try next blocklist
            exports.IPTools.queryDnsblLoop(ip, callback, reversedIpDot, index + 1);
        });
    };
    /**
     * IPTools.queryDnsbl(ip, callback)
     *
     * Calls callb
     * ack(blocklist), where blocklist is the blocklist domain
     * if the passed IP is in a blocklist, or null if the IP is not in
     * any blocklist.
     *
     * Return value matches isBlocked when treated as a boolean.
     */
    class_1.prototype.queryDnsbl = function (ip) {
        if (!Config.dnsbl)
            return Promise.resolve(null);
        if (exports.IPTools.dnsblCache.has(ip)) {
            return Promise.resolve(exports.IPTools.dnsblCache.get(ip) || null);
        }
        var reversedIpDot = ip.split('.').reverse().join('.') + '.';
        return new Promise(function (resolve, reject) {
            exports.IPTools.queryDnsblLoop(ip, resolve, reversedIpDot, 0);
        });
    };
    /*********************************************************
     * IP parsing
     *********************************************************/
    class_1.prototype.ipToNumber = function (ip) {
        ip = ip.trim();
        if (ip.includes(':') && !ip.includes('.')) {
            // IPv6, which PS does not support
            return null;
        }
        if (ip.startsWith('::ffff:'))
            ip = ip.slice(7);
        else if (ip.startsWith('::'))
            ip = ip.slice(2);
        var num = 0;
        var parts = ip.split('.');
        if (parts.length !== 4)
            return null;
        for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
            var part = parts_1[_i];
            num *= 256;
            var partAsInt = lib_1.Utils.parseExactInt(part);
            if (isNaN(partAsInt) || partAsInt < 0 || partAsInt > 255)
                return null;
            num += partAsInt;
        }
        return num;
    };
    class_1.prototype.numberToIP = function (num) {
        var ipParts = [];
        if (num < 0 || num >= Math.pow(256, 4) || num !== Math.trunc(num))
            return null;
        while (num) {
            var part = num % 256;
            num = (num - part) / 256;
            ipParts.unshift(part.toString());
        }
        while (ipParts.length < 4)
            ipParts.unshift('0');
        if (ipParts.length !== 4)
            return null;
        return ipParts.join('.');
    };
    class_1.prototype.getCidrRange = function (cidr) {
        if (!cidr)
            return null;
        var index = cidr.indexOf('/');
        if (index <= 0) {
            var ip = exports.IPTools.ipToNumber(cidr);
            if (ip === null)
                return null;
            return { minIP: ip, maxIP: ip };
        }
        var low = exports.IPTools.ipToNumber(cidr.slice(0, index));
        var bits = lib_1.Utils.parseExactInt(cidr.slice(index + 1));
        // fun fact: IPTools fails if bits <= 1 because JavaScript
        // does << with signed int32s.
        if (low === null || !bits || bits < 2 || bits > 32)
            return null;
        var high = low + (1 << (32 - bits)) - 1;
        return { minIP: low, maxIP: high };
    };
    /** Is this an IP range supported by `stringToRange`? Note that exact IPs are also valid IP ranges. */
    class_1.prototype.isValidRange = function (range) {
        return exports.IPTools.stringToRange(range) !== null;
    };
    class_1.prototype.stringToRange = function (range) {
        if (!range)
            return null;
        if (range.endsWith('*')) {
            var parts = range.replace('.*', '').split('.');
            if (parts.length > 3)
                return null;
            var a = parts[0], b = parts[1], c = parts[2];
            var minIP_1 = exports.IPTools.ipToNumber("".concat(a || '0', ".").concat(b || '0', ".").concat(c || '0', ".0"));
            var maxIP_1 = exports.IPTools.ipToNumber("".concat(a || '255', ".").concat(b || '255', ".").concat(c || '255', ".255"));
            if (minIP_1 === null || maxIP_1 === null)
                return null;
            return { minIP: minIP_1, maxIP: maxIP_1 };
        }
        var index = range.indexOf('-');
        if (index <= 0) {
            if (range.includes('/'))
                return exports.IPTools.getCidrRange(range);
            var ip = exports.IPTools.ipToNumber(range);
            if (ip === null)
                return null;
            return { maxIP: ip, minIP: ip };
        }
        var minIP = exports.IPTools.ipToNumber(range.slice(0, index));
        var maxIP = exports.IPTools.ipToNumber(range.slice(index + 1));
        if (minIP === null || maxIP === null || maxIP < minIP)
            return null;
        return { minIP: minIP, maxIP: maxIP };
    };
    class_1.prototype.rangeToString = function (range, sep) {
        if (sep === void 0) { sep = '-'; }
        return "".concat(this.numberToIP(range.minIP)).concat(sep).concat(this.numberToIP(range.maxIP));
    };
    /******************************
     * Range management functions *
     ******************************/
    class_1.prototype.checkPattern = function (patterns, num) {
        if (num === null)
            return false;
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var pattern = patterns_1[_i];
            if (num >= pattern.minIP && num <= pattern.maxIP) {
                return true;
            }
        }
        return false;
    };
    /**
     * Returns a checker function for the passed IP range or array of
     * ranges. The checker function returns true if its passed IP is
     * in the range.
     */
    class_1.prototype.checker = function (rangeString) {
        if (!(rangeString === null || rangeString === void 0 ? void 0 : rangeString.length))
            return function () { return false; };
        var ranges = [];
        if (typeof rangeString === 'string') {
            var rangePatterns = exports.IPTools.stringToRange(rangeString);
            if (rangePatterns)
                ranges = [rangePatterns];
        }
        else {
            ranges = rangeString.map(exports.IPTools.stringToRange).filter(function (x) { return x; });
        }
        return function (ip) {
            var ipNumber = exports.IPTools.ipToNumber(ip);
            return exports.IPTools.checkPattern(ranges, ipNumber);
        };
    };
    class_1.prototype.loadHostsAndRanges = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, _a, rows, ranges, _i, rows_1, row, _b, type, hostOrLowIP, highIP, host, minIP, maxIP, range;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, (0, lib_1.FS)(HOSTS_FILE).readIfExists()];
                    case 1:
                        _a = (_c.sent());
                        return [4 /*yield*/, (0, lib_1.FS)(PROXIES_FILE).readIfExists()];
                    case 2:
                        data = _a + (_c.sent());
                        rows = data.split('\n').map(function (row) { return row.replace('\r', ''); });
                        ranges = [];
                        for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                            row = rows_1[_i];
                            if (!row)
                                continue;
                            _b = row.split(','), type = _b[0], hostOrLowIP = _b[1], highIP = _b[2], host = _b[3];
                            if (!hostOrLowIP)
                                continue;
                            // Handle legacy data format
                            host = removeNohost(host);
                            hostOrLowIP = removeNohost(hostOrLowIP);
                            switch (type) {
                                case 'IP':
                                    exports.IPTools.singleIPOpenProxies.add(hostOrLowIP);
                                    break;
                                case 'HOST':
                                    exports.IPTools.proxyHosts.add(hostOrLowIP);
                                    break;
                                case 'RESIDENTIAL':
                                    exports.IPTools.residentialHosts.add(hostOrLowIP);
                                    break;
                                case 'MOBILE':
                                    exports.IPTools.mobileHosts.add(hostOrLowIP);
                                    break;
                                case 'RANGE':
                                    if (!host)
                                        continue;
                                    minIP = exports.IPTools.ipToNumber(hostOrLowIP);
                                    if (minIP === null) {
                                        Monitor.error("Bad IP address in host or proxy file: '".concat(hostOrLowIP, "'"));
                                        continue;
                                    }
                                    maxIP = exports.IPTools.ipToNumber(highIP);
                                    if (maxIP === null) {
                                        Monitor.error("Bad IP address in host or proxy file: '".concat(highIP, "'"));
                                        continue;
                                    }
                                    range = { host: exports.IPTools.urlToHost(host), maxIP: maxIP, minIP: minIP };
                                    if (range.maxIP < range.minIP)
                                        throw new Error("Bad range at ".concat(hostOrLowIP, "."));
                                    ranges.push(range);
                                    break;
                            }
                        }
                        exports.IPTools.ranges = ranges;
                        exports.IPTools.sortRanges();
                        return [2 /*return*/];
                }
            });
        });
    };
    class_1.prototype.saveHostsAndRanges = function () {
        var _a;
        var hostsData = '';
        var proxiesData = '';
        for (var _i = 0, _b = exports.IPTools.singleIPOpenProxies; _i < _b.length; _i++) {
            var ip = _b[_i];
            proxiesData += "IP,".concat(ip, "\n");
        }
        for (var _c = 0, _d = exports.IPTools.proxyHosts; _c < _d.length; _c++) {
            var host = _d[_c];
            proxiesData += "HOST,".concat(host, "\n");
        }
        for (var _e = 0, _f = exports.IPTools.residentialHosts; _e < _f.length; _e++) {
            var host = _f[_e];
            hostsData += "RESIDENTIAL,".concat(host, "\n");
        }
        for (var _g = 0, _h = exports.IPTools.mobileHosts; _g < _h.length; _g++) {
            var host = _h[_g];
            hostsData += "MOBILE,".concat(host, "\n");
        }
        exports.IPTools.sortRanges();
        for (var _j = 0, _k = exports.IPTools.ranges; _j < _k.length; _j++) {
            var range = _k[_j];
            var data = "RANGE,".concat(exports.IPTools.rangeToString(range, ',')).concat(range.host ? ",".concat(range.host) : "", "\n");
            if ((_a = range.host) === null || _a === void 0 ? void 0 : _a.endsWith('/proxy')) {
                proxiesData += data;
            }
            else {
                hostsData += data;
            }
        }
        void (0, lib_1.FS)(HOSTS_FILE).write(hostsData);
        void (0, lib_1.FS)(PROXIES_FILE).write(proxiesData);
    };
    class_1.prototype.addOpenProxies = function (ips) {
        for (var _i = 0, ips_1 = ips; _i < ips_1.length; _i++) {
            var ip = ips_1[_i];
            exports.IPTools.singleIPOpenProxies.add(ip);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.addProxyHosts = function (hosts) {
        for (var _i = 0, hosts_1 = hosts; _i < hosts_1.length; _i++) {
            var host = hosts_1[_i];
            exports.IPTools.proxyHosts.add(host);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.addMobileHosts = function (hosts) {
        for (var _i = 0, hosts_2 = hosts; _i < hosts_2.length; _i++) {
            var host = hosts_2[_i];
            exports.IPTools.mobileHosts.add(host);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.addResidentialHosts = function (hosts) {
        for (var _i = 0, hosts_3 = hosts; _i < hosts_3.length; _i++) {
            var host = hosts_3[_i];
            exports.IPTools.residentialHosts.add(host);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.removeOpenProxies = function (ips) {
        for (var _i = 0, ips_2 = ips; _i < ips_2.length; _i++) {
            var ip = ips_2[_i];
            exports.IPTools.singleIPOpenProxies.delete(ip);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.removeResidentialHosts = function (hosts) {
        for (var _i = 0, hosts_4 = hosts; _i < hosts_4.length; _i++) {
            var host = hosts_4[_i];
            exports.IPTools.residentialHosts.delete(host);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.removeProxyHosts = function (hosts) {
        for (var _i = 0, hosts_5 = hosts; _i < hosts_5.length; _i++) {
            var host = hosts_5[_i];
            exports.IPTools.proxyHosts.delete(host);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.removeMobileHosts = function (hosts) {
        for (var _i = 0, hosts_6 = hosts; _i < hosts_6.length; _i++) {
            var host = hosts_6[_i];
            exports.IPTools.mobileHosts.delete(host);
        }
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.rangeIntersects = function (a, b) {
        try {
            this.checkRangeConflicts(a, [b]);
        }
        catch (_a) {
            return true;
        }
        return false;
    };
    class_1.prototype.checkRangeConflicts = function (insertion, sortedRanges, widen) {
        var _a;
        if (insertion.maxIP < insertion.minIP) {
            throw new Error("Invalid data for address range ".concat(exports.IPTools.rangeToString(insertion), " (").concat(insertion.host, ")"));
        }
        var iMin = 0;
        var iMax = sortedRanges.length;
        while (iMin < iMax) {
            var i = Math.floor((iMax + iMin) / 2);
            if (insertion.minIP > sortedRanges[i].minIP) {
                iMin = i + 1;
            }
            else {
                iMax = i;
            }
        }
        if (iMin < sortedRanges.length) {
            var next = sortedRanges[iMin];
            if (insertion.minIP === next.minIP && insertion.maxIP === next.maxIP) {
                throw new Error("The address range ".concat(exports.IPTools.rangeToString(insertion), " (").concat(insertion.host, ") already exists"));
            }
            if (insertion.minIP <= next.minIP && insertion.maxIP >= next.maxIP) {
                if (widen) {
                    if (((_a = sortedRanges[iMin + 1]) === null || _a === void 0 ? void 0 : _a.minIP) <= insertion.maxIP) {
                        throw new Error("You can only widen one address range at a time.");
                    }
                    return iMin;
                }
                throw new Error("Too wide: ".concat(exports.IPTools.rangeToString(insertion), " (").concat(insertion.host, ")\n") +
                    "Intersects with: ".concat(exports.IPTools.rangeToString(next), " (").concat(next.host, ")"));
            }
            if (insertion.maxIP >= next.minIP) {
                throw new Error("Could not insert: ".concat(exports.IPTools.rangeToString(insertion), " ").concat(insertion.host, "\n") +
                    "Intersects with: ".concat(exports.IPTools.rangeToString(next), " (").concat(next.host, ")"));
            }
        }
        if (iMin > 0) {
            var prev = sortedRanges[iMin - 1];
            if (insertion.minIP >= prev.minIP && insertion.maxIP <= prev.maxIP) {
                throw new Error("Too narrow: ".concat(exports.IPTools.rangeToString(insertion), " (").concat(insertion.host, ")\n") +
                    "Intersects with: ".concat(exports.IPTools.rangeToString(prev), " (").concat(prev.host, ")"));
            }
            if (insertion.minIP <= prev.maxIP) {
                throw new Error("Could not insert: ".concat(exports.IPTools.rangeToString(insertion), " (").concat(insertion.host, ")\n") +
                    "Intersects with: ".concat(exports.IPTools.rangeToString(prev), " (").concat(prev.host, ")"));
            }
        }
    };
    /*********************************************************
     * Range handling functions
     *********************************************************/
    class_1.prototype.urlToHost = function (url) {
        if (url.startsWith('http://'))
            url = url.slice(7);
        if (url.startsWith('https://'))
            url = url.slice(8);
        if (url.startsWith('www.'))
            url = url.slice(4);
        var slashIndex = url.indexOf('/');
        if (slashIndex > 0 && url[slashIndex - 1] !== '?')
            url = url.slice(0, slashIndex);
        return url;
    };
    class_1.prototype.sortRanges = function () {
        lib_1.Utils.sortBy(exports.IPTools.ranges, function (range) { return range.minIP; });
    };
    class_1.prototype.getRange = function (minIP, maxIP) {
        for (var _i = 0, _a = exports.IPTools.ranges; _i < _a.length; _i++) {
            var range = _a[_i];
            if (range.minIP === minIP && range.maxIP === maxIP)
                return range;
        }
    };
    class_1.prototype.addRange = function (range) {
        if (exports.IPTools.getRange(range.minIP, range.maxIP)) {
            exports.IPTools.removeRange(range.minIP, range.maxIP);
        }
        exports.IPTools.ranges.push(range);
        return exports.IPTools.saveHostsAndRanges();
    };
    class_1.prototype.removeRange = function (minIP, maxIP) {
        exports.IPTools.ranges = exports.IPTools.ranges.filter(function (dc) { return dc.minIP !== minIP || dc.maxIP !== maxIP; });
        return exports.IPTools.saveHostsAndRanges();
    };
    /**
     * Will not reject; IPs with no RDNS entry will resolve to
     * '[byte1].[byte2]?/unknown'.
     */
    class_1.prototype.getHost = function (ip) {
        var _this = this;
        return new Promise(function (resolve) {
            if (!ip) {
                resolve('');
                return;
            }
            var ipNumber = exports.IPTools.ipToNumber(ip);
            if (ipNumber === null)
                throw new Error("Bad IP address: '".concat(ip, "'"));
            for (var _i = 0, _a = exports.IPTools.ranges; _i < _a.length; _i++) {
                var range = _a[_i];
                if (ipNumber >= range.minIP && ipNumber <= range.maxIP) {
                    resolve(range.host);
                    return;
                }
            }
            dns.reverse(ip, function (err, hosts) {
                if (err) {
                    resolve("".concat(ip.split('.').slice(0, 2).join('.'), "?/unknown"));
                    return;
                }
                if (!(hosts === null || hosts === void 0 ? void 0 : hosts[0])) {
                    if (ip.startsWith('50.')) {
                        resolve('comcast.net?/res');
                    }
                    else if (ipNumber >= telstraRange.minIP && ipNumber <= telstraRange.maxIP) {
                        resolve(telstraRange.host);
                    }
                    else {
                        _this.testConnection(ip, function (result) {
                            if (result) {
                                resolve("".concat(ip.split('.').slice(0, 2).join('.'), "?/proxy"));
                            }
                            else {
                                resolve("".concat(ip.split('.').slice(0, 2).join('.'), "?/unknown"));
                            }
                        });
                    }
                }
                else {
                    resolve(hosts[0]);
                }
            });
        });
    };
    /**
     * Does this IP respond to port 80? In theory, proxies are likely to
     * respond, while residential connections are likely to reject connections.
     *
     * Callback is guaranteed to be called exactly once, within a 1000ms
     * timeout.
     */
    class_1.prototype.testConnection = function (ip, callback) {
        var _this = this;
        var cachedValue = this.connectionTestCache.get(ip);
        if (cachedValue !== undefined) {
            return callback(cachedValue);
        }
        // Node.js's documentation does not make this easy to write. I discovered
        // this behavior by manual testing:
        // A successful connection emits 'connect', which you should react to
        // with socket.destroy(), which emits 'close'.
        // Some IPs instantly reject connections, emitting 'error' followed
        // immediately by 'close'.
        // Some IPs just never respond, leaving you to time out. Node will
        // emit the 'timeout' event, but not actually do anything else, leaving
        // you to manually use socket.destroy(), which emits 'close'
        var connected = false;
        var socket = require('net').createConnection({
            port: 80,
            host: ip,
            timeout: 1000,
        }, function () {
            connected = true;
            _this.connectionTestCache.set(ip, true);
            socket.destroy();
            return callback(true);
        });
        socket.on('error', function () { });
        socket.on('timeout', function () { return socket.destroy(); });
        socket.on('close', function () {
            if (!connected) {
                _this.connectionTestCache.set(ip, false);
                return callback(false);
            }
        });
    };
    class_1.prototype.shortenHost = function (host) {
        var _a;
        if ((_a = host.split('.').pop()) === null || _a === void 0 ? void 0 : _a.includes('/'))
            return host; // It has a suffix, e.g. leaseweb.com?/proxy
        var dotLoc = host.lastIndexOf('.');
        var tld = host.slice(dotLoc);
        if (tld === '.uk' || tld === '.au' || tld === '.br')
            dotLoc = host.lastIndexOf('.', dotLoc - 1);
        dotLoc = host.lastIndexOf('.', dotLoc - 1);
        return host.slice(dotLoc + 1);
    };
    /**
     * Host types:
     * - 'res' - normal residential ISP
     * - 'shared' - like res, but shared among many people: bans will have collateral damage
     * - 'mobile' - like res, but unstable IP (IP bans don't work)
     * - 'proxy' - datacenters, VPNs, proxy services, other untrustworthy sources
     *   (note that bots will usually be hosted on these)
     * - 'res?' - likely res, but host not specifically whitelisted
     * - 'unknown' - no rdns entry, treat with suspicion
     */
    class_1.prototype.getHostType = function (host, ip) {
        if (Punishments.isSharedIp(ip)) {
            return 'shared';
        }
        if (this.singleIPOpenProxies.has(ip) || this.torProxyIps.has(ip)) {
            // single-IP open proxies
            return 'proxy';
        }
        if (/^he\.net(\?|)\/proxy$/.test(host)) {
            // Known to only be VPN services
            if (['74.82.60.', '72.52.87.', '65.49.126.'].some(function (range) { return ip.startsWith(range); })) {
                return 'proxy';
            }
            // Hurricane Electric has an annoying habit of having residential
            // internet and datacenters on the same IP ranges - we get a lot of
            // legitimate users as well as spammers on VPNs from HE.
            // This splits the difference and treats it like any other unknown IP.
            return 'unknown';
        }
        // There were previously special cases for
        // 'digitalocean.proxy-nohost', 'servihosting.es.proxy-nohost'
        // DO is commonly used to host bots; I don't know who whitelisted
        // servihosting but I assume for a similar reason. This isn't actually
        // tenable; any service that can host bots can and does also host proxies.
        if (this.proxyHosts.has(host) || host.endsWith('/proxy')) {
            return 'proxy';
        }
        if (this.residentialHosts.has(host) || host.endsWith('/res')) {
            return 'res';
        }
        if (this.mobileHosts.has(host) || host.endsWith('/mobile')) {
            return 'mobile';
        }
        if (/^ip-[0-9]+-[0-9]+-[0-9]+\.net$/.test(host) || /^ip-[0-9]+-[0-9]+-[0-9]+\.eu$/.test(host)) {
            // OVH
            return 'proxy';
        }
        if (host.endsWith('/unknown')) {
            // rdns entry doesn't exist, and IP doesn't respond to a probe on port 80
            return 'unknown';
        }
        // rdns entry exists but is unrecognized
        return 'res?';
    };
    class_1.prototype.updateTorRanges = function () {
        return __awaiter(this, void 0, void 0, function () {
            var raw, torIps, _i, torIps_1, ip, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, lib_1.Net)('https://check.torproject.org/torbulkexitlist').get()];
                    case 1:
                        raw = _b.sent();
                        torIps = raw.split('\n');
                        for (_i = 0, torIps_1 = torIps; _i < torIps_1.length; _i++) {
                            ip = torIps_1[_i];
                            if (this.ipRegex.test(ip)) {
                                this.torProxyIps.add(ip);
                            }
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return class_1;
}());
var telstraRange = {
    minIP: exports.IPTools.ipToNumber("101.160.0.0"),
    maxIP: exports.IPTools.ipToNumber("101.191.255.255"),
    host: 'telstra.net?/res',
};
exports.default = exports.IPTools;
void exports.IPTools.updateTorRanges();
