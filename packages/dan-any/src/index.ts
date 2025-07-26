import 'reflect-metadata/lite'

import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import JSONbig from 'json-bigint'
import type { Options as AssGenOptions } from './ass-gen'
import type { CommandDm as DM_JSON_BiliCommandGrpc } from './proto/gen/bili/dm_pb'

import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import {
  timestampDate,
  timestampFromDate,
  timestampNow,
} from '@bufbuild/protobuf/wkt'

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
  text: string // 弹幕文本
  time?: number // 弹幕时间，默认为当前播放器时间
  mode?: number // 弹幕模式：0: 滚动 (默认)，1: 顶部，2: 底部
  color?: string // 弹幕颜色，默认为白色
  border?: boolean // 弹幕是否有描边，默认为 false
  style?: {} // 弹幕自定义样式，默认为空对象
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
  | 'danuni.bin'
  | 'danuni.pb.zst'
  | 'bili.xml'
  | 'bili.bin'
  | 'bili.cmd.bin'
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

interface Options {
  dedupe?: boolean
}

export class UniPool {
  constructor(
    public dans: UniDM[],
    public options: Options = {},
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
  static create() {
    return new UniPool([])
  }
  /**
   * 合并弹幕/弹幕库
   */
  assign(dans: UniPool | UniDM | UniDM[]) {
    if (dans instanceof UniPool) {
      return new UniPool([...this.dans, ...dans.dans])
    } else if (dans instanceof UniDM) {
      return new UniPool([...this.dans, dans])
    } else if (Array.isArray(dans) && dans.every((d) => d instanceof UniDM)) {
      return new UniPool([...this.dans, ...dans])
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
        { dedupe: false },
      )
    })
  }
  /**
   * 基于DMID的基本去重功能，用于解决该class下dans为array而非Set的问题
   */
  private dedupe() {
    const map = new Map()
    this.dans.forEach((d) => map.set(d.DMID || d.toDMID(), d))
    this.dans = [...map.values()]
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
        const key = ['content', 'mode', 'platform', 'pool']
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
    return new UniPool(result)
  }
  minify() {
    return this.dans.map((d) => d.minify())
  }
  convert2(format: DM_format, continue_on_error = false) {
    switch (format) {
      case 'danuni.json':
        return this.dans
      case 'danuni.bin':
        return this.toPb()
      // case 'bili.xml':
      //   return this.toBiliXML()
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
      case 'common.ass':
        return this.toASS()
      default: {
        const message = '(err) Unknown format or unsupported now!'
        if (continue_on_error) return message
        else throw new Error(message)
      }
    }
  }
  static fromPb(bin: Uint8Array | ArrayBuffer) {
    const data = fromBinary(DanmakuReplySchema, new Uint8Array(bin))
    return new UniPool(
      data.danmakus.map((d) =>
        UniDM.create({
          ...d,
          mode: d.mode as number,
          ctime: timestampDate(d.ctime || timestampNow()),
          pool: d.pool as number,
          attr: d.attr as UniDMTools.DMAttr[],
        }),
      ),
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
            progress: d.progress,
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
  static fromBiliXML(xml: string) {
    const parser = new XMLParser({ ignoreAttributes: false }),
      oriData: DM_XML_Bili = parser.parse(xml),
      dans = oriData.i.d
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
            BigInt(oriData.i.chatid),
          )
        })
        .filter((d) => d !== null),
    )
  }
  toBiliXML(): string {
    const genCID = (id: string) => {
      const UniID = ID.fromString(id)
      if (UniID.domain === platform.PlatformVideoSource.Bilibili) {
        const cid = UniID.id.replaceAll(
          `def_${platform.PlatformVideoSource.Bilibili}+`,
          '',
        )

        if (cid) return cid
      }
      return Number.parseInt(Buffer.from(id).toString('hex'), 16).toString()
    }
    const builder = new XMLBuilder({ ignoreAttributes: false })
    return builder.build({
      '?xml': {
        '@_version': '1.0',
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
        d: this.dans.map((dan) => dan.toBiliXML()),
      },
    })
  }
  static fromBiliGrpc(bin: Uint8Array | ArrayBuffer) {
    const data = fromBinary(DmSegMobileReplySchema, new Uint8Array(bin)),
      json = data.elems
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBili({ ...d, progress: d.progress / 1000 })
      }),
    )
  }
  /**
   * @param bin 符合`DmWebViewReplySchema`(bili视频meta)的protobuf二进制
   */
  static fromBiliCommandGrpc(bin: Uint8Array | ArrayBuffer) {
    const data = fromBinary(DmWebViewReplySchema, new Uint8Array(bin)),
      json = data.commandDms
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBiliCommand(d)
      }),
    )
  }
  static fromDplayer(
    json: DM_JSON_Dplayer,
    playerID: string,
    domain = 'other',
  ) {
    return new UniPool(
      json.data.map((d) => {
        // let TYPE = 0
        // if (d[1] === 1) TYPE = 5
        // else if (d[1] === 2) TYPE = 4
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
        )
      }),
    )
  }
  toDplayer(): DM_JSON_Dplayer {
    return {
      code: 0,
      data: this.dans.map((dan) => {
        const d = dan.toDplayer()
        return [d.progress, d.mode, d.color, d.midHash, d.content]
      }),
    }
  }
  static fromArtplayer(
    json: DM_JSON_Artplayer[],
    playerID: string,
    domain = 'other',
  ) {
    return new UniPool(
      json.map((d) => {
        // let TYPE = 0
        // if (d.mode === 1) TYPE = 5
        // else if (d.mode === 2) TYPE = 4
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
        )
      }),
    )
  }
  toArtplayer(): DM_JSON_Artplayer[] {
    return this.dans.map((dan) => {
      const d = dan.toArtplayer()
      return {
        text: d.content,
        time: d.progress,
        mode: d.mode as 0 | 1 | 2,
        color: `#${d.color.toString(16).toUpperCase() || 'FFFFFF'}`,
        border: d.border,
        style: d.style,
      }
    })
  }
  static fromDDPlay(json: DM_JSON_DDPlay, episodeId: string) {
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
        )
      }),
    )
  }
  toDDplay(): DM_JSON_DDPlay {
    return {
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
  static fromASS(ass: string) {
    return parseAssRawField(ass)
  }
  toASS(options: AssGenOptions = { substyle: {} }): string {
    const fn = this.shared.SOID
    return generateASS(this, { filename: fn, title: fn, ...options })
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
