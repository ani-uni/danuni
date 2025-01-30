// export type BlockRule = string | RegExp

import type { UniDM } from '../utils/dm-gen'

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
