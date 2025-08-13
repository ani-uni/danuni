/**
 * @author: xmcp(代码主要逻辑来源)
 * @see: https://github.com/xmcp/pakku.js
 * @license: GPL-3.0
 * 本文件内代码来源见上，经部分修改，并整合config注释
 */

import fs from 'fs-extra'
import type { DanmuChunk, DanmuClusterOutput, DanmuObject, int } from './types'

import {
  begin_chunk,
  begin_index_lock,
  detect_similarity,
  init as sim_init,
} from './similarity_stub'
import { Queue, Stats } from './types'

export const DEFAULT_CONFIG = {
  // 弹幕合并
  /**
   * 时间阈值(合并n秒内的弹幕)：
   * 超长（大概 60 秒以上？）的阈值可能会导致程序运行缓慢
   */
  THRESHOLD: 30,
  /**
   * 编辑距离合并阈值：
   * 根据编辑距离判断不完全一致但内容相近（例如有错别字）的弹幕,
   * 能有效击杀 "<code>你指尖跃动的电光</code>" 和 "<code>你<b>之间</b>跃动的电光</code>" 等
   * @example 禁用(0),轻微(≤3),中等(≤5),强力(≤8)
   */
  MAX_DIST: 5,
  /**
   * 词频向量合并阈值：
   * 根据 2-Gram 频率向量的夹角判断不完全一致但内容类似的弹幕,
   * 能有效击杀 "<code>yeah!~</code>" 和 "<code>yeah!~yeah!~yeah!~yeah!~</code>" 等
   * @example 禁用(1000),轻微(60%),中等(45%),强力(30%)
   */
  MAX_COSINE: 45,
  /**
   * 识别谐音弹幕：
   * 将常用汉字转换为拼音再进行比较,
   * 能有效击杀 "<code>布拉迪巴特福来</code>" 和 "<code>布拉迪·八德福莱</code>" 等
   */
  TRIM_PINYIN: true,
  // 比较文本时：
  TRIM_ENDING: true, // 忽略末尾标点
  TRIM_SPACE: true, // 忽略多余空格
  TRIM_WIDTH: true, // 忽略全半角差异

  // 例外设置
  FORCELIST: [
    ['^23{2,}$', '23333'],
    ['^6{3,}$', '66666'],
  ], // 强制合并（符合这些规则的弹幕，在比较是否相同时会先进行替换）
  WHITELIST: [] as [string, string][], // 强制忽略（符合这些规则的弹幕，即使内容相同也不会被合并）
  BLACKLIST: [] as [string, string][], // 强制删除（符合这些规则的弹幕，会直接被删除）
  CROSS_MODE: true, // 合并不同类型的弹幕(取消勾选后，底部弹幕不会跟滚动弹幕合并到一起)
  // 放过特定类型的弹幕：
  PROC_TYPE7: true, // 高级弹幕
  PROC_TYPE4: true, // 底部弹幕
  PROC_POOL1: false, // 字幕弹幕(位于弹幕池1)

  // // 显示设置
  // DANMU_MARK: 'prefix' as 'prefix' | 'suffix' | 'off', // 弹幕数量标记(开头/结尾/关闭)
  // MARK_THRESHOLD: 1, // 仅当数字大于n时显示
  // DANMU_SUBSCRIPT: true, // 数量标记显示成下标(₍₂₎/[x2])
  // // ENLARGE: true,
  // // SHRINK_THRESHOLD: 0,
  // /**
  //  * 自动弹幕优选：
  //  * 瞬时弹幕密度大于阈值时，按比例删除低权重弹幕，优先删除未合并弹幕
  //  * @example 禁用(0),轻微(>120),中等(>75),强力(>50)
  //  */
  // DROP_THRESHOLD: 0,
  // /**
  //  * 合并后尽量显示为固定弹幕：
  //  * 滚动弹幕和顶部 / 底部弹幕合并后显示在顶部 / 底部
  //  */
  // MODE_ELEVATION: true,
  // /**
  //  * 合并后的弹幕显示于n百分位弹幕的时间点
  //  * @example 0%(0),20%(20),50%(50)
  //  */
  // REPRESENTATIVE_PERCENT: 20,
}

export type Config = Partial<typeof DEFAULT_CONFIG>

interface DanmuIr {
  obj: DanmuObject
  str: string // for similarity algorithm
  idx: int
  sim_reason: string
}

