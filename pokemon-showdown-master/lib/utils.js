"use strict";
/**
 * Utils library
 *
 * Miscellaneous utility functions that don't really have a better place.
 *
 * It'll always be a judgment call whether or not a function goes into a
 * "catch-all" library like this, so here are some guidelines:
 *
 * - It must not have any dependencies
 *
 * - It must conceivably have a use in a wide variety of projects, not just
 *   Pokémon (if it's Pokémon-specific, Dex is probably a good place for it)
 *
 * - A lot of Chat functions are kind of iffy, but I'm going to say for now
 *   that if it's English-specific, it should be left out of here.
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
exports.Utils = exports.Multiset = exports.formatSQLArray = exports.parseExactInt = exports.waitUntil = exports.levenshtein = exports.deepClone = exports.clearRequireCache = exports.clampIntRange = exports.randomElement = exports.shuffle = exports.forceWrap = exports.escapeHTMLForceWrap = exports.html = exports.splitFirst = exports.sortBy = exports.compare = exports.visualize = exports.formatOrder = exports.stripHTML = exports.escapeHTML = exports.escapeRegex = exports.getString = void 0;
/**
 * Safely converts the passed variable into a string. Unlike '' + str,
 * String(str), or str.toString(), Utils.getString is guaranteed not to
 * crash.
 *
 * Specifically, the fear with untrusted JSON is an object like:
 *
 *     let a = {"toString": "this is not a function"};
 *     console.log(`a is ${a}`);
 *
 * This will crash (because a.toString() is not a function). Instead,
 * getString simply returns '' if the passed variable isn't a
 * string or a number.
 */
function getString(str) {
    return (typeof str === 'string' || typeof str === 'number') ? '' + str : '';
}
exports.getString = getString;
function escapeRegex(str) {
    return str.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}
exports.escapeRegex = escapeRegex;
/**
 * Escapes HTML in a string.
*/
function escapeHTML(str) {
    if (str === null || str === undefined)
        return '';
    return ('' + str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/\//g, '&#x2f;')
        .replace(/\n/g, '<br />');
}
exports.escapeHTML = escapeHTML;
/**
 * Strips HTML from a string.
 */
function stripHTML(htmlContent) {
    if (!htmlContent)
        return '';
    return htmlContent.replace(/<[^>]*>/g, '');
}
exports.stripHTML = stripHTML;
/**
 * Maps numbers to their ordinal string.
 */
function formatOrder(place) {
    // anything between 10 and 20 should always end with -th
    var remainder = place % 100;
    if (remainder >= 10 && remainder <= 20)
        return place + 'th';
    // follow standard rules with -st, -nd, -rd, and -th
    remainder = place % 10;
    if (remainder === 1)
        return place + 'st';
    if (remainder === 2)
        return place + 'nd';
    if (remainder === 3)
        return place + 'rd';
    return place + 'th';
}
exports.formatOrder = formatOrder;
/**
 * Visualizes eval output in a slightly more readable form
 */
function visualize(value, depth) {
    var _a;
    if (depth === void 0) { depth = 0; }
    if (value === undefined)
        return "undefined";
    if (value === null)
        return "null";
    if (typeof value === 'number' || typeof value === 'boolean') {
        return "".concat(value);
    }
    if (typeof value === 'string') {
        return "\"".concat(value, "\""); // NOT ESCAPED
    }
    if (typeof value === 'symbol') {
        return value.toString();
    }
    if (Array.isArray(value)) {
        if (depth > 10)
            return "[array]";
        return "[" + value.map(function (elem) { return visualize(elem, depth + 1); }).join(", ") + "]";
    }
    if (value instanceof RegExp || value instanceof Date || value instanceof Function) {
        if (depth && value instanceof Function)
            return "Function";
        return "".concat(value);
    }
    var constructor = '';
    if (value.constructor && value.constructor.name && typeof value.constructor.name === 'string') {
        constructor = value.constructor.name;
        if (constructor === 'Object')
            constructor = '';
    }
    else {
        constructor = 'null';
    }
    // If it has a toString, try to grab the base class from there
    // (This is for Map/Set subclasses like user.auth)
    var baseClass = ((value === null || value === void 0 ? void 0 : value.toString) && ((_a = /\[object (.*)\]/.exec(value.toString())) === null || _a === void 0 ? void 0 : _a[1])) || constructor;
    switch (baseClass) {
        case 'Map':
            if (depth > 2)
                return "Map";
            var mapped = __spreadArray([], value.entries(), true).map(function (val) { return "".concat(visualize(val[0], depth + 1), " => ").concat(visualize(val[1], depth + 1)); });
            return "".concat(constructor, " (").concat(value.size, ") { ").concat(mapped.join(', '), " }");
        case 'Set':
            if (depth > 2)
                return "Set";
            return "".concat(constructor, " (").concat(value.size, ") { ").concat(__spreadArray([], value, true).map(function (v) { return visualize(v); }, depth + 1).join(', '), " }");
    }
    if (value.toString) {
        try {
            var stringValue = value.toString();
            if (typeof stringValue === 'string' &&
                stringValue !== '[object Object]' &&
                stringValue !== "[object ".concat(constructor, "]")) {
                return "".concat(constructor, "(").concat(stringValue, ")");
            }
        }
        catch (_b) { }
    }
    var buf = '';
    for (var key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key))
            continue;
        if (depth > 2 || (depth && constructor)) {
            buf = '...';
            break;
        }
        if (buf)
            buf += ", ";
        var displayedKey = key;
        if (!/^[A-Za-z0-9_$]+$/.test(key))
            displayedKey = JSON.stringify(key);
        buf += "".concat(displayedKey, ": ") + visualize(value[key], depth + 1);
    }
    if (constructor && !buf && constructor !== 'null')
        return constructor;
    return "".concat(constructor, "{").concat(buf, "}");
}
exports.visualize = visualize;
/**
 * Compares two variables; intended to be used as a smarter comparator.
 * The two variables must be the same type (TypeScript will not check this).
 *
 * - Numbers are sorted low-to-high, use `-val` to reverse
 * - Strings are sorted A to Z case-semi-insensitively, use `{reverse: val}` to reverse
 * - Booleans are sorted true-first (REVERSE of casting to numbers), use `!val` to reverse
 * - Arrays are sorted lexically in the order of their elements
 *
 * In other words: `[num, str]` will be sorted A to Z, `[num, {reverse: str}]` will be sorted Z to A.
 */
