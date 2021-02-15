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
function writePackageVerToEnvironmentInfo(appDir, packageName) {
    const info = {};
    for (const iPackageName of packageName) {
        const iFile = path_1.default.join(appDir, 'node_modules', iPackageName, 'package.json');
        const fsContent = fs_1.default.readFileSync(iFile, 'utf-8');
        const fsJson = JSON.parse(fsContent);
        const ver = fsJson.version;
        info[`package : ${iPackageName}`] = ver;
    }
    runtime_1.allure.writeEnvironmentInfo(info);
}
exports.writePackageVerToEnvironmentInfo = writePackageVerToEnvironmentInfo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxsdXJlSGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQWxsdXJlSGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSx5REFBK0U7QUFDL0Usa0RBQThDO0FBQzlDLG9EQUFvQjtBQUNwQix3REFBd0I7QUFFWCxRQUFBLE1BQU0sR0FBRyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQztBQUU3QyxTQUFnQixPQUFPLENBQUksUUFBZ0IsRUFBRSxNQUFlO0lBQzFELE9BQU8sZ0JBQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDL0MsQ0FBQztBQUZELDBCQUVDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLFFBQWdCLEVBQUUsTUFBYyxFQUFFLEdBQVU7SUFDbEUsSUFBSSxRQUFnQyxDQUFDO0lBQ3JDLGdCQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDL0IsUUFBUSxHQUFHLGdCQUFNLENBQUMsaUJBQWlCLENBQUM7UUFDcEMsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFO1lBQ3JCLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzlCO0lBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNMLFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3pCLE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFWRCwwQkFVQztBQUVELFNBQWdCLGVBQWUsQ0FBQyxRQUFnQixFQUFFLE1BQWMsRUFBRSxLQUFhLEVBQUUsSUFBWTtJQUMzRixJQUFJLFFBQWdDLENBQUM7SUFDckMsZ0JBQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUMvQixRQUFRLEdBQUcsZ0JBQU0sQ0FBQyxpQkFBaUIsQ0FBQztJQUN0QyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ0wsUUFBUSxDQUFDLE1BQU0sR0FBRyxNQUFN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