/**
 * Created by yh on 2018/9/3.
 * BMFont 字体制作
 */
const gm = require('gm');
const fs = require('fs');
const path = require('path');
const getPixels = require("get-pixels");
const crypto = require('crypto');
const pngquant = require('node-pngquant-native');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;
let imgArr = [];
let imgX = 0;
let nowCount = 0;
function readDir(path) {
	console.log(path);
	let arr = path.indexOf('/') >= 0 ? path.split('/') : path.split('\\');
	let outputName = arr[arr.length-2];
	fs.readdir(path, (err, files) => {
		// console.log('files:',files);
		let count = 0;
		nowCount = 0;
		files.forEach(file=>{
			if(file.indexOf('.png') > 0){
				count++;
			}
		})
		files.forEach((file,index) => {
			readCall(path,file,count,outputName);
		})
	})
}

function  readCall (path,file,count,outputName) {
	if (file.indexOf('.png') >= 0) {
		let name = file.slice(0,-4);
		getImgSize(path +file).then(rect => {
			let obj = rect;
			if(name == 'dian'){
				name = '.';
			}
			obj.name = name
			obj.x = imgX;
			imgX += obj.width;
			imgArr.push(obj);
			nowCount++;
			if(nowCount == count){
				mergeImg(imgArr,path+'output\\'+outputName + '.png');
				writeFnt(imgArr,path + 'output\\'+ outputName + '.fnt',outputName+'.png')
			}
		});
	}
	else if(nowCount == count){
		mergeImg(imgArr,path+'output\\'+outputName + '.png');
		writeFnt(imgArr,path + 'output\\'+ outputName + '.fnt',outputName+'.png')
	}
}


//获取图片大小
function getImgSize(img) {
	return new Promise((resolve, reject) => {
		getPixels(img, (err, pixels) => {
			if (err) {
				console.log(img + '\n', err);
				return;
			}
			let width = pixels.shape[0];
			let height = pixels.shape[1];
			let area = width * height;
			this.maxWidth = Math.max(this.maxWidth, width);
			this.maxHeight = Math.max(this.maxHeight, height);
			this.allArea += area;
			let space = 1;
			let rect = {
				path: img,
				width: width,
				height: height,
				xadvance: width,
				x: 0,
				y: 0,
			};

			resolve(rect);
		});
	});
}

//合图
function mergeImg(imgSourceArr, output) {
	// console.log(imgSourceArr);
	return new Promise((resolve, reject) => {
		let self = this;
		let gmCall = gm();
		imgSourceArr.forEach(img => {
			let str = (img.x >= 0 ? '+' + img.x : img.x) + (img.y >= 0 ? '+' + img.y : img.y);
			// console.log(img.name,str);
			gmCall = gmCall.in('-page', str).in('-background', 'transparent').in(img.path);//
			// console.log(gmCall);
		});
		gmCall.mosaic()
			.write(output, (err) => {
        console.log('output',output);
				if (err) console.error(err);
				else {
					zipImage(output, resolve);
				}
			});
	});
}

//压缩图片
function zipImage(path,resolve){
	// let pngquant = require('node-pngquant-native');
	fs.readFile(path,  (err, buffer) => {
		if (err) throw err;
		let resBuffer = pngquant.compress(buffer, {
			"speed": 1 //1 ~ 11
		});
		writeFile(path, resBuffer, {
			flags: 'wb'
		}, (err)=>{
			resolve();
		});
	});
}


function writeFnt(imgArr,outputPath,imgName) {
  console.log(imgName);
  let obj = {file:imgName,frames:{}};
  // 6":{"x":75,"y":0,"w":27,"h":29,"offX":2,"offY":2,"sourceW":31,"sourceH":33},
	let scaleW = 0;
	let scaleH = 0;
	let str = '';
	imgArr.forEach(img=>{
    obj.frames[img.name] = {x:img.x,y:img.y,w:img.width,h:img.height,offX:0,offY:0,sourceW:img.width,sourceH:img.height};
  });
	writeFile(outputPath, JSON.stringify(obj));

}

function writeFile(path, contents, config,cb) {
  console.log(path);
	mkdirp(getDirName(path), function (err) {
		if (err) return cb(err);

		fs.writeFile(path, contents, config,cb);
	});
}


function deleteall(path) {
	var files = [];
	if(fs.existsSync(path)) {
		files = fs.readdirSync(path);
		files.forEach(function(file, index) {
			var curPath = path + "/" + file;
			if(fs.statSync(curPath).isDirectory()) { // recurse
				deleteall(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};

function main(path) {
	deleteall(path[0]+'output')
	readDir(path[0]);
}

main(process.argv.slice(2));
 