function compare(a, b) {
    if (typeof a === 'number') {
        return a - b;
    }
    if (typeof a === 'string') {
        return a.localeCompare(b);
    }
    if (typeof a === 'boolean') {
        return (a ? 1 : 2) - (b ? 1 : 2);
    }
    if (Array.isArray(a)) {
        for (var i = 0; i < a.length; i++) {
            var comparison = compare(a[i], b[i]);
            if (comparison)
                return comparison;
        }
        return 0;
    }
    if ('reverse' in a) {
        return compare(b.reverse, a.reverse);
    }
    throw new Error("Passed value ".concat(a, " is not comparable"));
}
exports.compare = compare;
function sortBy(array, callback) {
    if (!callback)
        return array.sort(compare);
    return array.sort(function (a, b) { return compare(callback(a), callback(b)); });
}
exports.sortBy = sortBy;
/**
* Like string.split(delimiter), but only recognizes the first `limit`
* delimiters (default 1).
*
* `"1 2 3 4".split(" ", 2) => ["1", "2"]`
*
* `Utils.splitFirst("1 2 3 4", " ", 1) => ["1", "2 3 4"]`
*
* Returns an array of length exactly limit + 1.
*
*/
function splitFirst(str, delimiter, limit) {
    if (limit === void 0) { limit = 1; }
    var splitStr = [];
    while (splitStr.length < limit) {
        var delimiterIndex = str.indexOf(delimiter);
        if (delimiterIndex >= 0) {
            splitStr.push(str.slice(0, delimiterIndex));
            str = str.slice(delimiterIndex + delimiter.length);
        }
        else {
            splitStr.push(str);
            str = '';
        }
    }
    splitStr.push(str);
    return splitStr;
}
exports.splitFirst = splitFirst;
/**
 * Template string tag function for escaping HTML
 */
function html(strings) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var buf = strings[0];
    var i = 0;
    while (i < args.length) {
        buf += escapeHTML(args[i]);
        buf += strings[++i];
    }
    return buf;
}
exports.html = html;
/**
 * This combines escapeHTML and forceWrap. The combination allows us to use
 * <wbr /> instead of U+200B, which will make sure the word-wrapping hints
 * can't be copy/pasted (which would mess up code).
 */
function escapeHTMLForceWrap(text) {
    return escapeHTML(forceWrap(text)).replace(/\u200B/g, '<wbr />');
}
exports.escapeHTMLForceWrap = escapeHTMLForceWrap;
/**
 * HTML doesn't support `word-wrap: break-word` in tables, but sometimes it
 * would be really nice if it did. This emulates `word-wrap: break-word` by
 * manually inserting U+200B to tell long words to wrap.
 */
