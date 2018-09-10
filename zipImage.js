/**
 * Created by yh on 2018/9/1.
 */
const fs = require('fs');
const path = require('path');
const pngquant = require('node-pngquant-native');
//压缩图片
function zipImage(path){
	// let pngquant = require('node-pngquant-native');
	return new Promise(((resolve, reject) => {
		fs.readFile(path,  (err, buffer) => {
			if (err) {
				console.log('err:',path);
				reject();
				return;
			}
			let resBuffer = pngquant.compress(buffer, {
				"speed": 1 //1 ~ 11
			});
			fs.writeFile(path, resBuffer, {
				flags: 'wb'
			}, (err)=>{
				console.log('write:',path);
				if(err){
					console.log('err:',path);
					reject();
					return;
				}
				resolve();
			});
		});
	}));
}

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
						travel(pathname, callback, ()=> {
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
	})
}


function main(argvs){
	let dir = argvs[0];
	let imgSource = [];
	travel(dir, (pathname, callback) => {
		let temp = pathname.slice(-4);
		// console.log(temp);
		if(temp == '.png'){
			imgSource.push(pathname);
		}
		if (callback) callback();
	}, () => {
		zipImages(imgSource);
		console.log('finish',imgSource);
	});
}

async function zipImages(imgSource){
	for(let i=0; i<imgSource.length; ++i){
		await zipImage(imgSource[i],)
	}
}

main(process.argv.slice(2));


 
 