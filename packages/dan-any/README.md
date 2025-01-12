# Dan-Any 弹幕随心转

## Features

- 多种弹幕格式之间互相转换
- 对多平台弹幕进行同一格式化

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

- [ ] 弹幕过滤
- [ ] ASS格式转换
- [ ] 反向转换bili弹幕格式