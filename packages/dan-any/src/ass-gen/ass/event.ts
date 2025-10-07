import type { Danmaku, SubtitleStyle } from '../types'

import { DanmakuType } from '../types'
import { dialogue } from './dialogue'

const calculateDanmakuPosition = (danmaku: Danmaku, config: SubtitleStyle) => {
  const { playResX, playResY, scrollTime, fixTime } = config

  switch (danmaku.type) {
    case DanmakuType.SCROLL: {
      const start = playResX
      const end = -playResX / 10 // Some extra space for complete exit
      const top = (danmaku.fontSizeType * playResY) / 20
      return {
        ...danmaku,
        start,
        end,
        top,
        left: 0,
        duration: scrollTime,
      }
    }
    case DanmakuType.TOP:
    case DanmakuType.BOTTOM: {
      const left = playResX / 2
      const top =
        danmaku.type === DanmakuType.TOP
          ? (danmaku.fontSizeType * playResY) / 20
          : playResY -
            config.bottomSpace -
            (danmaku.fontSizeType * playResY) / 20
      return {
        ...danmaku,
        start: 0,
        end: 0,
        top,
        left,
        duration: fixTime,
      }
    }
    default:
      throw new Error(`Unknown danmaku type: ${danmaku.type}`)
  }
}

export const event = (list: Danmaku[], config: SubtitleStyle) => {
  const content = [
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...list.map((danmaku) => {
      const positionedDanmaku = calculateDanmakuPosition(danmaku, config)
      return dialogue(positionedDanmaku, config)
    }),
  ]

  return content.join('\n')
}
