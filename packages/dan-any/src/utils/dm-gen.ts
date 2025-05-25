import TimeFormat from 'hh-mm-ss'
import type { DM_JSON_BiliCommandGrpc } from '..'
import type { PlatformDanmakuSource } from './platform'

import { createDMID, UniID as ID } from './id-gen'
import {
  PlatformDanmakuOnlySource,
  PlatformDanmakuSources,
  PlatformVideoSource,
} from './platform'

const BigIntSerializer = (k: string, v: any) =>
  typeof v === 'bigint' ? v.toString() : v

function cleanEmptyObjects(obj: object): object {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj
  }
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const cleanedValue = cleanEmptyObjects(value)
    if (
      cleanedValue !== undefined &&
      !(
        typeof cleanedValue === 'object' &&
        Object.keys(cleanedValue).length === 0
      )
    ) {
      cleaned[key] = cleanedValue
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : {}
}

class SetBin {
  constructor(public bin: number) {}
  set1(bit: number) {
    this.bin |= 1 << bit
  }
  set0(bit: number) {
    this.bin &= ~(1 << bit)
  }
}
const toBits = (number: number) => {
  // 低速方案
  // return [...number.toString(2)].map(Number)
  // 高速方案，位运算允许范围内更快
  const bits: boolean[] = []
  do {
    bits.unshift(!!(number & 1)) // boolean[]
    // bits.unshift(number & 1) // (0|1)[]
    number >>= 1
  } while (number)
  return bits
}

export type DMAttr =
  | 'Protect'
  | 'FromLive'
  | 'HighLike'
  | 'Compatible' // 由dan-any进行过兼容处理的弹幕，可能丢失部分信息
  | 'Reported' // 在DanUni上被多人举报过的弹幕
  | 'Unchecked' // 在DanUni上未被审核过的弹幕
  | 'Hide' // 由于其它原因需要隐藏的弹幕(建议在server端不返回该类弹幕)
const DMAttrUtils = {
  fromBin(bin: number = 0, format?: PlatformDanmakuSource) {
    const array = toBits(bin),
      attr: DMAttr[] = []
    if (format === 'bili') {
      if (array[0]) attr.push('Protect')
      if (array[1]) attr.push('FromLive')
      if (array[2]) attr.push('HighLike')
    }
    return attr
  },
  toBin(
    attr: DMAttr[] = [],
    /**
     * 对于二进制格式的读取，应该分别读取各位，
     * 但由于不知道B站及其它使用该参数程序的读取逻辑，
     * 所以单独提供 bili 格式
     */
    format?: PlatformDanmakuSource,
  ) {
    const bin = new SetBin(0)
    if (format === 'bili') {
      if (attr.includes('Protect')) bin.set1(0)
      if (attr.includes('FromLive')) bin.set1(1)
      if (attr.includes('HighLike')) bin.set1(2)
    }
    return bin.bin
  },
}
// class DMAttr {
//   constructor(
//     /**
//      * 保护
//      */
//     public protect: boolean = false,
//     /**
//      * 直播
//      */
//     public live: boolean = false,
//     /**
//      * 高赞
//      */
//     public highpraise: boolean = false,
//   ) {}
//   toBin(
//     /**
//      * 对于二进制格式的读取，应该分别读取各位，
//      * 但由于不知道B站及其它使用该参数程序的读取逻辑，
//      * 所以单独提供 bili 格式
//      */
//     format?: platfrom,
//   ) {
//     const bin = new SetBin(0)
//     if (this.protect) bin.set1(0)
//     if (this.live) bin.set1(1)
//     if (this.highpraise) bin.set1(2)
//     if (format === 'bili') return bin.bin
//     return bin.bin
//   }
//   static fromBin(bin: number = 0, format?: platfrom) {
//     const array = toBits(bin)
//     if (format === 'bili') {
//       return new DMAttr(array[0], array[1], array[2])
//     } else {
//       return new DMAttr(array[0], array[1], array[2])
//     }
//   }
// }

