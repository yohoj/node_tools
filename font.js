const gm = require('gm');
const fs = require('fs');
const getPixels = require("get-pixels");
const plist = require('plist');
const crypto = require('crypto');
const pngquant = require('node-pngquant-native');


class Font {
	constructor(source, output) {
		this._source = source;
		this._output = output;
		this.findFiles(this._source).then(
			(files) => {
				this.findFilesCall(files);
			},
			(err) => {
				console.log(err);
			}
		);

	}

	//遍历目录
	findFiles(dir) {
		return new Promise((resolve, reject) => {
			fs.readdir(dir, (err, files) => {
				resolve(files);
			});
		});


	};

	//遍历完成后处理
	findFilesCall(files) {
		let imgNameArr = [];
		// let imgSourceKey = [];
		let self = this;
		/*for (let i in imgSourceObj) {
			imgSourceKey.push(i);
		}*/
		/*(function nextObj(key) {
			if (key >= imgSourceKey.length) {
				for (let name in imgNameObj) {
					// let sp  = new MaxRectsBinPack(2048,2048,true);
					imgNameObj[name].forEach((f,index)=>{

					});
					for(let i=0; i<imgNameObj[name].length; ++i){
						imgNameObj[name][i].x = i * imgNameObj[name][i].width;
					}
					// imgNameObj[name] = sp.insert2(imgNameObj[name],2);
					console.log('start merge:',name);
					console.log(imgNameObj);
					self.mergeImg(imgNameObj[name], name);

				}
				self.productPlist(imgNameObj);
				return;
			}
			let pathArr = imgSourceObj[imgSourceKey[key]];
			// console.log(pathArr);
			if (!imgNameObj[imgSourceKey[key]]) {
				imgNameObj[imgSourceKey[key]] = [];
			}*/
		(function next(index) {
			if (index >= files.length) {
				// let sp  = new MaxRectsBinPack(2048,2048,true);

				for (let i = 0; i < imgNameArr.length; ++i) {
					imgNameArr[i].x = i * imgNameArr[i].width;
				}
				let arr = self._source.split('/');
				let name = arr[arr.length - 2];
				// imgNameObj[name] = sp.insert2(imgNameObj[name],2);
				self.mergeImg(imgNameArr, name);

				self.productPlist(imgNameArr,name);
				self.productLabel(name);
				// nextObj(key + 1);
				return;
			}

			let img = files[index];
			if (img.match(/(.*?)png/i)) {
				self.getImgSize(self._source + img).then((result) => {
					imgNameArr.push(result);
					next(index + 1);
				});
			}
			else {
				next(index + 1);
			}
		})(0);
		// })(0);
	};

	//获取图片大小
	getImgSize(img) {
		let imgObj = {};
		return new Promise((resolve, reject) => {
			getPixels(img, (err, pixels) => {
				if (err) {
					console.log("Bad image path:", img);
					return;
				}
				imgObj = {
					path: img,
					imgName: this.nameFormat(img),
					width: pixels.shape[0],
					height: pixels.shape[1],
					x: 0,
					y: 0,
				};
				resolve(imgObj);
			});
		});
	};

	//名字分割
	nameFormat(path) {
		let index = path.indexOf('_p');
		// let lastIndex = path.slice(0, index).lastIndexOf('/');
		// let firstName = path.slice(0, index).slice(lastIndex + 1);
		let lastName = path.slice(index + 3).replace(/\//g, '_').replace('.png', '');
		return lastName;
	};

	//合图
	mergeImg(imgSourceArr, output) {
		let self = this;
		let gmCall = gm();
		imgSourceArr.forEach(img => {
			let str = (img.x >= 0 ? '+' + img.x : img.x) + (img.y >= 0 ? '+' + img.y : img.y);
			// console.log(img.name,str);
			gmCall = gmCall.in('-page', str).in('-background', 'transparent').in(img.path);
			// console.log(gmCall);
		});
		gmCall.mosaic()
			.write(self._output + output + '.png', (err) => {
				if (err) console.log(err);
				else {
					self.zipImage(self._output + output + '.png');
				}
			});
	};

	//压缩图片
	zipImage(path) {
		// let pngquant = require('node-pngquant-native');

		fs.readFile(path, (err, buffer) => {
			if (err) throw err;
			let resBuffer = pngquant.compress(buffer, {
				"speed": 1 //1 ~ 11
			});
			console.log(path);
			fs.writeFile(path, resBuffer, {
				flags: 'wb'
			}, (err) => {
			});
		});
	}


	//plist文件生成
	productPlist(imgNameArr,name) {
		let self = this;
		self.getImgSize(this._output + name + '.png').then(result => {
			let md5 = this.mdEncode(this._output + name + '.png');
			let obj = {
				frames: {},
				metadata: {
					format: 2,
					realTextureFileName: name + '.png',
					size: `{${result.width},${result.height}}`,
					smartupdate: "$TexturePacker:SmartUpdate:" + md5 + "$",
					textureFileName: name + '.png'
				},
			};
			(function next(index) {
				if (index >= imgNameArr.length) {
					// console.log(obj);
					let plistStr = plist.build(obj);
					fs.writeFile(self._output + name + '.plist', plistStr, {
						flag: 'w'
					}, (err) => {
						if (err) {
							console.error(err);
						}
					});
					return;
				}
				let imgObj = imgNameArr[index];
				obj.frames[imgObj.imgName + '.png'] = {
					frame: `{{${imgObj.x},${imgObj.y}},{${imgObj.width},${imgObj.height}}}`,
					offset: '{0,0}',
					rotated: false,
					sourceColorRect: `{{0,0},{${imgObj.width},${imgObj.height}}}`,
					sourceSize: `{${imgObj.width},${imgObj.height}}`
				};
				next(index + 1);
			})(0);
		});
	}

	//生成 label 文件
	productLabel(name){
		let obj = {__type__:'cc.LabelAtlas'}
		fs.writeFile(this._output + name + '.labelatlas',JSON.stringify(obj,2,2),err=>{
			if(err){
				console.log(err);
			}
		});
	}

	//md5加密
	mdEncode(path) {
		let buffer = fs.readFileSync(path);
		let fsHash = crypto.createHash('md5');
		fsHash.update(buffer);
		let md5 = fsHash.digest('hex');
		return md5;
	}

}

let arr = process.argv.slice(2);
let source = arr[0];
let output = arr[1];
let img = new Font(source, output);