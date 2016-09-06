又一个轮子<br>
这是一个tampermonkey脚本，需要[安装tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo "Chrome网上应用商店")后使用。

##优点
使用了115原版的UI，看起来更美观（嗯，就是这样)
##缺点
使用了115的几个内置对象,如果115修改代码,将会导致功能不可用<br>
分分钟弃坑

#Changelog
####1.0.0
[release 1.0.0](https://github.com/luoweihua7/tampermonkey.115downloader/releases/tag/1.0.0)
####0.9.0
显示添加Aria2任务的进度
####0.8.0
收拢了序列请求的方法到API.sequence方法中
####0.7.0
添加目录上的功能按钮,也可以一键复制和Aria2下载了
####0.6.0
支持多选,支持目录<br>
多选数量控制<br>
注:目录选择后点击菜单栏的下载,会遍历目录下的所有文件
####0.5.0
暂时取消RSS下载源模式,保留复制和Aria2下载模式
####0.4.0
群晖需要登录,懒得处理,修改为RSS下载源模式
####0.3.0
按钮支持开关配置,可按需显示所需的功能按钮
####0.2.0
添加Aria2的rpc地址配置功能
####0.1.0
完成复制下载链接地址功能(Chrome 52已测试)<br>
完成添加下载任务到Aria2功能(Chrome 52已测试)

#TODO
- [ ] Aria2参数可配置(rpc地址已支持，扩展参数后续支持)
- [x] 支持目录
- [x] 支持多选
- [ ] 完成Chrome和Firefox到适配（已弃Firefox,所以可能不会去处理）`优先级低`
