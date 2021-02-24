"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePackageVerToEnvironmentInfo = exports.attachmentUtf8FileAuto = exports.attachmentUtf8File = exports.attachmentJsonByObj = exports.attachmentJson = exports.runStepWithInfo = exports.runStepWithStepName = exports.logStepWithTime = exports.logStep = exports.runStep = exports.config = void 0;
const tslib_1 = require("tslib");
const allure_js_commons_1 = require("allure-js-commons");
const runtime_1 = require("allure-mocha/runtime");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
exports.config = { baseDir: __dirname };
function runStep(stepName, action) {
    return runtime_1.allure.createStep(stepName, action)();
}
exports.runStep = runStep;
function logStep(stepName, status, err) {
    let currItem;
    runtime_1.allure.createStep(stepName, () => {
        currItem = runtime_1.allure.currentExecutable;
        if (err !== undefined) {
            logStep(err.message, status);
        }
    })();
    currItem.status = status;
    return currItem;
}
exports.logStep = logStep;
function logStepWithTime(stepName, status, start, stop) {
    let currItem;
    runtime_1.allure.createStep(stepName, () => {
        currItem = runtime_1.allure.currentExecutable;
    })();
    currItem.status = status;
    currItem.info.start = start;
    currItem.info.stop = stop;
    return currItem;
}
exports.logStepWithTime = logStepWithTime;
function runStepWithStepName(stepName) {
    const currItem = runtime_1.allure.currentExecutable;
    currItem.name = stepName;
}
exports.runStepWithStepName = runStepWithStepName;
function runStepWithInfo(action) {
    let currItem;
    let info;
    const step = runtime_1.allure.createStep('', () => {
        currItem = runtime_1.allure.currentExecutable;
        info = action();
    })();
    currItem.name = info.name;
    currItem.status = info.status;
    if (info.start !== undefined) {
        currItem.info.start = info.start;
    }
    if (info.stop !== undefined) {
        currItem.info.stop = info.stop;
    }
    return step;
}
exports.runStepWithInfo = runStepWithInfo;
function attachmentJson(name, data) {
    runtime_1.allure.attachment(name, JSON.stringify(data, undefined, 2), allure_js_commons_1.ContentType.JSON);
}
exports.attachmentJson = attachmentJson;
function attachmentJsonByObj(data) {
    for (const name in data) {
        if (!data[name] || Object.keys(data[name]).length === 0)
            continue;
        runtime_1.allure.attachment(name, JSON.stringify(data[name], undefined, 2), allure_js_commons_1.ContentType.JSON);
    }
}
exports.attachmentJsonByObj = attachmentJsonByObj;
function attachmentUtf8File(name, filename, addFirstLineContent) {
    let str;
    let contentType;
    if (!fs_1.default.existsSync(filename) || !fs_1.default.statSync(filename).isFile()) {
        str = '< file not found >';
        contentType = allure_js_commons_1.ContentType.TEXT;
    }
    else {
        switch (path_1.default.extname(filename).toLowerCase()) {
            case '.json':
                contentType = allure_js_commons_1.ContentType.JSON;
                break;
            case '.css':
                contentType = allure_js_commons_1.ContentType.CSS;
                break;
            case '.csv':
                contentType = allure_js_commons_1.ContentType.CSV;
                break;
            case '.jpg':
            case '.jpeg':
                contentType = allure_js_commons_1.ContentType.JPEG;
                break;
            case '.xml':
                contentType = allure_js_commons_1.ContentType.XML;
                break;
            case '.png':
                contentType = allure_js_commons_1.ContentType.PNG;
                break;
            case '.svg':
                contentType = allure_js_commons_1.ContentType.SVG;
                break;
            case '.uri':
                contentType = allure_js_commons_1.ContentType.URI;
                break;
            default:
                contentType = allure_js_commons_1.ContentType.TEXT;
        }
        str = fs_1.default.readFileSync(filename, 'utf-8');
    }
    if (addFirstLineContent) {
        str = addFirstLineContent + '\r\n\r\n' + str;
    }
    runtime_1.allure.attachment(name, str, contentType);
}
exports.attachmentUtf8File = attachmentUtf8File;
function attachmentUtf8FileAuto(filename) {
    const name = '${baseDir}/' + path_1.default.relative(exports.config.baseDir, filename);
    attachmentUtf8File(name, filename);
}
exports.attachmentUtf8FileAuto = attachmentUtf8FileAuto;
function writePackageVerToEnvironmentInfo(appDir, packageName, projectVer = true) {
    const info = {};
    if (projectVer) {
        const packageContent = fs_1.default.readFileSync(path_1.default.join(appDir, 'package.json'), 'utf-8');
        const fsJson = JSON.parse(packageContent);
        const { name, version } = fsJson;
        info[`project : ${name}`] = version;
    }
    for (const iPackageName of packageName) {
        const iFile = path_1.default.join(appDir, 'node_modules', iPackageName, 'package.json');
        const fsContent = fs_1.default.readFileSync(iFile, 'utf-8');
        const fsJson = JSON.parse(fsContent);
        const ver = fsJson.version;
        info[`dep : ${iPackageName}`] = "v" + ver;
    }
    runtime_1.allure.writeEnvironmentInfo(info);
}
exports.writePackageVerToEnvironmentInfo = writePackageVerToEnvironmentInfo;
