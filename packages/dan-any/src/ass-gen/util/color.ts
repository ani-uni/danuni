import type { RGB } from '../types'

const pad = (s: string) => (s.length < 2 ? `0${s}` : s)
const decimalToHex = (n: number) => pad(n.toString(16))

/**
 * 本函数实现复制自 [us-danmaku](https://github.com/tiansh/us-danmaku) 项目
 */
const isDarkColor = ({ r, g, b }: RGB) =>
  r * 0.299 + g * 0.587 + b * 0.114 < 0x30

const WHITE = { r: 255, g: 255, b: 255 }
const BLACK = { r: 0, g: 0, b: 0 }

export const hexColorToRGB = (hex: string) => {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1)
  }

  const [r, g, b] =
    hex.length === 3 ? hex.split('').map((c) => c + c) : hex.match(/../g) || []

  return {
    r: Number.parseInt(r, 16),
    g: Number.parseInt(g, 16),
    b: Number.parseInt(b, 16),
  }
}

export const decimalColorToRGB = (decimal: number) => {
  const div = (i: number, j: number) => Math.floor(i / j)

  return {
    r: div(decimal, 256 * 256),
    g: div(decimal, 256) % 256,
    b: decimal % 256,
  }
}

export const formatColor = ({ r, g, b }: RGB, opacity?: number) => {
  const color = [b, g, r]

  if (opacity !== undefined) {
    const alpha = Math.round((1 - opacity) * 255)
    color.unshift(alpha)
  }

  return `&H${color.map(decimalToHex).join('').toUpperCase()}`
}

export const getDecoratingColor = (color: RGB) =>
  isDarkColor(color) ? WHITE : BLACK

export const isWhite = (color: RGB) =>
  color.r === 255 && color.g === 255 && color.b === 255
