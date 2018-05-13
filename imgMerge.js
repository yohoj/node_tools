// import {gm} from 'gm';
const gm = require('gm');
const fs = require('fs');
const path = require('path');
const getPixels = require("get-pixels");
const plist = require('plist');

function main(argvs) {
  console.log(argvs);
  let source = argvs[0];
  let output = argvs[1];
  findFiles(source, findFilesCall);
}

//遍历目录回调
function findFilesCall(imgSourceObj) {
  let imgNameObj = {};
  let imgSourecKey = [];
  for (let i in imgSourceObj) {
    imgSourecKey.push(i);
  }
  (function nextObj(key) {
    if (key >= imgSourecKey.length) {
      // console.log('imgName', imgNameObj);
      for (let name in imgNameObj) {
        let sp = new sprite(1024, 1024, imgNameObj[name]);
        // console.log(name, sp);
        mergeImg(imgNameObj[name], name);
      }
      productPlist(imgNameObj);
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

      getImgSize(img).then((result) => {
        imgNameObj[imgSourecKey[key]].push(result);
        next(index + 1);
      });
    })(0);
  })(0);

}


//获取图片大小
function getImgSize(img) {
  let imgObj = {};

  return new Promise((resolve, reject) => {
    getPixels(img, (err, pixels) => {
      if (err) {
        console.log("Bad image path");
        return;
      }
      imgObj = {
        path: img,
        name: nameFormat(img),
        w: pixels.shape[0],
        h: pixels.shape[1]
      };
      resolve(imgObj);
    });
  });
}

//名字分割
function nameFormat(path) {
  let index = path.indexOf('_p');
  let lastIndex = path.slice(0, index).lastIndexOf('/');
  let firstName = path.slice(0, index).slice(lastIndex + 1);
  let lastName = path.slice(index + 3).replace(/\//g, '_').replace('.png', '');
  return firstName + '_' + lastName;
}

//合图
function mergeImg(imgSourceArr, output) {
  let gmCall = gm();
  imgSourceArr.forEach(img => {
    let str = (img.x >= 0 ? '+' + img.x : img.x) + (img.y >= 0 ? '+' + img.y : img.y);
    // console.log(img.name,str);
    gmCall = gmCall.in('-page', str).in('-background', 'transparent').in(img.path);
    // console.log(gmCall);
  });
  gmCall.mosaic('-background', '')
    .write(output + '.png', function (err) {
      if (err) console.log(err);
    });
}

function findFiles(dir, callback) {
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
      travel(dir + value, (pathname, callback) => {
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
}
//遍历目录
function travel(dir, callback, finish) {

  fs.readdir(dir, (err, files) => {
    (function next(i) {
      files = files.filter((value) => {
        return value != '.DS_Store';
      });
      if (i < files.length) {

        var pathname = path.join(dir, files[i]);

        fs.stat(pathname, (err, stats) => {
          if (stats.isDirectory()) {
            travel(pathname, callback, function () {
              next(i + 1);
            });
          } else {
            callback(pathname, function () {
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

//2d矩形排列算法
function sprite(w, h, boxes) {
  this.root = {
    x: 0,
    y: 0,
    w: w,
    h: h
  }; //初始化二叉树根节点
  this.init(boxes);
}

sprite.prototype = {
  init: function (boxes) {
    var i;
    for (i = 0; i < boxes.length; i++) {
      var block = boxes[i];
      var node = this.travel(this.root, block.w, block.h); //利用递归从根节点开始遍历二叉树,判断节点大小是否足够
      //console.log(node)
      if (node) { //如果节点大小足够
        this.markAndCutNode(node, block.w, block.h); //给节点做标记，并拆分成右侧与下测
        block.fit = true; //给小盒子做标记，并记录位置信息
        block.x = node.x;
        block.y = node.y;
      }
    }
  },
  //遍历二叉树
  travel: function (root, w, h) {
    if (root.filled) //已经放入盒子了，继续遍历子节点
      return this.travel(root.right, w, h) || this.travel(root.down, w, h); //遍历右边与下边
    else if ((w <= root.w) && (h <= root.h)) { //节点足够大,返回节点
      return root;
    } else {
      return null;
    }
  },
  //标记并拆分节点
  markAndCutNode: function (node, w, h) {
    node.filled = true; //标记节点为装入盒子状态
    node.down = {
      x: node.x,
      y: node.y + h,
      w: node.w,
      h: node.h - h
    }; //标记下侧出来
    node.right = {
      x: node.x + w,
      y: node.y,
      w: node.w - w,
      h: h
    }; //标记右侧出来
  }

};

//plist文件生成
function productPlist(imgNameObj) {
  for (let i in imgNameObj) {
    let obj = {
      frames: {},
      metadata:{
        format: 2,
        realTextureFileName: i + '.png',
        size: "{1024,1024}",
        smartupdate: "$TexturePacker:SmartUpdate:5e2e67727aa316242e75a1f0a11cb4ac$",
        textureFileName:i + '.png'
      },
    };
    (function next(index) {
      if (index >= imgNameObj[i].length) {
        // console.log(obj);
        let plistStr = plist.build(obj);
        fs.writeFile(i + '.plist', plistStr, {
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
        frame: `{{${imgObj.x},${imgObj.y}},{${imgObj.w},${imgObj.h}}}`,
        offset: '{0,0}',
        rotated: false,
        sourceColorRect: `{{0,0},{${imgObj.w},${imgObj.h}}}`,
        sourceSize: `{${imgObj.w},${imgObj.h}}`
      };
      next(index + 1);
    })(0);
  }


  // JSON.stringify
  // var json = [
  //   {
  //     "frames":{
  //       "bundle-identifier": "com.company.app",
  //       "bundle-version": "0.1.1",
  //       "kind": "software",
  //       "title": "AppName"
  //     },
  //     "metadata":{
  //       "format": "2",
  //       "realTextureFileName": "0.1.1",
  //       "size": "{1024,1024}",
  //       "smartupdate": "$TexturePacker:SmartUpdate:5e2e67727aa316242e75a1f0a11cb4ac$",
  //       "textureFileName":textureName
  //     }
  //   }

  // ];

  // <?xml version="1.0" encoding="UTF-8"?>
  // <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  // <plist version="1.0">
  //   <key>metadata</key>
  //   <dict>
  //     <key>bundle-identifier</key>
  //     <string>com.company.app</string>
  //     <key>bundle-version</key>
  //     <string>0.1.1</string>
  //     <key>kind</key>
  //     <string>software</string>
  //     <key>title</key>
  //     <string>AppName</string>
  //   </dict>
  // </plist>
}

main(process.argv.slice(2));
