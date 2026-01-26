import type { UniDM, UniPool } from '../..'

import { PlatformVideoSource } from '../../utils/platform'

/**
 * 用于过滤直接从B站api获取到的弹幕中去除dmid重复的弹幕
 */
export default function bili_dedupe(that: UniPool): UniPool {
  that.dans.forEach((d) => {
    if (d.platform !== PlatformVideoSource.Bilibili)
      throw new Error('bili-dedupe: 仅支持B站(主站)的弹幕')
    if (!d.extra.bili?.dmid)
      throw new Error('bili-dedupe: 弹幕缺少bili extra dmid字段')
  })
  const map = new Map<bigint, UniDM>()
  that.dans.forEach((d) => map.set(d.extra.bili!.dmid!, d)) // 已由上方的检查保证存在
  that.dans = [...map.values()]
  return that
}
