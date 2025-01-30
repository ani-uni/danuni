import type { Danmaku, RGB } from '../types'

import { UniPool } from '../..'
import { Modes } from '../../utils/dm-gen'
import { DanmakuType } from '../types'

function decimalToRGB888(decimal: number): RGB {
  const r = (decimal >> 16) & 0xff
  const g = (decimal >> 8) & 0xff
  const b = decimal & 0xff
  return {
    r,
    g,
    b,
  } satisfies RGB
}

export function UniPool2DanmakuLists(UP: UniPool): Danmaku[] {
  const dans = UP.dans
  let type = DanmakuType.SCROLL
  return dans.map((d) => {
    if (d.mode === Modes.Bottom) type = DanmakuType.BOTTOM
    else if (d.mode === Modes.Top) type = DanmakuType.TOP
    return {
      time: d.progress,
      type,
      fontSizeType: d.fontsize,
      content: d.content,
      color: decimalToRGB888(d.color),
      extra: d,
    } satisfies Danmaku
  })
}
export function DanmakuList2UniPool(d: Danmaku[]): UniPool {
  return new UniPool(d.map((d) => d.extra))
}
