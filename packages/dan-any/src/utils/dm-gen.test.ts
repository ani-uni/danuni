//基于以下注释，根据vitest生成测试用例
import { describe, expect, it } from 'vitest'
import type { UniDMObj } from './dm-gen'

import { UniDM, UniPool } from '..'

const xml = `<i>
<chatserver>chat.bilibili.com</chatserver>
<chatid>1156756312</chatid>
<mission>0</mission>
<maxlimit>2947</maxlimit>
<state>0</state>
<real_name>0</real_name>
<source>k-v</source>
<d p="13.213,1,25,16777215,1686314041,3,ff41173d,1335658005672492032">喜欢</d>
<d p="13.331,1,25,16777215,1686948453,3,56a3c5d5,1340979831550069760">不喜欢</d>
<d p="13.374,1,25,16777215,1686300770,3,647fe355,1335546672880933888">不喜欢</d>
<d p="13.499,1,25,16777215,1686301548,3,2848bf1c,1335553202649003264">不喜欢</d>
</i>`

describe('其它', () => {
  const pool = UniPool.fromBiliXML(xml)
  it('比较(常规)', () => {
    // 确保测试用例为预期值
    expect(pool.dans[0].content).toBe('喜欢')
    expect(pool.dans[1].content).toBe('不喜欢')
    // 正式测试
    const a = pool.dans[0].isSameAs(pool.dans[1]),
      b = pool.dans[1].isSameAs(pool.dans[2]),
      c = pool.dans[1].isSameAs(pool.dans[3])
    console.log(a, b, c)
    expect(a).toBe(false)
    expect(b).toBe(true)
    expect(c).toBe(true)
  })
  it('比较(extra)', () => {
    const commonSample = {
      FCID: 'test@du',
      content: 'T Sample',
      extra: {
        danuni: {
          merge: {
            count: 1,
            duration: 0,
            senders: ['test@du'],
          },
        },
      },
    } satisfies Partial<UniDMObj>
    const pool2 = [
      UniDM.create({ ...commonSample, extra: undefined }),
      UniDM.create({ ...commonSample, extra: {} }),
      UniDM.create({ ...commonSample, extra: { danuni: {} } }),
      UniDM.create({ ...commonSample }),
      UniDM.create({ ...commonSample, extra: { artplayer: { border: true } } }),
    ]
    for (const pool of pool2) {
      console.log(pool.extraStr)
      console.log(pool2[0].isSameAs(pool))
    }
    expect(pool2[0].isSameAs(pool2[1])).toBe(true)
    expect(pool2[0].isSameAs(pool2[2])).toBe(true)
    expect(pool2[0].isSameAs(pool2[3])).toBe(true)
    expect(pool2[0].isSameAs(pool2[4])).toBe(false)
  })
})
