# dan-any-plugin-detaolu 弹幕随心转(反套路插件)

[![Publish @dan-uni/dan-any-plugin-detaolu](https://github.com/ani-uni/danuni/actions/workflows/npm-dan-any-plugin-detaolu.yml/badge.svg)](https://github.com/ani-uni/danuni/actions/workflows/npm-dan-any-plugin-detaolu.yml)

## Features

基于 pakku.js[^1] 核心功能制作的弹幕过滤器，使用参数及全部功能可参见其仓库。  

## Usage 使用方法

```ts
import { UniPool } from "@dan-uni/dan-any";
import detaolu from "@dan-uni/dan-any-plugin-detaolu";

const pool = UniPool.create();
const d = (await pool.pipe(detaolu({ MAX_COSINE: 1000 }))).minify();
console.log(d);
```

## License 许可证

Released under the GNU GENERAL PUBLIC LICENSE (GPL) 3.0.  
本库采用 GPL 3.0 or later 许可证发布。  

[^1]: 对于`src/pakku.js`内的文件，使用了[xmcp/pakku.js](https://github.com/xmcp/pakku.js)的代码(GPL-3.0 LICENSE)，并对其进行了一定修改使其可在该项目下使用。  