const ENDING_CHARS = new Set('.。,，/?？!！…~～@^、+=-_♂♀ ')
// const TRIM_EXTRA_SPACE_RE = /[ \u3000]+/g
// const TRIM_CJK_SPACE_RE =
// /([\u3000-\u9FFF\uFF00-\uFFEF]) (?=[\u3000-\u9FFF\uFF00-\uFFEF])/g
const WIDTH_TABLE = new Map(
  Object.entries({
    '　': ' ',
    '１': '1',
    '２': '2',
    '３': '3',
    '４': '4',
    '５': '5',
    '６': '6',
    '７': '7',
    '８': '8',
    '９': '9',
    '０': '0',
    '!': '！',
    '＠': '@',
    '＃': '#',
    '＄': '$',
    '％': '%',
    '＾': '^',
    '＆': '&',
    '＊': '*',
    '（': '(',
    '）': ')',
    '－': '-',
    '＝': '=',
    '＿': '_',
    '＋': '+',
    '［': '[',
    '］': ']',
    '｛': '{',
    '｝': '}',
    ';': '；',
    '＇': "'",
    ':': '：',
    '＂': '"',
    ',': '，',
    '．': '.',
    '／': '/',
    '＜': '<',
    '＞': '>',
    '?': '？',
    '＼': '\\',
    '｜': '|',
    '｀': '`',
    '～': '~',
    ｑ: 'q',
    ｗ: 'w',
    ｅ: 'e',
    ｒ: 'r',
    ｔ: 't',
    ｙ: 'y',
    ｕ: 'u',
    ｉ: 'i',
    ｏ: 'o',
    ｐ: 'p',
    ａ: 'a',
    ｓ: 's',
    ｄ: 'd',
    ｆ: 'f',
    ｇ: 'g',
    ｈ: 'h',
    ｊ: 'j',
    ｋ: 'k',
    ｌ: 'l',
    ｚ: 'z',
    ｘ: 'x',
    ｃ: 'c',
    ｖ: 'v',
    ｂ: 'b',
    ｎ: 'n',
    ｍ: 'm',
    Ｑ: 'Q',
    Ｗ: 'W',
    Ｅ: 'E',
    Ｒ: 'R',
    Ｔ: 'T',
    Ｙ: 'Y',
    Ｕ: 'U',
    Ｉ: 'I',
    Ｏ: 'O',
    Ｐ: 'P',
    Ａ: 'A',
    Ｓ: 'S',
    Ｄ: 'D',
    Ｆ: 'F',
    Ｇ: 'G',
    Ｈ: 'H',
    Ｊ: 'J',
    Ｋ: 'K',
    Ｌ: 'L',
    Ｚ: 'Z',
    Ｘ: 'X',
    Ｃ: 'C',
    Ｖ: 'V',
    Ｂ: 'B',
    Ｎ: 'N',
    Ｍ: 'M',
  }),
)

/**
 * 反套路
 */
const detaolu = (inp: string, config: Config) => {
  const TRIM_ENDING = config.TRIM_ENDING
  const TRIM_SPACE = config.TRIM_SPACE
  const TRIM_WIDTH = config.TRIM_WIDTH
  const FORCELIST = (config?.FORCELIST ?? DEFAULT_CONFIG.FORCELIST).map(
    ([pattern, repl]) => [new RegExp(pattern, 'gi'), repl] as [RegExp, string],
  )

  let len = inp.length
  let text = ''

  if (TRIM_ENDING) {
    while (ENDING_CHARS.has(inp.charAt(len - 1)))
      // assert str.charAt(-1)===''
      len--
    if (len === 0)
      // all chars are ending chars, do nothing
      len = inp.length
  }

  if (TRIM_WIDTH) {
    for (let i = 0; i < len; i++) {
      const c = inp.charAt(i)
      text += WIDTH_TABLE.get(c) || c
    }
  } else {
    text = inp.slice(0, len)
  }

  if (TRIM_SPACE) {
    // text = text
    //   .replace(TRIM_EXTRA_SPACE_RE, ' ')
    //   .replace(TRIM_CJK_SPACE_RE, '$1')
    text = text
      .replaceAll(/[ \u3000]+/g, ' ')
      .replaceAll(
        /([\u3000-\u9FFF\uFF00-\uFFEF]) (?=[\u3000-\u9FFF\uFF00-\uFFEF])/g,
        '$1',
      )
  }

  for (const taolu of FORCELIST) {
    if (taolu[0].test(text)) {
      text = text.replace(taolu[0], taolu[1])
      return [true, text]
    }
  }

  return [false, text]
}

