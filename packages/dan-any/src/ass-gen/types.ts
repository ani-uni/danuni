// export type BlockRule = string | RegExp
import type { CanvasRenderingContext2D as NodeCRCtx2D } from 'canvas'
import type { UniDM } from '../utils/dm-gen'

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
export type CanvasCtx = NodeCRCtx2D | CanvasRenderingContext2D

export interface Context {
  filename: string
  title: string
}

export interface SubtitleStyle {
  fontSize: number[]
  fontName: string
  color: string
  outlineColor?: string
  backColor?: string
  outline: number
  shadow: number
  bold: boolean
  padding: number[]
  playResX: number
  playResY: number
  scrollTime: number
  fixTime: number
  opacity: number
  bottomSpace: number
  // block: BlockRule[]
  includeRaw: boolean
  mergeIn: number
}

export type RGB = { r: number; g: number; b: number }

export const DanmakuType = {
  SCROLL: 1,
  BOTTOM: 2,
  TOP: 3,
}

export const FontSize = {
  SMALL: 0,
  NORMAL: 1,
  LARGE: 2,
}

export type Danmaku = {
  time: number
  type: number
  fontSizeType: number
  color: RGB
  content: string
  extra: UniDM
}
