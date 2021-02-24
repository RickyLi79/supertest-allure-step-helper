import { ContentType } from "allure-js-commons";

export * as AllureHelper from "./helpers/AllureHelper";
export { AllureStepProxy } from "./helpers/AllureStepProxyHandler";
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