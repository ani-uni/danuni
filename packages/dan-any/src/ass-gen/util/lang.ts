export const assign = <T extends object>(
  source: T,
  ...targets: Partial<T>[]
): T => {
  for (const target of targets) {
    for (const key of Object.keys(target)) {
      ;(source as any)[key] = target[key as keyof typeof target]
    }
  }

  return source
}

export const arrayOfLength = <T>(length: number, defaultValue: T): T[] => {
  // eslint-disable-next-line unicorn/no-new-array
  const array = new Array(length)
  for (let i = 0; i < length; i++) {
    array[i] = defaultValue
  }
  return array
}

export const uniqueArray = <T>(array: T[]) => {
  const duplicates: T[] = []
  const result: T[] = []

  for (const item of array) {
    if (!duplicates.includes(item)) {
      duplicates.push(item)
      result.push(item)
    }
  }

  return result
}
