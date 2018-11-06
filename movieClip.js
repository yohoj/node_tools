/**
 * Created by yh on 2018/8/6.
 * 帧动画制作
 */
let fs = require('fs');


//获取配置文件
function readConfig(target){
	return new Promise(((resolve, reject) => {
		fs.readFile(target,(err,data)=>{
			if(err){
				reject(err);
				return;
			}
			resolve(data);
		});
	}));

}

function readdir(path) {
	return new Promise((resolve,reject)=>{
		let arr = path.split('/');
		let nameFront = arr[arr.length-1];
		if(nameFront.slice(-2) == '_p'){
			nameFront = '';
		}
		console.log('nameFront',nameFront)
		fs.readdir(path,{flag:'r'},(err,data)=>{
			let imgNames = [];
			let jsonPath =  path + '/' +data.filter((name)=>{return name.match(/(.*?)json/i)})[0];
			console.log(jsonPath);
			data = data.filter((name)=>{return name.match(/(.*?)png$/i)});
			data = data.sort((a,b)=>{
				let a1 = a.split('.')[0];
				let b1 = b.split('.')[0];
				return a1 - b1;
			});
			for(let i=0; i<data.length; ++i){
				let name = data[i];
				// if(name.match(/(.*?)png$/i)){
				if(nameFront){
					imgNames.push(nameFront + '_' + name);
				}
				else{
					imgNames.push(name);
				}
				// }
				// if(name.match(/(.*?)json/i)){
				// 	jsonPath = path + '/' + name;
				// }
			}
			// console.log(imgNames);
			// fs.close()
			resolve({imgNames,jsonPath})

		});
	});
}

function readMeta(path){
	// console.log('meta path:',path);
	return new Promise(((resolve, reject) => {
		fs.readFile(path,'utf8',(err,data)=>{
			if(err){
				reject(err);
				return;
			}
			// console.log('metadata:',data);
			resolve(data);
		});
	}));
}

function findUuid(metaObj,name) {
	console.log('name:',name)
	// console.log('name:',name,'metaObj',metaObj);
	for(let i in metaObj){
		// console.log(i,name);
		if(i == name){
			return metaObj[i].uuid;
		}
	}
}

function main(argvs){
	let source = argvs[0];
	let metaPath = argvs[1];
	console.log(argvs);
	readdir(source).then(({imgNames,jsonPath})=>{
		// console.log(jsonPath);
		readConfig(jsonPath).then(data=>{
			let configObj = JSON.parse(data);
			configObj._duration = imgNames.length/configObj.sample;
			let spriteFrame = configObj['curveData']['comps']['cc.Sprite'].spriteFrame = [];
			let metaName = configObj.meta + '.plist.meta';
			delete configObj['meta'];
			readMeta(metaPath + metaName).then(metaConfig => {
				let metaObj = JSON.parse(metaConfig).subMetas;
				for(let i=0; i<imgNames.length; ++i){
					let ani = {
						frame: i/configObj.sample,
						value: {
							__uuid__: findUuid(metaObj,imgNames[i])
						}}
					spriteFrame.push(ani);
				}
				let arr =source.indexOf('/') >= 0 ? source.split('/') : source.split('\\');
				fs.writeFile(source + '/'+arr[arr.length-1] + '.anim',JSON.stringify(configObj,2,2),(err)=>{
					if(err){
						console.log('write err:',err);
					}
				});
			});
			// console.log(spriteFrame);
			// console.log(JSON.stringify(configObj,2s,2));
		}).catch(err=>{
			if(err){
				console.log('readConfig err:',err);
			}
		});
	});
}
main(process.argv.slice(2));




 
 