/**
 * 白名单处理
 */
const whitelisted = (text: string, config: Config) => {
  const WHITELIST = (config?.WHITELIST ?? DEFAULT_CONFIG.WHITELIST).map(
    (x) => new RegExp(x[0], 'i'),
  )
  if (WHITELIST.length === 0) return false
  else return WHITELIST.some((re) => re.test(text))
}

/**
 * 黑名单处理
 */
const blacklisted = (text: string, config: Config) => {
  const BLACKLIST = (config?.BLACKLIST ?? DEFAULT_CONFIG.BLACKLIST).map((x) =>
    x[0] ? new RegExp(x[1]) : x[1].toLowerCase(),
  )
  if (BLACKLIST.length === 0) return null
  else {
    const lower = text.toLowerCase()
    for (const pattern of BLACKLIST) {
      const matched =
        typeof pattern === 'string'
          ? lower.includes(pattern)
          : pattern.test(text)
      if (matched) {
        return typeof pattern === 'string'
          ? ` ${pattern}`
          : ` /${pattern.source}/`
      }
    }
    return null
  }
}

function extract_special_danmu(text: string): string {
  try {
    text = JSON.parse(text)[4]
  } catch {}
  return text
}

/**
 * 删除换行符/制表符
 */
function trim_dispstr(text: string): string {
  return text.replaceAll(/([\r\n\t])/g, '').trim()
}

/**
 * 选取中间值(最多出现的文字)
 */
function select_median_length(strs: string[]): string {
  if (strs.length === 1) return strs[0]

  const sorted = strs.sort((a, b) => a.length - b.length)
  const mid = Math.floor(sorted.length / 2)
  return sorted[mid]
}

async function load_wasm(wasm_mod?: ArrayBuffer) {
  await sim_init(
    wasm_mod ??
      (await fs.readFile(new URL('./similarity-gen.wasm', import.meta.url))),
  )
}

