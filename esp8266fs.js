"use strict";

//------------------------------------------------------------------------------

Object.defineProperty(exports, "__esModule", { value: true });

//------------------------------------------------------------------------------

const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const process = require("process");
const tmp = require("tmp");
const vscode = require("vscode");
const WinReg = require("winreg");

//------------------------------------------------------------------------------
// VSCode Arduino Extension

const ARDUINO_CONFIG_FILE = path.join(".vscode", "arduino.json");

const ARDUINO_PATH = "arduino.path";                        // Location of arduino executable

// --- new items ---
const ESP8266FS_PREFERENCES = "esp8266fs.preferencesPath";      // Location of Arduino Custom Packages
const ESP8266FS_DATAFILES = "esp8266fs.dataFiles";
const ESP8266FS_TEMP = "esp8266fs.temp";

const ESP8266_LOGLEVEL = "esp8266fs.logLevel";

//------------------------------------------------------------------------------

const RESET    = "\u001b[0m";
const BOLD     = "\u001b[1m";

const RED      = "\u001b[31m";
const GREEN    = "\u001b[32m";
const YELLOW   = "\u001b[33m";
const BLUE     = "\u001b[34m";
const MAGENTA  = "\u001b[35m";
const CYAN     = "\u001b[36m";

const BOLD_RED = "\u001b[31m";

//------------------------------------------------------------------------------

function getVscodeConfigValue(key) {
    return vscode.workspace.getConfiguration().get(key);
}

//------------------------------------------------------------------------------

function getOS() { return os.platform(); }

//------------------------------------------------------------------------------

let outputChannel = null;
let logLevel = "normal"; // "normal", "verbose", "silent", "debug"

function log(message) {
    if (logLevel === "silent")
        return;

    console.log(message);
    outputChannel.appendLine(message);
}

//------------------------------------------------------------------------------

function logColor(color, message) { log(`${color}${message}${RESET}`); };

//------------------------------------------------------------------------------

function logAnnounce(message) { logColor(GREEN, message); }
function logUrgent(message) { logColor(BOLD_RED, message); }
function logImportant(message) { logColor(RED, message); }
function logSpiffs(message) { logColor(BLUE, message); }
function logCommand(message) { logColor(YELLOW, message); }

//------------------------------------------------------------------------------


function logVerbose(message) {

    if (logLevel === "verbose" || logLevel === "debug")
        logColor(MAGENTA, message);
}

//------------------------------------------------------------------------------

function logDebug(message) {

    if (logLevel === "debug")
        logColor(CYAN, message);
}

//------------------------------------------------------------------------------

function JSONify(obj) {
    return JSON.stringify(obj, null, " ");
}

//------------------------------------------------------------------------------

function runCommand(command, args) {
    logVerbose("Running: " + command + " " + args.join(" "));

    const spawn = childProcess.spawnSync(command, args, { encoding: "utf8" });

    if (spawn.error)
        throw error;

    spawn.stdout
        .toString()
        .replace(/\r\n/, "\n")
        .split("\n")
        .forEach(line => logCommand(line.trimRight()));

    spawn.stderr
        .toString()
        .replace(/\r\n/, "\n")
        .split("\n")
        .forEach(line => logUrgent(line.trimRight()));

    if (spawn.status)
        throw `${command} returned ${spawn.status}`;
}

//------------------------------------------------------------------------------

function dirExists(dir) {
    try {
        return fs.statSync(dir).isDirectory();
    }
    catch (e) {
        return false;
    }
}

//------------------------------------------------------------------------------

function getFolders(dir) {
    return fs.readdirSync(dir);
}

//------------------------------------------------------------------------------

function fileExists(file) {
    try {
        return fs.statSync(file).isFile();
    }
    catch (e) {
        return false;
    }
}

//------------------------------------------------------------------------------

function readFile(name) {
    return fs.readFileSync(name, "utf8");
}

//------------------------------------------------------------------------------

function readLines(name) {
    return readFile(name).split(/[\r\n|\r|\n]/);
}

//------------------------------------------------------------------------------

