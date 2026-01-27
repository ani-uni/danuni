import type { UniDM, UniPool } from '../..'

/**
 * 从弹幕池中查找出最新的一条弹幕
 * 按照弹幕的创建时间(ctime)排序，返回最新的一条
 */
export default function getLatestDan(that: UniPool): UniDM | null {
  return that.dans.length === 0
    ? null
    : that.dans.reduce((latest, current) =>
        current.ctime > latest.ctime ? current : latest,
      )
}
