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
	let source  = argvs[0];
	let output = argvs[1];
	console.log('start path:', source,'output:',output);
	let arr = source.split('/');
	console.log(arr);
	let fileName = arr[arr.length-1].split('.')[0];
	workbook = xlsx.readFile(source);
	to_json(workbook,fileName,output);
}

function to_json(workbook,fileName,output) {
	let result = {};
	// 获取 Excel 中所有表名
	let sheetNames = workbook.SheetNames; // 返回 ['sheet1', 'sheet2']
	/*workbook.SheetNames.forEach((sheetName) => {
		let worksheet = workbook.Sheets[sheetName];
		console.log(sheetName);
		result[sheetName] = xlsx.utils.sheet_to_json(worksheet);
	});*/
	let worksheet = workbook.Sheets[sheetNames[0]];
	console.log(sheetNames);
	// 获取表的有效范围
	for(let i=65;i<91;i++) {
		let sheet = worksheet[String.fromCharCode(i) + '1']
		if(sheet){
			sheet.h = sheet.w = sheet.v = config[fileName].names[i-65];
			sheet.r = '<t>'+sheet.v + '</t>';
		}
	}
	let temp = xlsx.utils.sheet_to_json(worksheet);
	temp.forEach((obj,index)=>{
		let key = obj[config[fileName].key];
		if(config[fileName].array && !result[key]){
			result[key] = [];
		}
		result[key].push(obj);
	});
	if(config[fileName].method){
		console.log('method');
		config[fileName].method(result);
	}

	let json = {}//JSON.stringify({fileName:result}, 2, 2);
	fs.readFile(output+'/'  + 'config.json',{flag:'r'},(err,data)=>{
		if(data){
			json = JSON.parse(data);
		}
		json[fileName] = result;
		fs.writeFile(output+'/'  + 'config.json', JSON.stringify(json,2,2), {
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
	console.log()
	console.log("打印表信息",JSON.stringify(result, 2, 2));  //显示格式{"表1":[],"表2":[]}
	return result;*/
}


readExcel(process.argv.slice(2));

