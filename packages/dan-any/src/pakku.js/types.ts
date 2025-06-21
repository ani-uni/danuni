// import type { Config } from '../utils/dm-merge'

import type { UniDM } from '../utils/dm-gen'

export type int = number
export type float = number
export type AnyObject = { [k: string]: any }

export interface DanmuObject {
  time_ms: int
  mode: int
  // fontsize: float
  // color: int
  // sender_hash: string
  content: string
  // sendtime: int
  // weight: int
  // id: string
  pool: int
  // danuni
  // danuni_sender: string
  danuni_dan: UniDM

  // extra: {
  //   // for protobuf ingress
  //   proto_attr?: int | null
  //   proto_action?: string | null
  //   proto_animation?: string | null
  //   proto_colorful?: int | null
  //   proto_oid?: int | null
  //   proto_dmfrom?: int | null
  // }
}

export interface DanmuObjectPeer extends DanmuObject {
  pakku: {
    sim_reason: string
  }
}

export interface DanmuObjectRepresentative extends DanmuObject {
  pakku: {
    peers: DanmuObjectPeer[]
    desc: string[]
    disp_str: string
  }
}

export interface DanmuChunk<ObjectType extends DanmuObject> {
  objs: ObjectType[]

  // extra: {
  //   // for protobuf ingress
  //   proto_segidx?: int
  //   proto_colorfulsrc?: AnyObject[]

  //   // for xml ingress
  //   xml_maxlimit?: string
  //   xml_chatid?: string
  // }
}

export interface DanmuCluster {
  peers: DanmuObjectPeer[]
  desc: string[]
  chosen_str: string
}

export interface DanmuClusterPtr {
  peers_ptr: [int, string][] // index and sim_reason
  desc: string[]
  chosen_str: string
  // danuni
  danuni_count: int
  danuni_dans: DanmuObject[]
  // danuni_senders: string[]
}

export interface DanmuClusterOutput {
  clusters: DanmuClusterPtr[]
  stats: Stats
}

export class Stats {
  // type = 'done' as const
  // download_time_ms = 0
  // parse_time_ms = 0
  // userscript_time_ms = 0

  combined_identical = 0
  combined_edit_distance = 0
  combined_pinyin_distance = 0
  combined_cosine_distance = 0

  // deleted_dispval = 0
  deleted_blacklist = 0
  deleted_blacklist_each: { [k: string]: int } = {}

  ignored_whitelist = 0
  // ignored_script = 0
  ignored_type = 0

  // modified_enlarge = 0
  // modified_shrink = 0
  // modified_scroll = 0

  num_taolu_matched = 0
  // num_total_danmu = 0
  // num_onscreen_danmu = 0
  // num_max_combo = 0
  // num_max_dispval = 0

  // notify(tabid: int, config: Config) {
  //   save_state({ ['STATS_' + tabid]: this }).then(() => {
  //     let text =
  //       config.POPUP_BADGE === 'count'
  //         ? '' + (this.num_total_danmu - this.num_onscreen_danmu)
  //         : config.POPUP_BADGE === 'percent'
  //           ? `${this.num_total_danmu ? Math.max(0, 100 - (100 * this.num_onscreen_danmu) / this.num_total_danmu).toFixed(0) : 0}%`
  //           : config.POPUP_BADGE === 'dispval'
  //             ? '' + Math.ceil(this.num_max_dispval)
  //             : /* off */ null
  //     void chrome.runtime.sendMessage({
  //       type: 'update_badge',
  //       tabid: tabid,
  //       text: text,
  //       bgcolor: '#008800',
  //     })
  //   })
  //   return this
  // }

  // update_from(x: Stats) {
  //   for (let k of [
  //     'combined_identical',
  //     'combined_edit_distance',
  //     'combined_pinyin_distance',
  //     'combined_cosine_distance',
  //     'deleted_dispval',
  //     'deleted_blacklist',
  //     'ignored_whitelist',
  //     'ignored_type',
  //     'ignored_script',
  //     'modified_enlarge',
  //     'modified_shrink',
  //     'modified_scroll',
  //     'num_taolu_matched',
  //   ]) {
  //     // @ts-ignore
  //     this[k] += x[k]
  //   }

  //   for (let k of ['num_max_combo', 'num_max_dispval']) {
  //     // @ts-ignore
  //     this[k] = Math.max(this[k], x[k])
  //   }
  //   for (let [k, v] of Object.entries(x.deleted_blacklist_each)) {
  //     this.deleted_blacklist_each[k] = (this.deleted_blacklist_each[k] || 0) + v
  //   }
  // }
}

export class Queue<T> {
  storage: { [k: int]: T }
  index_l: int
  index_r: int // [l, r)
  constructor(init: T[] = []) {
    this.storage = { ...init }
    this.index_l = 0
    this.index_r = init.length
  }
  push(item: T) {
    this.storage[this.index_r++] = item
  }
  pop() {
    delete this.storage[this.index_l++]
  }
  peek(): T | null {
    if (this.index_l === this.index_r) return null
    return this.storage[this.index_l]
  }
  size() {
    return this.index_r - this.index_l
  }
  [Symbol.iterator]() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    let index = self.index_l
    return {
      next() {
        if (index >= self.index_r) return { done: true, value: undefined }
        return { done: false, value: self.storage[index++] }
      },
    } as IterableIterator<T>
  }
}
