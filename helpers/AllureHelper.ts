import { ContentType, ExecutableItemWrapper, Status } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import fs from 'fs';
import path from 'path';

export const config = { baseDir: __dirname };

export function runStep<T>(stepName: string, action: () => T): T {
  return allure.createStep(stepName, action)();
}

export function logStep(stepName: string, status: Status, err?:Error) {
  let currItem!: ExecutableItemWrapper;
  allure.createStep(stepName, () => {
    currItem = allure.currentExecutable;
    if (err !== undefined) {
      logStep(err.message, status);
    }
  })();
  currItem.status = status;
  return currItem;
}

export function logStepWithTime(stepName: string, status: Status, start: number, stop: number) {
  let currItem!: ExecutableItemWrapper;
  allure.createStep(stepName, () => {
    currItem = allure.currentExecutable;
  })();
  currItem.status = status;
  (<any>currItem).info.start = start;
  (<any>currItem).info.stop = stop;
  return currItem;
}

export function runStepWithStepName(stepName: string) {
  const currItem = allure.currentExecutable;
  currItem.name = stepName;
}

type StepInfoType = { name: string, status: Status, start?: number, stop?: number };
export function runStepWithInfo(action: () => StepInfoType) {
  let currItem!: ExecutableItemWrapper;
  let info!: StepInfoType;
  const step = allure.createStep('', () => {
    currItem = allure.currentExecutable;
    info = action();
  })();
  currItem.name = info.name;
  currItem.status = info.status;
  if (info.start !== undefined) { (<any>currItem).info.start = info.start; }
  if (info.stop !== undefined) { (<any>currItem).info.stop = info.stop; }
  return step;
}

export function attachmentJson(name: string, data: any) {
  allure.attachment(name, JSON.stringify(data, undefined, 2), ContentType.JSON);
}

export function attachmentJsonByObj(data: { [name: string]: any }) {
  for (const name in data) {
    if (!data[name] || Object.keys(data[name]).length === 0) continue;
    allure.attachment(name, JSON.stringify(data[name], undefined, 2), ContentType.JSON);
  }
}

export function attachmentUtf8File(name: string, filename: string, addFirstLineContent?: string) {
  let str: string;
  let contentType: ContentType;
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    str = '< file not found >';
    contentType = ContentType.TEXT;
  } else {
    switch (path.extname(filename).toLowerCase()) {
      case '.json':
        contentType = ContentType.JSON;
        break;
      case '.css':
        contentType = ContentType.CSS;
        break;
      case '.csv':
        contentType = ContentType.CSV;
        break;
      case '.jpg':
      case '.jpeg':
        contentType = ContentType.JPEG;
        break;
      case '.xml':
        contentType = ContentType.XML;
        break;
      case '.png':
        contentType = ContentType.PNG;
        break;
      case '.svg':
        contentType = ContentType.SVG;
        break;
      case '.uri':
        contentType = ContentType.URI;
        break;
      default:
        contentType = ContentType.TEXT;
    }
    str = fs.readFileSync(filename, 'utf-8');
  }
  if (addFirstLineContent) {
    str = addFirstLineContent + '\r\n\r\n' + str;
  }
  allure.attachment(name, str, contentType);

}

export function attachmentUtf8FileAuto(filename: string) {
  const name = '${baseDir}/' + path.relative(config.baseDir, filename);
  attachmentUtf8File(name, filename);
}

export function writePackageVerToEnvironmentInfo(appDir:string, packageName:string[], projectVer=true) {
  const info:{[key:string]:string} = {};

  if ( projectVer ){
    const packageContent =  fs.readFileSync(path.join(appDir,  'package.json'), 'utf-8');
    const fsJson = JSON.parse(packageContent);
    const {name,version} = fsJson;
    info[`project : ${name}`] = version;
  }

  for (const iPackageName of packageName) {
    const iFile = path.join(appDir, 'node_modules', iPackageName, 'package.json');
    const fsContent = fs.readFileSync(iFile, 'utf-8');
    const fsJson = JSON.parse(fsContent);
    const ver = fsJson.version;
    info[`dep : ${iPackageName}`] = "v"+ver;
  }
  allure.writeEnvironmentInfo(info);
}

