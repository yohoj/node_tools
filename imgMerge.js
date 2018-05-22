const gm = require('gm');
const fs = require('fs');
const path = require('path');
const getPixels = require("get-pixels");
const plist = require('plist');
const crypto = require('crypto');
const MaxRectsBinPack = require('./MaxRectsBinPack');
const pngquant = require('node-pngquant-native');


class ImgMerge {
	constructor(source, output) {
		this._source = source;
		this._output = output;
		this.findFiles(this._source).then(
			(imgSourceObj)=>{
				this.findFilesCall(imgSourceObj);
			},
			(err)=>{
				console.log(err);
			}
		);

	}
	//遍历目录
	findFiles(dir) {
		console.log('dir:',dir);
		return new Promise((resolve, reject) => {
			let imgSourceObj = {};
			let filesLength = 0;
			fs.readdir(dir, (err, files) => {
				//只留下后缀名为'_p'的文件夹
				files = files.filter((value) => {
					return value.slice(-2) == '_p';
				});
				files.forEach((value) => {
					let name = value.slice(0, -2);
					if (!imgSourceObj[name]) {
						imgSourceObj[name] = [];
					}
					this.travel(dir + value, (pathname, callback) => {
						imgSourceObj[name].push(pathname);
						if (callback) callback();
					}, () => {
						filesLength++;
						if (filesLength >= files.length) {
							resolve(imgSourceObj);
						}
					});
				});

			});
		});


	};
	travel(dir, callback, finish) {
		let self = this;
		fs.readdir(dir, (err, files) => {
			(function next(i) {
				files = files.filter((value) => {
					return value != '.DS_Store';
				});
				if (i < files.length) {

					var pathname = path.join(dir, files[i]);

					fs.stat(pathname, (err, stats) => {
						if (stats.isDirectory()) {
							self.travel(pathname, callback, ()=> {
								next(i + 1);
							});
						} else {
							callback(pathname, ()=> {
								next(i + 1);
							});
						}
					});
				} else {
					if (finish) finish();
				}
			}(0));
		});
	};
	//遍历完成后处理
	findFilesCall (imgSourceObj){
		let imgNameObj = {};
		let imgSourceKey = [];
		let self = this;
		for (let i in imgSourceObj) {
			imgSourceKey.push(i);
		}
		(function nextObj(key) {
			if (key >= imgSourceKey.length) {
				for (let name in imgNameObj) {
					let sp  = new MaxRectsBinPack(2048,2048,true);
					imgNameObj[name] = sp.insert2(imgNameObj[name],2);
					console.log('start merge:',name);
					self.mergeImg(imgNameObj[name], name);

				}
				self.productPlist(imgNameObj);
				return;
			}
			let pathArr = imgSourceObj[imgSourceKey[key]];
			if (!imgNameObj[imgSourceKey[key]]) {
				imgNameObj[imgSourceKey[key]] = [];
			}
			(function next(index) {
				if (index >= pathArr.length) {
					nextObj(key + 1);
					return;
				}

				let img = pathArr[index];
				// console.log('img:',img);

				self.getImgSize(img).then((result) => {
					imgNameObj[imgSourceKey[key]].push(result);
					next(index + 1);
				});
			})(0);
		})(0);
	};

	//获取图片大小
	getImgSize(img) {
		let imgObj = {};
		return new Promise((resolve, reject) => {
			getPixels(img, (err, pixels) => {
				if (err) {
					console.log("Bad image path:",img);
					return;
				}
				imgObj = {
					path: img,
					imgName: this.nameFormat(img),
					width: pixels.shape[0],
					height: pixels.shape[1],
					x:0,
					y:0,
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
			.write(self._output + output + '.png', (err)=> {
				if (err) console.log(err);
				else{
					self.zipImage(self._output + output + '.png');
				}
			});
	};

	//压缩图片
	zipImage(path){
		// let pngquant = require('node-pngquant-native');

		fs.readFile(path,  (err, buffer) => {
			if (err) throw err;
			let resBuffer = pngquant.compress(buffer, {
				"speed": 1 //1 ~ 11
			});
			fs.writeFile(path, resBuffer, {
				flags: 'wb'
			}, (err)=>{});
		});
	}


	//plist文件生成
	productPlist(imgNameObj) {
		let self = this;
		for (let i in imgNameObj) {
			self.getImgSize(this._output + i + '.png').then(result=>{
					let md5 = this.mdEncode(this._output + i + '.png');
					let obj = {
						frames: {},
						metadata: {
							format: 2,
							realTextureFileName: i + '.png',
							size: `{${result.width},${result.height}}`,
							smartupdate: "$TexturePacker:SmartUpdate:"+md5 + "$",
							textureFileName: i + '.png'
						},
					};
					(function next(index) {
						if (index >= imgNameObj[i].length) {
							// console.log(obj);
							let plistStr = plist.build(obj);
							fs.writeFile(self._output + i + '.plist', plistStr, {
								flag: 'w'
							}, (err) => {
								if (err) {
									console.error(err);
								}
							});
							return;
						}
						let imgObj = imgNameObj[i][index];
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
	}

	//md5加密
	mdEncode(path){
		let buffer = fs.readFileSync(path);
		let fsHash = crypto.createHash('md5');
		fsHash.update(buffer);
		let md5 = fsHash.digest('hex');
		return md5;
	}

}
module.exports = ImgMerge;