import { ContentType, Status } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import { SuperAgentTest } from 'supertest';
import { attachmentJson, attachmentJsonByObj, attachmentUtf8File, attachmentUtf8FileAuto, logStep, logStepWithTime, runStepWithInfo } from './AllureHelper';
import { TEST_RESPONSE_HEADER_CONTROLLER_FILE, TEST_RESPONSE_HEADER_REQUEST_SCHEMA } from './Test-Response-Header';
import superagent from "superagent";

declare module 'supertest'
{
  interface Test {
    stepName(str: string): this;
    expectHeader(field: string, val?: string): this;
    endAllureStep(): Promise<void>;
  }

  interface SuperTest<T extends superagent.SuperAgentRequest> {
    stepName(str: string): this;
    attachment(name: string, content: string | Buffer, contentType: ContentType): this;
    attachmentFile(name: string, filename: string): this;
  }
}


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
type StackType = { pKey: PropertyKey, argArray?: any };
const TOP_PROXY_PREFIX = Symbol('TopProxy#prefix');
const topKey = 'supertest';


const errChar = '--';
const maxStepNameLenHalf = 10;
function getStackStepName(stack: StackType, isPassed: boolean, short: boolean) {
  const arr: string[] = [];
  for (const i of stack.argArray) {
    if (typeof i !== 'function') {
      let item = i === undefined ? 'undefined' : JSON.stringify(i);
      if (short) {
        if (item.length > maxStepNameLenHalf * 2) {
          item = `${item.substr(0, maxStepNameLenHalf)}...${item.substr(-maxStepNameLenHalf)}`;
        }
      }
      arr.push(item);
    } else {
      arr.push('<func>');
    }
  }
  return `.${isPassed ? '' : errChar}${String(isPassed ? stack.pKey : stack.pKey.toString().toUpperCase())}(${arr.join(', ')})${isPassed ? '' : errChar}`;
}

class AllureStepProxyHandler<T extends object> implements ProxyHandler<T> {

  public static create<T extends SuperAgentTest>(target: T): T {
    const handler = new AllureStepProxyHandler(target, topKey);
    const p = new Proxy(target, handler);
    p[TOP_PROXY_PREFIX] = '';
    handler.topProxy = p;
    handler.topHandler = handler;
    AllureStepProxyHandler.applyStack.set(target, []);
    return p;
  }

  protected static create2<T extends object>(target: T, pKey: PropertyKey, topProxy: ProxyConstructor, topHandler: AllureStepProxyHandler<T>): T {
    const p = new Proxy(() => 0, new AllureStepProxyHandler(target, pKey, topProxy, topHandler));
    return p;
  }

  protected target: T;
  protected pKey: PropertyKey;
  protected topProxy!: ProxyConstructor;
  protected isTopProxy!: boolean;
  protected topHandler!: AllureStepProxyHandler<T>;
  protected end = false;

  protected constructor(target: T, pKey: PropertyKey, topProxy?: ProxyConstructor, topHandler?: AllureStepProxyHandler<T>) {
    this.target = target;
    this.pKey = pKey;
    if (topProxy) { this.topProxy = topProxy; }
    if (topHandler) { this.topHandler = topHandler; }
    this.isTopProxy = !topProxy;
  }

