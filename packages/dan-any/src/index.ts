import { XMLParser } from 'fast-xml-parser'
import type { CommandDm as DM_JSON_BiliCommandGrpc } from './proto/gen/bili/dm_pb'
// import type * as UniDMType from './utils/dm-gen'
import type { platfrom } from './utils/id-gen'

import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import {
  timestampDate,
  timestampFromDate,
  timestampNow,
} from '@bufbuild/protobuf/wkt'

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
  mode?: 0 | 1 | 2 // 弹幕模式: 0: 滚动(默认)，1: 顶部，2: 底部
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
export class UniPool {
  constructor(public dans: UniDM[]) {}
  static fromPb(bin: Uint8Array | ArrayBuffer) {
    const data = fromBinary(DanmakuReplySchema, new Uint8Array(bin))
    return new UniPool(
      data.danmakus.map(
        (d) =>
          new UniDM(
            d.FCID,
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
            d.SPMO,
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
            FCID: d.FCID,
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
            SPMO: d.SPMO,
            extra: d.extraStr,
          }
        }),
      }),
    )
  }
  static fromBiliXML(xml: string, SPMO?: string) {
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
          SPMO,
          BigInt(oriData.i.chatid),
        )
      }),
    )
  }
  static fromBiliGrpc(bin: Uint8Array | ArrayBuffer, SPMO?: string) {
    const data = fromBinary(DmSegMobileReplySchema, new Uint8Array(bin)),
      json = data.elems
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBili(d, SPMO)
      }),
    )
  }
  /**
   *
   * @param bin 符合`DmWebViewReplySchema`(bili视频meta)的protobuf二进制
   * @param SPMO
   */
  static fromBiliCommandGrpc(bin: Uint8Array | ArrayBuffer, SPMO?: string) {
    const data = fromBinary(DmWebViewReplySchema, new Uint8Array(bin)),
      json = data.commandDms
    return new UniPool(
      json.map((d) => {
        return UniDM.fromBiliCommand(d, SPMO)
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
  static fromDDPlay(json: DM_JSON_DDPlay, episodeId: string, domain?: string) {
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
          domain,
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
}

export {
  // UniPool,
  UniDM,
  UniDMTools,
  UniIDTools,
  type DM_JSON_BiliCommandGrpc,
  type platfrom,
  // type UniDMType,
  // type UniIDType,
}

// console.log(
//   UniPool.fromBiliXML(`<i>
// <chatserver>chat.bilibili.com</chatserver>
// <chatid>1156756312</chatid>
// <mission>0</mission>
// <maxlimit>2947</maxlimit>
// <state>0</state>
// <real_name>0</real_name>
// <source>k-v</source>
// <d p="13.213,1,25,16777215,1686314041,3,ff41173d,1335658005672492032">喜欢</d>
// <d p="13.213,1,25,16777215,1686590010,0,296b35b5,1337972999512832512">来了 哈哈~~</d>
// <d p="13.246,1,25,16777215,1686276875,0,5664cfc4,1335346233459549696">就是</d>
// <d p="13.266,1,25,16777215,1686283375,0,c7e6646f,1335400761013670912">什么鬼？</d>
// <d p="13.284,1,25,16777215,1686291338,0,38662881,1335467554877267456">哇哦</d>
// <d p="13.306,1,25,16777215,1686268410,0,4c01de10,1335275224983600896">试试</d>
// <d p="13.331,1,25,16777215,1686948453,3,56a3c5d5,1340979831550069760">不喜欢</d>
// <d p="13.374,1,25,16777215,1686300770,3,647fe355,1335546672880933888">不喜欢</d>
// <d p="13.376,1,25,16777215,1686297921,0,469d94b8,1335522778300134400">哦豁</d>
// <d p="13.419,1,25,8700107,1686268005,0,be402447,1335271828100244224">太酷啦</d>
// <d p="13.419,1,25,16777215,1686316828,3,7ffb6619,1335681385016736768">喜欢</d>
// <d p="13.459,1,25,16777215,1686299729,0,45834405,1335537942797634048">一般，不好看</d>
// <d p="13.462,1,25,16777215,1686302133,0,3cab672c,1335558106620590080">哈哈哈</d>
// <d p="13.481,1,25,16777215,1686297342,0,ce67fafd,1335517923728804864">？</d>
// <d p="13.499,1,25,16777215,1686301548,3,2848bf1c,1335553202649003264">不喜欢</d>
// </i>`),
// )
// console.log(
//   UniPool.fromArtplayer(
//     [
//       {
//         text: '', // 弹幕文本
//         time: 10, // 弹幕时间, 默认为当前播放器时间
//         mode: 0, // 弹幕模式: 0: 滚动(默认)，1: 顶部，2: 底部
//         color: '#FFFFFF', // 弹幕颜色，默认为白色
//         border: false, // 弹幕是否有描边, 默认为 false
//         style: { border: '10rem' }, // 弹幕自定义样式, 默认为空对象
//       },
//     ],
//     '111',
//     'acfun',
//   ),
// )
