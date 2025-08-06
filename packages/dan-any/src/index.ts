import 'reflect-metadata/lite'

import { isJSON, isObject, isString } from 'class-validator'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import JSONbig from 'json-bigint'
import type { Options as AssGenOptions, CanvasCtx } from './ass-gen'
import type { CommandDm as DM_JSON_BiliCommandGrpc } from './proto/gen/bili/dm_pb'

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
} from './proto/gen/bili/dm_pb'
import { DanmakuReplySchema } from './proto/gen/danuni_pb'
// import type * as UniIDType from './utils/id-gen'

import { UniDM } from './utils/dm-gen'
import * as UniDMTools from './utils/dm-gen'
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

export interface DM_XML_Bili {
  i: {
    chatserver: string
    chatid: number
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
export interface DM_JSON_Dplayer {
  code: 0
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
    cid: number
    p: string
    m: string
  }[]
}

export type DM_format =
  | 'danuni.json'
  | 'danuni.pb.bin'
  | 'bili.xml'
  | 'bili.pb.bin'
  | 'bili.cmd.pb.bin'
  | 'dplayer.json'
  | 'artplayer.json'
  | 'ddplay.json'
  | 'common.ass'

type shareItems = Partial<
  Pick<
    UniDMTools.UniDMObj,
    'SOID' | 'senderID' | 'platform' | 'SOID' | 'pool' | 'mode' | 'color'
  >
>

type UniPoolPipe = (that: UniPool) => Promise<UniPool>
type UniPoolPipeSync = (that: UniPool) => UniPool

export interface Options {
  dedupe?: boolean
  dmid?: boolean | number | UniIDTools.DMIDGenerator
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
  async pipe(fn: UniPoolPipe): Promise<UniPool> {
    return fn(this)
  }
  pipeSync(fn: UniPoolPipeSync): UniPool {
    return fn(this)
  }
  get shared(): shareItems {
    const isShared = (key: keyof UniDMTools.UniDMObj) => {
      return this.dans.every((d) => d[key])
    }
    return {
      SOID: isShared('SOID') ? this.dans[0].SOID : undefined,
      senderID: isShared('senderID') ? this.dans[0].senderID : undefined,
      platform: isShared('platform') ? this.dans[0].platform : undefined,
      pool: isShared('pool') ? this.dans[0].pool : undefined,
      mode: isShared('mode') ? this.dans[0].mode : undefined,
      color: isShared('color') ? this.dans[0].color : undefined,
    }
  }
  get stat() {
    const default_stat = {
      SOID: [] as { val: string; count: number }[],
      mode: [
        { val: UniDMTools.Modes.Normal, count: 0 },
        { val: UniDMTools.Modes.Bottom, count: 0 },
        { val: UniDMTools.Modes.Top, count: 0 },
        { val: UniDMTools.Modes.Reverse, count: 0 },
        { val: UniDMTools.Modes.Ext, count: 0 },
      ],
      fontsize: [
        // { val: 18, count: 0 },
        // { val: 25, count: 0 },
        // { val: 36, count: 0 },
      ] as { val: number; count: number }[],
      color: [] as { val: number; count: number }[],
      senderID: [] as { val: string; count: number }[],
      content: [] as { val: string; count: number }[],
      weight: [] as { val: number; count: number }[],
      pool: [
        { val: UniDMTools.Pools.Def, count: 0 },
        { val: UniDMTools.Pools.Sub, count: 0 },
        { val: UniDMTools.Pools.Adv, count: 0 },
        { val: UniDMTools.Pools.Ix, count: 0 },
      ],
      platform: [] as { val?: string; count: number }[],
    }
    type Stat = typeof default_stat
    const stat = this.dans.reduce((s, d): Stat => {
      const SOID = s.SOID.find((i) => i.val === d.SOID)
      if (!SOID) {
        s.SOID.push({ val: d.SOID, count: 1 })
      } else {
        SOID.count++
      }
      const mode = s.mode.find((i) => i.val === d.mode)
      if (!mode) {
        s.mode.push({ val: d.mode, count: 1 })
      } else {
        mode.count++
      }
      const fontsize = s.fontsize.find((i) => i.val === d.fontsize)
      if (!fontsize) {
        s.fontsize.push({ val: d.fontsize, count: 1 })
      } else {
        fontsize.count++
      }
      const color = s.color.find((i) => i.val === d.color)
      if (!color) {
        s.color.push({ val: d.color, count: 1 })
      } else {
        color.count++
      }
      const senderID = s.senderID.find((i) => i.val === d.senderID)
      if (!senderID) {
        s.senderID.push({ val: d.senderID, count: 1 })
      } else {
        senderID.count++
      }
      const content = s.content.find((i) => i.val === d.content)
      if (!content) {
        s.content.push({ val: d.content, count: 1 })
      } else {
        content.count++
      }
      const weight = s.weight.find((i) => i.val === d.weight)
      if (!weight) {
        s.weight.push({ val: d.weight, count: 1 })
      } else {
        weight.count++
      }
      const pool = s.pool.find((i) => i.val === d.pool)
      if (!pool) {
        s.pool.push({ val: d.pool, count: 1 })
      } else {
        pool.count++
      }
      const platform = s.platform.find((i) => i.val === d.platform)
      if (!platform) {
        s.platform.push({ val: d.platform, count: 1 })
      } else {
        platform.count++
      }
      return s
    }, default_stat)
    return stat
  }
  get most() {
    const s = this.stat
    return {
      mode: s.mode.sort((a, b) => b.count - a.count)[0].val,
      fontsize: s.fontsize.sort((a, b) => b.count - a.count)[0].val,
      color: s.color.sort((a, b) => b.count - a.count)[0].val,
      senderID: s.senderID.sort((a, b) => b.count - a.count)[0].val,
      content: s.content.sort((a, b) => b.count - a.count)[0].val,
      weight: s.weight.sort((a, b) => b.count - a.count)[0].val,
      pool: s.pool.sort((a, b) => b.count - a.count)[0].val,
      platform: s.platform.sort((a, b) => b.count - a.count)[0].val,
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
    if (this.shared[key]) return [this]
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
    if (!this.shared.SOID) {
      console.error(
        "本功能仅支持同弹幕库内使用，可先 .split('SOID') 在分别使用",
      )
      return this
    }
    if (lifetime <= 0) return this
    const mergeContext = this.dans.reduce<
      [
        UniDM[],
        Record<string, UniDM>,
        Record<string, UniDMTools.ExtraDanUniMerge>,
      ]
    >(
      ([result, cache, mergeObj], danmaku) => {
        const key = ['content', 'mode', 'pool', 'platform']
          .map((k) => danmaku[k as keyof UniDM])
          .join('|')
        const cached = cache[key]
        const lastAppearTime = cached?.progress || 0
        if (
          cached &&
          danmaku.progress - lastAppearTime <= lifetime &&
          danmaku.isSameAs(cached, { skipDanuniMerge: true })
        ) {
          const senders = mergeObj[key].senders
          senders.push(danmaku.senderID)
          const extra = danmaku.extra
          extra.danuni = extra.danuni || {}
          extra.danuni.merge = {
            count: senders.length,
            duration: Number.parseFloat(
              (danmaku.progress - cached.progress).toFixed(3),
            ),
            senders,
            taolu_count: senders.length,
            taolu_senders: senders,
          }
          danmaku.extraStr = JSON.stringify(extra)
          cache[key] = danmaku
          mergeObj[key] = extra.danuni.merge
          return [result, cache, mergeObj]
        } else {
          mergeObj[key] = {
            count: 1,
            duration: 0,
            senders: [danmaku.senderID],
            taolu_count: 1,
            taolu_senders: [danmaku.senderID],
          }
          cache[key] = danmaku
          // 初始化merge信息，包含第一个sender
          const extra = danmaku.extra
          extra.danuni = extra.danuni || {}
          extra.danuni.merge = mergeObj[key]
          danmaku.extraStr = JSON.stringify(extra)
          result.push(danmaku)
          return [result, cache, mergeObj]
        }
      },
      [[], {}, {}],
    )
    // 处理结果，删除senders<=1的merge字段
    const [result, _cache, mergeObj] = mergeContext
    result.forEach((danmaku, i) => {
      const key = ['content', 'mode', 'platform', 'pool']
        .map((k) => danmaku[k as keyof UniDM])
        .join('|')
      const extra = result[i].extra,
        mergeData = mergeObj[key]
      result[i].extraStr = JSON.stringify({
        ...extra,
        danuni: {
          ...extra.danuni,
          merge: mergeData,
        },
      } satisfies UniDMTools.Extra)
      if (mergeData?.count) {
        if (mergeData.count <= 1) {
          const updatedExtra = { ...extra }
          if (updatedExtra.danuni) {
            delete updatedExtra.danuni.merge
            if (Object.keys(updatedExtra.danuni).length === 0) {
              delete updatedExtra.danuni
            }
          }
          result[i].extraStr =
            Object.keys(updatedExtra).length > 0
              ? JSON.stringify(updatedExtra)
              : undefined
        } else {
          result[i].senderID = 'merge[bot]@dan-any'
          result[i].attr
            ? result[i].attr.push(UniDMTools.DMAttr.Protect)
            : (result[i].attr = [UniDMTools.DMAttr.Protect])
        }
      }
    })
    return new UniPool(result, this.options, this.info)
  }
  minify() {
    return this.dans.map((d) => d.minify())
  }
  static import(
    file: unknown,
    options?: Options,
  ): { pool: UniPool; fmt: DM_format } {
    const err = '无法识别该文件，请手动指定格式！'
    const parseJSON = (
      json: DM_JSON_Artplayer &
        DM_JSON_DDPlay &
        DM_JSON_Dplayer & { danuni?: DanUniConvertTip },
    ): { pool: UniPool; fmt: DM_format } | undefined => {
      try {
        if (Array.isArray(json) && json.every((d) => d.SOID)) {
          return { pool: new UniPool(json, options), fmt: 'danuni.json' }
        } else if (json.danmuku && json.danmuku.every((d) => d.text)) {
          return {
            pool: this.fromArtplayer(
              json,
              json.danuni?.data ?? '',
              undefined,
              options,
            ),
            fmt: 'artplayer.json',
          }
        } else if (
          json.count &&
          json.comments &&
          json.comments.every((d) => d.m)
        ) {
          return {
            pool: this.fromDDPlay(json, json.danuni?.data ?? '', options),
            fmt: 'ddplay.json',
          }
        } else if (
          json?.code == 0 &&
          json.data &&
          json.data.every((d) => Array.isArray(d))
        ) {
          return {
            pool: this.fromDplayer(
              json,
              json.danuni?.data ?? '',
              undefined,
              options,
            ),
            fmt: 'dplayer.json',
          }
        }
      } catch {}
    }
    const parseStr = (
      file: string,
    ): { pool: UniPool; fmt: DM_format } | undefined => {
      try {
        if (isJSON(file)) {
          const json = JSON.parse(file)
          return parseJSON(json)
        }
      } catch {}
      try {
        const xmlParser = new XMLParser({ ignoreAttributes: false })
        const xml = xmlParser.parse(file)
        if (xml?.i?.d)
          return { pool: this.fromBiliXML(file, options), fmt: 'bili.xml' }
      } catch {}
      try {
        return { pool: this.fromASS(file, options), fmt: 'common.ass' }
      } catch {}
    }
    let errmesg
    if (isObject(file)) {
      if (file instanceof ArrayBuffer || file instanceof Uint8Array) {
        try {
          return { pool: this.fromPb(file), fmt: 'danuni.pb.bin' }
        } catch {}
        try {
          return { pool: this.fromBiliGrpc(file), fmt: 'bili.pb.bin' }
        } catch {}
        try {
          return {
            pool: this.fromBiliCommandGrpc(file),
            fmt: 'bili.cmd.pb.bin',
          }
        } catch {}
        try {
          const fileStr = new TextDecoder().decode(file)
          const prStr = parseStr(fileStr)
          if (!prStr) errmesg = `${err}(定位: bin->string)`
          else return prStr
        } catch {}
      } else {
        const prJSON = parseJSON(file as any)
        if (!prJSON) throw new Error(`${err}(定位: json)`)
        return prJSON
      }
    } else if (isString(file)) {
      const prStr = parseStr(file)
      if (!prStr) throw new Error(`${err}(定位: string)`)
      return prStr
    }
    throw new Error(errmesg ?? err)
  }
  convert2(format: DM_format, continue_on_error = false) {
    switch (format) {
      case 'danuni.json':
        return this.dans
      case 'danuni.pb.bin':
        return this.toPb()
      case 'bili.xml':
        return this.toBiliXML()
      // case 'bili.bin':
      //   return this.toBiliBin()
      // case 'bili.cmd.bin':
      //   return this.toBiliCmdBin()
      case 'dplayer.json':
        return this.toDplayer()
      case 'artplayer.json':
        return this.toArtplayer()
      case 'ddplay.json':
        return this.toDDplay()
      // case 'common.ass':
      //   return this.toASS()
      default: {
        const message = '(err) Unknown format or unsupported now!'
        if (continue_on_error) return message
        else throw new Error(message)
      }
    }
  }
  static fromPb(bin: Uint8Array | ArrayBuffer, options?: Options) {
    const data = fromBinary(DanmakuReplySchema, new Uint8Array(bin))
    return new UniPool(
      data.danmakus.map((d) =>
        UniDM.create(
          {
            ...d,
            progress: d.progress / 1000,
            mode: d.mode as number,
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
      DanmakuReplySchema,
      create(DanmakuReplySchema, {
        danmakus: this.dans.map((d) => {
          return {
            SOID: d.SOID,
            DMID: d.DMID,
            progress: Math.round(d.progress * 1000),
            mode: d.mode as number,
            fontsize: d.fontsize,
            color: d.color,
            senderID: d.senderID,
            content: d.content,
            ctime: timestampFromDate(d.ctime),
            weight: d.weight,
            pool: d.pool as number,
            attr: d.attr,
            platform: d.platform,
            extra: d.extraStr,
          }
        }),
      }),
    )
  }
  static fromBiliXML(xml: string, options?: Options) {
    const parser = new XMLParser({ ignoreAttributes: false }),
      oriData: DM_XML_Bili & { danuni?: DanUniConvertTip } = parser.parse(xml),
      dans = oriData.i.d,
      fromConverted = !!oriData.danuni,
      cid = BigInt(oriData.i.chatid)
    return new UniPool(
      dans
        .map((d) => {
          const p_str = d['@_p'],
            p_arr = p_str.split(',')
          return UniDM.fromBili(
            {
              content: d['#text'],
              progress: Number.parseFloat(p_arr[0]),
              mode: Number.parseInt(p_arr[1]),
              fontsize: Number.parseInt(p_arr[2]),
              color: Number.parseInt(p_arr[3]),
              ctime: BigInt(p_arr[4]),
              pool: Number.parseInt(p_arr[5]),
              midHash: p_arr[6],
              id: BigInt(p_arr[7]),
              weight: Number.parseInt(p_arr[8]),
            },
            cid,
            options,
            fromConverted ? oriData.danuni?.data : undefined,
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
        '@_encoding': 'UTF-8',
      },
      danuni: { ...DanUniConvertTipTemplate, data: this.shared.SOID },
      i: {
        chatserver: 'chat.bilibili.com',
        chatid: genCID(this.dans[0].SOID),
        mission: 0,
        maxlimit: this.dans.length,
        state: 0,
        real_name: 0,
        source: 'k-v',
        d: this.dans.map((dan) => dan.toBiliXML(options)),
      },
    })
  }
  static fromBiliGrpc(bin: Uint8Array | ArrayBuffer, options?: Options) {
    const data = fromBinary(DmSegMobileReplySchema, new Uint8Array(bin)),
      json = data.elems
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
    const data = fromBinary(DmWebViewReplySchema, new Uint8Array(bin)),
      json = data.commandDms
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBiliCommand(d, d.oid, options)
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
  toASS(
    canvasCtx: CanvasCtx,
    options: AssGenOptions = { substyle: {} },
  ): string {
    const fn = this.shared.SOID
    return generateASS(this, { filename: fn, title: fn, ...options }, canvasCtx)
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
