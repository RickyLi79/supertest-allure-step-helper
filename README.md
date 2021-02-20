# supertest-allure-step-helper

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/supertest-allure-step-helper.svg?style=flat-square
[npm-url]: https://npmjs.org/package/supertest-allure-step-helper
[download-image]: https://img.shields.io/npm/dm/supertest-allure-step-helper.svg?style=flat-square
[download-url]: https://npmjs.org/package/supertest-allure-step-helper

#### Introduce
turns the calls of `supertest` to `allure.createStep()`

#### Install

```shell
$ npm i -D supertest-allure-step-helper
```
#### Usage

```ts
  const HOST = 'https://github.com';
  const toPath = '/RickyLi79';
  const query = { tab: 'repositories', 'type': 'public' };

  @test('expect `success`')
  public async test1() {
    const supertestAgent = supertest.agent(HOST);
    const agent = AllureStepProxy.create(supertestAgent); // create
    await agent
      .stepName('visit') // optional, add by `supertest-allure-step-helper` 
      .get(toPath)
      .query(query)
      .expect(200)
      .expectHeader('server', 'GitHub.com') // not a `supertest` function, add by `supertest-allure-step-helper` 
      .endAllureStep(); // this MUST be called at finnal
  }
```

#### Demo Screenshot

![Image][1]
![Image][2]

[1]:./demo/demo-success.png
[2]:./demo/demo-broken.png



#### Example
[./allure.test/example.allure.ts](./allure.test/example.allure.ts)

#### Example Report HTML
- https://rickyli79.github.io/testing-reports/supertest-allure-step-helper/allure-report/
- https://rickyli79.gitee.io/testing-reports/supertest-allure-step-helper/allure-report/