  get(target: T, property: PropertyKey): any {
    if (property === TOP_PROXY_PREFIX) {
      return target[property];
    }
    if (property === 'endAllureStep') {
      return async (brokenIfError = true) => {
        const statusIfErr: Status = brokenIfError ? Status.BROKEN : Status.FAILED;
        this.end = true;
        const stack = AllureStepProxyHandler.applyStack.get(this.target)!;
        let re: any = this.target;

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
            re = re.expect(function (field: string, val?: string) {
              return res => {
                const gotHeader = res.get(field);
                if (gotHeader !== val) {
                  // return new Error('expected header[]' + status + ' "' + a + '", got ' + res.status + ' "' + b + '"');
                  return new Error(`expected header['${field}'] => '${val}' , got '${gotHeader}'`);
                }
              };
            }(iStack.argArray[0], iStack.argArray[1]));
          } else {
            re = re[iStack.pKey](...iStack.argArray);
          }
        }

        let errIdx = -1;
        let requestErr: any;

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
        let result: any;
        const start = Date.now();
        try {
          result = await re;
        } catch (err) {
          requestErr = err;
        }
        const stop = Date.now();

        let topStepName = topKey;
        runStepWithInfo(() => {
          const expectErr = !requestErr?.message.startsWith('expected ')
          let err = requestErr && expectErr;
          let lastStatus = Status.PASSED;
          let firstAssertStep = true;
          let connectionRefused = false;
          for (const idx in stack) {
            const iStack = stack[idx];
            // #region enabled by server debug
            if (iStack.pKey === 'attachment') {
              // eslint-disable-next-line prefer-spread
              allure.attachment(iStack.argArray[0], iStack.argArray[1], iStack.argArray[2]);
              continue;
            }
            if (iStack.pKey === 'attachmentFile') {
              attachmentUtf8File(iStack.argArray[0], iStack.argArray[1]);
              continue;
            }
            // #endregion

            let status: Status = Status.PASSED;
            if (err) {
              if (!propertyKeysOfTest[iStack.pKey]) {
                status = Status.PASSED;
                lastStatus = statusIfErr;
              } else {
                if (expectErr && firstAssertStep) {
                  firstAssertStep = false;
                  logStepWithTime(requestErr.message, statusIfErr, start, stop);
                  topStepName += `.${errChar}x${errChar}`;
                  connectionRefused = true;
                }
                status = Status.SKIPPED;
              }
            } else if (errIdx === Number.parseInt(idx)) {
              err = true;
              lastStatus = status = statusIfErr;
            }
            if (propertyKeysOfTest[iStack.pKey]) {
              if (firstAssertStep && !requestErr) {
                firstAssertStep = false;
                logStepWithTime(`--> request -> statusCode : ${re.res.statusCode}`, status, start, stop);
              }
            }
            topStepName += getStackStepName(iStack, status !== statusIfErr, true);
            logStep((idx === '0' ? 'supertest' : '') + getStackStepName(iStack, true, false), status, status === statusIfErr ? requestErr : undefined);
          }
          attachmentJsonByObj({
            Request: {
              url: re.url,
              path: re.req.path,
              method: re.req.method,
              headers: re.req._headers,
              body: re._data,
            },
          })
          if (!connectionRefused) {
            attachmentJsonByObj({
              Response: {
                headers: re.res.headers,
                body: re.res.body,
              },
            });
            {
              {
                const toFile = re.res.headers[TEST_RESPONSE_HEADER_CONTROLLER_FILE];
                if (toFile) {
                  attachmentUtf8FileAuto(toFile, ['.ts', '.js']);
                }
              }
              {
                const reqSchema = re.res.headers[TEST_RESPONSE_HEADER_REQUEST_SCHEMA];
                if (reqSchema) {
                  attachmentJson('Request Schema', JSON.parse(reqSchema));
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

        if (requestErr && brokenIfError) throw requestErr;
        AllureStepProxyHandler.applyStack.delete(this.target);
        return result;
      };
    }

    if (propertyKeysToProxy[property]) {
      return AllureStepProxyHandler.create2(target, property, this.topProxy, this.topHandler);
    }

    return target[property];
  }

  protected static applyStack: Map<any, StackType[]> = new Map();

  protected firstApply!: Promise<any>;
  apply(_target: any, _thisArg: any, argArray?: any): any {
    if (this.pKey === 'stepName') {
      this.topProxy[TOP_PROXY_PREFIX] = argArray[0] + ' : ';
      return this.topProxy;
    }
    const stack = AllureStepProxyHandler.applyStack.get(this.target)!;
    stack.push({ pKey: this.pKey, argArray });
    return this.topProxy;
  }

}

export const AllureStepProxy = AllureStepProxyHandler;
