// import parse from './parse/bilibili'
import type { Options as UniPoolOptions } from '..'
import type { RawConfig } from './ass/raw'
import type { CanvasCtx, SubtitleStyle } from './types'

import { UniPool } from '..'
import ass from './ass/create'
import { deRaw } from './ass/raw'
import getConfig from './config'
import { DanmakuList2UniPool, layoutDanmaku } from './util'

export { CanvasCtx }

export type Options = {
  filename?: string
  title?: string
  substyle?: Partial<SubtitleStyle>
  raw?: RawConfig
}

/**
 * 使用bilibili弹幕(XMl)生成ASS字幕文件
 * @param {string} danmaku XML弹幕文件内容
 * @param {Options} options 杂项
 * @returns {string} 返回ASS字幕文件内容
 * @description 杂项相关  
`filename`: 还原文件为XML时使用的默认文件名  
`title`: ASS [Script Info] Title 项的值,显示于播放器字幕选择  
`substyle`: ASS字幕样式
 * @example ```ts
import fs from 'fs'
const filename = 'example.xml'
const xmlText = fs.readFileSync(filename, 'utf-8')
const assText = generateASS(xmlText, { filename, title: 'Quick Example' })
fs.writeFileSync(`${filename}.ass`, assText, 'utf-8')
```
 */
export function generateASS(
  danmaku: UniPool,
  options: Options,
  canvasCtx: CanvasCtx,
): string {
  //   const result = parse(text)
  const config = getConfig(options.substyle)
  // const filteredList = filterDanmaku(result.list, config.block)
  // const mergedList = mergeDanmaku(result.list, config.mergeIn)
  const mergedList = danmaku.merge(config.mergeIn)
  const layoutList = layoutDanmaku(mergedList, config, canvasCtx)
  const content = ass(
    layoutList,
    danmaku,
    config,
    {
      filename: options?.filename || 'unknown',
      title: options?.title || 'unknown',
    },
    options.raw,
  )

  return content
}

export function parseAssRawField(
  ass: string,
  options?: UniPoolOptions,
): UniPool {
  const raw = deRaw(ass)
  if (!raw) return UniPool.create()
  else return DanmakuList2UniPool(raw.list, options)
}
