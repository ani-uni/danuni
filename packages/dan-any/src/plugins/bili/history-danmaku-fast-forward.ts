/**
 * 注：该方法受BiliPlus全弹幕下载器启发
 * 详情参考以下链接
 * @see https://github.com/HengXin666/BiLiBiLi_DanMu_Crawling/issues/14
 */

import { DateTime } from 'luxon'
import type { UniPool } from '../..'

interface BiliHistoryDanmakuFastForwardResult {
  earliest: string | null
  FastForward: string[]
  skip: string[]
  SpecificDate: string
}

/**
 * 针对B站历史弹幕使用时间逆序+快进以确定完成获取/下一次获取位置的算法
 *
 * 传入值是一个包含历史弹幕的UniPool，来自对任意一天(UTC+8, yyyy-MM-dd)的历史弹幕api
 */
function main(
  that: UniPool,
  query_history_date: string,
): BiliHistoryDanmakuFastForwardResult {
  const qhd = DateTime.fromFormat(query_history_date, 'yyyy-MM-dd', {
    zone: 'Asia/Shanghai',
  }).setZone('Asia/Shanghai')
  if (!qhd.isValid) throw new Error('Invalid query_history_date')
  const s = qhd.startOf('day')
  const before = that.dans.filter((d) => d.ctime < s.toJSDate())

  if (before.length === 0) {
    return {
      earliest: null,
      FastForward: [],
      skip: [],
      SpecificDate: qhd.toFormat('yyyy-MM-dd'),
    }
  }

  // 获取最早的日期（字符串格式）
  const earliestCtime = before.toSorted(
    (a, b) => a.ctime.getTime() - b.ctime.getTime(),
  )[0].ctime
  const earliestDate = DateTime.fromJSDate(earliestCtime)
    .setZone('Asia/Shanghai')
    .startOf('day')

  // 提取有弹幕的日期集合
  const datesWithDanmaku = new Set<string>()
  for (const dan of before) {
    const dateStr = DateTime.fromJSDate(dan.ctime)
      .setZone('Asia/Shanghai')
      .toFormat('yyyy-MM-dd')
    datesWithDanmaku.add(dateStr)
  }

  // 计算earliest到query_history_date之间的所有日期
  let current = earliestDate
  const allDates: string[] = []
  while (current < s) {
    allDates.push(current.toFormat('yyyy-MM-dd'))
    current = current.plus({ days: 1 })
  }

  // 区分fast-forward和skip
  const FastForward = allDates.filter((d) => datesWithDanmaku.has(d))
  const skip = allDates.filter((d) => !datesWithDanmaku.has(d))

  return {
    earliest: earliestDate.toFormat('yyyy-MM-dd'),
    FastForward,
    skip,
    SpecificDate: qhd.toFormat('yyyy-MM-dd'),
  }
}

export function bili_history_fast_forward(
  /**
   * 请求api时使用的日期(UTC+8, yyyy-MM-dd)
   */
  query_history_date: string,
) {
  return (that: UniPool) => main(that, query_history_date)
}
