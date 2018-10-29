图像合成工具
node 版本6.8.1
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

