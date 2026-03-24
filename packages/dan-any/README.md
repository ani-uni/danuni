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
- `src/plugins`下的插件 `bili`(B站弹幕相关) `stats`(统计相关)，内部附有使用文档

## 转换提示

使用该库可以不失去任何关键信息地导入常见格式的弹幕，并已附加字段的形式保留部分弹幕格式专有的信息；但将弹幕转换为第三方格式时，由于其设计上无法封装附加信息，会导致不可避免的信息损失。  
如果需要以最为可靠的方式传送弹幕，请尽量使用 `danuni.json` / `danuni.binpb` 进行导出分发。  

由于设计上想尽可能多地保留原始信息，将弹幕转换为第三方格式的弹幕时，可能在非常用字段上与官方格式不完全相同，若有极强的兼容性需求，请手动开启对应转换函数的兼容性选项。  

*致开发者： 若导入后检测到 `UniPool.info.fromConverted` 为true ，建议提示用户不要再对该弹幕文件再次进行转换，否则可能导致解析错误*  

## 特殊字段提示

### ASS Raw 字段

为便于由ASS格式还原，由本工具生成的ASS弹幕格式中，包含以下字段：`RawCompressType` `RawBaseType` `Raw`  
根据其内容可以还原原始转换数据。
同时本工具兼容了`justorez/biliy`[^1]生成的ASS，并支持了其暂未实现的还原功能。  

## TODO

- [ ] 完善弹幕降级显示功能(使高级弹幕有损转换为普通弹幕)
- [ ] 完善使用文档
- [ ] 支持chpt弹幕转换为Artplayer章节(artplayer-plugin-chapter)
- [ ] 使用zod重写类型系统

## Awesome Projects

- [HengXin666/BiLiBiLi_DanMu_Crawling](https://github.com/HengXin666/BiLiBiLi_DanMu_Crawling)

## License 许可证

Released under the GNU LESSER GENERAL PUBLIC LICENSE (LGPL) 3.0.  
本库采用 LGPL 3.0 or later 许可证发布。  

[^1]: 对于`src/ass-gen`内的文件，使用了[justorez/biliy](https://github.com/justorez/biliy)的代码(MIT LICENSE)，并使用了AI进行修改与修复，同时支持了更优的Raw还原功能。  
