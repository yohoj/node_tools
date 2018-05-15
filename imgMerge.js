// import {gm} from 'gm';
const gm = require('gm');
const fs = require('fs');
const path = require('path');
const getPixels = require("get-pixels");
const plist = require('plist');
const MaxRectsBinPack = require('./MaxRectsBinPack');

class ImgMerge {
  constructor(source, output) {
    this._source = source;
    this._output = output;
    this.findFiles(this._source, this.findFilesCall.bind(this));
  }
  findFiles(dir, callback) {
    let imgSourceObj = {};
    let filesLength = 0;
    fs.readdir(dir, (err, files) => {
      // console.log(files.splice(-2,2));
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
            callback(imgSourceObj);
          }
        });
      });

    });
  };
  //遍历目录回调
  findFilesCall (imgSourceObj){
    let imgNameObj = {};
    let imgSourecKey = [];
    let self = this;
    for (let i in imgSourceObj) {
      imgSourecKey.push(i);
    }
    (function nextObj(key) {
      if (key >= imgSourecKey.length) {
        // console.log('imgName', imgNameObj);
        for (let name in imgNameObj) {
          // let sp = new sprite(1024, 1024, imgNameObj[name]);
          let sp  = new MaxRectsBinPack(1024,1024,true);
          // console.log(imgNameObj[name]);
          imgNameObj[name] = sp.insert2(imgNameObj[name],2);
          // console.log(name, sp);
          self.mergeImg(imgNameObj[name], name);
          
        }
        self.productPlist(imgNameObj);
        return;
      }
      let pathArr = imgSourceObj[imgSourecKey[key]];
      if (!imgNameObj[imgSourecKey[key]]) {
        imgNameObj[imgSourecKey[key]] = [];
      }
      (function next(index) {
        if (index >= pathArr.length) {
          nextObj(key + 1);
          return;
        }

        let img = pathArr[index];
        // console.log('img:',img);

        self.getImgSize(img).then((result) => {
          imgNameObj[imgSourecKey[key]].push(result);
          next(index + 1);
        });
      })(0);
    })(0);
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
  //获取图片大小
  getImgSize(img) {
    let imgObj = {};
    return new Promise((resolve, reject) => {
      getPixels(img, (err, pixels) => {
        if (err) {
          console.log("Bad image path");
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
    gmCall.mosaic('-background', '')
      .write(self._output + output + '.png', function (err) {
        if (err) console.log(err);
      });
  };

  //plist文件生成
  productPlist(imgNameObj) {
    let self = this;
    for (let i in imgNameObj) {
      self.getImgSize(this._output + i + '.png').then(result=>{
        let obj = {
          frames: {},
          metadata: {
            format: 2,
            realTextureFileName: i + '.png',
            size: `{${result.width},${result.height}}`,
            smartupdate: "$TexturePacker:SmartUpdate:5e2e67727aa316242e75a1f0a11cb4ac$",
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

}
module.exports = ImgMerge;