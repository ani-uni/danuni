import type { SubtitleStyle } from './types'

import { assign, formatColor, hexColorToRGB } from './util'

// const builtinRules = {
//     COLOR: true,
//     TOP: true,
//     BOTTOM: true
// }

// const convertBlockRule = (rule: string) =>
//     builtinRules[rule] ? rule : new RegExp(rule)

export const getConfig = (overrides = {}): SubtitleStyle => {
  const defaults = {
    fontSize: [25, 25, 36],
    fontName: 'SimHei',
    color: '#ffffff',
    outlineColor: undefined,
    backColor: undefined,
    outline: 2,
    shadow: 0,
    bold: false,
    padding: [2, 2, 2, 2],
    playResX: 1920,
    playResY: 1080,
    scrollTime: 8,
    fixTime: 4,
    opacity: 0.6,
    bottomSpace: 60,
    includeRaw: true,
    mergeIn: -1,
    // block: [],
  }

  const config = assign(defaults, overrides)
  config.color = formatColor(hexColorToRGB(config.color))
  config.outlineColor =
    config.outlineColor && formatColor(hexColorToRGB(config.outlineColor))
  config.backColor =
    config.backColor && formatColor(hexColorToRGB(config.backColor))
  // config.block = uniqueArray(config.block).map(convertBlockRule)

  return config
}
