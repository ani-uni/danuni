import { gzipSync } from 'node:zlib'
import type { Context, Danmaku, SubtitleStyle } from '../types'

// eslint-disable-next-line import/no-default-export
export default (list: Danmaku[], config: SubtitleStyle, context: Context) => {
  const raw = { list, config, context }
  const rawText = JSON.stringify(raw)
  return `;Raw: ${gzipSync(rawText).toString('base64')}`
}
