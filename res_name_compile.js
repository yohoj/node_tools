/**
 * Created by rockyl on 16/3/30.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var dir = process.cwd();
console.log(`dir -> ${dir}`);
var projectPath = dir;//'/Users/rockyl/WorkSpaces/h5-game/html5/doudizhu';
var assetsPath = path.join(projectPath, 'resource/assets');
var projectName = path.basename(projectPath);
var resNamesPath = path.join(projectPath, 'src/model/ResNames.ts');

var templateHeader = `class ResNames{\n`;
var templateFooter = `\n}`;

var files = fs.readdirSync(assetsPath);
var lines = [];
files.forEach((fileName)=>{
	if(fileName.match(/sheet.*?json/)){
		var sheet = JSON.parse(fs.readFileSync(path.join(assetsPath, fileName), 'utf-8'));
		for(var key in sheet.frames){
			lines.push(`	static ${key}:string = '${key}';`);
		}
	}
});
var content = templateHeader + lines.join('\n') + templateFooter;
//console.log(content);
fs.writeFileSync(resNamesPath, content, 'utf-8');

console.log(`compile [${projectName}] ResNames success!`);
