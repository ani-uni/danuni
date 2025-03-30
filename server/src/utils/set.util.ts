/**
 * 差集(A-B)(从A集合中移除B集合中的所有元素)
 */
export function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const result = new Set<T>(setA)
  for (const elem of setB) {
    result.delete(elem)
  }
  return result
}

// 子集(A⊆B)
export function isSubsetOf<T>(setA: Set<T>, setB: Set<T>) {
  if (setA.size > setB.size) {
    return false
  }
  let isSubset = true
  ;[...setA].every((value: T) => {
    if (!setB.has(value)) {
      isSubset = false
      return false
    }
    return true
  })
  return isSubset
}
