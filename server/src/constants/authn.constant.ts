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
  danmakuSend = 'danmaku.send',
  danmakuSendChapter = 'danmaku.send:chpt',
  danmakuSendAdv = 'danmaku.send:adv',
  danmakuSendSub = 'danmaku.send:sub',
  danmakuDel = 'danmaku.del', //base
  danmakuEventIssue = 'danmaku.event.issue',
  danmakuEventVote = 'danmaku.event.vote',
  danmakuEventClose = 'danmaku.event.close', //admin
  metaImport = 'meta.import',
  metaExport = 'meta.export',
  danmakuImport = 'danmaku.import',
  danmakuExport = 'danmaku.export',
  // danmakuEventExport = 'danmaku.event.export',
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
  public readonly lv3 = new Set([...this.lv2, Scopes.danmakuEventVote])
  public readonly lv4 = new Set([...this.lv3, Scopes.danmakuSendChapter])
  public readonly lv5 = new Set([
    ...this.lv4,
    Scopes.metaCreate,
    Scopes.danmakuSendAdv,
    Scopes.danmakuSendSub,
  ])
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
