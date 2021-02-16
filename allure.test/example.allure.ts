import { suite, test } from '@testdeck/mocha';
import { allure } from 'allure-mocha/runtime';
import supertest from 'supertest';
import * as allureDecorators from 'ts-test-decorators';
import { AllureStepProxy } from '../helpers/AllureStepProxyHandler';
import * as AllureHelper from '../helpers/AllureHelper';


const HOST = 'https://github.com';
const toPath = '/RickyLi79';
const query = { tab: 'repositories', 'type': 'public' };

@suite('supertest-allure-step-helper : expample')
export class TestSuite {


  public static async before() {
    allureDecorators.decorate<any>(allure);
    AllureHelper.writePackageVerToEnvironmentInfo(process.cwd(), ['@testdeck/mocha', 'allure-js-commons', 'allure-mocha', 'ts-test-decorators', 'supertest', 'mocha'])

  }

  @test('expect `success`')
  public async test1() {
    const supertestAgent = supertest.agent(HOST);
    const agent = AllureStepProxy.create(supertestAgent);
    await agent
      .stepName('visit') // optional
      .get(toPath)
      .query(query)
      .expect(200)
      .expectHeader('server', 'GitHub.com') // not a `supertest` function, add by `supertest-allure-step-helper` 
      .endAllureStep(); // this MUST be called at finnal position
  }

  @test('expect `broken` at `expect`')
  public async test2() {
    const supertestAgent = supertest.agent(HOST);
    const agent = AllureStepProxy.create(supertestAgent);

    await agent
      .get(toPath)
      .query(query)
      .expect(302)  // expect 'broken' here
      .endAllureStep(); // this MUST be called at finnal position
  }

  @test('expect `broken` at `.expect(200)`')
  public async test3() {
    const supertestAgent = supertest.agent(HOST);
    const agent = AllureStepProxy.create(supertestAgent);

    await agent
      .post(toPath)
      .query(query)
      .expect(200)  // expect 'broken' here
      .expectHeader('server', 'GitHub.com')
      .endAllureStep(); // this MUST be called at finnal position
  }

  @test('expect `broken` at curl')
  public async test4() {
    const supertestAgent = supertest.agent("http://no.such.domain.host/no/such/page");
    const agent = AllureStepProxy.create(supertestAgent);

    await agent
      .get(toPath)
      .query(query)
      // expect 'broken' here
      .expect(200)
      .endAllureStep(); // this MUST be called at finnal position
  }

  @test('expect `broken` at `.expectHeader()`')
  public async test5() {
    const supertestAgent = supertest.agent(HOST);
    const agent = AllureStepProxy.create(supertestAgent);

    await agent
      .get(toPath)
      .query(query)
      .expect(200)
      .expectHeader('server', 'xxx') // not a `supertest` function, add by `supertest-allure-step-helper` 
      .endAllureStep(); // this MUST be called at finnal position
  }

}