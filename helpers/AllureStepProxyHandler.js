"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllureStepProxy = void 0;
const tslib_1 = require("tslib");
const allure_js_commons_1 = require("allure-js-commons");
const runtime_1 = require("allure-mocha/runtime");
const assert_1 = tslib_1.__importDefault(require("assert"));
const Test_Response_Header_1 = require("./Test-Response-Header");
const AllureHelper_1 = require("./AllureHelper");
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
        if (property === 'dispose') {
            return () => {
                // console.log('disposed');
                if (!this.end) {
                    throw Error('run `endAllureStep` first');
                }
                AllureStepProxyHandler.applyStack.delete(this.target);
            };
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
                                assert_1.default.strictEqual(res.get(field), val);
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
                    let err = requestErr && !(requestErr === null || requestErr === void 0 ? void 0 : requestErr.message.startsWith('expected'));
                    let lastStatus = allure_js_commons_1.Status.PASSED;
                    let firstAssertStep = true;
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
                                if (!requestErr.message.startsWith('expected') && firstAssertStep) {
                                    firstAssertStep = false;
                                    AllureHelper_1.logStepWithTime(requestErr.message, statusIfErr, start, stop);
                                    topStepName += `.${errChar}x${errChar}`;
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
                            path: re.req.path,
                            method: re.req.method,
                            headers: re.req._headers,
                            body: re._data,
                        },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxsdXJlU3RlcFByb3h5SGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFsbHVyZVN0ZXBQcm94eUhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHlEQUF3RDtBQUN4RCxrREFBOEM7QUFDOUMsNERBQTRCO0FBQzVCLGlFQUFtSDtBQUNuSCxpREFBNEo7QUFvQjVKLE1BQU0sa0JBQWtCLEdBQUc7SUFDekIsYUFBYSxFQUFFLElBQUk7SUFDbkIsTUFBTSxFQUFFLElBQUk7SUFDWixHQUFHLEVBQUUsSUFBSTtJQUVULFlBQVksRUFBRSxJQUFJO0NBQ25CLENBQUM7QUFFRixNQUFNLG1CQUFtQixHQUFHO0lBQzFCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLFFBQVEsRUFBRSxJQUFJO0lBQ2QsT0FBTyxFQUFFLElBQUk7SUFDYixJQUFJLEVBQUUsSUFBSTtJQUNWLEdBQUcsRUFBRSxJQUFJO0lBQ1QsTUFBTSxFQUFFLElBQUk7SUFDWixHQUFHLEVBQUUsSUFBSTtJQUNULElBQUksRUFBRSxJQUFJO0lBQ1YsSUFBSSxFQUFFLElBQUk7SUFDVixLQUFLLEVBQUUsSUFBSTtJQUNYLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLEtBQUssRUFBRSxJQUFJO0lBQ1gsSUFBSSxFQUFFLElBQUk7SUFDVixNQUFNLEVBQUUsSUFBSTtJQUNaLE9BQU8sRUFBRSxJQUFJO0lBQ2IsS0FBSyxFQUFFLElBQUk7SUFDWCxJQUFJLEVBQUUsSUFBSTtJQUNWLFFBQVEsRUFBRSxJQUFJO0lBQ2QsU0FBUyxFQUFFLElBQUk7SUFDZixLQUFLLEVBQUUsSUFBSTtJQUNYLEdBQUcsRUFBRSxJQUFJO0lBQ1QsTUFBTSxFQUFFLElBQUk7SUFDWixXQUFXLEVBQUUsSUFBSTtJQUNqQixNQUFNLEVBQUUsSUFBSTtJQUNaLFNBQVMsRUFBRSxJQUFJO0lBQ2YsS0FBSyxFQUFFLElBQUk7SUFDWCxNQUFNLEVBQUUsSUFBSTtJQUNaLFdBQVcsRUFBRSxJQUFJO0lBRWpCLE1BQU0sRUFBRSxJQUFJO0lBQ1osTUFBTSxFQUFFLElBQUk7SUFDWixJQUFJLEVBQUUsSUFBSTtJQUNWLE1BQU0sRUFBRSxJQUFJO0lBQ1osRUFBRSxFQUFFLElBQUk7SUFDUixJQUFJLEVBQUUsSUFBSTtJQUNWLFlBQVksRUFBRSxJQUFJO0lBQ2xCLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLEtBQUssRUFBRSxJQUFJO0lBQ1gsS0FBSyxFQUFFLElBQUk7SUFDWCxHQUFHLEVBQUUsSUFBSTtJQUNULEVBQUUsRUFBRSxJQUFJO0lBQ1IsRUFBRSxFQUFFLElBQUk7SUFDUixLQUFLLEVBQUUsSUFBSTtJQUNYLElBQUksRUFBRSxJQUFJO0lBQ1YsR0FBRyxFQUFFLElBQUk7SUFDVCxLQUFLLEVBQUUsSUFBSTtJQUNYLFNBQVMsRUFBRSxJQUFJO0lBQ2YsWUFBWSxFQUFFLElBQUk7SUFDbEIsS0FBSyxFQUFFLElBQUk7SUFDWCxJQUFJLEVBQUUsSUFBSTtJQUNWLFNBQVMsRUFBRSxJQUFJO0lBQ2YsR0FBRyxFQUFFLElBQUk7SUFDVCxPQUFPLEVBQUUsSUFBSTtJQUNiLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLElBQUksRUFBRSxJQUFJO0lBQ1YsS0FBSyxFQUFFLElBQUk7SUFFWCxhQUFhLEVBQUUsSUFBSTtJQUNuQixNQUFNLEVBQUUsSUFBSTtJQUNaLEdBQUcsRUFBRSxJQUFJO0lBRVQsY0FBYztJQUVkLFFBQVEsRUFBRSxJQUFJO0lBQ2QsVUFBVSxFQUFFLElBQUk7SUFDaEIsY0FBYyxFQUFFLElBQUk7SUFDcEIsWUFBWSxFQUFFLElBQUk7Q0FDbkIsQ0FBQztBQUdGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDbkQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDO0FBRzNCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQztBQUNyQixNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztBQUM5QixTQUFTLGdCQUFnQixDQUFDLEtBQWdCLEVBQUUsUUFBaUIsRUFBRSxLQUFjO0lBQzNFLE1BQU0sR0FBRyxHQUFhLEVBQUUsQ0FBQztJQUN6QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7UUFDOUIsSUFBSSxPQUFPLENBQUMsS0FBSyxVQUFVLEVBQUU7WUFDM0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLEtBQUssRUFBRTtnQkFDVCxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLEdBQUcsQ0FBQyxFQUFFO29CQUN4QyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7aUJBQ3RGO2FBQ0Y7WUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2hCO2FBQU07WUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3BCO0tBQ0Y7SUFDRCxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDMUosQ0FBQztBQUVELE1BQU0sc0JBQXNCO0lBd0IxQixZQUFzQixNQUFTLEVBQUUsSUFBaUIsRUFBRSxRQUEyQixFQUFFLFVBQXNDO1FBRjdHLFFBQUcsR0FBRyxLQUFLLENBQUM7UUFHcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxRQUFRLEVBQUU7WUFBRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztTQUFFO1FBQzNDLElBQUksVUFBVSxFQUFFO1lBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7U0FBRTtRQUNqRCxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsUUFBUSxDQUFDO0lBQzlCLENBQUM7SUE1Qk0sTUFBTSxDQUFDLE1BQU0sQ0FBbUIsTUFBUztRQUM5QyxNQUFNLE9BQU8sR0FBRyxJQUFJLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDO1FBQzdCLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVTLE1BQU0sQ0FBQyxPQUFPLENBQW1CLE1BQVMsRUFBRSxJQUFpQixFQUFFLFFBQTBCLEVBQUUsVUFBcUM7UUFDeEksTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksc0JBQXNCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUM3RixPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFpQkQsR0FBRyxDQUFDLE1BQVMsRUFBRSxRQUFxQjtRQUNsQyxJQUFJLFFBQVEsS0FBSyxnQkFBZ0IsRUFBRTtZQUNqQyxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUN6QjtRQUNELElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtZQUMxQixPQUFPLEdBQUcsRUFBRTtnQkFDViwyQkFBMkI7Z0JBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO29CQUNiLE1BQU0sS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7aUJBQzFDO2dCQUNELHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELENBQUMsQ0FBQztTQUNIO1FBQ0QsSUFBSSxRQUFRLEtBQUssZUFBZSxFQUFFO1lBQ2hDLE9BQU8sS0FBSyxFQUFFLGFBQWEsR0FBRyxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxXQUFXLEdBQVcsYUFBYSxDQUFDLENBQUMsQ0FBQywwQkFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMEJBQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQzFFLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixNQUFNLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUUsQ0FBQztnQkFDbEUsSUFBSSxFQUFFLEdBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFFMUIsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLEtBQUssTUFBTSxHQUFHLElBQUksS0FBSyxFQUFFO29CQUN2QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFCLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxZQUFZLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxnQkFBZ0IsRUFBRTt3QkFDcEUsU0FBUztxQkFDVjtvQkFFRCxJQUFJLGNBQWMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN6RCxjQUFjLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDdkM7b0JBQ0QsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRTt3QkFDbEMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBUyxLQUFZLEVBQUUsR0FBVTs0QkFDOUMsT0FBTyxHQUFHLENBQUMsRUFBRTtnQ0FDWCxnQkFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDOzRCQUMxQyxDQUFDLENBQUM7d0JBQ0osQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzVDO3lCQUFNO3dCQUNMLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3FCQUMxQztpQkFDRjtnQkFFRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDaEIsSUFBSSxVQUFlLENBQUM7Z0JBRXBCLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtvQkFDM0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUIsd0NBQXdDO29CQUN4QyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUFFO3dCQUNyQixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3BCLElBQUksR0FBRyxZQUFZLEtBQUssRUFBRTs0QkFDeEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxjQUFjLENBQUM7eUJBQy9CO3dCQUNELE9BQU8sR0FBRyxDQUFDO29CQUNiLENBQUMsQ0FBQztpQkFDSDtnQkFDRCxJQUFJLE1BQVcsQ0FBQztnQkFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUN6QixJQUFJO29CQUNGLE1BQU0sR0FBRyxNQUFNLEVBQUUsQ0FBQztpQkFDbkI7Z0JBQUMsT0FBTyxHQUFHLEVBQUU7b0JBQ1osVUFBVSxHQUFHLEdBQUcsQ0FBQztpQkFDbEI7Z0JBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUV4QixJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUM7Z0JBQ3pCLDhCQUFlLENBQUMsR0FBRyxFQUFFO29CQUNuQixJQUFJLEdBQUcsR0FBRyxVQUFVLElBQUksRUFBQyxVQUFVLGFBQVYsVUFBVSx1QkFBVixVQUFVLENBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUMsQ0FBQztvQkFDcEUsSUFBSSxVQUFVLEdBQUcsMEJBQU0sQ0FBQyxNQUFNLENBQUM7b0JBQy9CLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQztvQkFDM0IsS0FBSyxNQUFNLEdBQUcsSUFBSSxLQUFLLEVBQUU7d0JBQ3ZCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFFMUIsa0NBQWtDO3dCQUNsQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFOzRCQUNoQyx5Q0FBeUM7NEJBQ3pDLGdCQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzlFLFNBQVM7eUJBQ1Y7d0JBQ0QsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLGdCQUFnQixFQUFFOzRCQUNwQyxpQ0FBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDM0QsU0FBUzt5QkFDVjt3QkFDRCxhQUFhO3dCQUViLElBQUksTUFBTSxHQUFXLDBCQUFNLENBQUMsTUFBTSxDQUFDO3dCQUNuQyxJQUFJLEdBQUcsRUFBRTs0QkFDUCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dDQUNwQyxNQUFNLEdBQUcsMEJBQU0sQ0FBQyxNQUFNLENBQUM7Z0NBQ3ZCLFVBQVUsR0FBRyxXQUFXLENBQUM7NkJBQzFCO2lDQUFNO2dDQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxlQUFlLEVBQUU7b0NBQ2pFLGVBQWUsR0FBRyxLQUFLLENBQUM7b0NBQ3hCLDhCQUFlLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO29DQUM5RCxXQUFXLElBQUksSUFBSSxPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7aUNBQ3pDO2dDQUNELE1BQU0sR0FBRywwQkFBTSxDQUFDLE9BQU8sQ0FBQzs2QkFDekI7eUJBQ0Y7NkJBQU0sSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTs0QkFDMUMsR0FBRyxHQUFHLElBQUksQ0FBQzs0QkFDWCxVQUFVLEdBQUcsTUFBTSxHQUFHLFdBQVcsQ0FBQzt5QkFDbkM7d0JBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7NEJBQ25DLElBQUksZUFBZSxJQUFJLENBQUMsVUFBVSxFQUFFO2dDQUNsQyxlQUFlLEdBQUcsS0FBSyxDQUFDO2dDQUN4Qiw4QkFBZSxDQUFDLCtCQUErQixFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7NkJBQzFGO3lCQUNGO3dCQUNELFdBQVcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsTUFBTSxLQUFLLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDdEUsc0JBQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDNUk7b0JBQ0Qsa0NBQW1CLENBQUM7d0JBQ2xCLE9BQU8sRUFBRTs0QkFDUCxJQUFJLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJOzRCQUNqQixNQUFNLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNOzRCQUNyQixPQUFPLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFROzRCQUN4QixJQUFJLEVBQUUsRUFBRSxDQUFDLEtBQUs7eUJBQ2Y7d0JBQ0QsUUFBUSxFQUFFOzRCQUNSLE9BQU8sRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU87NEJBQ3ZCLElBQUksRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUk7eUJBQ2xCO3FCQUNGLENBQUMsQ0FBQztvQkFDSDt3QkFDRTs0QkFDRSxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQywyREFBb0MsQ0FBQyxDQUFDOzRCQUNwRSxJQUFJLE1BQU0sRUFBRTtnQ0FDVixxQ0FBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQzs2QkFDaEM7eUJBQ0Y7d0JBQ0Q7NEJBQ0UsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsMERBQW1DLENBQUMsQ0FBQzs0QkFDdEUsSUFBSSxTQUFTLEVBQUU7Z0NBQ2IsNkJBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7NkJBQ3pEO3lCQUNGO3FCQUNGO29CQUNELE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQzNJLENBQUMsQ0FBQyxDQUFDO2dCQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRWhCLElBQUksVUFBVSxFQUFFO29CQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLFdBQVcsRUFBRSxDQUFDLENBQUM7aUJBQ2hIO2dCQUVELElBQUksVUFBVSxJQUFJLGFBQWE7b0JBQUUsTUFBTSxVQUFVLENBQUM7Z0JBQ2xELHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxPQUFPLE1BQU0sQ0FBQztZQUNoQixDQUFDLENBQUM7U0FDSDtRQUVELElBQUksbUJBQW1CLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDakMsT0FBTyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUN6RjtRQUVELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFLRCxLQUFLLENBQUMsT0FBWSxFQUFFLFFBQWEsRUFBRSxRQUFjO1FBQy9DLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7WUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDdEQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO1NBQ3RCO1FBQ0QsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFFLENBQUM7UUFDbEUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDMUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3ZCLENBQUM7O0FBWGdCLGlDQUFVLEdBQTBCLElBQUksR0FBRyxFQUFFLENBQUM7QUFlcEQsUUFBQSxlQUFlLEdBQUcsc0JBQXNCLENBQUMifQ==