import { XMLParser } from 'fast-xml-parser'
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
import * as UniIDTools from './utils/id-gen'
import * as platform from './utils/platform'

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
  time?: number // 弹幕时间, 默认为当前播放器时间
  mode?: number // 弹幕模式: 0: 滚动(默认)，1: 顶部，2: 底部
  color?: string // 弹幕颜色，默认为白色
  border?: boolean // 弹幕是否有描边, 默认为 false
  style?: {} // 弹幕自定义样式, 默认为空对象
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
    'SOID' | 'senderID' | 'platform' | 'SOID' | 'pool' | 'mode'
  >
>

export class UniPool {
  readonly shared: shareItems = {}
  constructor(public dans: UniDM[]) {
    function isShared(key: keyof UniDMTools.UniDMObj) {
      return new Set(dans.map((d) => d[key])).size === 1
    }
    if (isShared('SOID')) this.shared.SOID = dans[0].SOID
    if (isShared('senderID')) this.shared.senderID = dans[0].senderID
    if (isShared('platform')) this.shared.platform = dans[0].platform
    if (isShared('SOID')) this.shared.SOID = dans[0].SOID
    if (isShared('pool')) this.shared.pool = dans[0].pool
    if (isShared('mode')) this.shared.mode = dans[0].mode
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
      return new UniPool(this.dans.filter((d) => d[key] === v))
    })
  }
  /**
   * 合并一定时间段内的重复弹幕，防止同屏出现过多
   * @param lifetime 查重时间区段，单位秒 (默认为0，表示不查重)
   */
  merge(lifetime = 0) {
    if (!this.shared.SOID) {
      console.error(
        "本功能仅支持同弹幕库内使用，可先 .split('EPID') 在分别使用",
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
        const key = ['content', 'mode', 'platform', 'pool', 'SOID']
          .map((k) => danmaku[k as keyof UniDM])
          .join('|')
        const cached = cache[key]
        const lastAppearTime = cached?.progress || 0
        if (
          cached &&
          danmaku.progress - lastAppearTime <= lifetime &&
          danmaku.isSameAs(cached)
        ) {
          const senders = mergeObj[key].senders
          senders.push(danmaku.senderID)
          const extra = danmaku.extra
          extra.danuni = extra.danuni || {}
          extra.danuni.merge = {
            count: senders.length,
            duration: danmaku.progress - cached.progress,
            senders,
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
      const key = ['content', 'mode', 'platform', 'pool', 'SOID']
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
      data.danmakus.map(
        (d) =>
          new UniDM(
            d.SOID,
            d.progress,
            d.mode as number,
            d.fontsize,
            d.color,
            d.senderID,
            d.content,
            timestampDate(d.ctime || timestampNow()),
            d.weight,
            d.pool as number,
            d.attr as UniDMTools.DMAttr[],
            d.platform,
            d.extra,
            d.DMID,
          ),
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
      dans.map((d) => {
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
      }),
    )
  }
  static fromBiliGrpc(bin: Uint8Array | ArrayBuffer) {
    const data = fromBinary(DmSegMobileReplySchema, new Uint8Array(bin)),
      json = data.elems
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBili(d)
      }),
    )
  }
  /**
   *
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
