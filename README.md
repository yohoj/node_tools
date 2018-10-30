windows node 版本6.8.1
mac node版本支持8.11.1
## 图片合成工具
首先要安装GraphicsMagick或者ImageMagick
mac安装如下
```
brew install imagemagick
brew install graphicsmagick
```
windows安装graphicsmagick[下载地址](http://www.graphicsmagick.org/INSTALL-windows.html)

主要用来合成cocos creator所需要的plist文件用法
```
node imgMerge.js sourceDir outputDir
```
sourceDir(图片目录) 结构如下：
```
design/
├── h_p
│   ├── btn
│   │   ├── button1.png
│   │   ├── button2.png
│   │   ├── gou.png
│   │   ├── login.png
│   │   ├── shadow.png
│   │   ├── tips.png
│   │   └── user-agreement.png
│   ├── dice
│   │   ├── 2.png
│   └── loding
│       ├── 0.png
│       └── 1.png
├── jfdk
│   ├── btn
│   │   ├── button1.png
│   │   ├── button2.png
│   ├── dice
│   │   ├── 10.png
│   │   ├── 11.png
│   │   ├── 12.png
│   └── loding
│       ├── 0.png
│       └── 1.png
└── login_p
    ├── btn
    │   ├── button1.png
    │   ├── button2.png
    ├── dice
    │   ├── 10.png
    │   ├── 11.png
    └── loding
        ├── 0.png
        └── 1.png
```
只有文件夹后缀为'_p'的才会合成图片

## 图片压缩批处理
```$xslt
node zipImage.js sourceFile
```
## 帧动画合成
```$xslt
node movieClip.js sourceFile targetFile
```
在执行该命令前先将sourceFile目录下的图片合成plist图集，<br>
soruceFile名字应该与plist图集名字一致并且在creator中打开生成.meta文件,<br>
其中sourceFile目录下应该包含一个config.json内容如下
```$xslt
{
	"__type__": "cc.AnimationClip",
	"_name": "boyDefault",
	"_objFlags": 0,
	"_rawFiles": null,
	"_duration": 0.5833333333333334,
	"sample": 12,
	"speed": 1,
	"wrapMode": 2,
	"curveData": {
		"comps": {
			"cc.Sprite": {
				"spriteFrame":[]
			}
		}
	},
	"events": [],
	"meta":"battle_other_animation"
}
```
## BMFont合成
```$xslt
node BMFont.js sourceFile targetFile
```
图片名称就是字的名称 '.'例外用中文'点'来表示
## excel导出工具
```$xslt
node excel.js source.excels targetFile
```
在design/excels/目录下有一个config.js代码如下
```$xslt
 const config = {
	'kuns': {//excel文件名称
		'key': 'id',//主要
		'names': ['id', 'order','level', 'weight'],//表头
		'array':true,//是否是数组
		'method': function (data) { //js代码可以对表进行自定义操作
			for (let i in data) {
      				// data[i].forEach()
      				let obj = {id:i,levels:[]};
      				data[i].forEach(p=>{
      					delete p['id'];
      				});
      				obj.levels = data[i];
      				data[i] = obj;
      				// console.log(i,data[i]);
      			}
		}
	}
}

module.exports = config;
```

