import jsSHA from 'jssha'
import type { ctime } from './dm-gen'

import { UniDM } from './dm-gen'

export const domainPreset = {
  // acfun: 'acfun.cn',
  // baha: 'ani.gamer.com.tw',
  // bgm: 'bgm.tv',
  // bili: 'b23.tv',
  // bglobal: 'biliintl.com',
  // ddplay: 'dandanplay.com',
  acfun: 'acfun',
  baha: 'baha',
  bgm: 'bgm',
  bili: 'bili', //b23
  bglobal: 'bglobal', //bintl
  ddplay: 'ddplay',
  tucao: 'tucao',
}

export type platfrom =
  | 'acfun'
  | 'baha'
  | 'bili'
  | 'bglobal'
  | 'ddplay'
  | 'danuni'
  | 'tucao'
  | 'other'
export const platforms = Object.keys(domainPreset) as platfrom[]
// export const platforms = [
//   'acfun',
//   'baha',
//   'bili',
//   'bglobal',
//   'ddplay',
//   'danuni',
//   'tucao',
//   // 'other',
// ]

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
     * ### 非DanUni弹幕服务预设(默认采用其最短服务域名)
     * - `acfun.cn`
     * - `ani.gamer.com.tw` (Baha)
     * - `bgm.tv` (bangumi)
     * - `b23.tv` (比bilibili.com短，省空间)
     * - `biliintl.com` (即bilibili.tv)
     * - `dandanplay.com`
     * - `tucao` (由于其域名常变，故分配固定解析，运行时解析)
     */
    public domain: string,
  ) {}
  toString() {
    return `${this.id}@${this.domain}`
  }
  static fromNull(domain?: string) {
    return new UniID('anonymous', domain || 'danuni')
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
    if (cid) return new UniID(cid.toString(), domainPreset.bili)
    else if (mid) return new UniID(mid.toString(), domainPreset.bili)
    else if (midHash) return new UniID(midHash, domainPreset.bili)
    else return this.fromNull(domainPreset.bili)
  }
  static fromUnknown(
    id: string,
    /**
     * 可使用预设`acfun` `baha` `bili` `bglobal` `ddplay` `tucao`代替其域名
     */
    domain: platfrom | string,
  ) {
    // domain = preset2domain(domain).domain
    if (id) return new UniID(id, domain)
    else return this.fromNull(domain)
  }
}

// export function preset2domain(domain: platfrom | string) {
//   for (const [k, v] of Object.entries(domainPreset)) {
//     if (domain === k) return { platform: k, domain: v }
//   }
//   return { platform: 'other', domain: domain }
// }

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
