import { assert, assertType, it } from 'vitest'

import { measureTextWidth } from '../util/layout'

it('canvas measureTextWidth', () => {
  const text = '一段测试文字'
  const width = measureTextWidth('SimHei', 25, false, text)
  assertType<number>(width)
  assert(width >= 25 * text.length)
})
