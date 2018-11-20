const gm = require('gm');
const fs = require('fs');
const path = require('path');
const getPixels = require("get-pixels");
const plist = require('plist');
const crypto = require('crypto');
const MaxRectsBinPack = require('./MaxRectsBinPack');
const os = require('os');
const pngquant = require('node-pngquant-native');



class ImgMergeForEgret {
    constructor(source, output) {
        this._source = source;
        this._output = output + '/sheet_';
        let projectPath = process.cwd();
        this.modifyTimesPath = path.join(projectPath, 'design/images/sheetModifyTime.json');
        this.inPath = path.join(projectPath, 'design/images');
        this.resJsonPath = path.join(projectPath, 'resource/default.res.json');
        this.resConfig = JSON.parse(fs.readFileSync(this.resJsonPath, 'utf-8'));
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
            (imgSourceObj) => {
                this.findFilesCall(imgSourceObj);
            },
            (err) => {
                console.log(err);
            }
        );

    }

    //resConfig
    save() {
        let templateHeader = `class ResNames{\n`;
        let templateFooter = `\n}`;
        let projectPath = process.cwd();
        let resNamesPath = path.join(projectPath, 'src/model/ResNames.ts');
        let lines = [];
        //提取所有keys
        this.resConfig.resources.forEach((resource) => {
            lines.push(`	static ${resource.name}:string = '${resource.name}';`);
        });

        //提取所有subkeys
        this.resConfig.resources.filter((item) => {
            return item.name.indexOf('sheet_') >= 0;
        }).forEach(item => {
            item.subkeys.split(',').forEach(key => {
                lines.push(`	static ${key}:string = '${key}';`);
            });
        });
        let content = templateHeader + lines.join('\n') + templateFooter;

        fs.writeFileSync(resNamesPath, content, 'utf-8');

        fs.writeFileSync(this.resJsonPath, JSON.stringify(this.resConfig, null, '\t'), 'utf-8');

        fs.writeFileSync(this.modifyTimesPath, JSON.stringify(this.modifyTimes, 2, 2), 'utf-8');

        console.log('export successfully.');
    }
    //遍历目录
    findFiles(dir) {
        return new Promise((resolve, reject) => {
            let imgSourceObj = {};
            let filesLength = 0;
            fs.readdir(dir, (err, files) => {
                //只留下后缀名为'_p'的文件夹
                files = files.filter((value) => {
                    if (value.indexOf('_p') >= 0) { //如果要打包
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


    }

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
                            self.travel(pathname, callback, () => {
                                next(i + 1);
                            });
                        } else {
                            callback(pathname, () => {
                                next(i + 1);
                            });
                        }
                    });
                } else {
                    if (finish) finish();
                }
            }(0));
        });
    }

    //遍历完成后处理
    findFilesCall(imgSourceObj) {
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
                self.productJson(imgNameObj);
                self.save();
                // fs.writeFileSync(self.modifyTimesPath, JSON.stringify(self.modifyTimes, 2, 2), 'utf-8');
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
                    let sp = new MaxRectsBinPack(textureWidth, textureHeight, false);
                    let name = imgSourceKey[key];
                    // console.log('imgNaeobj:',imgNameObj,name)
                    imgNameObj[name] = sp.insert2(imgNameObj[name], 0);
                    console.log('start merge:', name);
                    self.mergeImg(imgNameObj[name], name).then(() => {
                        nextObj(key + 1);
                    });
                    // let pack = new MaxRectsBinPack(textureWidth, textureHeight, false);
                    // let result = pack.insert2(rects, mode);
                    return;
                }

                let img = pathArr[index];
                if (img.match(/(.*?)png/i)) {
                    self.getImgSize(img).then((result) => {
                        imgNameObj[imgSourceKey[key]].push(result);
                        next(index + 1);
                    });
                } else {
                    next(index + 1);
                }
            })(0);
        })(0);
    }

    //获取图片大小
    getImgSize(img) {
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
                    name: this.nameFormat(img),
                    path: img,
                    area,
                    width: width + space * 2,
                    height: height + space * 2,
                    sourceW: width,
                    sourceH: height,
                    offX: 0,
                    offY: 0,
                    x: 0,
                    y: 0,
                };

                resolve(rect);
            });
        });
    }


    //名字分割
    nameFormat(path) {
        let index = path.indexOf('_p');
        // let lastIndex = path.slice(0, index).lastIndexOf('/');
        // let firstName = path.slice(0, index).slice(lastIndex + 1);
        let lastName = path.slice(index + 3).replace(/\//g, '_').replace('.png', '');
        return lastName;
    }

    //合图
    mergeImg(imgSourceArr, output) {
        return new Promise((resolve, reject) => {
            let self = this;
            let gmCall = gm();
            imgSourceArr.forEach(img => {
                let str = (img.x >= 0 ? '+' + img.x : img.x) + (img.y >= 0 ? '+' + img.y : img.y);
                // console.log(img.name,str);
                gmCall = gmCall.in('-page', str).in('-background', 'transparent').in(img.path); //
                // console.log(gmCall);
            });
            gmCall.mosaic()
                .write(self._output + output + '.png', (err) => {
                    if (err) console.log(err);
                    else {
                        if ((self._output + output).indexOf('_c') < 0) {
                            self.zipImage(self._output + output + '.png', resolve);
                        } else {
                            resolve();
                        }
                    }
                });
        });
    }

    //压缩图片
    zipImage(path, resolve) {
        // let pngquant = require('node-pngquant-native');
        fs.readFile(path, (err, buffer) => {
            if (err) throw err;
            let resBuffer = pngquant.compress(buffer, {
                "speed": 1 //1 ~ 11
            });
            fs.writeFile(path, resBuffer, {
                flags: 'wb'
            }, (err) => {
                resolve();
            });
        });
    }



    productJson(imgNameObj) {
        let self = this;
        for (let i in imgNameObj) {
            let flag = this.resConfig.resources.some(item=>{
                if(item.name == 'sheet_' + i){
                    item.subkeys = '';
                    imgNameObj[i].forEach(img=>{
                        item.subkeys += i + '_' + img.name + ','
                    });
                    item.subkeys = item.subkeys.substring(0,item.subkeys.length-1);
                    return true;
                };
            })
            if(!flag){
                let item = {url:'assets/sheets/' + 'sheet_'+i + '.json',type:'sheet',name:'sheet_'+i,subkeys:''};
                imgNameObj[i].forEach(img=>{
                    item.subkeys += i + '_' + img.name + ','
                });
                item.subkeys = item.subkeys.substring(0,item.subkeys.length-1);
                this.resConfig.resources.push(item);
            }
            self.getImgSize(this._output + i + '.png').then((result) => {
                let obj = {
                    file: 'sheet_' + i + '.png',
                    frames: {},
                };
                (function next(index) {
                    if (index >= imgNameObj[i].length) {
                        fs.writeFile(self._output + i + '.json', JSON.stringify(obj, 2, 2), {
                            flag: 'w'
                        }, (err) => {
                            if (err) {
                                console.error(err);
                            }
                        });
                        return;
                    }
                    let imgObj = imgNameObj[i][index];
                    //{"x":2,"y":723,"w":85,"h":107,"offX":10,"offY":19,"sourceW":110,"sourceH":161}
                    obj.frames[`${i}_${imgObj.name}`] = {
                        x: imgObj.x,
                        y: imgObj.y,
                        w: imgObj.sourceW,
                        h: imgObj.sourceH,
                        offX: 0,
                        offY: 0,
                        sourceW: imgObj.sourceW,
                        sourceH: imgObj.sourceH,
                    };
                    next(index + 1);
                })(0);
            });
        }
    }

    //md5加密
    mdEncode(path) {
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
        this.everyFold(path, (fold) => {
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

function main(argvs) {
    let source = argvs[0];
    let output = argvs[1];
    if (!source) {
        source = process.cwd() + '/design/images/';
        output = process.cwd() + '/resource/assets/sheets';
    }
    let img = new ImgMergeForEgret(source, output);

}
main(process.argv.slice(2));
