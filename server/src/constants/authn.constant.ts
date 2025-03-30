export const AUTHN_ROLES_OPTIONS = 'authn_module:roles_meta_options'
// export const AUTHN_LEVEL_OPTIONS = 'authn_module:level_meta_options'
export const AUTHN_SCOPE_OPTIONS = 'authn_module:scope_meta_options'

export const AUTHN_ROLES_PASS_OPTIONS = 'authn_module:roles_meta_pass_options'
export const AUTHN_SCOPE_PASS_OPTIONS = 'authn_module:scope_meta_pass_options'

// export enum LevelSectionFiedls {
//   metaCreate = 'metaCreate',
//   danmaku = 'danmaku',
//   danmakuChapterFull = 'danmakuChapterFull',
//   danmakuExtFull = 'danmakuExtFull',
// }
export enum Roles {
  admin = 'admin',
  user = 'user',
  bot = 'bot',
  guest = 'guest',
}
export enum Scopes {
  all = 'all',
  authBan = 'auth.ban',
  metaCreate = 'meta.create',
  metaModify = 'meta.modify',
  metaHashNew = 'meta.hash.new',
  metaHashVote = 'meta.hash.vote',
  metaRefreshOrFetchFromRemoteOrigin = 'meta.refresh',
  metaDel = 'meta.del',
  danmakuSend = 'danmaku.send',
  danmakuSendChapter = 'danmaku.send:chpt',
  danmakuSendChapterPassCheck = 'danmaku.send:chpt#passcheck',
  danmakuSendAdv = 'danmaku.send:adv',
  danmakuSendAdvPassCheck = 'danmaku.send:adv#passcheck',
  danmakuSendSub = 'danmaku.send:sub',
  danmakuSendSubPassCheck = 'danmaku.send:sub#passcheck',
  /**
   * 管理员级的删除权限，不受 inBufferTime 的制约，但仍可能已被备份
   */
  danmakuDel = 'danmaku.del',
  danmakuImport = 'danmaku.import',
  danmakuExport = 'danmaku.export',
  danmakuEventIssue = 'danmaku.event.issue',
  danmakuEventVote = 'danmaku.event.vote',
  danmakuEventEnd = 'danmaku.event.end',
}
export class GroupsClass {
  public readonly admin = new Set(
    Object.entries(Scopes).map(([_key, val]) => val),
  )
  public readonly lv1 = new Set([Scopes.danmakuSend, Scopes.danmakuEventIssue])
  public readonly lv2 = new Set([...this.lv1, Scopes.metaHashVote])
  public readonly lv3 = new Set([
    ...this.lv2,
    Scopes.metaHashNew,
    Scopes.danmakuEventVote,
    Scopes.metaRefreshOrFetchFromRemoteOrigin,
  ])
  public readonly lv4 = new Set([...this.lv3, Scopes.danmakuSendChapter])
  public readonly lv5 = new Set([
    ...this.lv4,
    Scopes.metaCreate,
    Scopes.danmakuSendAdv,
    Scopes.danmakuSendSub,
  ])
  public readonly lv6 = new Set([...this.lv5, Scopes.danmakuSendAdvPassCheck])
  public readonly sub = new Set([...this.lv6, Scopes.danmakuSendSubPassCheck])
}
export const Groups = new GroupsClass()

export interface AuthnModel {
  uid: string
  sid: string
  role: Roles
  scopes: Set<Scopes>
  pass: boolean
  weight: number
}