interface DMBili {
  id: bigint // xml 7
  progress: number // xml 0
  mode: number // xml 1
  fontsize: number // xml 2
  color: number // xml 3
  midHash: string // xml 6
  /**
   * 特殊类型解析：
   * - [ohh] : /oh{2,}/gi
   * - [前方高能]
   * - [...] (JS数组) : 高级弹幕
   */
  content: string // xml content
  ctime: bigint // xml 4
  pool: number // xml 5
  weight?: number // xml 8
  action?: string
  idStr?: string
  attr?: number
  animation?: string
  extra?: string
  colorful?: number
  type?: number
  oid?: bigint
}
interface DMBiliCommand extends DM_JSON_BiliCommandGrpc {}
interface DMDplayer {
  /**
   * 进度(秒)
   */
  progress: number
  mode: number
  color: number
  midHash: string
  content: string
}
interface DMArtplayer {
  /**
   * 进度(秒)
   */
  progress: number
  mode: number
  color: number
  content: string
  border?: boolean
  style?: object
}
interface DMDDplay {
  cid: number
  /**
   * content
   */
  m: string
  /**
   * p[0]
   */
  progress: number
  /**
   * p[1]
   */
  mode: number
  /**
   * p[2]
   */
  color: number
  /**
   * p[3]
   */
  uid: string
}

export interface Extra {
  artplayer?: ExtraArtplayer
  bili?: ExtraBili
  danuni?: ExtraDanUni
}
interface ExtraArtplayer {
  style?: object
  border?: boolean
}
interface ExtraBili {
  mode?: number //原弹幕类型
  pool?: number //原弹幕池
  adv?: string
  code?: string
  bas?: string
  command?: DMBiliCommand
}
export interface ExtraDanUni {
  chapter?: ExtraDanUniChapter
  merge?: ExtraDanUniMerge
}
export interface ExtraDanUniChapter {
  // seg: {
  //   st: number //开始时刻
  // } //起止时间(ms)
  duration: number //持续时间
  type: ExtraDanUniChapterType
  // action: ExtraDanUniChapterAction
}
export interface ExtraDanUniMerge {
  duration: number //持续时间(重复内容第一次出现时间开始到合并了的弹幕中最后一次出现的时间)
  count: number //重复次数
  senders: string[] //发送者
}
export enum ExtraDanUniChapterType {
  Chapter = 'ch', //其它片段(用于标记章节)
  Review = 'rev', //回顾
  OP = 'op', //片头
  Intermission = 'int', //中场
  ED = 'ed', //片尾
  Preview = 'prvw', //预告
  Cut = 'cut', //删减(删减版中提供删减说明,提供开始位置、长度)
  Duplicate = 'dup', //补档(完整版中指明其它平台中删减位置)
  AdBiz = 'biz', //商业广告
  AdUnpaid = 'promo', //推广(无偿/公益)广告
}
const ExtraDanUniChapterTypeDict = {
  chs: {
    ch: '其它片段',
    rev: '回顾',
    op: '片头',
    int: '中场',
    ed: '片尾',
    prvw: '预告',
    cut: '删减',
    dup: '补档',
    biz: '商业广告',
    promo: '推广',
  },
}
export enum ExtraDanUniChapterAction {
  Disabled = -1,
  ShowOverlay,
  ManualSkip,
  AutoSkip,
}

export enum Modes {
  Normal,
  Bottom,
  Top,
  Reverse, //逆向弹幕
  Ext, //需要读取extra的弹幕，用于兼容bili等复杂弹幕
}
export enum Pools {
  Def, //默认池
  Sub, //重要池，建议强制加载，含字幕、科普、空降等
  Adv, //高级弹幕专用池，均需读取extra
  Ix, //互动池
}

export type ctime = string | number | bigint | Date
// enum ctimeFmt {
//   bigintStr = 'bigintStr',
//   dateObj = 'dateObj',
//   dateStr = 'dateStr',
// }

export interface UniDMObj {
  EPID: string
  progress: number
  mode: Modes
  fontsize: number
  color: number
  senderID: string
  content: string
  ctime: Date
  weight: number
  pool: Pools
  attr: DMAttr[]
  platform: PlatformDanmakuSource | string
  SOID: string
  extra: string | Extra
  extraStr: string
  DMID: string
}

/**
 * 所有 number/bigint 值设为0自动转换为默认
 */