async function merge(
  chunk: DanmuChunk<DanmuObject>,
  // next_chunk: DanmuChunk<DanmuObject>,
  config: Config = DEFAULT_CONFIG,
): Promise<DanmuClusterOutput> {
  await load_wasm()

  begin_chunk(config)

  const ret: DanmuClusterOutput = {
    clusters: [],
    stats: new Stats(),
    deleted_chunk: [],
  }

  function apply_single_cluster(idx: int, obj: DanmuObject, desc: string) {
    ret.clusters.push({
      peers_ptr: [[idx, 'IGN']],
      desc: [desc],
      chosen_str: obj.content,
      // danuni
      danuni_count: 1,
      // danuni_senders: [obj.danuni_sender],
      danuni_dans: [obj],
    })
  }
  function apply_cluster(irs: DanmuIr[]) {
    if (irs.length === 1) {
      ret.clusters.push({
        peers_ptr: irs.map((ir) => [ir.idx, ir.sim_reason]),
        desc: [],
        chosen_str: irs[0].obj.content, // do not use detaolued str for single danmu
        // danuni
        danuni_count: irs.length,
        // danuni_senders: irs.map((ir) => ir.obj.danuni_sender),
        danuni_dans: irs.map((ir) => ir.obj),
      })
    } else {
      const text_cnts = new Map()
      let most_texts: string[] = [],
        most_cnt = 0

      for (const ir of irs) {
        const text = ir.str
        const cnt = 1 + (text_cnts.get(text) || 0)
        text_cnts.set(text, cnt)

        if (cnt > most_cnt) {
          most_texts = [text]
          most_cnt = cnt
        } else if (cnt === most_cnt) {
          most_texts.push(text)
        }
      }

      const most_text = select_median_length(most_texts)

      ret.clusters.push({
        peers_ptr: irs.map((ir) => [ir.idx, ir.sim_reason]),
        desc: most_cnt > 1 ? [`采用了出现 ${most_cnt} 次的文本`] : [],
        chosen_str: most_text,
        // danuni
        danuni_count: most_cnt,
        // danuni_senders: irs.map((ir) => ir.obj.danuni_sender),
        danuni_dans: irs.map((ir) => ir.obj),
      })
    }
  }

  function obj_to_ir(objs: DanmuObject[], s: Stats | null): DanmuIr[] {
    return objs
      .map((obj, idx) => {
        if (!config.PROC_POOL1 && obj.pool === 1) {
          if (s) {
            s.ignored_type++
            apply_single_cluster(idx, obj, '已忽略字幕弹幕，可以在选项中修改')
          }
          return null
        }
        // if (!config.PROC_TYPE7 && obj.mode === 7) {
        if (!config.PROC_TYPE7 && obj.mode === 4) {
          if (s) {
            s.ignored_type++
            apply_single_cluster(idx, obj, '已忽略特殊弹幕，可以在选项中修改')
          }
          return null
        }
        // if (!config.PROC_TYPE4 && obj.mode === 4) {
        if (!config.PROC_TYPE4 && obj.mode === 1) {
          if (s) {
            s.ignored_type++
            apply_single_cluster(idx, obj, '已忽略底部弹幕，可以在选项中修改')
          }
          return null
        }
        // if (obj.mode === 8) {
        //   if (s) {
        //     s.ignored_script++
        //     apply_single_cluster(idx, obj, '代码弹幕')
        //   }
        //   return null
        // }
        // if (obj.mode === 9) {
        //   if (s) {
        //     s.ignored_script++
        //     apply_single_cluster(idx, obj, 'BAS弹幕')
        //   }
        //   return null
        // }

        const disp_str = trim_dispstr(
          // obj.mode === 7 && obj.content[0] === '['
          obj.mode === 4 && obj.content[0] === '['
            ? extract_special_danmu(obj.content)
            : obj.content,
        )

        // if (obj.mode !== 8 && obj.mode !== 9) {
        if (obj.mode !== 4) {
          const matched = blacklisted(disp_str, config)
          if (matched) {
            if (s) {
              s.deleted_blacklist++
              s.deleted_blacklist_each[matched] =
                (s.deleted_blacklist_each[matched] || 0) + 1
              ret.deleted_chunk.push({
                ...obj,
                pakku: {
                  deleted_reason: `命中黑名单：${matched}`,
                },
              })
            }
            return null
          }
        }
        if (whitelisted(disp_str, config)) {
          if (s) {
            s.ignored_whitelist++
            apply_single_cluster(idx, obj, '命中白名单')
          }
          return null
        }

        const [matched_taolu, detaolued] = detaolu(disp_str, config)

        if (matched_taolu && s) {
          s.num_taolu_matched++
        }

        return {
          obj,
          str: detaolued,
          idx,
          sim_reason: 'ORIG',
        }
      })
      .filter((obj) => obj !== null) as DanmuIr[]
  }

  const danmus = obj_to_ir(chunk.objs, ret.stats)
  // const next_chunk_danmus = obj_to_ir(next_chunk.objs, null)

  const nearby_danmus: Queue<DanmuIr[]> = new Queue()

  const THRESHOLD_MS = (config?.THRESHOLD ?? DEFAULT_CONFIG.THRESHOLD) * 1000

  for (const dm of danmus) {
    while (true) {
      const peeked = nearby_danmus.peek()
      if (
        peeked === null ||
        dm.obj.time_ms - peeked[0].obj.time_ms <= THRESHOLD_MS
      )
        break
      apply_cluster(peeked)
      nearby_danmus.pop()
    }

    const sim = detect_similarity(
      dm.str,
      dm.obj.mode,
      nearby_danmus.index_l,
      ret.stats,
    )
    if (sim !== null) {
      const candidate =
        nearby_danmus.storage[nearby_danmus.index_r - sim.idx_diff]
      dm.sim_reason = sim.reason
      candidate.push(dm)
    } else {
      nearby_danmus.push([dm])
    }
  }

  // now process last few clusters with the next chunk
  begin_index_lock()
  // outer: for (const dm of next_chunk_danmus) {
  //   while (true) {
  //     const peeked = nearby_danmus.peek()
  //     if (peeked === null) break outer
  //     if (dm.obj.time_ms - peeked[0].obj.time_ms <= THRESHOLD_MS) break
  //     apply_cluster(peeked)
  //     nearby_danmus.pop()
  //   }

  //   const sim = detect_similarity(
  //     dm.str,
  //     dm.obj.mode,
  //     nearby_danmus.index_l,
  //     ret.stats,
  //   )
  //   if (sim !== null) {
  //     const candidate =
  //       nearby_danmus.storage[nearby_danmus.index_r - sim.idx_diff]
  //     dm.sim_reason = sim.reason
  //     candidate.push(dm)
  //   }
  // }

  // finally apply remaining clusters
  for (const candidate of nearby_danmus) {
    apply_cluster(candidate)
  }

  return ret
}

export default merge
