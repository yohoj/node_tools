/**
 * Created by user on 2018/10/31.
 */
const fs = require('fs');
const plist = require('plist');
const getPixels = require("get-pixels");
const crypto = require('crypto');

const main = (argvs)=>{
	readFile(argvs[0]);
};

const readFile = (path)=>{
	fs.readFile(path + '.json',{flag:'r'},(err,data)=>{
		if(data){
			data = JSON.parse(data);
			productPlist(data,path);
		}
	});
};

//获取图片大小
const getImgSize= (img) => {
	return new Promise((resolve, reject) => {
		getPixels(img, (err, pixels) => {
			if (err) {
				console.log(img + '\n', err);
				return;
			}
			let width = pixels.shape[0];
			let height = pixels.shape[1];
			let area = width * height;
			let space = 1;
			let rect = {
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

//md5加密
const mdEncode =(path)=> {
	let buffer = fs.readFileSync(path);
	let fsHash = crypto.createHash('md5');
	fsHash.update(path);
	let md5 = fsHash.digest('hex');
	return md5;
}

const productPlist = (json,path)=> {
	let arr = path.split('\\');
	let pangName = arr[arr.length-1];
	getImgSize(path + '.png').then((result) => {
		let md5 = mdEncode(path + '.png');
		let obj = {
			frames: {},
			metadata: {
				format: 2,
				realTextureFileName: pangName + '.png',
				size: `{${result.width},${result.height}}`,
				smartupdate: "$TexturePacker:SmartUpdate:" + md5 + "$",
				textureFileName: pangName + '.png'
			},
		};
		for(let i in json.frames){
			let imgObj= json.frames[i];
			obj.frames[i] =  {
				frame: `{{${imgObj.x},${imgObj.y}},{${imgObj.w},${imgObj.h}}}`,
				offset: `{${imgObj.offX},${imgObj.offY}}`,
				rotated: false,
				sourceColorRect: `{{${(imgObj.sourceW-imgObj.w)/2+imgObj.offX},${(imgObj.sourceH-imgObj.h)/2-imgObj.offY}},{${imgObj.w},${imgObj.h}}}`,
				sourceSize: `{${imgObj.sourceW},${imgObj.sourceH}}`
			};
		}
		let plistStr = plist.build(obj);
		fs.writeFile(path+ '.plist', plistStr, {
			flag: 'w'
		}, (err) => {
			if (err) {
				console.error(err);
			}
		});
	});
}

main(process.argv.slice(2));
 
 