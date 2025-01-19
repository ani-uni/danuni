# Dan-Any 弹幕随心转

[![Publish @dan-uni/dan-any](https://github.com/ani-uni/danuni/actions/workflows/npm-dan-any.yml/badge.svg)](https://github.com/ani-uni/danuni/actions/workflows/npm-dan-any.yml)

## Features

- 多种弹幕格式之间互相转换
- 对多平台弹幕进行统一格式化

## Formats 支持转换的格式

`pb`指`protobuf`格式(grpc协议下的默认传输格式)

- [x] DanUni(json,pb)
- [x] bili(普通+高级弹幕,xml) `正向`
- [x] bili(普通+高级弹幕,pb) `正向`
- [x] bili(指令弹幕,pb) `正向`
- [x] dplayer
- [x] artplayer
- [x] 弹弹Play

## TODO

- [ ] ASS格式转换
- [ ] 反向转换bili弹幕格式

## License 许可证

Released under the GNU LESSER GENERAL PUBLIC LICENSE (LGPL) 3.0.  
本库采用 LGPL 3.0 许可证发布。  
