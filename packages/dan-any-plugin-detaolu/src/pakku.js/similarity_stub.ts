import type { Config } from '.'
import type { int, Stats } from './types'

// @ts-expect-error
import generated_promise from './similarity-gen'

let module: any = null
let ptr_buf: number

const MAX_STRING_LEN = 16005

export async function init(wasm_module: ArrayBuffer | NonSharedBuffer) {
  module = await generated_promise({ wasm: wasm_module })
  ptr_buf = module._malloc(MAX_STRING_LEN * 2 + 7)
  if (ptr_buf % 2)
    // align to ushort
    ptr_buf++
}

export function begin_chunk(config: Config) {
  try {
    module._begin_chunk(
      ptr_buf,
      config.MAX_DIST,
      config.MAX_COSINE,
      config.TRIM_PINYIN,
      config.CROSS_MODE,
    )
  } catch (error) {
    throw new Error(`wasm error (begin_chunk):\n${error}`)
  }
}

export function begin_index_lock() {
  try {
    module._begin_index_lock()
  } catch (error) {
    throw new Error(`wasm error (begin_index_lock):\n${error}`)
  }
}

enum CombinedReason {
  combined_identical = 0,
  combined_edit_distance = 1,
  combined_pinyin_distance = 2,
  combined_cosine_distance = 3,
}

export function detect_similarity(
  str: string,
  mode: number,
  index_l: int,
  S: Stats,
): null | { reason: string; idx_diff: int } {
  try {
    module.stringToUTF16(str, ptr_buf, MAX_STRING_LEN * 2)
  } catch (error) {
    throw new Error(`wasm error (write str buf): ${str}\n${error}`)
  }

  let ret: number
  try {
    ret = module._check_similar(mode, index_l)
  } catch (error) {
    throw new Error(`wasm error (similar): ${str}\n${error}`)
  }

  if (ret === 0)
    // fast path for CombinedReason.not_combined
    return null

  ret = ret >>> 0 // to unsigned
  const reason: CombinedReason = ret >>> 30
  const dist = (ret >>> 19) & ((1 << 11) - 1)
  const idx_diff = ret & ((1 << 19) - 1)

  let reason_str
  switch (reason) {
    case CombinedReason.combined_identical: {
      S.combined_identical++
      reason_str = '=='

      break
    }
    case CombinedReason.combined_edit_distance: {
      S.combined_edit_distance++
      reason_str = `≤${dist}`

      break
    }
    case CombinedReason.combined_cosine_distance: {
      S.combined_cosine_distance++
      reason_str = `${dist}%`

      break
    }
    case CombinedReason.combined_pinyin_distance: {
      S.combined_pinyin_distance++
      reason_str = `P≤${dist}`

      break
    }
    default: {
      throw new Error(`similarity wasm returned unknown reason: ${ret}`)
    }
  }

  return { reason: reason_str, idx_diff }
}
