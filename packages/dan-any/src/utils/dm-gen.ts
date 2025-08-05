import { Expose, plainToInstance } from 'class-transformer'
import {
  IsDate,
  IsEmail,
  isEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateOrReject,
} from 'class-validator'
import TimeFormat from 'hh-mm-ss'
import JSONbig from 'json-bigint'
import type { DM_JSON_BiliCommandGrpc } from '..'
import type { PlatformDanmakuSource } from './platform'

import { createDMID, DMIDGenerator, UniID as ID } from './id-gen'
import {
  PlatformDanmakuOnlySource,
  PlatformDanmakuSources,
  PlatformVideoSource,
} from './platform'

const JSON = JSONbig({ useNativeBigInt: true })

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
      (typeof cleanedValue !== 'object' ||
        Object.keys(cleanedValue).length !== 0)
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

/**
 * 获得数字的二进制，每位以boolean(true/false)表示1/0，从低位向高位
 * @param number 任意进制数字
 */
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
  return bits.toReversed()
}

export enum DMAttr {
  Protect = 'Protect',
  FromLive = 'FromLive',
  HighLike = 'HighLike',
  Compatible = 'Compatible', // 由dan-any进行过兼容处理的弹幕，可能丢失部分信息
  Reported = 'Reported', // 在DanUni上被多人举报过的弹幕
  Unchecked = 'Unchecked', // 在DanUni上未被审核过的弹幕
  HasEvent = 'HasEvent', // 该弹幕当前在DanUni上存在事件(如点赞/举报等)
  Hide = 'Hide', // 由于其它原因需要隐藏的弹幕(建议在server端不返回该类弹幕)
}
const DMAttrUtils = {
  fromBin(bin: number = 0, format?: PlatformDanmakuSource) {
    const array = toBits(bin),
      attr: DMAttr[] = []
    if (format === 'bili') {
      if (array[0]) attr.push(DMAttr.Protect)
      if (array[1]) attr.push(DMAttr.FromLive)
      if (array[2]) attr.push(DMAttr.HighLike)
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
      if (attr.includes(DMAttr.Protect)) bin.set1(0)
      if (attr.includes(DMAttr.FromLive)) bin.set1(1)
      if (attr.includes(DMAttr.HighLike)) bin.set1(2)
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
  progress: number // xml 0 ; xml s, protobuf ms
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
  dmid?: bigint //原弹幕ID
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
  taolu_count: number //类似弹幕数量
  taolu_senders: string[] //类似弹幕发送者
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
  SOID: string
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
  extra: string | Extra
  extraStr: string
  DMID: string
}

interface Options {
  dmid?: boolean | number | DMIDGenerator
}

export class UniDM {
  /**
   * 资源ID
   * @description 由某一danuni服务确定的某一剧集下不同资源(不同视频站/字幕组具有细节差异)的ID
   */
  @IsEmail({ require_tld: false })
  @IsString()
  @IsNotEmpty()
  @Expose()
  public SOID: string = ID.fromNull().toString()
  /**
   * 弹幕出现位置(单位s;精度为ms,即保留三位小数)
   */
  @Min(0)
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  public progress: number = 0
  /**
   * 弹幕类型
   */
  @IsEnum(Modes)
  @IsNotEmpty()
  @Expose()
  public mode: Modes = Modes.Normal
  /**
   * 字号
   * @default 25
   * - 12
   * - 16
   * - 18：小
   * - 25：标准
   * - 36：大
   * - 45
   * - 64
   */
  @Max(64)
  @Min(12)
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  public fontsize: number = 25
  /**
   * 颜色
   * @description 为DEC值(十进制RGB888值)，默认白色
   * @default 16777215
   */
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  public color: number = 16777215
  /**
   * 发送者 senderID
   */
  @IsEmail({ require_tld: false })
  @IsString()
  @IsNotEmpty()
  @Expose()
  public senderID: string = ID.fromNull().toString()
  /**
   * 正文
   */
  @IsString()
  @IsNotEmpty()
  @Expose()
  public content: string = ''
  /**
   * 发送时间
   */
  @IsDate()
  @IsNotEmpty()
  @Expose()
  public ctime: Date = new Date()
  /**
   * 权重 用于屏蔽等级 区间:[0,11]
   * @description 参考B站，源弹幕有该参数则直接利用，
   * 本实现默认取5，再经过ruleset匹配加减分数
   * @description 为0时表示暂时未计算权重
   */
  @Max(11)
  @Min(0)
  @IsInt()
  @IsNotEmpty()
  @Expose()
  public weight: number = 0
  /**
   * 弹幕池 0:普通池 1:字幕池 2:特殊池(代码/BAS弹幕) 3:互动池(互动弹幕中选择投票快速发送的弹幕)
   */
  @IsEnum(Pools)
  @IsNotEmpty()
  @Expose()
  public pool: Pools = Pools.Def
  /**
   * 弹幕属性位(bin求AND)
   * bit0:保护 bit1:直播 bit2:高赞
   */
  @IsEnum(DMAttr, { each: true })
  @IsNotEmpty()
  @Expose()
  public attr: DMAttr[] = []
  /**
   * 初始来源平台
   * `danuni`与任意空值(可隐式转换为false的值)等价
   */
  @IsString()
  @IsOptional()
  @Expose()
  public platform?: PlatformDanmakuSource | string
  /**
   * 弹幕原始数据(不推荐使用)
   * @description 适用于无法解析的B站代码弹幕、Artplayer弹幕样式等
   * @description 初步约定:
   * - Artplayer: style不为空时，将其JSON.stringify()存入
   */
  @IsString()
  @IsOptional()
  @Expose()
  public extraStr?: string
  @IsString()
  @IsOptional()
  @Expose()
  public DMID?: string
  private options: Options = { dmid: createDMID }
  @Expose()
  init(options?: Options) {
    this.options = options || this.options
    const def = new UniDM()

    if (this.options.dmid === undefined || this.options.dmid === true)
      this.options.dmid = createDMID

    this.content = String(this.content)

    if (!this.SOID) this.SOID = def.SOID
    if (!this.progress) this.progress = def.progress
    if (!this.mode) this.mode = def.mode
    if (!this.fontsize) this.fontsize = def.mode
    if (!this.color) this.color = def.color
    if (!this.senderID) this.senderID = def.senderID
    if (!this.content) this.content = def.content
    if (!this.ctime) this.ctime = def.ctime
    if (!this.weight) this.weight = def.weight
    if (!this.pool) this.pool = def.pool
    if (!this.attr) this.attr = def.attr

    if (!this.DMID && this.options.dmid !== false) this.DMID = this.toDMID()
    this.progress = Number.parseFloat(this.progress.toFixed(3))
    if (this.extraStr)
      this.extraStr = JSON.stringify(
        cleanEmptyObjects(JSON.parse(this.extraStr)),
      )
    if (this.extraStr === '{}') this.extraStr = undefined
    else if (this.mode !== Modes.Ext) {
      const checkExtraBili = (obj?: ExtraBili) =>
        obj
          ? (['adv', 'bas', 'code', 'command'] as (keyof ExtraBili)[]).some(
              (k) => obj[k],
            )
          : false
      if (
        this.extra.artplayer ||
        this.extra.danuni?.chapter ||
        checkExtraBili(this.extra.bili)
      )
        this.mode = Modes.Ext
    }
    return this
  }
  @Expose()
  async validate() {
    return validateOrReject(this)
  }
  static create(pjson?: Partial<UniDMObj>, options?: Options) {
    return pjson
      ? plainToInstance(
          UniDM,
          pjson.extra
            ? {
                ...pjson,
                extraStr: pjson.extra
                  ? JSON.stringify(pjson.extra)
                  : pjson.extraStr,
              }
            : pjson,
          { excludeExtraneousValues: true },
        ).init(options)
      : new UniDM()
  }
  @Expose()
  get extra(): Extra {
    const extra = JSON.parse(this.extraStr || '{}')
    // this.extraStr = JSON.stringify(cleanEmptyObjects(extra))
    return extra
    // return cleanEmptyObjects(extra) as Extra
  }
  @Expose()
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
   * @description 同一SOID下唯一
   */
  @Expose()
  toDMID() {
    if (this.options.dmid === false) return
    else if (this.options.dmid === true) return createDMID(this)
    else if (typeof this.options.dmid === 'number')
      return createDMID(this, this.options.dmid)
    return this.options.dmid!(this)
  }
  @Expose()
  isSameAs(dan: UniDM, options?: { skipDanuniMerge?: boolean }): boolean {
    // 不支持比较高级弹幕
    if (this.mode === Modes.Ext || dan.mode === Modes.Ext) return false
    // 合并过视为不同，防止存在合并完成弹幕后再次合并造成计数错误
    if (
      !options?.skipDanuniMerge &&
      (this.extra.danuni?.merge || dan.extra.danuni?.merge)
    )
      return false
    const isSame = (k: keyof UniDMObj) => this[k] === dan[k],
      checks = (
        [
          'SOID',
          'content',
          'mode',
          'pool',
          'platform',
        ] satisfies (keyof UniDMObj)[]
      ).every((k) => isSame(k))
    // 忽略使用了extra字段却不在mode里标记的弹幕
    return checks
  }
  @Expose()
  minify() {
    type UObj = Partial<UniDMObj> & Pick<UniDMObj, 'SOID'>
    const def: UObj = UniDM.create(),
      dan: UObj = UniDM.create(this)
    // const prototypes = Object.getOwnPropertyNames(this)
    for (const key in dan) {
      const k = key as keyof UObj,
        v = dan[k]
      // if (key in prototypes) continue
      if (key === 'SOID') continue
      else if (!v) delete dan[k]
      else if (v === def[k]) delete dan[k]
      else {
        if (k === 'attr' && Array.isArray(v) && v.length === 0) delete dan[k]
        if (k === 'extraStr' && v === '{}') delete dan[k]
      }
    }
    return JSON.parse(JSON.stringify(dan)) as UObj
  }
  @Expose()
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
      clone.senderID = 'compat[bot]@dan-any'
      clone.attr.push(DMAttr.Compatible)
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
  static fromBili(
    args: DMBili,
    cid?: bigint,
    options?: Options,
    recSOID?: string,
  ) {
    interface TExtra extends Extra {
      bili: ExtraBili
    }
    if (args.oid && !cid) cid = args.oid
    const SOID =
        recSOID ||
        `def_${PlatformVideoSource.Bilibili}+${ID.fromBili({ cid })}`,
      senderID = isEmail(args.midHash, { require_tld: false })
        ? args.midHash
        : ID.fromBili({ midHash: args.midHash })
    let mode = Modes.Normal
    const pool = args.pool, //暂时不做处理，兼容bili的pool格式
      extra: TExtra = {
        bili: { mode: args.mode, pool: args.pool, dmid: args.id },
      }
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
    return this.create(
      {
        ...args,
        SOID,
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
        extra,
      },
      options,
    )
  }
  @Expose()
  toBiliXML(options?: {
    skipBiliCommand?: boolean
    /**
     * 见 ../index.ts UniPool.toBiliXML() 的 options，该option不宜手动调用，判断逻辑未封装
     */
    avoidSenderIDWithAt?: boolean
  }) {
    if (options?.skipBiliCommand && this.extra.bili?.command) {
      return null
    }
    const recMode = (mode: Modes, extra?: ExtraBili) => {
      switch (mode) {
        case Modes.Normal:
          return 1
        case Modes.Bottom:
          return 4
        case Modes.Top:
          return 5
        case Modes.Reverse:
          return 6
        case Modes.Ext:
          if (!extra) return 1
          else if (extra.adv) return 7
          else if (extra.code) return 8
          else if (extra.bas) return 9
          else return 1
        default:
          return 1
      }
    }
    const rMode = this.extra.bili?.mode || recMode(this.mode, this.extra?.bili)
    let content
    switch (rMode) {
      case 7:
        content = this.extra?.bili?.adv
        break
      case 8:
        content = this.extra?.bili?.code
        break
      case 9:
        content = this.extra?.bili?.bas
        break
      default:
        content = this.content
        break
    }
    return {
      '#text': content ?? this.content,
      '@_p': [
        this.progress,
        rMode,
        this.fontsize,
        this.color,
        this.ctime.getTime() / 1000,
        this.extra.bili?.pool || this.pool, // 目前pool与bili兼容
        options?.avoidSenderIDWithAt
          ? this.senderID.replaceAll(`@${PlatformVideoSource.Bilibili}`, '')
          : this.senderID,
        this.extra.bili?.dmid || this.DMID || this.toDMID(),
        this.weight,
      ].join(','),
    }
  }
  static fromBiliCommand(args: DMBiliCommand, cid?: bigint, options?: Options) {
    if (args.oid && !cid) cid = args.oid
    const SOID = `def_${PlatformVideoSource.Bilibili}+${ID.fromBili({ cid })}`,
      senderID = ID.fromBili({ mid: args.mid })
    return this.create(
      {
        ...args,
        SOID,
        // progress: args.progress,
        mode: Modes.Ext,
        // fontsize: args.fontsize,
        // color: args.color,
        senderID: senderID.toString(),
        // content: args.content,
        ctime: new Date(`${args.ctime} GMT+0800`), // 无视本地时区，按照B站的东8区计算时间
        weight: 10,
        pool: Pools.Adv,
        attr: [DMAttr.Protect],
        platform: PlatformVideoSource.Bilibili,
        extra: {
          bili: {
            command: args,
          },
        },
      },
      options,
    )
  }
  static fromDplayer(
    args: DMDplayer,
    playerID: string,
    domain: string,
    options?: Options,
  ) {
    const SOID = ID.fromUnknown(playerID, domain),
      senderID = ID.fromUnknown(args.midHash, domain)
    return this.create(
      {
        ...args,
        SOID: SOID.toString(),
        // progress: args.progress,
        mode: this.transMode(args.mode, 'dplayer'),
        // fontsize: 25,
        // color: args.color,
        senderID: senderID.toString(),
        // content: args.content,
        platform: domain,
      },
      options,
    )
  }
  @Expose()
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
  static fromArtplayer(
    args: DMArtplayer,
    playerID: string,
    domain: string,
    options?: Options,
  ) {
    const SOID = ID.fromUnknown(playerID, domain),
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
    return this.create(
      {
        ...args,
        SOID: SOID.toString(),
        // progress: args.progress,
        mode: this.transMode(args.mode, 'artplayer'),
        // fontsize: 25,
        // color: args.color,
        senderID: senderID.toString(),
        // content: args.content,
        platform: domain,
        extra, //optional BigINt parser
      },
      options,
    )
  }
  @Expose()
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
    options?: Options,
  ) {
    const SOID = ID.fromUnknown(
      `def_${PlatformDanmakuOnlySource.DanDanPlay}+${episodeId}`,
      domain,
    )
    return this.create(
      {
        ...args,
        SOID: SOID.toString(),
        // progress: args.progress,
        mode: this.transMode(args.mode, 'ddplay'),
        // fontsize: 25,
        // color: args.color,
        senderID: args.uid,
        content: args.m,
        platform: domain,
        DMID: args.cid.toString(), //无需 new ID() 获取带suffix的ID
      },
      options,
    )
  }
  @Expose()
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
      cid: this.DMID
        ? Number.parseInt(Buffer.from(this.DMID).toString('hex'), 16)
        : 0,
    }
  }
}
