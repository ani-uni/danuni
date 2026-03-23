import 'reflect-metadata/lite'

import { isJSON, isString } from 'class-validator'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import JSONbig from 'json-bigint'
import type { Options as AssGenOptions, CanvasCtx } from './ass-gen'
import type { CommandDm as DM_JSON_BiliCommandGrpc } from './proto/gen/bilibili/community/service/dm/v1/dm_pb'
import type { Danmaku } from './proto/gen/danuni/danmaku/v1/danmaku_pb'

import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import {
  timestampDate,
  timestampFromDate,
  timestampNow,
} from '@bufbuild/protobuf/wkt'

import pkg from '../package.json'
import { generateASS, parseAssRawField } from './ass-gen'
import {
  // DanmakuElem as DM_JSON_BiliGrpc,
  DmSegMobileReplySchema,
  DmWebViewReplySchema,
} from './proto/gen/bilibili/community/service/dm/v1/dm_pb'
import { ListDanResponseSchema } from './proto/gen/danuni/danmaku/v1/danmaku_pb'
// import type * as UniIDType from './utils/id-gen'

import { UniDM } from './utils/dm-gen'
import * as UniDMTools from './utils/dm-gen'
import { fileParser } from './utils/fileParser'
import { UniID as ID } from './utils/id-gen'
import * as UniIDTools from './utils/id-gen'
import * as platform from './utils/platform'

const JSON = JSONbig({
  useNativeBigInt: true,
})

const DanUniConvertTipTemplate: DanUniConvertTip = {
  meassage: 'Converted by DanUni!',
  version: `JS/TS ${pkg.name} (v${pkg.version})`,
}

interface DanUniConvertTip {
  meassage: string
  version: string
  data?: string
}

export type DM_JSON_DanuniMin = Partial<UniDMTools.UniDMObj>[]

export interface DM_XML_Bili {
  i: {
    chatserver: string
    chatid: bigint
    mission: number
    maxlimit: number
    state: number
    real_name: number
    source: string
    d: {
      '#text': string
      '@_p': string
    }[]
  }
}
export interface DM_JSON_BiliUp {
  /** 接口状态码，0 表示成功 */
  code: number
  /** 文本形式的状态码，约定为字符串 "0" */
  message: string
  /** TTL（time to live） 标识，本接口常量为 1 */
  ttl: number
  data: {
    /** 分页元信息 */
    page: {
      /** 当前页序号，从 1 开始 */
      num: number
      /** 每页返回的弹幕条数 */
      size: number
      /** 总页数 */
      total: number
    }
    result: {
      /** 弹幕 ID，int64 */
      id: bigint
      /** 弹幕 ID 字符串形式 */
      id_str: string
      /** 弹幕类型：1 表示视频弹幕（当前接口恒为 1） */
      type: number
      aid: bigint
      bvid: string
      oid: bigint
      mid: bigint
      /** 发送者 mid 的 CRC 哈希（正常接口里用的是这个，保护隐私） */
      mid_hash: string
      /** 弹幕池 */
      pool: number
      /** 属性位字符串，逗号分隔的数字列表，对应 attr 二进制位 */
      attrs: string
      /** 弹幕出现时间，单位毫秒(注意，此处与protobuf接口保持一致，但xml中progress是秒) */
      progress: number
      mode: number
      /** 弹幕内容, content */
      msg: string
      state: number // ?
      fontsize: number
      /** 弹幕颜色，需将16进制转化为普通弹幕的10进制，示例："ffffff" */
      color: string
      /** 发送时间戳，单位秒 */
      ctime: number
      /** 发送者昵称 */
      uname: string
      /** 发送者头像链接 */
      uface: string
      /** 视频主标题 */
      title: string
      self_seen: boolean // 尽自己可见?
      /** 弹幕点赞数 */
      like_count: number
      user_like: number // ?
      /** 分 P 标题 */
      p_title: string
      /** 视频封面链接 */
      cover: string
      is_charge: boolean // 该up是否开通充电计划?
      is_charge_plus: boolean // 该up是否开通高级充电计划?
      following: boolean // 当前登录用户是否关注该发送者?
      extra_cps: null // ?
    }[]
  }
}
export interface DM_JSON_Dplayer {
  code: number
  /**
   * progress,mode,color,midHash,content
   */
  data: [number, number, number, string, string][]
}
export interface DM_JSON_Artplayer {
  danmuku: {
    text: string // 弹幕文本
    time?: number // 弹幕时间，默认为当前播放器时间
    mode?: number // 弹幕模式：0: 滚动 (默认)，1: 顶部，2: 底部
    color?: string // 弹幕颜色，默认为白色
    border?: boolean // 弹幕是否有描边，默认为 false
    style?: {} // 弹幕自定义样式，默认为空对象
  }[]
}
export interface DM_JSON_DDPlay {
  count: number | string
  comments: {
    cid: bigint
    p: string
    m: string
  }[]
}

