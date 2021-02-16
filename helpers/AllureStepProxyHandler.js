"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllureStepProxy = void 0;
const allure_js_commons_1 = require("allure-js-commons");
const runtime_1 = require("allure-mocha/runtime");
const AllureHelper_1 = require("./AllureHelper");
const Test_Response_Header_1 = require("./Test-Response-Header");
const propertyKeysOfTest = {
    serverAddress: true,
    expect: true,
    end: true,
    expectHeader: true,
};
const propertyKeysToProxy = {
    attachCookies: true,
    checkout: true,
    connect: true,
    copy: true,
    del: true,
    delete: true,
    get: true,
    head: true,
    lock: true,
    merge: true,
    mkactivity: true,
    mkcol: true,
    move: true,
    notify: true,
    options: true,
    patch: true,
    post: true,
    propfind: true,
    proppatch: true,
    purge: true,
    put: true,
    report: true,
    saveCookies: true,
    search: true,
    subscribe: true,
    trace: true,
    unlock: true,
    unsubscribe: true,
    accept: true,
    attach: true,
    auth: true,
    buffer: true,
    ca: true,
    cert: true,
    clearTimeout: true,
    disableTLSCerts: true,
    field: true,
    http2: true,
    key: true,
    ok: true,
    on: true,
    parse: true,
    part: true,
    pfx: true,
    query: true,
    redirects: true,
    responseType: true,
    retry: true,
    send: true,
    serialize: true,
    set: true,
    timeout: true,
    trustLocalhost: true,
    type: true,
    unset: true,
    serverAddress: true,
    expect: true,
    end: true,
    // then: true,
    stepName: true,
    attachment: true,
    attachmentFile: true,
    expectHeader: true,
};
const TOP_PROXY_PREFIX = Symbol('TopProxy#prefix');
const topKey = 'supertest';
const errChar = '--';
const maxStepNameLenHalf = 10;
function getStackStepName(stack, isPassed, short) {
    const arr = [];
    for (const i of stack.argArray) {
        if (typeof i !== 'function') {
            let item = JSON.stringify(i);
            if (short) {
                if (item.length > maxStepNameLenHalf * 2) {
                    item = `${item.substr(0, maxStepNameLenHalf)}...${item.substr(-maxStepNameLenHalf)}`;
                }
            }
            arr.push(item);
        }
        else {
            arr.push('<func>');
        }
    }
    return `.${isPassed ? '' : errChar}${String(isPassed ? stack.pKey : stack.pKey.toString().toUpperCase())}(${arr.join(', ')})${isPassed ? '' : errChar}`;
}
class AllureStepProxyHandler {
    constructor(target, pKey, topProxy, topHandler) {
        this.end = false;
        this.target = target;
        this.pKey = pKey;
        if (topProxy) {
            this.topProxy = topProxy;
        }
        if (topHandler) {
            this.topHandler = topHandler;
        }
        this.isTopProxy = !topProxy;
    }
    static create(target) {
        const handler = new AllureStepProxyHandler(target, topKey);
        const p = new Proxy(target, handler);
        p[TOP_PROXY_PREFIX] = '';
        handler.topProxy = p;
        handler.topHandler = handler;
        AllureStepProxyHandler.applyStack.set(target, []);
        return p;
    }
    static create2(target, pKey, topProxy, topHandler) {
        const p = new Proxy(() => 0, new AllureStepProxyHandler(target, pKey, topProxy, topHandler));
        return p;
    }
    get(target, property) {
        if (property === TOP_PROXY_PREFIX) {
            return target[property];
        }
        if (property === 'endAllureStep') {
            return async (brokenIfError = true) => {
                const statusIfErr = brokenIfError ? allure_js_commons_1.Status.BROKEN : allure_js_commons_1.Status.FAILED;
                this.end = true;
                const stack = AllureStepProxyHandler.applyStack.get(this.target);
                let re = this.target;
                let assertStockIdx = -1;
                for (const idx in stack) {
                    const iStack = stack[idx];
                    if (iStack.pKey === 'attachment' || iStack.pKey === 'attachmentFile') {
                        continue;
                    }
                    if (assertStockIdx < 0 && propertyKeysOfTest[iStack.pKey]) {
                        assertStockIdx = Number.parseInt(idx);
                    }
                    if (iStack.pKey === 'expectHeader') {
                        re = re.expect(function (field, val) {
                            return res => {
                                const gotHeader = res.get(field);
                                if (gotHeader !== val) {
                                    // return new Error('expected header[]' + status + ' "' + a + '", got ' + res.status + ' "' + b + '"');
                                    return new Error(`expected header['${field}'] => '${val}' , got '${gotHeader}'`);
                                }
                            };
                        }(iStack.argArray[0], iStack.argArray[1]));
                    }
                    else {
                        re = re[iStack.pKey](...iStack.argArray);
                    }
                }
                let errIdx = -1;
                let requestErr;
                for (const i in re._asserts) {
                    const idx = Number.parseInt(i);
                    const fn = re._asserts[i];
                    // eslint-disable-next-line no-loop-func
                    re._asserts[i] = res => {
                        const err = fn(res);
                        if (err instanceof Error) {
                            errIdx = idx + assertStockIdx;
                        }
                        return err;
                    };
                }
                let result;
                const start = Date.now();
                try {
                    result = await re;
                }
                catch (err) {
                    requestErr = err;
                }
                const stop = Date.now();
                let topStepName = topKey;
                AllureHelper_1.runStepWithInfo(() => {
                    const expectErr = !(requestErr === null || requestErr === void 0 ? void 0 : requestErr.message.startsWith('expected '));
                    let err = requestErr && expectErr;
                    let lastStatus = allure_js_commons_1.Status.PASSED;
                    let firstAssertStep = true;
                    let connectionRefused = false;
                    for (const idx in stack) {
                        const iStack = stack[idx];
                        // #region enabled by server debug
                        if (iStack.pKey === 'attachment') {
                            // eslint-disable-next-line prefer-spread
                            runtime_1.allure.attachment(iStack.argArray[0], iStack.argArray[1], iStack.argArray[2]);
                            continue;
                        }
                        if (iStack.pKey === 'attachmentFile') {
                            AllureHelper_1.attachmentUtf8File(iStack.argArray[0], iStack.argArray[1]);
                            continue;
                        }
                        // #endregion
                        let status = allure_js_commons_1.Status.PASSED;
                        if (err) {
                            if (!propertyKeysOfTest[iStack.pKey]) {
                                status = allure_js_commons_1.Status.PASSED;
                                lastStatus = statusIfErr;
                            }
                            else {
                                if (expectErr && firstAssertStep) {
                                    firstAssertStep = false;
                                    AllureHelper_1.logStepWithTime(requestErr.message, statusIfErr, start, stop);
                                    topStepName += `.${errChar}x${errChar}`;
                                    connectionRefused = true;
                                }
                                status = allure_js_commons_1.Status.SKIPPED;
                            }
                        }
                        else if (errIdx === Number.parseInt(idx)) {
                            err = true;
                            lastStatus = status = statusIfErr;
                        }
                        if (propertyKeysOfTest[iStack.pKey]) {
                            if (firstAssertStep && !requestErr) {
                                firstAssertStep = false;
                                AllureHelper_1.logStepWithTime(`--> request -> statusCode : ${re.res.statusCode}`, status, start, stop);
                            }
                        }
                        topStepName += getStackStepName(iStack, status !== statusIfErr, true);
                        AllureHelper_1.logStep((idx === '0' ? 'supertest' : '') + getStackStepName(iStack, true, false), status, status === statusIfErr ? requestErr : undefined);
                    }
                    AllureHelper_1.attachmentJsonByObj({
                        Request: {
                            url: re.url,
                            path: re.req.path,
                            method: re.req.method,
                            headers: re.req._headers,
                            body: re._data,
                        },
                    });
                    if (!connectionRefused) {
                        AllureHelper_1.attachmentJsonByObj({
                            Response: {
                                headers: re.res.headers,
                                body: re.res.body,
                            },
                        });
                        {
                            {
                                const toFile = re.res.headers[Test_Response_Header_1.TEST_RESPONSE_HEADER_CONTROLLER_FILE];
                                if (toFile) {
                                    AllureHelper_1.attachmentUtf8FileAuto(toFile);
                                }
                            }
                            {
                                const reqSchema = re.res.headers[Test_Response_Header_1.TEST_RESPONSE_HEADER_REQUEST_SCHEMA];
                                if (reqSchema) {
                                    AllureHelper_1.attachmentJson('Request Schema', JSON.parse(reqSchema));
                                }
                            }
                        }
                    }
                    return { name: this.topProxy[TOP_PROXY_PREFIX] !== '' ? this.topProxy[TOP_PROXY_PREFIX] : topStepName, status: lastStatus, start, stop };
                });
                stack.splice(0);
                if (requestErr) {
                    console.error(`[endAllureStep ${requestErr ? 'err' : 'ok'}] ${this.topProxy[TOP_PROXY_PREFIX] + topStepName}`);
                }
                if (requestErr && brokenIfError)
                    throw requestErr;
                AllureStepProxyHandler.applyStack.delete(this.target);
                return result;
            };
        }
        if (propertyKeysToProxy[property]) {
            return AllureStepProxyHandler.create2(target, property, this.topProxy, this.topHandler);
        }
        return target[property];
    }
    apply(_target, _thisArg, argArray) {
        if (this.pKey === 'stepName') {
            this.topProxy[TOP_PROXY_PREFIX] = argArray[0] + ' : ';
            return this.topProxy;
        }
        const stack = AllureStepProxyHandler.applyStack.get(this.target);
        stack.push({ pKey: this.pKey, argArray });
        return this.topProxy;
    }
}
AllureStepProxyHandler.applyStack = new Map();
exports.AllureStepProxy = AllureStepProxyHandler;
//# sourceMappingURL=AllureStepProxyHandler.js.map