function forceWrap(text) {
    return text.replace(/[^\s]{30,}/g, function (word) {
        var lastBreak = 0;
        var brokenWord = '';
        for (var i = 1; i < word.length; i++) {
            if (i - lastBreak >= 10 || /[^a-zA-Z0-9([{][a-zA-Z0-9]/.test(word.slice(i - 1, i + 1))) {
                brokenWord += word.slice(lastBreak, i) + '\u200B';
                lastBreak = i;
            }
        }
        brokenWord += word.slice(lastBreak);
        return brokenWord;
    });
}
exports.forceWrap = forceWrap;
function shuffle(arr) {
    var _a;
    // In-place shuffle by Fisher-Yates algorithm
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [arr[j], arr[i]], arr[i] = _a[0], arr[j] = _a[1];
    }
    return arr;
}
exports.shuffle = shuffle;
function randomElement(arr) {
    var i = Math.floor(Math.random() * arr.length);
    return arr[i];
}
exports.randomElement = randomElement;
/** Forces num to be an integer (between min and max). */
function clampIntRange(num, min, max) {
    if (typeof num !== 'number')
        num = 0;
    num = Math.floor(num);
    if (min !== undefined && num < min)
        num = min;
    if (max !== undefined && num > max)
        num = max;
    return num;
}
exports.clampIntRange = clampIntRange;
function clearRequireCache(options) {
    if (options === void 0) { options = {}; }
    var excludes = (options === null || options === void 0 ? void 0 : options.exclude) || [];
    excludes.push('/node_modules/');
    for (var path in require.cache) {
        var skip = false;
        for (var _i = 0, excludes_1 = excludes; _i < excludes_1.length; _i++) {
            var exclude = excludes_1[_i];
            if (path.includes(exclude)) {
                skip = true;
                break;
            }
        }
        if (!skip)
            delete require.cache[path];
    }
}
exports.clearRequireCache = clearRequireCache;
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj))
        return obj.map(function (prop) { return deepClone(prop); });
    var clone = Object.create(Object.getPrototypeOf(obj));
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var key = _a[_i];
        clone[key] = deepClone(obj[key]);
    }
    return clone;
}
exports.deepClone = deepClone;
function levenshtein(s, t, l) {
    // Original levenshtein distance function by James Westgate, turned out to be the fastest
    var d = [];
    // Step 1
    var n = s.length;
    var m = t.length;
    if (n === 0)
        return m;
    if (m === 0)
        return n;
    if (l && Math.abs(m - n) > l)
        return Math.abs(m - n);
    // Create an array of arrays in javascript (a descending loop is quicker)
    for (var i = n; i >= 0; i--)
        d[i] = [];
    // Step 2
    for (var i = n; i >= 0; i--)
        d[i][0] = i;
    for (var j = m; j >= 0; j--)
        d[0][j] = j;
    // Step 3
    for (var i = 1; i <= n; i++) {
        var si = s.charAt(i - 1);
        // Step 4
        for (var j = 1; j <= m; j++) {
            // Check the jagged ld total so far
            if (i === j && d[i][j] > 4)
                return n;
            var tj = t.charAt(j - 1);
            var cost = (si === tj) ? 0 : 1; // Step 5
            // Calculate the minimum
            var mi = d[i - 1][j] + 1;
            var b = d[i][j - 1] + 1;
            var c = d[i - 1][j - 1] + cost;
            if (b < mi)
                mi = b;
            if (c < mi)
                mi = c;
            d[i][j] = mi; // Step 6
        }
    }
    // Step 7
    return d[n][m];
}
exports.levenshtein = levenshtein;
function waitUntil(time) {
    return new Promise(function (resolve) {
        setTimeout(function () { return resolve(); }, time - Date.now());
    });
}
exports.waitUntil = waitUntil;
/** Like parseInt, but returns NaN if the int isn't already in normalized form */
function parseExactInt(str) {
    if (!/^-?(0|[1-9][0-9]*)$/.test(str))
        return NaN;
    return parseInt(str);
}
exports.parseExactInt = parseExactInt;
/** formats an array into a series of question marks and adds the elements to an arguments array */
function formatSQLArray(arr, args) {
    args === null || args === void 0 ? void 0 : args.push.apply(args, arr);
    return __spreadArray([], '?'.repeat(arr.length), true).join(', ');
}
exports.formatSQLArray = formatSQLArray;
var Multiset = /** @class */ (function (_super) {
    __extends(Multiset, _super);
    function Multiset() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Multiset.prototype.add = function (key) {
        var _a;
        this.set(key, ((_a = this.get(key)) !== null && _a !== void 0 ? _a : 0) + 1);
        return this;
    };
    Multiset.prototype.remove = function (key) {
        var _a;
        var newValue = ((_a = this.get(key)) !== null && _a !== void 0 ? _a : 0) - 1;
        if (newValue <= 0)
            return this.delete(key);
        this.set(key, newValue);
        return true;
    };
    return Multiset;
}(Map));
exports.Multiset = Multiset;
// backwards compatibility
exports.Utils = {
    parseExactInt: parseExactInt,
    waitUntil: waitUntil,
    html: html,
    escapeHTML: escapeHTML,
    compare: compare,
    sortBy: sortBy,
    levenshtein: levenshtein,
    shuffle: shuffle,
    deepClone: deepClone,
    clearRequireCache: clearRequireCache,
    randomElement: randomElement,
    forceWrap: forceWrap,
    splitFirst: splitFirst,
    stripHTML: stripHTML,
    visualize: visualize,
    getString: getString,
    escapeRegex: escapeRegex,
    formatSQLArray: formatSQLArray,
    Multiset: Multiset,
};
