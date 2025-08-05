import { createCanvas } from 'canvas'
import { assertType, it } from 'vitest'

import { measureTextWidthConstructor } from '../util/layout'

it('canvas measureTextWidth', () => {
  const text = '一段测试文字'
  const canvas = createCanvas(50, 50)
  const width = measureTextWidthConstructor(
    canvas.getContext('2d') as unknown as CanvasRenderingContext2D,
  )('SimHei', 25, false, text)
  assertType<number>(width)
  console.info(width, text.length)
  // assert(width >= 25 * text.length)
})
