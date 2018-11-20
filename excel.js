const xlsx = require('xlsx');
const fs = require('fs')
const path = require('path');
let projectPath = process.cwd();
let configPath = path.join(projectPath, 'design/excels/config.js');
let config = require(configPath);
let workbook;
/*{
	'levels':{
		'key':'level',
		'names':['level','boy','girl','time'],//'board_type_3','board_type_4','board_type_5'
		/!*'method':function (data){
			for(let i in data){
				data[i].probability = [];
				data[i].probability.push(data[i]['board_type_0']);
				data[i].probability.push(data[i]['board_type_1']);
				data[i].probability.push(data[i]['board_type_2']);
				// data[i].probability.push(data[i]['board_type_3']);
				// data[i].probability.push(data[i]['board_type_4']);
				// data[i].probability.push(data[i]['board_type_5']);
				delete data[i]['board_type_0'];
				delete data[i]['board_type_1'];
				delete data[i]['board_type_2'];
				// delete data[i]['board_type_3'];
				// delete data[i]['board_type_4'];
				// delete data[i]['board_type_5'];
			}
		}*!/
	},
	'items':{
		'key':'id',
		'names':['name','id','price','type','shop'],
	}
};*/
function readExcel(argvs) {
  let source = argvs[0];
  let output = argvs[1];
  console.log('start path:', source, 'output:', output);
  let arr = source.indexOf('/') >= 0 ? source.split('/') : source.split('\\');
  let fileName = arr[arr.length - 1].split('.')[0];
  workbook = xlsx.readFile(source);
  to_json(workbook, fileName, output);
}

function to_json(workbook, fileName, output) {
  let result = {};
  // 获取 Excel 中所有表名
  let sheetNames = workbook.SheetNames; // 返回 ['sheet1', 'sheet2']
  /*workbook.SheetNames.forEach((sheetName) => {
  	let worksheet = workbook.Sheets[sheetName];
  	result[sheetName] = xlsx.utils.sheet_to_json(worksheet);
  });*/
  let worksheet = workbook.Sheets[sheetNames[0]];
  // console.log(worksheet, worksheet['!ref']);
  let range = worksheet['!ref'].split(':');
  let startRow = 1;
  let endRow = 1;
  let startColumn = '';
  let endColumn = ''
  range.forEach((str, index) => {
    let tempColumn = '';
    let tempRow = 1;
    for (let i = 0; i < str.length; ++i) {
      if (str.charCodeAt(i) >= 65 && str.charCodeAt(i) < 91) {
        tempColumn += str[i];
      } else {
        tempRow = str.substring(i);
        // console.log(i,str[i],tempRow);
        break;
      }
    }
    switch (index) {
      case 0:
        startColumn = tempColumn;
        startRow = parseInt(tempRow);
        break;
      case 1:
        endColumn = tempColumn;
        endRow = parseInt(tempRow);
        break;
    }
  })
  // 获取表的有效范围
  let index = 0;
  // console.log(startColumn,endColumn);
  while (1) {
    for (let i = startRow; i <= endRow; ++i) {
      let sheet = worksheet[switchStr(index) + i];
      // console.log(switchStr(index) + i,sheet);
      if (sheet && i == 1) {
        sheet.h = sheet.w = sheet.v = config[fileName].names[index];
        sheet.r = '<t>' + sheet.v + '</t>';
      } else if (!sheet) {
        // console.log(worksheet[switchStr(index) + i]);
        switch (worksheet[switchStr(index) + '2'].v) {
          case 'STRING':
            worksheet[switchStr(index) + i] = {
              t: 's',
              h:'',
              w:'',
              v:'',
              r:'<t> </t>'
            };
            break;
          case 'INT':
          worksheet[switchStr(index) + i] = {
            t: 'n',
            h:0,
            w:0,
            v:0,
            r:'<t>0</t>'
          };
            break;
          case 'INTS':
          worksheet[switchStr(index) + i] = {
            t: 's',
            h:'0|0',
            w:'0|0',
            v:'0|0',
            r:'<t>0|0</t>'
          };
            break;
        }
        // worksheet[]
      }
    }
    let column = switchStr(index);
    if (column == endColumn) {
      break;
    }
    index++;
  }
  console.log(worksheet);
  let temp = xlsx.utils.sheet_to_json(worksheet);
  // console.log(temp);
  temp.splice(0, 2);
  temp.forEach((obj, index) => {
    let key = obj[config[fileName].key];
    if (config[fileName].array && !result[key]) {
      result[key] = [];
    }
    if (config[fileName].array) {
      result[key].push(obj);
    } else {
      result[key] = obj;
    }
  });
  if (config[fileName].method) {
    config[fileName].method(result);
  }

  let json = {} //JSON.stringify({fileName:result}, 2, 2);
  fs.readFile(output + '/' + 'config.json', {
    flag: 'r'
  }, (err, data) => {
    if (data) {
      json = JSON.parse(data);
    }
    json[config[fileName].title] = result;
    fs.writeFile(output + '/' + 'config.json', JSON.stringify(json, 2, 2), {
      flag: 'w'
    }, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

  // 获取 A1 单元格对象
  // 获取 A1 中的值
  /*let sheet1 = JSON.stringify(result, 2, 2)['Sheet1'];
  return result;*/
}

function switchStr(num) {
  /* if(num % 26 == 0){
    if(Math.floor(num/26) > 26){
      return switchStr(Math.floor(num/26))+String.fromCharCode(26 + 64);
    }
    let temp = '';
    for(let i=0; i<Math.floor(num/26); ++i){
      temp += String.fromCharCode(26 + 64);
    }
    return temp;
  } */
  if (Math.floor(num / 26) > 26) {
    return switchStr(Math.floor(num / 26) - 1) + String.fromCharCode(num % 26 + 65);
  }
  if (Math.floor(num / 26) == 0) {
    return String.fromCharCode(num % 26 + 65);
  }
  return String.fromCharCode(Math.floor(num / 26) + 64) + String.fromCharCode(num % 26 + 65);
}


readExcel(process.argv.slice(2));
