// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @see https://github.com/google/zx/blob/main/src/goods.ts
 * @see https://github.com/google/zx/blob/main/src/util.ts
 */

export function sleep(duration: Duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, parseDuration(duration))
  })
}

export function parseDuration(d: Duration) {
  if (typeof d === 'number') {
    if (Number.isNaN(d) || d < 0) throw new Error(`Invalid duration: "${d}".`)
    return d
  }
  if (/^\d+s$/.test(d)) return +d.slice(0, -1) * 1000
  if (/^\d+ms$/.test(d)) return +d.slice(0, -2)
  if (/^\d+m$/.test(d)) return +d.slice(0, -1) * 1000 * 60

  throw new Error(`Unknown duration: "${d}".`)
}

export type Duration = number | `${number}m` | `${number}s` | `${number}ms`
