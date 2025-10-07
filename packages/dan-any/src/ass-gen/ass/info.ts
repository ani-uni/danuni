import type { Context } from '../types'

import pkg from '../../../package.json' with { type: 'json' }

type ExtraInfo = Context

type Resolution = {
  playResX: number
  playResY: number
}

export const info = (
  { playResX, playResY }: Resolution,
  { filename, title }: ExtraInfo,
) => {
  const content = [
    '[Script Info]',
    `Title: ${title}`,
    `Original Script: 根据 ${filename} 的弹幕信息，由 ${pkg.homepage} 生成`,
    'ScriptType: v4.00+',
    'Collisions: Reverse',
    `PlayResX: ${playResX}`,
    `PlayResY: ${playResY}`,
    'Timer: 100.0000',
  ]
  return content.join('\n')
}
