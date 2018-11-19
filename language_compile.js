/**
 * Created by rockyl on 16/3/30.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var dir = process.cwd();
console.log(`dir -> ${dir}`);
var projectPath = dir;
var langPath = path.join(projectPath, 'resource/configs/lang.json');
var libsPath = path.join(projectPath, 'src/model/LanguagePack.ts');
var lang = JSON.parse(fs.readFileSync(langPath, 'utf-8'));

var typeMap = {
	object: 'any',
	number: 'number',
	string: 'string',
	array: 'any[]',
};
var templateHeader = `class LanguagePack{\n`;
var templateFooter = `\n}`;
var templateIdsHeader = `class LanguageIds{\n`;
var templateIdsFooter = `\n}`;

function enumObject(obj){
	var lines = [], idsLines = [];
	for(var key in obj){
		var attribute = obj[key];
		var type = attribute instanceof Array ? 'array' : typeof attribute;
		var typeString = typeMap[type];
		lines.push(`	${key}:${typeString};`);
		idsLines.push(`	${key}:string = '${key}';`);
	}
	var contentPack = templateHeader + lines.join('\n') + templateFooter;
	var contentIds = templateIdsHeader + idsLines.join('\n') + templateIdsFooter;

	var content = contentPack + '\n' + contentIds;
	fs.writeFileSync(libsPath, content, 'utf-8');
}
enumObject(lang);
var projectName = path.basename(projectPath);
console.log(`compile [${projectName}] lang.json success!`);