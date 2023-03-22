/**
 * Created by rockyl on 2017/2/13.
 */

let path = require('path');
let argv = require('argv');

let args = argv.option([{
	name: 'in',
	short: 'i',
	type: 'string',
	description: 'path for input',
	example: "'script --in=value' or 'script -i value'"
}, {
	name: 'out',
	short: 'o',
	type: 'string',
	description: 'path for output',
	example: "'script --out=value' or 'script -o value'"
}, {
	name: 'process',
	short: 'p',
	type: 'string',
	description: 'process',
	example: "'script --process=value' or 'script -p value'"
}]).run();
let options = args.options;
let inPath = options.in;
let outPath = options.out || '';
let process = options.process.split('|');
console.log(`inPath:${inPath},outPath:${outPath},process,${process}`);
const fs = require('fs');
let content = fs.readFileSync(inPath, 'utf-8');;
let reg = /message\s+(\w*)\s*\{/;
let result = content.match(/message\s+\w*\s*\{/ig);
let allNames = [];
let items = [];
let index = 1000;
result.forEach((item) => {
	let name = item.match(reg)[1];
	if (allNames.indexOf(name) < 0) {
		allNames.push(name);
		index++;

		items.push({index, name});
	}
});
let processMap = {};

processMap.ts = function() {
	let lines = [];
	let names = [];
	items.forEach(item => {
		let {index, name} = item;

		lines.push(`protoIDs[${index}] = '${name}';\n`);
		lines.push(`protoIDs['${name}'] = ${index};\n`);

		if (name.indexOf('Req') >= 0) {
			let temp = name.substr(0, name.length - 3);
			names.push(`static ${temp}:string = '${temp}';\n`);
		}

		names.push(`static ${name}:string = '${name}';\n`);
	});

// 	let tsContent = `class ProtocolsProtocols {
// 	static getMap(): any {
// 		let protoIDs = {};
// 		${lines.join('\t\t')}
// 		return protoIDs;
// 	}
// }
// `;

	let tsProtoNamesContent = `class ProtoNames{
	${names.join('\t')}}`;

	// fs.writeFileSync(path.resolve(outPath, 'ProtoIDs.ts'), tsContent);
	fs.writeFileSync(path.resolve(outPath, 'ProtoNames.ts'), tsProtoNamesContent);
}

processMap.js = function() {
	let lines = [];
	items.forEach(item => {
		let {index, name} = item;

		lines.push(`protoIDs[${index}] = '${name}';\n`);
		lines.push(`protoIDs['${name}'] = ${index};\n`);
	});

	let jsContent = `"use strict";

let protoIDs = {};
${lines.join('')}
module.exports = protoIDs;
`;

	fs.writeFileSync(path.resolve(outPath, 'protoIDs.js'), jsContent);
}

processMap.json = function() {
	let lines = [];
	items.forEach(item => {
		let {index, name} = item;

		lines.push(`\t${index}: "${name}",\n`);
		lines.push(`\t"${name}": ${index},\n`);
	});

	let jsContent = `{
${lines.join('')}
}
`;

	fs.writeFileSync(path.resolve(outPath, 'protoIDs.json'), jsContent);
}

function export_java() {
	let lines = [];
	items.forEach(item => {
		let {index, name} = item;

		lines.push(`\t\tpids.put(${index}, "${name}");\n`);
		lines.push(`\t\tpids.put("${name}", ${index});\n`);
	});

	let jsContent = `public class MessageConfig {

	public static final HashMap<Object, Object> pids = new HashMap<Object, Object>();

	static {
${lines.join('')}
	}

}
`;

	fs.writeFileSync(path.resolve(outPath, 'protoIDs.java'), jsContent);
}

processMap.java = export_java;

function export_go() {
	let lines = [];
	items.forEach(item => {
		let {index, name} = item;

		lines.push(`\tcase ${index}: return &${name}{}\n`);
	});

	let goContent = `package game

import "github.com/golang/protobuf/proto"

func GetProtoMessageByID(id int)proto.Message{
	switch id{
${lines.join('')}
	}

	return nil
}
`;

	fs.writeFileSync(path.resolve(outPath, 'ProtoIDs.go'), goContent);
}

processMap.go = export_go;

process.forEach((p) => {
	let func = processMap[p];
	if (func) {
		console.log('export ' + p);
		func();
	}
});

console.log('compile success.');