export enum DM_format {
  DanuniJson = 'danuni.json',
  DanuniMinJson = 'danuni.min.json',
  DanuniPbBin = 'danuni.binpb',
  BiliXml = 'bili.xml',
  BiliPbBin = 'bili.binpb',
  BiliCmdPbBin = 'bili.cmd.binpb',
  BiliUpJson = 'bili.up.json',
  DplayerJson = 'dplayer.json',
  ArtplayerJson = 'artplayer.json',
  DdplayJson = 'ddplay.json',
  CommonAss = 'common.ass',
}

type shareItems = Partial<
  Pick<
    UniDMTools.UniDMObj,
    'SOID' | 'senderID' | 'platform' | 'SOID' | 'pool' | 'mode' | 'color'
  >
>
type statItems = Partial<
  Pick<
    UniDMTools.UniDMObj,
    | 'SOID'
    | 'mode'
    | 'fontsize'
    | 'color'
    | 'senderID'
    | 'content'
    | 'weight'
    | 'pool'
    | 'platform'
  >
>
type Stats<T extends keyof statItems> = Map<statItems[T], number>

export interface Options {
  dedupe?: boolean
  /**
   * @description
   * 当为`false`时，关闭DMID生成; 当为正整数时，表示生成DMID的截取位数; 或可传入一个DMID生成器实例
   */
  dmid?: boolean | number | UniIDTools.DMIDGenerator
}

type Convert2Format =
  | DM_format.DanuniJson
  | DM_format.DanuniMinJson
  | DM_format.DanuniPbBin
  | DM_format.BiliXml
  | DM_format.DplayerJson
  | DM_format.ArtplayerJson
  | DM_format.DdplayJson
type Convert2ResultMap = {
  [DM_format.DanuniJson]: UniDM[]
  [DM_format.DanuniMinJson]: DM_JSON_DanuniMin
  [DM_format.DanuniPbBin]: Uint8Array
  [DM_format.BiliXml]: string
  [DM_format.DplayerJson]: DM_JSON_Dplayer & { danuni?: DanUniConvertTip }
  [DM_format.ArtplayerJson]: DM_JSON_Artplayer & { danuni?: DanUniConvertTip }
  [DM_format.DdplayJson]: DM_JSON_DDPlay & { danuni?: DanUniConvertTip }
}

