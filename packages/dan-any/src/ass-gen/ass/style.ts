import type { SubtitleStyle } from '../types'

import { formatColor, getDecoratingColor, hexColorToRGB } from '../util'

export const style = ({
  fontName,
  fontSize,
  color: configColor,
  outlineColor,
  backColor,
  bold,
  outline,
  shadow,
  opacity,
}: SubtitleStyle) => {
  const fields = [
    'Name',
    'Fontname',
    'Fontsize',
    'PrimaryColour',
    'SecondaryColour',
    'OutlineColour',
    'BackColour',
    'Bold',
    'Italic',
    'Underline',
    'StrikeOut',
    'ScaleX',
    'ScaleY',
    'Spacing',
    'Angle',
    'BorderStyle',
    'Outline',
    'Shadow',
    'Alignment',
    'MarginL',
    'MarginR',
    'MarginV',
    'Encoding',
  ]
  // 默认白底黑框
  const primaryColorValue = formatColor(hexColorToRGB(configColor), opacity)
  // 边框和阴影颜色没给的话算一个出来，不是黑就是白
  const secondaryColor = getDecoratingColor(hexColorToRGB(configColor))
  const outlineColorValue = formatColor(
    outlineColor ? hexColorToRGB(outlineColor) : secondaryColor,
    opacity,
  )
  const backColorValue = formatColor(
    backColor ? hexColorToRGB(backColor) : secondaryColor,
    opacity,
  )
  const colorStyle = `${primaryColorValue},${primaryColorValue},${outlineColorValue},${backColorValue}`

  const boldValue = bold ? '1' : '0'
  const fontStyle = `${boldValue},0,0,0,100,100,0,0,1,${outline},${shadow},7,0,0,0,0`

  const fontDeclaration = (size: number, i: number) =>
    `Style: F${i},${fontName},${size},${colorStyle},${fontStyle}`
  const content = [
    '[V4+ Styles]',
    `Format: ${fields.join(',')}`,
    ...fontSize.map(fontDeclaration),
  ]
  return content.join('\n')
}