export class UniDM {
  /**
   * 同步时确认位置的参数
   */
  // syncAnchor = BigInt(Date.now())
  constructor(
    /**
     * EPID
     * @description 由某一danuni服务确定的某一剧集的ID
     */
    public EPID: string,
    /**
     * 弹幕出现位置(单位s;精度为ms,即保留三位小数)
     */
    public progress: number = 0,
    /**
     * 弹幕类型
     */
    public mode: Modes = Modes.Normal,
    /**
     * 字号
     * @default 25
     * - 18：小
     * - 25：标准
     * - 36：大
     */
    public fontsize: number = 25,
    /**
     * 颜色
     * @description 为DEC值(十进制RGB888值)，默认白色
     * @default 16777215
     */
    public color: number = 16777215,
    /**
     * 发送者 senderID
     */
    public senderID: string = ID.fromNull().toString(),
    /**
     * 正文
     */
    public content: string = '',
    /**
     * 发送时间
     */
    // public ctime: bigint = BigInt(Date.now()),
    public ctime: Date = new Date(),
    /**
     * 权重 用于屏蔽等级 区间:[1,10]
     * @description 参考B站，源弹幕有该参数则直接利用，
     * 本实现默认取5，再经过ruleset匹配加减分数
     * @description 特殊情况下接受值为0，即设置0需转换为默认权重(5)
     */
    public weight: number = 5,
    /**
     * 弹幕池 0:普通池 1:字幕池 2:特殊池(代码/BAS弹幕) 3:互动池(互动弹幕中选择投票快速发送的弹幕)
     */
    public pool: Pools = Pools.Def,
    /**
     * 弹幕属性位(bin求AND)
     * bit0:保护 bit1:直播 bit2:高赞
     */
    public attr: DMAttr[] = [],
    /**
     * 初始来源平台
     * `danuni`与任意空值(可隐式转换为false的值)等价
     */
    public platform?: PlatformDanmakuSource | string,
    /**
     * 资源ID
     * @description 由某一danuni服务确定的某一剧集下不同资源(不同视频站/字幕组具有细节差异)的ID
     */
    public SOID?: string,
    /**
     * 弹幕原始数据(不推荐使用)
     * @description 适用于无法解析的B站代码弹幕、Artplayer弹幕样式等
     * @description 初步约定:
     * - Artplayer: style不为空时，将其JSON.stringify()存入
     */
    public extraStr?: string,
    public DMID?: string,
  ) {
    //TODO 引入class-validator
    if (progress < 0) this.progress = 0
    if (mode < Modes.Normal || mode > Modes.Ext) this.mode = Modes.Normal
    if (fontsize <= 0) this.fontsize = 25
    if (color <= 0) this.color = 16777215 //虽然不知道为0是否为可用值，但过为少见，利用其作为默认位
    // if (ctime <= 0n) this.ctime = BigInt(Date.now())
    if (weight <= 0 || weight > 10) this.weight = 5
    if (pool < Pools.Def || pool > Pools.Ix) this.pool = Pools.Def
    // if (attr < 0 || attr > 0b111) this.attr = 0
    if (!DMID) DMID = this.toDMID()

    this.progress = Number.parseFloat(progress.toFixed(3))
    if (extraStr)
      this.extraStr = JSON.stringify(cleanEmptyObjects(JSON.parse(extraStr)))
    if (extraStr === '{}') this.extraStr = undefined
  }
  static create(args?: Partial<UniDMObj>) {
    return args
      ? new UniDM(
          args.EPID || ID.fromNull().toString(),
          args.progress,
          args.mode,
          args.fontsize,
          args.color,
          args.senderID,
          args.content,
          args.ctime,
          args.weight,
          args.pool,
          args.attr,
          args.platform,
          args.SOID,
          typeof args.extra === 'object'
            ? JSON.stringify(args.extra)
            : args.extra || args.extraStr,
          args.DMID,
        )
      : new UniDM(ID.fromNull().toString())
  }
  get extra(): Extra {
    const extra = JSON.parse(this.extraStr || '{}')
    // this.extraStr = JSON.stringify(cleanEmptyObjects(extra))
    return extra
    // return cleanEmptyObjects(extra) as Extra
  }
  get isFrom3rdPlatform() {
    if (
      this.platform &&
      PlatformDanmakuSources.includes(this.platform as PlatformDanmakuSource)
    )
      return true
    else return false
  }
  /**
   * 弹幕id
   * @description sha3-256(content+senderID+ctime)截取前8位
   * @description 同一EPID下唯一
   */
  toDMID() {
    return createDMID(this.content, this.senderID, this.ctime)
  }
  isSameAs(dan: UniDM, _check2 = false): boolean {
    const isSame = (k: keyof UniDMObj) => this[k] === dan[k],
      checks = (
        [
          'EPID',
          'content',
          'mode',
          'platform',
          'pool',
          'SOID',
        ] satisfies (keyof UniDMObj)[]
      ).every((k) => isSame(k))
    // 如果两个对象的extra都是空对象，只检查基本字段
    if (
      JSON.stringify(this.extra) === '{}' &&
      JSON.stringify(dan.extra) === '{}'
    ) {
      return checks
    }
    // 特殊情况：只包含danuni.merge的情况
    const thisHasOnlyMerge =
      this.extra.danuni?.merge &&
      !this.extra.artplayer &&
      !this.extra.bili &&
      !this.extra.danuni.chapter
    const danHasOnlyMerge =
      dan.extra.danuni?.merge &&
      !dan.extra.artplayer &&
      !dan.extra.bili &&
      !dan.extra.danuni.chapter
    if (thisHasOnlyMerge && danHasOnlyMerge) {
      return checks
    }
    if (_check2) {
      return isSame('extraStr') && checks
    }
    const a = { ...this.extra }
    const b = { ...dan.extra }
    if (a.danuni) delete a.danuni.merge
    if (b.danuni) delete b.danuni.merge
    return UniDM.create({ ...a, extraStr: JSON.stringify(a) }).isSameAs(
      UniDM.create({ ...b, extraStr: JSON.stringify(b) }),
      true,
    )
  }
  minify() {
    type UObj = Partial<UniDMObj> & Pick<UniDMObj, 'EPID'>
    const def: UObj = UniDM.create(),
      dan: UObj = UniDM.create(this)
    // const prototypes = Object.getOwnPropertyNames(this)
    for (const key in dan) {
      const k = key as keyof UObj,
        v = dan[k]
      // if (key in prototypes) continue
      if (key === 'EPID') continue
      else if (!v) delete dan[k]
      else if (v === def[k]) delete dan[k]
      else {
        if (k === 'attr' && Array.isArray(v) && v.length === 0) delete dan[k]
        if (k === 'extraStr' && v === '{}') delete dan[k]
      }
    }
    return JSON.parse(JSON.stringify(dan)) as UObj
  }
  downgradeAdvcancedDan(
    {
      include,
      exclude,
      cleanExtra = false,
    }: {
      include?: (keyof Extra)[]
      exclude?: (keyof Extra)[]
      cleanExtra?: boolean
    } = { include: [], exclude: [] },
  ) {
    if (!this.extra) return this
    else {
      if (!include) include = []
      if (!exclude) exclude = []
      const check = (k: keyof Extra) =>
        include?.includes(k) || !exclude?.includes(k)
      // TODO 分别对 mode7/8/9 command artplayer等正常播放器无法绘制的弹幕做降级处理
      const clone = UniDM.create(this)
      clone.mode = Modes.Top
      if (check('danuni') && clone.extra.danuni) {
        const danuni = clone.extra.danuni
        if (danuni.merge) {
          const merge = danuni.merge
          clone.content = `${this.content} x${merge.count}`
        } else if (danuni.chapter) {
          const chapter = danuni.chapter
          if (chapter.type === ExtraDanUniChapterType.Cut)
            clone.content = `[提示]${clone.platform}源${ExtraDanUniChapterTypeDict.chs[chapter.type]}了${chapter.duration}秒`
          else if (chapter.type === ExtraDanUniChapterType.Duplicate)
            clone.content = `[提示(${ExtraDanUniChapterTypeDict.chs[chapter.type]})]${clone.platform}源-${chapter.duration}秒`
          else
            clone.content = `[空降(${ExtraDanUniChapterTypeDict.chs[chapter.type]})]${TimeFormat.fromS(clone.progress + chapter.duration)}`
        }
      } else if (check('bili') && clone.extra.bili) {
        const bili = clone.extra.bili
        if (bili.mode === 7 && bili.adv) {
          clone.content = `[B站高级弹幕]${JSON.parse(bili.adv)[4] || ''}`
        } else if (bili.command) {
          const command = bili.command
          clone.content = `[B站指令弹幕]${command.content}`
          clone.fontsize = 36
        }
      }
      clone.senderID = 'compat@bot'
      clone.attr.push('Compatible')
      if (cleanExtra) clone.extraStr = undefined
      return clone
    }
  }
  /**
   * 将各种类型的时间进行格式化
   * @param oriCtime
   * @param tsUnit 当`oriCtime`为数字类型表时间戳时的单位;
   * 为 毫秒(ms)/秒(s)
   * @returns {Date} Date格式时间
   */
  static transCtime(oriCtime: ctime, tsUnit?: 'ms' | 's'): Date {
    function isMsTs(ts: number | bigint) {
      if (tsUnit === 'ms') return true
      else if (tsUnit === 's') return false
      else return ts < 100000000
    }
    if (typeof oriCtime === 'number' || typeof oriCtime === 'bigint')
      if (isMsTs(oriCtime)) return new Date(Number(oriCtime))
      else return new Date(Number(oriCtime) * 1000)
    else if (typeof oriCtime === 'string') {
      if (/^\d+n$/.test(oriCtime))
        return new Date(Number(oriCtime.slice(0, -1)))
      // else return Date.parse(oriCtime)
      else return new Date(oriCtime)
    }
    // } else if (typeof oriCtime === 'object') return BigInt(oriCtime.getTime())
    else return oriCtime // BigInt(Date.now())
  }
  // static reviveCtime(ctime: bigint, fmt: ctimeFmt = ctimeFmt.bigintStr) {
  //   if (fmt === ctimeFmt.dateObj || fmt === ctimeFmt.dateStr) {
  //     const date = new Date(Number(ctime))
  //     if (fmt === ctimeFmt.dateStr) return date.toString()
  //     else return date
  //   } else return ctime.toString() + 'n'
  // }
  static transMode(
    oriMode: number,
    fmt: 'bili' | 'dplayer' | 'artplayer' | 'ddplay',
  ): Modes {
    let mode = Modes.Normal
    switch (fmt) {
      case 'bili':
        // 类型 1 2 3:普通弹幕 4:底部弹幕 5:顶部弹幕 6:逆向弹幕 7:高级弹幕 8:代码弹幕 9:BAS弹幕(pool必须为2)
        switch (oriMode) {
          case 4:
            mode = Modes.Bottom
            break
          case 5:
            mode = Modes.Top
            break
          case 6:
            mode = Modes.Reverse
            break
          case 7:
            mode = Modes.Ext
            break
          case 8:
            mode = Modes.Ext
            break
          case 9:
            mode = Modes.Ext
            break
        }
        break

      case 'dplayer':
        if (oriMode === 1) mode = Modes.Top
        else if (oriMode === 2) mode = Modes.Bottom
        break

      case 'artplayer':
        if (oriMode === 1) mode = Modes.Top
        else if (oriMode === 2) mode = Modes.Bottom
        break

      case 'ddplay':
        // 弹幕模式：1-普通弹幕，4-底部弹幕，5-顶部弹幕
        // 其适配为bili格式子集
        mode = this.transMode(oriMode, 'bili')
        break

      default:
        mode = Modes.Normal
        break
    }
    return mode
  }
  static fromBili(args: DMBili, cid?: bigint) {
    interface TExtra extends Extra {
      bili: ExtraBili
    }
    if (args.oid && !cid) cid = args.oid
    const EPID = ID.fromBili({ cid }),
      senderID = ID.fromBili({ midHash: args.midHash })
    let mode = Modes.Normal
    const pool = args.pool, //暂时不做处理，兼容bili的pool格式
      extra: TExtra = { bili: { mode: args.mode, pool: args.pool } }
    //重复 transMode ，但此处有关于extra的额外处理
    switch (args.mode) {
      case 4:
        mode = Modes.Bottom
        break
      case 5:
        mode = Modes.Top
        break
      case 6:
        mode = Modes.Reverse
        break
      case 7:
        mode = Modes.Ext
        extra.bili.adv = args.content
        break
      case 8:
        mode = Modes.Ext
        extra.bili.code = args.content
        break
      case 9:
        mode = Modes.Ext
        extra.bili.bas = args.content
        break

      default:
        mode = Modes.Normal
        break
    }
    // if (args.mode === 7) extra.bili.adv = args.content
    // else if (args.mode === 8) extra.bili.code = args.content
    // else if (args.mode === 9) extra.bili.bas = args.content
    return this.create({
      ...args,
      EPID: EPID.toString(),
      // progress: args.progress,
      mode,
      // fontsize: args.fontsize,
      // color: args.color,
      senderID: senderID.toString(),
      // content: args.content,
      ctime: this.transCtime(args.ctime, 's'),
      weight: args.weight ? args.weight : pool === Pools.Ix ? 1 : 0,
      pool,
      attr: DMAttrUtils.fromBin(args.attr, PlatformVideoSource.Bilibili),
      platform: PlatformVideoSource.Bilibili,
      // 需改进，7=>advanced 8=>code 9=>bas 互动=>command
      // 同时塞进无法/无需直接解析的数据
      // 另开一个解析器，为大部分播放器（无法解析该类dm）做文本类型降级处理
      extra:
        args.mode >= 7 ? JSON.stringify(extra, BigIntSerializer) : undefined,
    })
  }
  static fromBiliCommand(args: DMBiliCommand, cid?: bigint) {
    if (args.oid && !cid) cid = args.oid
    const EPID = ID.fromBili({ cid }),
      senderID = ID.fromBili({ mid: args.mid })
    return this.create({
      ...args,
      EPID: EPID.toString(),
      // progress: args.progress,
      mode: Modes.Ext,
      // fontsize: args.fontsize,
      // color: args.color,
      senderID: senderID.toString(),
      // content: args.content,
      ctime: new Date(`${args.ctime} GMT+0800`), // 无视本地时区，按照B站的东8区计算时间
      weight: 10,
      pool: Pools.Adv,
      attr: ['Protect'],
      platform: PlatformVideoSource.Bilibili,
      extra: JSON.stringify(
        {
          bili: {
            command: args,
          },
        },
        BigIntSerializer,
      ),
    })
  }
  static fromDplayer(args: DMDplayer, playerID: string, domain: string) {
    const EPID = ID.fromUnknown(playerID, domain),
      senderID = ID.fromUnknown(args.midHash, domain)
    return this.create({
      ...args,
      EPID: EPID.toString(),
      // progress: args.progress,
      mode: this.transMode(args.mode, 'dplayer'),
      // fontsize: 25,
      // color: args.color,
      senderID: senderID.toString(),
      // content: args.content,
      platform: domain,
    })
  }
  toDplayer(): DMDplayer {
    let mode = 0
    if (this.mode === Modes.Top) mode = 1
    else if (this.mode === Modes.Bottom) mode = 2
    return {
      mode,
      progress: this.progress,
      color: this.color,
      midHash: this.senderID,
      content: this.content,
    }
  }
  static fromArtplayer(args: DMArtplayer, playerID: string, domain: string) {
    const EPID = ID.fromUnknown(playerID, domain),
      senderID = ID.fromUnknown('', domain)
    let extra = args.border
      ? ({ artplayer: { border: args.border, style: {} } } as Extra)
      : undefined
    if (args.style) {
      if (extra)
        extra = {
          ...extra,
          artplayer: { ...extra.artplayer, style: args.style },
        }
      else extra = { artplayer: { style: args.style } }
    }
    return this.create({
      ...args,
      EPID: EPID.toString(),
      // progress: args.progress,
      mode: this.transMode(args.mode, 'artplayer'),
      // fontsize: 25,
      // color: args.color,
      senderID: senderID.toString(),
      // content: args.content,
      platform: domain,
      extra: JSON.stringify(extra, BigIntSerializer), //optional BigINt parser
    })
  }
  toArtplayer(): DMArtplayer {
    let mode = 0
    if (this.mode === Modes.Top) mode = 1
    else if (this.mode === Modes.Bottom) mode = 2
    return {
      progress: this.progress,
      mode,
      color: this.color,
      content: this.content,
      style: this.extra.artplayer?.style,
    }
  }
  static fromDDplay(
    args: DMDDplay,
    episodeId: string,
    domain = PlatformDanmakuOnlySource.DanDanPlay,
  ) {
    const EPID = ID.fromUnknown(episodeId, domain)
    return this.create({
      ...args,
      EPID: EPID.toString(),
      // progress: args.progress,
      mode: this.transMode(args.mode, 'ddplay'),
      // fontsize: 25,
      // color: args.color,
      senderID: args.uid,
      content: args.m,
      platform: domain,
      DMID: args.cid.toString(), //无需 new ID() 获取带suffix的ID
    })
  }
  toDDplay(): DMDDplay {
    let mode = 1
    if (this.mode === Modes.Top) mode = 5
    else if (this.mode === Modes.Bottom) mode = 4
    return {
      progress: this.progress,
      mode,
      color: this.color,
      uid: this.senderID,
      m: this.content,
      cid: Number(this.DMID) || 1,
    }
  }
}
