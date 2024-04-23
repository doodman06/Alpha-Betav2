"use strict";
/**
 * Crash logger
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Logs crashes, sends an e-mail notification if you've set up
 * config.js to do that.
 *
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.crashlogger = void 0;
var fs = require("fs");
var path = require("path");
var CRASH_EMAIL_THROTTLE = 5 * 60 * 1000; // 5 minutes
var logPath = path.resolve(
// not sure why this is necessary, but in Windows testing it was
__dirname, '../', __dirname.includes("".concat(path.sep, "dist").concat(path.sep)) ? '..' : '', 'logs/errors.txt');
var lastCrashLog = 0;
var transport;
/**
 * Logs when a crash happens to console, then e-mails those who are configured
 * to receive them.
 */
function crashlogger(error, description, data, emailConfig) {
    var _a;
    if (data === void 0) { data = null; }
    if (emailConfig === void 0) { emailConfig = null; }
    var datenow = Date.now();
    var stack = (typeof error === 'string' ? error : error === null || error === void 0 ? void 0 : error.stack) || '';
    if (data) {
        stack += "\n\nAdditional information:\n";
        for (var k in data) {
            stack += "  ".concat(k, " = ").concat(data[k], "\n");
        }
    }
    console.error("\nCRASH: ".concat(stack, "\n"));
    var out = fs.createWriteStream(logPath, { flags: 'a' });
    out.on('open', function () {
        out.write("\n".concat(stack, "\n"));
        out.end();
    }).on('error', function (err) {
        console.error("\nSUBCRASH: ".concat(err.stack, "\n"));
    });
    var emailOpts = emailConfig || ((_a = global.Config) === null || _a === void 0 ? void 0 : _a.crashguardemail);
    if (emailOpts && ((datenow - lastCrashLog) > CRASH_EMAIL_THROTTLE)) {
        lastCrashLog = datenow;
        if (!transport) {
            try {
                require.resolve('nodemailer');
            }
            catch (_b) {
                throw new Error('nodemailer is not installed, but it is required if Config.crashguardemail is configured! ' +
                    'Run npm install --no-save nodemailer and restart the server.');
            }
        }
        var text = "".concat(description, " crashed ");
        if (transport) {
            text += "again with this stack trace:\n".concat(stack);
        }
        else {
            try {
                transport = require('nodemailer').createTransport(emailOpts.options);
            }
            catch (_c) {
                throw new Error("Failed to start nodemailer; are you sure you've configured Config.crashguardemail correctly?");
            }
            text += "with this stack trace:\n".concat(stack);
        }
        transport.sendMail({
            from: emailOpts.from,
            to: emailOpts.to,
            subject: emailOpts.subject,
            text: text,
        }, function (err) {
            if (err)
                console.error("Error sending email: ".concat(err));
        });
    }
    return null;
}
exports.crashlogger = crashlogger;