function getRegistryValue(hive, key, name) {
    return new Promise((resolve, reject) => {
        try {
            const regKey = new WinReg({
                hive,
                key,
            });

            regKey.valueExists(name, (e, exists) => {
                if (e) {
                    reject(e);
                }

                if (exists) {
                    regKey.get(name, (err, result) => {
                        if (!err) {
                            resolve(result ? result.value : "");
                        } else {
                            reject(err);
                        }
                    });
                } else {
                    resolve("");
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

//------------------------------------------------------------------------------

const ARDUINO_X32_REG_KEY = "\\SOFTWARE\\Arduino";
const ARDUINO_X64_REG_KEY = "\\SOFTWARE\\WOW6432Node\\Arduino";

async function getArduinoInstallPath() {
    switch (getOS()) {
        case "win32":
            const dir = await getRegistryValue(WinReg.HKLM,
                (process.arch === "x64" ||
                 process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432"))
                    ? ARDUINO_X64_REG_KEY
                    : ARDUINO_X32_REG_KEY,
                "Install_Dir");

            if (dirExists(dir)) {
                return dir;
            }
            try {
                const file = path.resolve((runCommand("where",  [ "arduino" ]))).trim();

                if (fileExists(file)) {
                    return path.dirname(file);
                }
            }
            catch (error) {
            }

            break;

        case "darwin":
            const location = [path.join(process.env.HOME, "Applications"), "/Applications"]
                    .find(dir => dirExists(path.join(dir, "Arduino.app")));

            if (location)
                return location;

            break;

        case "linux":
            try {
                const file = path.resolve(runCommand("readlink", [ "-f", "$(which arduino)" ])).trim();

                if (fileExists(file)) {
                    return path.dirname(file);
                }
            }
            catch (ex) { // Ignore the errors.
            }

            break;
    }

    throw "Can't find Arduino executable.";
}

//------------------------------------------------------------------------------

async function getArduinoPath() {
    const dir = getVscodeConfigValue(ARDUINO_PATH) || await getArduinoInstallPath();

    if (!dir)
        throw "Can't find Arduino path.";

    if (!dirExists(dir))
        throw `Arduino path "${dir} " doesn't exist.`;

    logVerbose(`Arduino path: "${dir}"`);
    return dir;
}

//-------------------------------------------------------------------------------

const USER_SHELL_FOLDERS = "\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders";

function getPreferencesPath() {
    let dir = getVscodeConfigValue(ESP8266FS_PREFERENCES);

    if (!dir) {
        switch (getOS()) {
            case "win32":
                dir = path.join(process.env.LOCALAPPDATA, "Arduino15");
                break;

            case "linux":
                dir = path.join(process.env.HOME, ".arduino15");
                break;

            case "darwin":
                dir = path.join(process.env.HOME, "Library/Arduino15");
                break;
        }
    }

    if (!dir)
        throw "Can't find preferences path.";

    if (!dirExists(dir))
        throw `Preferences path "${dir}" doesn't exist.`;

    logVerbose(`Preferences Path: "${dir}"`);
    return dir;
}

//-------------------------------------------------------------------------------

function getDataFilesPath(arduinoJson) {
    const dir = arduinoJson.esp8266dataFiles
               || getVscodeConfigValue(ESP8266FS_DATAFILES)
               || path.join(vscode.workspace.rootPath, "data");

    if (!dirExists(dir))
        throw `ESP8266 Data Files path "${dir}" not found.`;

    logVerbose(`ESP8266 Data Files path: "${dir}"`);

    return dir;
}

//-------------------------------------------------------------------------------

function getSpiffsFile(arduinoJson) {
    let file = path.join(getTempPath(arduinoJson), "spiffs.bin");

    logVerbose(`SPIFFS File: "${file}"`);
    return file;
}

//-------------------------------------------------------------------------------

function getSystemTempPath() {
    const temp = tmp.dirSync();

    logDebug(`System tmp path: "${temp}"`);

    return temp;
}
//-------------------------------------------------------------------------------

function getTempPath(arduinoJson) {
    const temp = arduinoJson.esp8266temp
              || getVscodeConfigValue(ESP8266FS_TEMP)
              || getSystemTempPath()
              || path.join(vscode.workspace.rootPath, "temp");

    if (!dirExists(temp))
        throw `ESP8266 Temp Files location "${temp}" not found.`;

    return temp;
}

//-------------------------------------------------------------------------------

async function getArduinoPreferences(location) {

    const preferences = {};

    const file = path.join(location, "preferences.txt");
    logVerbose(`Reading preferences from "${file}"`);

    readLines(file)
        .forEach(line => {
            if (line.startsWith("#") || line.length == 0)
                return;

            const pair = line.split("=");

            logDebug(`  "${pair[0]}"="${pair[1]}"`);
            preferences[pair[0]] = pair[1];
        }
    );

    return preferences;
}

//-------------------------------------------------------------------------------

async function getArduinoJson() {
    var json = JSON.parse(readFile(path.join(vscode.workspace.rootPath, ARDUINO_CONFIG_FILE)));

    if (json.configuration) {
        json.configuration.split(",").forEach(config => {
            let param = config.split("=");

            json[param[0]] = param[1];
        });
    }

    return json;
}
//-------------------------------------------------------------------------------

function _getTarget(arduinJson, preferences) {
    if (!arduinJson.board) {
        const target =
            {
                package: preferences["target_package"],
                architecture: preferences["target_platform"],
                board: preferences["board"]
            };

        return target;
    }

    const values = arduinJson.board.split(":");

    const target =
        {
            package: values[0],
            architecture: values[1],
            board: values[2]
        };

    return target;
}

//------------------------------------------------------------------------------

function getTarget(arduinJson, preferences) {
    const target = _getTarget(arduinJson, preferences);

    if (target.package !== "esp8266" || target.architecture !== "esp8266")
        throw "Current Arduino package/architecture is not ESP8266.";

    logDebug(`target:`);
    JSONify(target).split("\n").map(line => logDebug(line));

    return target;
}

//------------------------------------------------------------------------------

function _getMemoryConfiguration(arduinoJson, preferences, target) {
    if (arduinoJson.FlashSize)
        return arduinoJson.FlashSize;

    const flashSize = preferences["custom_FlashSize"];

    if (flashSize) {
        const match = flashSize.match(/^${target.board}_(\S+)/);

        if (match)
            return match[1];
    }

    throw "Can't determine Flash Size.";
}

//------------------------------------------------------------------------------

function getMemoryConfiguration(arduinoJson, preferences, target) {
    const config = _getMemoryConfiguration(arduinoJson, preferences, target);

    logVerbose(`Memory Config: ${config}`);

    return config;
}

//------------------------------------------------------------------------------

function getEsp8266spiffs(preferencesPath, target, memoryConfig, arduinoJson) {
    const dir = path.join(preferencesPath, "packages", target.package, "hardware", target.architecture);

    if (!dirExists(dir))
        throw "ESP8266 has not been installed with the Arduino Board Manager.";

    const folders = getFolders(dir);

    if (folders.length != 1)
        throw "There should only be one ESP8266 Package installed with the Arduino Board Manager.";

    logImportant(`Found ESP8266 version ${folders[0]}`);

    const spiffs = {};

    readLines(path.join(dir, folders[0], "boards.txt"))
        .forEach(line => {
            const match = line.match(`${target.board}\\.(?:build|upload)\\.(\\S+)=(\\S+)`)
                       || line.match(`${target.board}\\.menu\\.FlashSize\\.${memoryConfig}\\.(?:build|upload)\\.(\\S+)=(\\S+)`)

            if (match)
                spiffs[match[1]] = match[2];
        }
    );

    if (!spiffs.spiffs_start)
        throw `Missing "spiffs_start" definition: target = ${target}, config = ${memoryConfig}.`

    if (!spiffs.spiffs_end)
        throw `Missing "spiffs_end" definition: target = ${target}, config = ${memoryConfig}.`

    if (arduinoJson.UploadSpeed)
        spiffs.speed = arduinoJson.UploadSpeed;

    if (arduinoJson.ResetMethod)
        spiffs.resetmethod = arduinoJson.ResetMethod;

    logDebug(`spiffs:`);
    JSONify(spiffs).split("\n").map(line => logDebug(line));

    return spiffs;
}

//------------------------------------------------------------------------------

function program(name) {
    return (getOS() === "win32" && name.indexOf(".") == -1)
        ? (name + ".exe")
        : name;
}

//------------------------------------------------------------------------------

function getToolPath(toolsPath, tool) {
    const dir = path.join(toolsPath, tool);

    if (!dirExists(dir))
        throw `Can't locate "${tool}" path`;

    const folders = getFolders(dir);

    if (folders.length != 1)
        throw `There should only be one ESP8266 "${tool}" tool installed with the Arduino Board Manager.`;

    const file = path.join(dir, folders[0], program(tool));

    if (!fileExists(file))
    throw `Can't locate ${file}.`;

    logVerbose(`${tool}: ${CYAN}${file}`);
    logImportant(`Found ${tool} version ${folders[0]}`);
    return file;
}

//------------------------------------------------------------------------------

function getToolsPath(preferencesPath, target) {
    const dir = path.join(preferencesPath, "packages", target.package, "tools");

    if (!dirExists(dir))
        throw "Can't find ESP8266 tools path.";

    logVerbose(`Tools Path: "${dir}"`);
    return dir;
}

//------------------------------------------------------------------------------

function getPort(arduinoJson, preferences) {
    let port = arduinoJson.port || preferences["serial.port"];

    logVerbose(`Output Port: ${port}`);
    return port;
}

//------------------------------------------------------------------------------

function isIP(port) {
    return port.match(/^(\d+)\.(\d+).(\d+).(\d+)$/);
}

//------------------------------------------------------------------------------

function stringToInt(value) {
    return parseInt(value, value.match(/^0x/i) ? 16 : 10);
}

//------------------------------------------------------------------------------

function toHex(decimal, width = 4) {
    return ("00000" + (Number(decimal).toString(16))).slice(-width).toUpperCase()
}

//------------------------------------------------------------------------------

function makeOsPath(dir) {
    dir = dir.replace(/\\/g, "/");

    if (dir.indexOf(" ") != -1)
        dir = `"${dir}"`;

    return dir;
}

//------------------------------------------------------------------------------

// [SPIFFS] data   : C:\Code\Mailbox\Blink\data
// [SPIFFS] size   : 3052
// [SPIFFS] page   : 256
// [SPIFFS] block  : 8192
// [SPIFFS] upload : C:\Users\Kev\AppData\Local\Temp\arduino_build_812203/Blink.spiffs.bin
// [SPIFFS] address: 0x100000
// [SPIFFS] reset  : nodemcu
// [SPIFFS] port   : COM6
// [SPIFFS] speed  : 115200

function packFiles(mkspiffs, dataPath, spiffs, imagePath) {
    const dataSize = stringToInt(spiffs.spiffs_end) - stringToInt(spiffs.spiffs_start);
    const dataSizeInK = dataSize >> 10;
    const spiPage = stringToInt(spiffs.spiffs_pagesize || "256");
    const spiBlock = stringToInt(spiffs.spiffs_blocksize || "4096");

    logImportant(`SPIFFS Creating Image... (${imagePath})`);
    logSpiffs(`  [SPIFFS] program: ${mkspiffs}`);
    logSpiffs(`  [SPIFFS] data   : ${dataPath}`);
    logSpiffs(`  [SPIFFS] size   : ${dataSizeInK}K`);
    logSpiffs(`  [SPIFFS] page   : ${spiPage}`);
    logSpiffs(`  [SPIFFS] block  : ${spiBlock}`);

    runCommand(
        makeOsPath(mkspiffs),
    [
        "-c", makeOsPath(dataPath),
        "-p", spiPage,
        "-b", spiBlock,
        "-s", dataSize,
        makeOsPath(imagePath)
    ]);
}

//------------------------------------------------------------------------------

function uploadOTA(pythonCmd, espota, serialPort, imagePath) {
    logImportant(`SPIFFS Uploading Image... (${imagePath})`);
    logSpiffs(`  [SPIFFS] Python: ${pythonCmd}`);
    logSpiffs(`  [SPIFFS] EspOTA: ${espota}`);
    logSpiffs(`  [SPIFFS] IP    : ${serialPort}`);

    runCommand(
        makeOsPath(pythonCmd),
    [
        makeOsPath(espota),
        "-i", serialPort,
        "-s",
        "-f", makeOsPath(imagePath)
    ]);
}

//------------------------------------------------------------------------------

function upload(esptool, spiffs, serialPort, imagePath) {
    const uploadAddress = stringToInt(spiffs.spiffs_start);
    const uploadSpeed = stringToInt(spiffs.speed);
    const resetMethod = spiffs.resetmethod;

    logImportant(`SPIFFS Uploading Image... (${imagePath})`);
    logSpiffs(`  [SPIFFS] program: ${esptool}`);
    logSpiffs(`  [SPIFFS] address: 0x` + toHex(uploadAddress, 6));
    logSpiffs(`  [SPIFFS] reset  : ${resetMethod}`);
    logSpiffs(`  [SPIFFS] port   : ${serialPort}`);
    logSpiffs(`  [SPIFFS] speed  : ${uploadSpeed}`);

    runCommand(
        makeOsPath(esptool),
    [
        "-ca", uploadAddress,
        "-cd", resetMethod,
        "-cp", serialPort,
        "-cb", uploadSpeed,
        "-cf", makeOsPath(imagePath)
    ]);
}

//------------------------------------------------------------------------------

async function _uploadFsData() {
    const executable = await getArduinoPath();
    const preferencesPath = await getPreferencesPath();
    const preferences = await getArduinoPreferences(preferencesPath);
    const arduinoJson = await getArduinoJson();

    const target = getTarget(arduinoJson, preferences);

    const dataPath = getDataFilesPath(arduinoJson);
    const spiffsImage = getSpiffsFile(arduinoJson);

    const memoryConfig = getMemoryConfiguration(arduinoJson, preferences, target);

    const spiffs = getEsp8266spiffs(preferencesPath, target, memoryConfig, arduinoJson);

    const toolsPath = getToolsPath(preferencesPath, target);

    const mkspiffs = getToolPath(toolsPath, "mkspiffs");

    let esptool;
    let epota;

    const port = getPort(arduinoJson, preferences);

    if (isIP(port))
        espota = getToolPath(toolsPath, "espota.py");
    else
        esptool = getToolPath(toolsPath, "esptool");

        // --- Ready to get down to business ---

    log(`--- Packing SPIFFS file ---`);

    packFiles(mkspiffs, dataPath, spiffs, spiffsImage);

    log(`--- Uploading SPIFFS file ---`);

    if (isIP(port))
        uploadOTA(program("python"), espota, serialPort, imagePath);
    else
        upload(esptool, spiffs, port, spiffsImage);
}

//------------------------------------------------------------------------------

var locked = null;

async function uploadFsData() {
    if (locked) {
        vscode.window.showErrorMessage("ESP8266FS already running");
        return;
    }

    logLevel = getVscodeConfigValue(ESP8266_LOGLEVEL) || logLevel;

    logAnnounce(`ESP8266 Upload File System started.`);
    locked = "locked";

    try {
        await _uploadFsData();
        vscode.window.showInformationMessage('ESP266 Uploaded!');
    } catch (error) {
        logUrgent(error);
        vscode.window.showErrorMessage(error);
    }

    logAnnounce(`ESP8266 Upload File System finished.`);
    locked = null;
}

//------------------------------------------------------------------------------

async function activate(context) {
    outputChannel = vscode.window.createOutputChannel("ESP8266FS");
    logLevel = getVscodeConfigValue(ESP8266_LOGLEVEL) || "normal";
    logVerbose(`ESP8266FS is now active!`);

    context.subscriptions.push(vscode.commands.registerCommand('esp8266fs.uploadData', uploadFsData));
}

exports.activate = activate;

//------------------------------------------------------------------------------

function deactivate() {}

exports.deactivate = (() => {});