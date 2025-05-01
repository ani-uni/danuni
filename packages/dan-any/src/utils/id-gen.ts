import jsSHA from 'jssha'
import type { ctime } from './dm-gen'
import type { PlatformSource } from './platform'

import { UniDM } from './dm-gen'
import { PlatformVideoSource } from './platform'

export class UniID {
  constructor(
    /**
     * @description 每个domain下应为唯一值
     * @example danuni: 推荐为UUID/ULID/NanoID
     * bili: midHash hash算法为CRC32
     */
    public id: string,
    /**
     * @description 弹幕首次出现的平台域名(注意可以为如localhost等根域名)
     * ### 预设
     * - `{any}.danuni` (若使用IP或无域名，请使用该domain，防止隐私泄露/无法解析)
     * #### 注意
     * - `any`值建议为UUID/ULID/NanoID以防同步错误
     * ### 非DanUni弹幕服务建议使用预设，或自行填写域名
     */
    public domain: PlatformSource | string,
  ) {}
  toString() {
    return `${this.id}@${this.domain}`
  }
  static fromNull(domain?: PlatformSource | 'runtime' | string) {
    return new UniID(
      domain === 'runtime' ? 'runtime' : 'anonymous',
      domain || 'danuni',
    )
  }
  static fromBili({
    cid,
    mid,
    midHash,
  }: {
    cid?: number | bigint | string
    mid?: number | bigint
    midHash?: string
  }) {
    if (cid) return new UniID(cid.toString(), PlatformVideoSource.Bilibili)
    else if (mid) return new UniID(mid.toString(), PlatformVideoSource.Bilibili)
    else if (midHash) return new UniID(midHash, PlatformVideoSource.Bilibili)
    else return this.fromNull(PlatformVideoSource.Bilibili)
  }
  static fromUnknown(
    id: string,
    /**
     * 可使用预设
     */
    domain: PlatformSource | string,
  ) {
    if (id) return new UniID(id, domain)
    else return this.fromNull(domain)
  }
}

export function createDMID(
  content: string = '',
  senderID: string,
  ctime: ctime,
  slice = 8,
) {
  return new jsSHA('SHA3-256', 'TEXT')
    .update(content + senderID + UniDM.transCtime(ctime).toISOString())
    .getHash('HEX')
    .slice(0, slice)
}
