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
		let projectPath = process.cwd();
		this.modifyTimesPath = path.join(projectPath, 'design/images/sheetModifyTime.json');
		this.inPath = path.join(projectPath, 'design/images');
		this.modifyTimes = {};
		this.allArea = 0;
		this.maxWidth = 0;
		this.maxHeight = 0;
		this.rects = [];
		if (fs.existsSync(this.modifyTimesPath)) {
			this.modifyTimes = require(this.modifyTimesPath);
		} else {
			this.modifyTimes = {};
		}
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
		return new Promise((resolve, reject) => {
			let imgSourceObj = {};
			let filesLength = 0;
			fs.readdir(dir, (err, files) => {
				//只留下后缀名为'_p'的文件夹
				files = files.filter((value) => {
					if (value.indexOf('_p') >= 0) {  //如果要打包
						return this.shouldCombine(path.resolve(this.inPath, value));
					}
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
			self.maxWidth = 0;
			self.maxHeight = 0;
			self.allArea = 0;
			if (key >= imgSourceKey.length) {
				/*for (let name in imgNameObj) {
					let sp  = new MaxRectsBinPack(2048,2048,false);
					imgNameObj[name] = sp.insert2(imgNameObj[name],0);
					console.log('start merge:',name);
					self.mergeImg(imgNameObj[name], name);

				}*/
				self.productPlist(imgNameObj);
				fs.writeFileSync(self.modifyTimesPath, JSON.stringify(self.modifyTimes,2,2), 'utf-8');
				return;
			}
			let pathArr = imgSourceObj[imgSourceKey[key]];
			// console.log(pathArr);
			if (!imgNameObj[imgSourceKey[key]]) {
				imgNameObj[imgSourceKey[key]] = [];
			}
			(function next(index) {
				if (index >= pathArr.length) {
					let space = 1;
					let size = Math.sqrt(self.allArea);
					let textureWidth = Math.max(size, self.maxWidth + space * 2);
					let textureHeight = 2048;
					let sp  = new MaxRectsBinPack(textureWidth,textureHeight,false);
					let name = imgSourceKey[key];
					// console.log('imgNaeobj:',imgNameObj,name)
					imgNameObj[name] = sp.insert2(imgNameObj[name],0);
					console.log('start merge:',name);
					self.mergeImg(imgNameObj[name], name).then(()=>{
						nextObj(key + 1);
					});
					// let pack = new MaxRectsBinPack(textureWidth, textureHeight, false);
					// let result = pack.insert2(rects, mode);
					return;
				}

				let img = pathArr[index];
				if(img.match(/(.*?)png/i)){
					self.getImgSize(img).then((result) => {
						imgNameObj[imgSourceKey[key]].push(result);
						next(index + 1);
					});
				}
				else{
					next(index + 1);
				}
			})(0);
		})(0);
	};

	//获取图片大小
	getImgSize(img) {
		return new Promise((resolve, reject) => {
			getPixels(img, (err, pixels) => {
				if (err) {
					console.log(img + '\n',err);
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
					name:this.nameFormat(img),
					path: img,
					area,
					width: width + space * 2,
					height: height + space * 2,
					sourceW: width,
					sourceH: height,
					offX: 0,
					offY: 0,
					x:0,
					y:0,
				};

				resolve(rect);
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
				.write(self._output + output + '.png', (err)=> {
					if (err) console.log(err);
					else{
						self.zipImage(self._output + output + '.png',resolve);
					}
				});
		});
	};

	//压缩图片
	zipImage(path,resolve){
		// let pngquant = require('node-pngquant-native');

		fs.readFile(path,  (err, buffer) => {
			if (err) throw err;
			let resBuffer = pngquant.compress(buffer, {
				"speed": 1 //1 ~ 11
			});
			fs.writeFile(path, resBuffer, {
				flags: 'wb'
			}, (err)=>{
				resolve();
			});
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
						obj.frames[imgObj.name + '.png'] = {
							frame: `{{${imgObj.x},${imgObj.y}},{${imgObj.sourceW},${imgObj.sourceH}}}`,
							offset: '{0,0}',
							rotated: false,
							sourceColorRect: `{{0,0},{${imgObj.sourceW},${imgObj.sourceH}}}`,
							sourceSize: `{${imgObj.sourceW},${imgObj.sourceH}}`
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

	 foldModified(path) {
		let modifyTime = this.modifyTimes[path];
		let data = fs.statSync(path);

		let mtime = Date.parse(data.mtime) % 100000000;

		this.modifyTimes[path] = mtime;

		return mtime !== modifyTime;
	}

	shouldCombine(path) {
		let modified = false;
		this.everyFold(path,  (fold)=> {
			if (this.foldModified(fold)) {
				modified = true;
			}
		});

		return modified;
	}

	everyFold(parent, callback, includeParent = true) {
		if (includeParent) {
			callback(parent);
		}
		fs.readdirSync(parent).some((item) => {
			if (item.indexOf('.DS_Store') < 0) {
				let filePath = path.join(parent, item);
				let stat = fs.lstatSync(filePath);
				if (stat.isDirectory()) {
					if (callback(filePath)) {
						return true;
					}
					this.everyFold(filePath, callback, false);
				}
			}
		});
	}

}
module.exports = ImgMerge;