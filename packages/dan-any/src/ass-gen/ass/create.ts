import type { UniPool } from '../..'
import type { Context, SubtitleStyle } from '../types'

import { UniPool2DanmakuLists } from '../util'
import event from './event'
import info from './info'
import raw from './raw'
import style from './style'

// eslint-disable-next-line import/no-default-export
export default (
  list: UniPool,
  rawList: UniPool,
  config: SubtitleStyle,
  context: Context = { filename: 'unknown', title: 'unknown' },
) => {
  const Elist = UniPool2DanmakuLists(list),
    ErawList = UniPool2DanmakuLists(rawList)
  const content = [info(config, context), style(config), event(Elist, config)]

  if (config.includeRaw) {
    content.push(raw(ErawList, config, context))
  }

  return `${content.join('\n\n')}\n`
}
