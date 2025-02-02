//基于以下注释，根据vitest生成测试用例
import { describe, it } from 'vitest'

import { UniPool } from './index'

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
<d p="13.284,1,25,16777215,1686291338,0,38662881,1335467554877267456">哇哦</d>
<d p="13.306,1,25,16777215,1686268410,0,4c01de10,1335275224983600896">试试</d>
<d p="13.331,1,25,16777215,1686948453,3,56a3c5d5,1340979831550069760">不喜欢</d>
<d p="13.374,1,25,16777215,1686300770,3,647fe355,1335546672880933888">不喜欢</d>
<d p="13.376,1,25,16777215,1686297921,0,469d94b8,1335522778300134400">哦豁</d>
<d p="13.419,1,25,8700107,1686268005,0,be402447,1335271828100244224">太酷啦</d>
<d p="13.419,1,25,16777215,1686316828,3,7ffb6619,1335681385016736768">喜欢</d>
<d p="13.459,1,25,16777215,1686299729,0,45834405,1335537942797634048">一般，不好看</d>
<d p="13.462,1,25,16777215,1686302133,0,3cab672c,1335558106620590080">哈哈哈</d>
<d p="13.481,1,25,16777215,1686297342,0,ce67fafd,1335517923728804864">？</d>
<d p="13.499,1,25,16777215,1686301548,3,2848bf1c,1335553202649003264">不喜欢</d>
</i>`
describe('转化自', () => {
  it('bili(xml)', () => {
    const pool = UniPool.fromBiliXML(xml)
    console.info(xml)
    console.info(pool)
  })
  it('bili(json)', () => {
    const json = [
        {
          text: '', // 弹幕文本
          time: 10, // 弹幕时间, 默认为当前播放器时间
          mode: 0, // 弹幕模式: 0: 滚动(默认)，1: 顶部，2: 底部
          color: '#FFFFFF', // 弹幕颜色，默认为白色
          border: false, // 弹幕是否有描边, 默认为 false
          style: { border: '10rem' }, // 弹幕自定义样式, 默认为空对象
        },
      ],
      pool = UniPool.fromArtplayer(json, 'playerid-test', 'acfun')
    console.info(json)
    console.info(pool)
  })
  it('ass(双向)', () => {
    const pool = UniPool.fromBiliXML(xml)
    const ass = pool.toASS()
    console.info(ass)
    console.info(UniPool.fromASS(ass))
  })
})

describe('共通值', () => {
  const pool = UniPool.fromBiliXML(xml)
  it('获取shared', () => {
    console.info(pool.shared)
  })
  it('按pool分组', () => {
    console.info(pool.split('pool'))
  })
})

describe('其它', () => {
  const pool = UniPool.fromBiliXML(xml)
  it('最小化', () => {
    console.info(pool.minify())
  })
  it('合并范围内重复', () => {
    console.info(pool.merge(10).minify())
  })
})
