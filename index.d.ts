/// <reference types="superagent" />
/// <reference types="node" />
import { ContentType } from "allure-js-commons";
export * as AllureHelper from "./helpers/AllureHelper";
export { AllureStepProxy } from "./helpers/AllureStepProxyHandler";
declare module 'supertest' {
    interface Test {
        expectHeader(field: string, val: string): this;
        endAllureStep(): Promise<void>;
    }
}
declare module 'superagent' {
    interface SuperAgent<Req extends SuperAgentRequest> {
        stepName(str: string): this;
        attachment(name: string, content: string | Buffer, contentType: ContentType): this;
        attachmentFile(name: string, filename: string): this;
    }
}
