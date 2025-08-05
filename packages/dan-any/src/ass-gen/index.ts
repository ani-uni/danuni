// import parse from './parse/bilibili'
import type { RawConfig } from './ass/raw'
import type { SubtitleStyle } from './types'

import { UniPool } from '..'
import ass from './ass/create'
import { deRaw } from './ass/raw'
import getConfig from './config'
import { DanmakuList2UniPool, layoutDanmaku } from './util'

export type Options = {
  filename?: string
  title?: string
  substyle?: Partial<SubtitleStyle>
  raw?: RawConfig
}

/**
 * 请根据您的使用环境提供一个 50x50 的 2D Canvas 上下文
 * @example
 * // Node.js + canvas
 * import { createCanvas } from 'canvas'
 * const canvas = createCanvas(50, 50)
 * const ctx = canvas.getContext('2d')
 * @example
 * // Node.js + Fabric.js
 * import { StaticCanvas } from 'fabric/node'
 * const ctx = new StaticCanvas(null, { width: 50, height: 50 }).getContext()
 * @example
 * // Browser + Native Canvas
 * const canvas = document.createElement('canvas')
 * canvas.width = 50
 * canvas.height = 50
 * const ctx = canvas.getContext('2d')
 * @example
 * // Browser + Fabric.js
 * import { Canvas } from 'fabric'
 * const ctx = new Canvas('canvas', { width: 50, height: 50 }).getContext()
 */
export type CanvasCtx = CanvasRenderingContext2D

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

export function parseAssRawField(ass: string): UniPool {
  const raw = deRaw(ass)
  if (!raw) return UniPool.create()
  else return DanmakuList2UniPool(raw.list)
}
