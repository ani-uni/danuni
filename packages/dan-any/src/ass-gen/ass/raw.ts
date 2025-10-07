import {
  brotliCompressSync,
  brotliDecompressSync,
  gunzipSync,
  gzipSync,
} from 'node:zlib'
import * as base16384 from 'base16384'
import type { Context, Danmaku, SubtitleStyle } from '../types'

type compressType = 'brotli' | 'gzip'
type baseType = 'base64' | 'base18384'
const compressTypes = new Set(['brotli', 'gzip'])
const baseTypes = new Set(['base64', 'base18384'])

export interface RawConfig {
  compressType: compressType
  baseType: baseType
}

function fromUint16Array(array: Uint16Array): string {
  let result = ''
  for (const element of array) {
    result += String.fromCodePoint(element)
  }
  return result
}

export function raw(
  list: Danmaku[],
  config: SubtitleStyle,
  context: Context,
  compressType: compressType = 'brotli',
  baseType: baseType = 'base18384',
) {
  const raw = { list, config, context }
  const rawText = JSON.stringify(raw)
  let compress: Buffer
  if (compressType === 'brotli') compress = brotliCompressSync(rawText)
  else compress = gzipSync(rawText)
  return `;RawCompressType: ${compressType}\n;RawBaseType: ${baseType}\n;Raw: ${baseType === 'base64' ? compress.toString('base64') : fromUint16Array(base16384.encode(compress))}`
}

export function deRaw(ass: string):
  | {
      list: Danmaku[]
      config: SubtitleStyle
      context: Context
    }
  | undefined {
  const arr = ass.split('\n')
  const lineCompressType = arr.find((line) =>
    line.startsWith(';RawCompressType:'),
  )
  const lineBaseType = arr.find((line) => line.startsWith(';RawBaseType:'))
  const lineRaw = arr.find((line) => line.startsWith(';Raw:'))
  if (!lineCompressType || !lineBaseType || !lineRaw) return undefined
  else {
    let compressType = lineCompressType.replace(';RawCompressType: ', '').trim()
    let baseType = lineBaseType.replace(';RawBaseType: ', '').trim()
    if (!compressTypes.has(compressType)) compressType = 'gzip'
    if (!baseTypes.has(baseType)) baseType = 'base64'
    const text = lineRaw.replace(';Raw: ', '').trim()
    const buffer =
      baseType === 'base64'
        ? Buffer.from(text, 'base64')
        : Buffer.from(
            base16384.decode(Buffer.from(text, 'utf8').toString('utf8')),
          )
    let decompress: Buffer
    if (compressType === 'brotli') decompress = brotliDecompressSync(buffer)
    else decompress = gunzipSync(buffer)
    try {
      return JSON.parse(decompress.toString('utf8'))
    } catch {
      return undefined
    }
  }
}
