const path = require('path');
const {readExcel} = require('./excel');
let projectPath = process.cwd();
let configPath = path.join(projectPath, 'design/excels/config.js');
let config = require(configPath);
const allExcel = async (argvs) => {
  console.log(argvs);
  let source = argvs[0];
  let output = argvs[1];
  let paths = [];
  let index = 0;
  for(let i in config){
    await readExcel([source + i + '.xlsx',output]);
    index++;
    console.log(`${i} finished`)
  }
  console.log(`all finish sum=${index}`);
}
allExcel(process.argv.slice(2))

