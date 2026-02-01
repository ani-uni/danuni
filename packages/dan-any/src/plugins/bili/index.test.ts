//基于以下注释，根据vitest生成测试用例
import { describe, expect, it } from 'vitest'

import { UniDM, UniPool } from '../..'
import { bili_dedupe, to_bili_deduped } from './dedupe'
import { bili_history_fast_forward } from './history-danmaku-fast-forward'

const xml = `<i>
<chatserver>chat.bilibili.com</chatserver>
<chatid>1156756312</chatid>
<mission>0</mission>
<maxlimit>2947</maxlimit>
<state>0</state>
<real_name>0</real_name>
<source>k-v</source>
<d p="13.213,1,25,16777215,1686314041,3,ff41173d,1335658005672492032">喜欢</d>
<d p="13.213,1,25,16777215,1686590010,0,296b35b5,1337972999512832512">来了 哈哈~~</d>
<d p="13.246,1,25,16777215,1686276875,0,5664cfc4,1335346233459549696">就是</d>
<d p="13.266,1,25,16777215,1686283375,0,c7e6646f,1335400761013670912">什么鬼？</d>
<d p="13.284,1,25,16777215,1686291338,0,38662881,1335517923728804864">哇哦</d>
<d p="13.306,1,25,16777215,1686268410,0,4c01de10,1335275224983600896">试试</d>
<d p="13.331,1,25,16777215,1686948453,3,56a3c5d5,1340979831550069760">不喜欢</d>
<d p="13.374,1,25,16777215,1686300770,3,647fe355,1335546672880933888">不喜欢</d>
<d p="13.376,1,25,16777215,1686297921,0,469d94b8,1335522778300134400">哦豁</d>
<d p="13.419,1,25,8700107,1686268005,0,be402447,1335271828100244224">太酷啦</d>
<d p="13.419,1,25,16777215,1686316828,3,7ffb6619,1335681385016736768">喜欢</d>
<d p="13.459,1,25,16777215,1686299729,0,45834405,1335537942797634048">一般，不好看</d>
<d p="13.462,1,25,16777215,1686302133,0,3cab672c,1335558106620590080">哈哈哈</d>
<d p="13.481,1,25,16777215,1686297342,0,ce67fafd,1335517923728804864">？</d>
<d p="13.499,1,25,16777215,1686301548,3,2848bf1c,1335517923728804864">不喜欢</d>
</i>`

describe('B站弹幕相关', () => {
  const pool = UniPool.fromBiliXML(xml)
  it('B站dmid去重(仅限主站直接获取的弹幕)', () => {
    const ori = pool.dans.length
    expect(ori).toBe(15)
    const n = pool.pipe(to_bili_deduped)
    expect(n.dans.length).toBe(13)
    expect(pool.dans.length).toBe(15)
    pool.pipe(bili_dedupe)
    expect(pool.dans.length).toBe(13)
  })
  describe('B站历史弹幕反向快进算法', () => {
    it('正常测试', () => {
      // Mock一些历史弹幕数据：跨越2024-01-01到2024-01-10
      const mockDans = [
        // 2024-01-01 有弹幕
        UniDM.create({
          SOID: '123@bili',
          content: 'test1',
          progress: 10,
          ctime: new Date('2024-01-01T10:00:00+08:00'),
        }),
        // 2024-01-02 有弹幕
        UniDM.create({
          SOID: '123@bili',
          content: 'test2',
          progress: 20,
          ctime: new Date('2024-01-02T15:30:00+08:00'),
        }),
        // 2024-01-03 无弹幕（跳过）
        // 2024-01-04 有弹幕
        UniDM.create({
          SOID: '123@bili',
          content: 'test3',
          progress: 30,
          ctime: new Date('2024-01-04T08:00:00+08:00'),
        }),
        // 2024-01-05 到 2024-01-09 无弹幕（跳过）
        // 2024-01-10 有弹幕（但这是查询日期，不应该包含在结果中）
        UniDM.create({
          SOID: '123@bili',
          content: 'test4',
          progress: 40,
          ctime: new Date('2024-01-10T12:00:00+08:00'),
        }),
        // 2024-01-11 有弹幕（晚于查询日期，不应该包含）
        UniDM.create({
          SOID: '123@bili',
          content: 'test5',
          progress: 50,
          ctime: new Date('2024-01-11T09:00:00+08:00'),
        }),
      ]

      const pool = new UniPool(mockDans)
      const result = pool.pipe(bili_history_fast_forward('2024-01-10'))

      // 验证结果
      expect(result.earliest).toBe('2024-01-01')
      expect(result.SpecificDate).toBe('2024-01-10')

      // fast-forward 应该包含有弹幕的日期（2024-01-01, 02, 04）
      expect(result.FastForward).toEqual([
        '2024-01-01',
        '2024-01-02',
        '2024-01-04',
      ])

      // skip 应该包含没有弹幕的日期（2024-01-03, 05-09）
      expect(result.skip).toEqual([
        '2024-01-03',
        '2024-01-05',
        '2024-01-06',
        '2024-01-07',
        '2024-01-08',
        '2024-01-09',
      ])
    })
    it('无历史弹幕', () => {
      const mockDans = [
        UniDM.create({
          SOID: '123@bili',
          content: 'test',
          progress: 10,
          ctime: new Date('2024-01-10T12:00:00+08:00'),
        }),
      ]

      const pool = new UniPool(mockDans)
      const result = pool.pipe(bili_history_fast_forward('2024-01-10'))

      expect(result.earliest).toBe(null)
      expect(result.FastForward).toEqual([])
      expect(result.skip).toEqual([])
    })
  })
})
