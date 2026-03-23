export function fileParser(file: unknown, mod: 'bin'): ArrayBuffer | Uint8Array
export function fileParser(file: unknown, mod: 'string'): string
export function fileParser<T extends object>(file: unknown, mod: 'json'): T
export function fileParser(
  file: unknown,
  mod: 'bin' | 'string' | 'json',
): ArrayBuffer | Uint8Array | string | object {
  const isBinary = file instanceof ArrayBuffer || file instanceof Uint8Array
  switch (mod) {
    case 'bin': {
      if (isBinary) return file
      throw new TypeError('Expected binary data for mod "bin"')
    }
    case 'string': {
      if (typeof file === 'string') return file
      if (isBinary) return new TextDecoder().decode(file)
      throw new TypeError('Expected binary data or string for mod "string"')
    }
    case 'json': {
      if (typeof file === 'object' && file !== null && !isBinary) return file
      if (typeof file !== 'string' && !isBinary) {
        throw new TypeError(
          'Expected object, JSON string, or binary data for mod "json"',
        )
      }
      const str =
        typeof file === 'string' ? file : new TextDecoder().decode(file)
      try {
        return JSON.parse(str)
      } catch {
        throw new Error('Invalid JSON string')
      }
    }
    default:
      throw new Error(`Unsupported mod "${mod}"`)
  }
}