export class UniPool {
  constructor(
    public dans: UniDM[],
    public options: Options = {},
    public info = {
      /**
       * 是否从已被转换过的第三方格式弹幕再次转换而来
       */
      fromConverted: false,
    },
  ) {
    if (options.dedupe !== false) options.dedupe = true
    if (this.options.dedupe) this.dedupe()
  }
  pipe<T extends (...args: any) => any>(fn: T): ReturnType<T> {
    return fn(this)
  }
  /**
   * @deprecated 使用 `getShared` 代替
   */
  get shared(): shareItems {
    if (this.dans.length === 0) return {}
    const keys: (keyof shareItems)[] = [
      'SOID',
      'senderID',
      'platform',
      'pool',
      'mode',
      'color',
    ]
    const result: shareItems = {} as shareItems
    for (const key of keys) {
      const sharedVal = this.getShared(key)
      if (sharedVal !== undefined) {
        result[key] = sharedVal as any
      }
    }
    return result
  }
  getShared<K extends keyof shareItems>(key: K): shareItems[K] {
    if (this.dans.length === 0) return undefined
    const firstVal = this.dans[0][key]
    for (let i = 1; i < this.dans.length; i++) {
      if (this.dans[i][key] !== firstVal) {
        return undefined
      }
    }
    return firstVal
  }
  getStat<K extends keyof statItems>(key: K): Stats<K> {
    const statMap = new Map<statItems[K], number>()
    for (const dan of this.dans) {
      const val = dan[key]
      statMap.set(val, (statMap.get(val) || 0) + 1)
    }
    return statMap
  }
  getMost<K extends keyof statItems>(key: K) {
    const stats = this.getStat(key)
    if (stats.size === 0) return { val: undefined, count: 0 }
    let mostVal: statItems[K] | undefined
    let maxCount = 0
    for (const [val, count] of stats.entries()) {
      if (count > maxCount) {
        maxCount = count
        mostVal = val
      }
    }
    return { val: mostVal, count: maxCount }
  }
  /**
   * @deprecated 使用 `getMost` 代替
   */
  get most() {
    const keys: (keyof statItems)[] = [
      'mode',
      'fontsize',
      'color',
      'senderID',
      'content',
      'weight',
      'pool',
      'platform',
    ]
    const statMaps = new Map<
      keyof statItems,
      Map<statItems[keyof statItems], number>
    >()
    for (const dan of this.dans) {
      for (const key of keys) {
        if (!statMaps.has(key)) {
          statMaps.set(key, new Map())
        }
        const statMap = statMaps.get(key)!
        const val = dan[key]
        statMap.set(val, (statMap.get(val) || 0) + 1)
      }
    }
    const result: Record<string, any> = {}
    for (const key of keys) {
      const statMap = statMaps.get(key)!
      let mostVal: statItems[keyof statItems] | undefined
      let maxCount = 0
      for (const [val, count] of statMap.entries()) {
        if (count > maxCount) {
          maxCount = count
          mostVal = val
        }
      }
      result[key] = mostVal
    }
    return {
      mode: result.mode as UniDMTools.Modes,
      fontsize: result.fontsize as number,
      color: result.color as number,
      senderID: result.senderID as string,
      content: result.content as string,
      weight: result.weight as number,
      pool: result.pool as UniDMTools.Pools,
      platform: result.platform as string | undefined,
    }
  }
  static create(options?: Options) {
    return new UniPool([], options)
  }
  /**
   * 合并弹幕/弹幕库
   */
  assign(dans: UniPool | UniDM | UniDM[]) {
    if (dans instanceof UniPool) {
      return new UniPool(
        [...this.dans, ...dans.dans],
        { ...this.options, ...dans.options },
        { ...this.info, ...dans.info },
      )
    } else if (dans instanceof UniDM) {
      return new UniPool([...this.dans, dans], this.options, this.info)
    } else if (Array.isArray(dans) && dans.every((d) => d instanceof UniDM)) {
      return new UniPool([...this.dans, ...dans], this.options, this.info)
    } else return this
  }
  /**
   * 按共通属性拆分弹幕库
   */
  split(key: keyof shareItems) {
    if (this.getShared(key)) return [this]
    const set = new Set(this.dans.map((d) => d[key]))
    return [...set].map((v) => {
      return new UniPool(
        this.dans.filter((d) => d[key] === v),
        { ...this.options, dedupe: false },
        this.info,
      )
    })
  }
  /**
   * 基于DMID的基本去重功能，用于解决该class下dans为array而非Set的问题
   */
  private dedupe() {
    // 这里基本上没有性能瓶颈(大文件测试与AI优化下无明显区别)
    if (this.options.dmid !== false) {
      const map = new Map()
      this.dans.forEach((d) => map.set(d.DMID || d.toDMID(), d))
      this.dans = [...map.values()]
    }
    this.options.dedupe = false
  }
  /**
   * 合并一定时间段内的重复弹幕，防止同屏出现过多
   * @param lifetime 查重时间区段，单位秒 (默认为 0，表示不查重)
   */
  merge(lifetime = 0) {
    if (!this.getShared('SOID')) {
      console.error(
        "本功能仅支持同弹幕库内使用，可先 .split('SOID') 在分别使用",
      )
      return this
    }
    if (lifetime <= 0) return this
    const result: UniDM[] = []
    const cache: Record<string, UniDM> = {}
    const mergeObj: Record<string, UniDMTools.ExtraDanUniMerge> = {}
    // 第一遍：合并弹幕
    for (const danmaku of this.dans) {
      const key = `${danmaku.content}|${danmaku.mode}|${danmaku.pool}|${danmaku.platform}`
      const cached = cache[key]

      if (
        cached &&
        danmaku.progress - cached.progress <= lifetime &&
        danmaku.isSameAs(cached, { skipDanuniMerge: true })
      ) {
        // 更新已存在的弹幕
        mergeObj[key].senders.push(danmaku.senderID)
        mergeObj[key].count = mergeObj[key].senders.length
        mergeObj[key].taolu_count = mergeObj[key].count
        mergeObj[key].taolu_senders = mergeObj[key].senders
        mergeObj[key].duration = Number.parseFloat(
          (danmaku.progress - cached.progress).toFixed(3),
        )
        cache[key] = danmaku
      } else {
        // 新弹幕
        mergeObj[key] = {
          count: 1,
          duration: 0,
          senders: [danmaku.senderID],
          taolu_count: 1,
          taolu_senders: [danmaku.senderID],
        }
        cache[key] = danmaku
        result.push(danmaku)
      }
    }
    // 第二遍：更新 extraStr
    for (const danmaku of result) {
      const key = `${danmaku.content}|${danmaku.mode}|${danmaku.pool}|${danmaku.platform}`
      const mergeData = mergeObj[key]
      const extra = danmaku.extra
      if (mergeData.count > 1) {
        // 多个发送者：设置为机器人并添加保护标记
        danmaku.senderID = 'merge[bot]@dan-any'
        if (!danmaku.attr) {
          danmaku.attr = [UniDMTools.DMAttr.Protect]
        } else if (!danmaku.attr.includes(UniDMTools.DMAttr.Protect)) {
          danmaku.attr.push(UniDMTools.DMAttr.Protect)
        }

        extra.danuni = extra.danuni || {}
        extra.danuni.merge = mergeData
        danmaku.extraStr = JSON.stringify(extra)
      } else {
        // 单个发送者：清理 merge 字段
        if (extra.danuni?.merge) {
          delete extra.danuni.merge
          if (Object.keys(extra.danuni).length === 0) {
            delete extra.danuni
          }
        }
        danmaku.extraStr =
          Object.keys(extra).length > 0 ? JSON.stringify(extra) : undefined
      }
    }
    return new UniPool(result, this.options, this.info)
  }
  minify() {
    return this.dans.map((d) => d.minify())
  }
  static import(
    file: unknown,
    options?: Options,
    /**
     * 加载指定解析模块，为空则全选，为字符串则视为文件名解析加载模块
     */
    mod?: string | ('json' | 'str' | 'bin')[],
  ): { pool: UniPool; fmt: DM_format } {
    const handlers = {
      [DM_format.DanuniJson]: (json: UniDM[]) => ({
        pool: new UniPool(json, options),
        fmt: DM_format.DanuniJson,
      }),
      [DM_format.DanuniMinJson]: (json: DM_JSON_DanuniMin) => ({
        pool: this.fromMin(json, options),
        fmt: DM_format.DanuniMinJson,
      }),
      [DM_format.DanuniPbBin]: (
        file: ArrayBuffer | Uint8Array<ArrayBufferLike>,
      ) => ({
        pool: this.fromPb(file),
        fmt: DM_format.DanuniPbBin,
      }),
      [DM_format.BiliXml]: (file: string) => ({
        pool: this.fromBiliXML(file, options),
        fmt: DM_format.BiliXml,
      }),
      [DM_format.BiliPbBin]: (
        file: ArrayBuffer | Uint8Array<ArrayBufferLike>,
      ) => ({
        pool: this.fromBiliGrpc(file),
        fmt: DM_format.BiliPbBin,
      }),
      [DM_format.BiliCmdPbBin]: (
        file: ArrayBuffer | Uint8Array<ArrayBufferLike>,
      ) => ({
        pool: this.fromBiliCommandGrpc(file),
        fmt: DM_format.BiliCmdPbBin,
      }),
      [DM_format.BiliUpJson]: (json: DM_JSON_BiliUp) => ({
        pool: this.fromBiliUp(json, options),
        fmt: DM_format.BiliUpJson,
      }),
      [DM_format.DplayerJson]: (
        json: DM_JSON_Dplayer & {
          danuni?: DanUniConvertTip
        },
      ) => ({
        pool: this.fromDplayer(
          json,
          json.danuni?.data ?? '',
          undefined,
          options,
        ),
        fmt: DM_format.DplayerJson,
      }),
      [DM_format.ArtplayerJson]: (
        json: DM_JSON_Artplayer & {
          danuni?: DanUniConvertTip
        },
      ) => ({
        pool: this.fromArtplayer(
          json,
          json.danuni?.data ?? '',
          undefined,
          options,
        ),
        fmt: DM_format.ArtplayerJson,
      }),
      [DM_format.DdplayJson]: (
        json: DM_JSON_DDPlay & {
          danuni?: DanUniConvertTip
        },
      ) => ({
        pool: this.fromDDPlay(json, json.danuni?.data ?? '', options),
        fmt: DM_format.DdplayJson,
      }),
      [DM_format.CommonAss]: (file: string) => ({
        pool: this.fromASS(file, options),
        fmt: DM_format.CommonAss,
      }),
    }

    if (typeof mod === 'string') {
      const fn = mod
      // 直接按照默认模式处理匹配后缀的文件
      try {
        if (fn.endsWith(DM_format.DanuniJson)) {
          return handlers[DM_format.DanuniJson](fileParser(file, 'json'))
        } else if (fn.endsWith(DM_format.DanuniMinJson))
          return handlers[DM_format.DanuniMinJson](fileParser(file, 'json'))
        else if (fn.endsWith(DM_format.DanuniPbBin))
          return handlers[DM_format.DanuniPbBin](fileParser(file, 'bin'))
        else if (fn.endsWith(DM_format.BiliXml))
          return handlers[DM_format.BiliXml](fileParser(file, 'string'))
        else if (fn.endsWith(DM_format.BiliPbBin))
          return handlers[DM_format.BiliPbBin](fileParser(file, 'bin'))
        else if (fn.endsWith(DM_format.BiliCmdPbBin))
          return handlers[DM_format.BiliCmdPbBin](fileParser(file, 'bin'))
        else if (fn.endsWith(DM_format.BiliUpJson))
          return handlers[DM_format.BiliUpJson](fileParser(file, 'json'))
        else if (fn.endsWith(DM_format.DplayerJson))
          return handlers[DM_format.DplayerJson](fileParser(file, 'json'))
        else if (fn.endsWith(DM_format.ArtplayerJson))
          return handlers[DM_format.ArtplayerJson](fileParser(file, 'json'))
        else if (fn.endsWith(DM_format.DdplayJson))
          return handlers[DM_format.DdplayJson](fileParser(file, 'json'))
        else if (fn.endsWith(DM_format.CommonAss))
          return handlers[DM_format.CommonAss](fileParser(file, 'string'))
      } catch {}
      // 按照后缀设定启用模块
      const ext = fn.split('.').pop()?.toLowerCase()
      if (ext) {
        if (ext === 'json') mod = ['json']
        else if (['xml', 'ass'].includes(ext)) mod = ['str']
        else if (['binpb', 'bin', 'so'].includes(ext)) mod = ['bin']
      }
    }
    if (!mod) mod = ['json', 'str', 'bin']
    const err = '无法识别该文件，请手动指定格式！'
    const parseJSON = (
      json: DM_JSON_Artplayer &
        DM_JSON_DDPlay &
        DM_JSON_Dplayer &
        DM_JSON_BiliUp & { danuni?: DanUniConvertTip },
    ): { pool: UniPool; fmt: DM_format } | undefined => {
      try {
        if (Array.isArray(json) && json.every((d) => d.SOID)) {
          return handlers[DM_format.DanuniMinJson](json) // 使用兼容性参数，danuni.min.json解析器可以解析danuni.json
        } else if (json.danmuku && json.danmuku.every((d) => d.text)) {
          return handlers[DM_format.ArtplayerJson](json)
        } else if (
          json.count &&
          json.comments &&
          Array.isArray(json.comments) &&
          json.comments.every((d) => d.m)
        ) {
          return handlers[DM_format.DdplayJson](json)
        } else if (
          json.code == 0 &&
          json.data &&
          Array.isArray(json.data) &&
          json.data.every((d) => Array.isArray(d))
        ) {
          return handlers[DM_format.DplayerJson](json)
        } else if (
          json.code == 0 &&
          json.message == '0' &&
          json.data &&
          json.data.page &&
          json.data.result &&
          Array.isArray(json.data.result) &&
          json.data.result.every((d) => d.id && d.oid)
        ) {
          return handlers[DM_format.BiliUpJson](json)
        }
      } catch {}
    }
    const parseStr = (
      file: string,
    ): { pool: UniPool; fmt: DM_format } | undefined => {
      // json-str
      if (mod.includes('json'))
        try {
          if (isJSON(file)) {
            const json = JSON.parse(file)
            return parseJSON(json)
          }
        } catch {}
      // pure-str (xml/ass)
      if (mod.includes('str')) {
        try {
          const xmlParser = new XMLParser({ ignoreAttributes: false })
          const xml = xmlParser.parse(file)
          if (xml?.i?.d) return handlers[DM_format.BiliXml](file)
        } catch {}
        try {
          return handlers[DM_format.CommonAss](file)
        } catch {}
      }
    }
    let errmesg
    if (typeof file === 'object' || Array.isArray(file)) {
      if (file instanceof ArrayBuffer || file instanceof Uint8Array) {
        // pure-bin (pb)
        if (mod.includes('bin')) {
          try {
            return handlers[DM_format.DanuniPbBin](file)
          } catch {}
          try {
            return handlers[DM_format.BiliPbBin](file)
          } catch {}
          try {
            return handlers[DM_format.BiliCmdPbBin](file)
          } catch {}
        }
        // str-bin (pure-str + json-str)

        try {
          const fileStr = new TextDecoder().decode(file)
          const prStr = parseStr(fileStr)
          if (prStr) {
            return prStr
          } else {
            errmesg = `${err}(定位: bin->string)`
          }
        } catch {}
      } else if (mod.includes('json')) {
        // pure-json
        const prJSON = parseJSON(file as any)
        if (!prJSON) throw new Error(`${err}(定位: json)`)
        return prJSON
      }
    } else if (isString(file)) {
      // pure-str + json-str
      const prStr = parseStr(file)
      if (!prStr) throw new Error(`${err}(定位: string)`)
      return prStr
    }
    throw new Error(errmesg ?? err)
  }
  convert2<T extends Convert2Format>(
    format: T,
    file_wrapper: true,
    continue_on_error?: boolean,
  ): File
  convert2<T extends Convert2Format>(
    format: T,
    file_wrapper?: false,
    continue_on_error?: boolean,
  ): Convert2ResultMap[T]
  convert2(
    format: DM_format,
    file_wrapper = false,
    continue_on_error = false,
  ): File | Convert2ResultMap[Convert2Format] | string {
    switch (format) {
      case DM_format.DanuniJson:
        if (file_wrapper)
          return new File([JSON.stringify(this.dans)], DM_format.DanuniJson, {
            type: 'application/json',
          })
        else return this.dans
      case DM_format.DanuniMinJson:
        if (file_wrapper)
          return new File(
            [JSON.stringify(this.minify())],
            DM_format.DanuniMinJson,
            {
              type: 'application/json',
            },
          )
        else return this.minify()
      case DM_format.DanuniPbBin:
        if (file_wrapper)
          return new File([this.toPb()], DM_format.DanuniPbBin, {
            type: 'application/protobuf',
          })
        else return this.toPb()
      case DM_format.BiliXml:
        if (file_wrapper)
          return new File([this.toBiliXML()], DM_format.BiliXml, {
            type: 'application/xml',
          })
        else return this.toBiliXML()
      // case DM_format.BiliPbBin:
      //   return this.toBiliBin()
      // case DM_format.BiliCmdPbBin:
      //   return this.toBiliCmdBin()
      // case DM_format.BiliUpJson:
      //   return this.toBiliUp()
      case DM_format.DplayerJson:
        if (file_wrapper)
          return new File(
            [JSON.stringify(this.toDplayer())],
            DM_format.DplayerJson,
            {
              type: 'application/json',
            },
          )
        return this.toDplayer()
      case DM_format.ArtplayerJson:
        if (file_wrapper)
          return new File(
            [JSON.stringify(this.toArtplayer())],
            DM_format.ArtplayerJson,
            {
              type: 'application/json',
            },
          )
        return this.toArtplayer()
      case DM_format.DdplayJson:
        if (file_wrapper)
          return new File(
            [JSON.stringify(this.toDDplay())],
            DM_format.DdplayJson,
            {
              type: 'application/json',
            },
          )
        return this.toDDplay()
      // case DM_format.CommonAss:
      //   return this.toASS()
      default: {
        const message = '(err) Unknown format or unsupported now!'
        if (continue_on_error) return message
        else throw new Error(message)
      }
    }
  }
  static fromMin(json: DM_JSON_DanuniMin, options?: Options) {
    return new UniPool(json.map((d: any) => UniDM.create(d, options)))
  }
  static fromPb(bin: Uint8Array | ArrayBuffer, options?: Options) {
    const data = fromBinary(ListDanResponseSchema, new Uint8Array(bin))
    return new UniPool(
      data.danmakus.map((d) =>
        UniDM.create(
          {
            ...d,
            SOID: d.soid,
            DMID: d.dmid,
            progress: d.progress / 1000,
            mode: d.mode as number,
            senderID: d.senderId,
            ctime: timestampDate(d.ctime || timestampNow()),
            pool: d.pool as number,
            attr: d.attr as UniDMTools.DMAttr[],
            extra: undefined,
            extraStr: d.extra,
          },
          options,
        ),
      ),
      options,
    )
  }
  /**
   * 转为 protobuf 二进制
   */
  toPb() {
    return toBinary(
      ListDanResponseSchema,
      create(ListDanResponseSchema, {
        danmakus: this.dans.map((d) => {
          return {
            soid: d.SOID,
            dmid: d.DMID ?? '',
            progress: Math.round(d.progress * 1000),
            mode: d.mode as number,
            fontsize: d.fontsize,
            color: d.color,
            senderId: d.senderID,
            content: d.content,
            ctime: timestampFromDate(d.ctime),
            weight: d.weight,
            pool: d.pool as number,
            attr: d.attr,
            platform: d.platform,
            extra: d.extraStr,
          } satisfies Omit<Danmaku, '$typeName'>
        }),
      }),
    )
  }
  static fromBiliXML(xml: string, options?: Options) {
    const parser = new XMLParser({ ignoreAttributes: false })
    const oriData: DM_XML_Bili & { i: { danuni?: DanUniConvertTip } } =
      parser.parse(xml)
    const dans = oriData.i.d
    const fromConverted = !!oriData.i.danuni
    const cid = BigInt(oriData.i.chatid)
    return new UniPool(
      dans
        .map((d) => {
          return UniDM.fromBili(
            UniDM.parseBiliSingle(d['@_p'], d['#text']),
            cid,
            options,
            fromConverted ? oriData.i.danuni?.data : undefined,
          )
        })
        .filter((d) => d !== null),
      options,
      { fromConverted },
    )
  }
  toBiliXML(options?: {
    /**
     * 当SOID非来源bili时，若此处指定则使用该值为cid，否则使用SOID
     */
    cid?: bigint
    /**
     * 当仅含有来自bili的弹幕时，启用将保持发送者标识不含`@`
     * @description
     * bili的弹幕含midHash(crc)，不启用该处使用senderID填充，启用则去除`@bili`部分，提高兼容性
     */
    avoidSenderIDWithAt?: boolean
  }): string {
    const genCID = (id: string) => {
      const UniID = ID.fromString(id)
      if (UniID.domain === platform.PlatformVideoSource.Bilibili) {
        const cid = UniID.id.replaceAll(
          `def_${platform.PlatformVideoSource.Bilibili}+`,
          '',
        )

        if (cid) return cid
      }
      return !options?.cid || id
    }
    if (options?.avoidSenderIDWithAt) {
      const ok = this.dans.every((d) =>
        d.senderID.endsWith(`@${platform.PlatformVideoSource.Bilibili}`),
      )
      if (!ok) throw new Error('存在其他来源的senderID，请关闭该功能再试！')
    }
    const builder = new XMLBuilder({ ignoreAttributes: false })
    return builder.build({
      '?xml': {
        '@_version': '1.0',
        // eslint-disable-next-line unicorn/text-encoding-identifier-case
        '@_encoding': 'UTF-8',
      },
      i: {
        chatserver: 'chat.bilibili.com',
        chatid: genCID(this.dans[0].SOID),
        mission: 0,
        maxlimit: this.dans.length,
        state: 0,
        real_name: 0,
        source: 'k-v',
        danuni: { ...DanUniConvertTipTemplate, data: this.getShared('SOID') },
        d: this.dans.map((dan) => dan.toBiliXML(options)),
      },
    })
  }
  static fromBiliGrpc(bin: Uint8Array | ArrayBuffer, options?: Options) {
    const data = fromBinary(DmSegMobileReplySchema, new Uint8Array(bin))
    const json = data.elems
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBili(
          { ...d, progress: d.progress / 1000 },
          d.oid,
          options,
        )
      }),
      options,
    )
  }
  /**
   * @param bin 符合`DmWebViewReplySchema`(bili视频meta)的protobuf二进制
   */
  static fromBiliCommandGrpc(bin: Uint8Array | ArrayBuffer, options?: Options) {
    const data = fromBinary(DmWebViewReplySchema, new Uint8Array(bin))
    const json = data.commandDms
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBiliCommand(d, d.oid, options)
      }),
      options,
    )
  }
  static fromBiliUp(json: DM_JSON_BiliUp, options?: Options) {
    return new UniPool(
      json.data.result.map((d) => {
        // 处理 attrs 字符串转换为 attr 二进制
        // attrs 格式如 "1,13,21"，每个数字对应二进制位
        const attrBin = d.attrs
          ? d.attrs
              .split(',')
              .map(Number)
              .reduce((bin, bitPosition) => bin | (1 << (bitPosition - 1)), 0)
          : 0

        return UniDM.fromBili(
          {
            id: BigInt(d.id_str || d.id),
            progress: d.progress / 1000, // 毫秒转秒
            mode: d.mode,
            fontsize: d.fontsize,
            color: Number.parseInt(d.color, 16),
            mid: d.mid,
            midHash: d.mid_hash,
            content: d.msg,
            ctime: BigInt(d.ctime),
            pool: d.pool,
            // idStr: d.id_str,
            attr: attrBin,
            oid: BigInt(d.oid),
          },
          BigInt(d.oid),
          options,
        )
      }),
      options,
    )
  }
  static fromDplayer(
    json: DM_JSON_Dplayer & { danuni?: DanUniConvertTip },
    playerID: string,
    domain = 'other',
    options?: Options,
  ) {
    return new UniPool(
      json.data.map((d) => {
        return UniDM.fromDplayer(
          {
            content: d[4],
            progress: d[0],
            mode: d[1],
            color: d[2],
            midHash: d[3],
          },
          playerID,
          domain,
          options,
        )
      }),
      options,
      { fromConverted: !!json.danuni },
    )
  }
  toDplayer(): DM_JSON_Dplayer & { danuni?: DanUniConvertTip } {
    return {
      code: 0,
      danuni: {
        ...DanUniConvertTipTemplate,
        data: this.dans[0].SOID.split('@')[0],
      },
      data: this.dans.map((dan) => {
        const d = dan.toDplayer()
        return [d.progress, d.mode, d.color, d.midHash, d.content]
      }),
    }
  }
  static fromArtplayer(
    json: DM_JSON_Artplayer & { danuni?: DanUniConvertTip },
    playerID: string,
    domain = 'other',
    options?: Options,
  ) {
    return new UniPool(
      json.danmuku.map((d) => {
        return UniDM.fromArtplayer(
          {
            content: d.text,
            progress: d.time || 0,
            mode: d.mode || 0,
            color: Number((d.color || 'FFFFFF').replace('#', '0x')),
            style: d.style,
          },
          playerID,
          domain,
          options,
        )
      }),
      options,
      { fromConverted: !!json.danuni },
    )
  }
  toArtplayer(): DM_JSON_Artplayer & { danuni?: DanUniConvertTip } {
    return {
      danuni: {
        ...DanUniConvertTipTemplate,
        data: this.dans[0].SOID.split('@')[0],
      },
      danmuku: this.dans.map((dan) => {
        const d = dan.toArtplayer()
        return {
          text: d.content,
          time: d.progress,
          mode: d.mode as 0 | 1 | 2,
          color: `#${d.color.toString(16).toUpperCase() || 'FFFFFF'}`,
          border: d.border,
          style: d.style,
        }
      }),
    }
  }
  static fromDDPlay(
    json: DM_JSON_DDPlay & { danuni?: DanUniConvertTip },
    episodeId: string,
    options?: Options,
  ) {
    return new UniPool(
      json.comments.map((d) => {
        const p_arr = d.p.split(',')
        return UniDM.fromDDplay(
          {
            cid: d.cid,
            color: Number.parseInt(p_arr[2]),
            m: d.m,
            mode: Number.parseInt(p_arr[1]),
            progress: Number.parseFloat(p_arr[0]),
            uid: p_arr[3],
          },
          episodeId,
          undefined, //使用默认
          options,
        )
      }),
      options,
      { fromConverted: !!json.danuni },
    )
  }
  toDDplay(): DM_JSON_DDPlay & { danuni?: DanUniConvertTip } {
    const episodeId = this.dans[0].SOID.split('@')[0].replaceAll(
      `def_${platform.PlatformDanmakuOnlySource.DanDanPlay}+`,
      '',
    )
    return {
      danuni: { ...DanUniConvertTipTemplate, data: episodeId },
      count: this.dans.length,
      comments: this.dans.map((dan) => {
        const d = dan.toDDplay()
        return {
          cid: d.cid,
          p: `${d.progress},${d.mode},${d.color},${d.uid}`,
          m: d.m,
        }
      }),
    }
  }
  static fromASS(ass: string, options?: Options) {
    return parseAssRawField(ass, options)
  }
  /**
   * 转换为ASS字幕格式的弹幕，需播放器支持多行ASS渲染
   */
  toASS(canvasCtx: CanvasCtx, options?: AssGenOptions): string {
    const defaultOptions: AssGenOptions = { substyle: {} }
    const finalOptions = options ?? defaultOptions
    const fn = this.getShared('SOID')
    return generateASS(
      this,
      { filename: fn, title: fn, ...finalOptions },
      canvasCtx,
    )
  }
}

export {
  platform,
  // UniPool,
  UniDM,
  UniDMTools,
  UniIDTools,
  type DM_JSON_BiliCommandGrpc,
  // type UniDMType,
  // type UniIDType,
}
