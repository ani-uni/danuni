// import { createAccessControl } from 'better-auth/plugins/access'
// import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

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
// const baseStatement = {
//   meta: ['create', 'update', 'delete', 'source.new', 'source.vote'],
//   danmaku: [
//     'send',
//     'send:chpt',
//     'send:chpt#bypass',
//     'send:adv',
//     'send:adv#bypass',
//     'send:sub',
//     'send:sub#bypass',
//     'delete',
//     'import',
//     'export',
//     'event.issue',
//     'event.vote',
//     'event.close',
//   ],
// }
// const statement = {
//   ...defaultStatements,
//   meta: baseStatement.meta,
//   danmaku: baseStatement.danmaku,
// } as const
// const ac = createAccessControl(statement)
// export const acRoles = {
//   admin: ac.newRole({
//     ...statement,
//     ...adminAc.statements,
//   }),
//   user: ac
// }
export enum Scopes {
  all = 'all',
  // authBan = 'auth.ban', //admin
  metaCreate = 'meta.create', //maintainer
  metaEdit = 'meta.edit', //base
  metaEditPgc = 'meta.edit:pgc', //maintainer
  metaDel = 'meta.del', //base
  // metaEpCreate = 'meta.ep.create',
  // metaEpEdit = 'meta.ep.edit',
  // metaEpDel = 'meta.ep.del',
  // metaSourceCreate = 'meta.source.create',
  // metaSourceEdit = 'meta.source.edit',
  // metaSourceDelPgc = 'meta.source.del:pgc', //maintainer
  // metaRefreshOrFetchFromRemoteOrigin = 'meta.refresh',
  danmakuSend = 'danmaku.send',
  danmakuSendChapter = 'danmaku.send:chpt',
  // danmakuSendChapterBypass = 'danmaku.send:chpt#bypass',
  danmakuSendAdv = 'danmaku.send:adv',
  // danmakuSendAdvBypass = 'danmaku.send:adv#bypass',
  danmakuSendSub = 'danmaku.send:sub',
  // danmakuSendSubBypass = 'danmaku.send:sub#bypass',
  danmakuDel = 'danmaku.del', //base
  // /**
  //  * 管理员级的删除权限，不受 inBufferTime 的制约，但仍可能已被备份
  //  */
  // danmakuDelBypass = 'danmaku.del#bypass',
  danmakuImport = 'danmaku.import',
  danmakuExport = 'danmaku.export',
  danmakuEventIssue = 'danmaku.event.issue',
  danmakuEventVote = 'danmaku.event.vote',
  danmakuEventClose = 'danmaku.event.close', //admin
}
export class GroupsClass {
  public readonly admin = new Set(
    Object.entries(Scopes).map(([_key, val]) => val),
  )
  public readonly base = new Set([
    Scopes.metaEdit,
    Scopes.metaDel,
    Scopes.danmakuDel,
  ])
  public readonly lv1 = new Set([Scopes.danmakuSend, Scopes.danmakuEventIssue])
  public readonly lv2 = new Set([...this.lv1, Scopes.metaEditPgc])
  public readonly lv3 = new Set([
    ...this.lv2,
    Scopes.metaCreate,
    // Scopes.metaSourceDelPgc,
    Scopes.danmakuEventVote,
    // Scopes.metaRefreshOrFetchFromRemoteOrigin,
  ])
  public readonly lv4 = new Set([...this.lv3, Scopes.danmakuSendChapter])
  public readonly lv5 = new Set([
    ...this.lv4,
    Scopes.metaCreate,
    Scopes.danmakuSendAdv,
    Scopes.danmakuSendSub,
  ])
  // public readonly lv6 = new Set([...this.lv5, Scopes.danmakuSendAdvBypass])
  // public readonly sub = new Set([...this.lv6, Scopes.danmakuSendSubBypass])
}
export const Groups = new GroupsClass()

export interface AuthnModel {
  uid: string
  sid: string
  role: Roles
  scopes: Set<Scopes>
  pass: boolean
  no_pass_scopes: Set<Scopes>
  weight: number
}
