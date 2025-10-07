import type { UniPool } from '../..'
import type { Context, SubtitleStyle } from '../types'
import type { RawConfig } from './raw'

import { UniPool2DanmakuLists } from '../util'
import { event } from './event'
import { info } from './info'
import { raw } from './raw'
import { style } from './style'

const default_context = { filename: 'unknown', title: 'unknown' }

export const ass = (
  list: UniPool,
  rawList: UniPool,
  config: SubtitleStyle,
  context: Context = default_context,
  rawConfig?: RawConfig,
) => {
  const Elist = UniPool2DanmakuLists(list)
  const ErawList = UniPool2DanmakuLists(rawList)
  const content = [info(config, context), style(config), event(Elist, config)]

  if (config.includeRaw) {
    content.push(
      raw(
        ErawList,
        config,
        context,
        rawConfig?.compressType,
        rawConfig?.baseType,
      ),
    )
  }

  return `${content.join('\n\n')}\n`
}
