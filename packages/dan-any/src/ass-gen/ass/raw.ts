import {
  brotliCompressSync,
  brotliDecompressSync,
  gunzipSync,
  gzipSync,
  zstdCompressSync,
  zstdDecompressSync,
} from 'node:zlib'
import * as base16384 from 'base16384'
import type { Context, Danmaku, SubtitleStyle } from '../types'

type compressType = 'zstd' | 'brotli' | 'gzip'
type baseType = 'base64' | 'base18384'
const compressTypes = ['zstd', 'brotli', 'gzip'],
  baseTypes = ['base64', 'base18384']

export interface RawConfig {
  compressType: compressType
  baseType: baseType
}

function fromUint16Array(array: Uint16Array): string {
  let result = ''
  for (const element of array) {
    result += String.fromCharCode(element)
  }
  return result
}

export function raw(
  list: Danmaku[],
  config: SubtitleStyle,
  context: Context,
  compressType: compressType = 'zstd',
  baseType: baseType = 'base18384',
) {
  const raw = { list, config, context },
    rawText = JSON.stringify(raw)
  let compress = Buffer.from('')
  if (compressType === 'zstd') compress = zstdCompressSync(rawText)
  else if (compressType === 'brotli') compress = brotliCompressSync(rawText)
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
  const arr = ass.split('\n'),
    lineCompressType = arr.find((line) => line.startsWith(';RawCompressType:')),
    lineBaseType = arr.find((line) => line.startsWith(';RawBaseType:')),
    lineRaw = arr.find((line) => line.startsWith(';Raw:'))
  if (!lineCompressType || !lineBaseType || !lineRaw) return undefined
  else {
    let compressType = lineCompressType
        .replace(';RawCompressType: ', '')
        .trim(),
      baseType = lineBaseType.replace(';RawBaseType: ', '').trim()
    if (!compressTypes.includes(compressType)) compressType = 'gzip'
    if (!baseTypes.includes(baseType)) baseType = 'base64'
    const text = lineRaw.replace(';Raw: ', '').trim(),
      buffer =
        baseType === 'base64'
          ? Buffer.from(text, 'base64')
          : Buffer.from(
              base16384.decode(Buffer.from(text, 'utf-8').toString('utf-8')),
            )
    let decompress = Buffer.from('')
    if (compressType === 'zstd') decompress = zstdDecompressSync(buffer)
    else if (compressType === 'brotli')
      decompress = brotliDecompressSync(buffer)
    else decompress = gunzipSync(buffer)
    try {
      return JSON.parse(decompress.toString('utf-8'))
    } catch {
      return undefined
    }
  }
}
