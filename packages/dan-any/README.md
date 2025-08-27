# Dan-Any 弹幕随心转

[![Publish @dan-uni/dan-any](https://github.com/ani-uni/danuni/actions/workflows/npm-dan-any.yml/badge.svg)](https://github.com/ani-uni/danuni/actions/workflows/npm-dan-any.yml)

## Features

- 多种弹幕格式之间互相转换
- 对多平台弹幕进行统一格式化
- 获取一组弹幕中的共通值
- 对弹幕按一定key值进行分组
- 合并较短时间内出现的重复弹幕
- 管道式插件系统

## Formats 支持转换的格式

`pb`指`protobuf`格式(grpc协议下的默认传输格式)

- [x] DanUni(json,pb)
- [x] bili(普通+高级弹幕,xml) `双向`
- [x] bili(普通+高级弹幕,pb) `正向`
- [x] bili(指令弹幕,pb) `正向`
- [x] dplayer
- [x] artplayer
- [x] 弹弹Play
- [x] ASS `双向(部分支持，见下)`

## Plguins 插件

插件的使用方法参见对应路径下README.md  

- [dan-any-plugin-detaolu](https://github.com/ani-uni/danuni/tree/master/packages/dan-any-plugin-detaolu): 基于pakku.js的弹幕过滤器

## 特殊字段提示

### ASS Raw 字段

为便于由ASS格式还原，由本工具生成的ASS弹幕格式中，包含以下字段：`RawCompressType` `RawBaseType` `Raw`  
根据其内容可以还原原始转换数据。
同时本工具兼容了`justorez/biliy`[^1]生成的ASS，并支持了其暂未实现的还原功能。  

## TODO

- [ ] 完善弹幕降级显示功能(使高级弹幕有损转换为普通弹幕)
- [ ] 完善使用文档
- [ ] 支持chpt弹幕转换为Artplayer章节(artplayer-plugin-chapter)

## Awesome Projects

- [HengXin666/BiLiBiLi_DanMu_Crawling](https://github.com/HengXin666/BiLiBiLi_DanMu_Crawling)

## License 许可证

Released under the GNU LESSER GENERAL PUBLIC LICENSE (LGPL) 3.0.  
本库采用 LGPL 3.0 or later 许可证发布。  

[^1]: 对于`src/ass-gen`内的文件，使用了[justorez/biliy](https://github.com/justorez/biliy)的代码(MIT LICENSE)，并使用了AI进行修改与修复，同时支持了更优的Raw还原功能。  
