import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import {
  // AUTHN_LEVEL_OPTIONS,
  AUTHN_ROLES_OPTIONS,
  AUTHN_ROLES_PASS_OPTIONS,
  AUTHN_SCOPE_OPTIONS,
  AUTHN_SCOPE_PASS_OPTIONS,
  AuthnModel,
  Groups,
  // LevelSectionFiedls,
  Roles,
  Scopes,
} from '~/constants/authn.constant'
import { SidOrder } from '~/modules/auth/auth.constant'
import { AuthService } from '~/modules/auth/auth.service'
// import { Levels } from '~/modules/user/user.model'
import {
  FastifyBizRequest,
  getNestExecutionContextRequest,
} from '~/transformers/get-req.transformer'
import {
  // LevelLowException,
  NotInScopeException,
  NotSpecificRoleException,
} from '~/utils/custom-request-exception'
import * as SetUtils from '~/utils/set.util'

@Injectable()
export class AuthnGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    protected readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targetRoles = this.reflector.getAllAndOverride<Roles[]>(
        AUTHN_ROLES_OPTIONS,
        [context.getHandler(), context.getClass()],
      ),
      // targetLevelSections = this.reflector.getAllAndOverride<
      //   LevelSectionFiedls[]
      // >(AUTHN_LEVEL_OPTIONS, [context.getHandler(), context.getClass()]),
      targetScopes = new Set(
        this.reflector.getAllAndOverride<Scopes[]>(AUTHN_SCOPE_OPTIONS, [
          context.getHandler(),
          context.getClass(),
        ]),
      ),
      targetRolesPass = this.reflector.getAllAndOverride<Roles[]>(
        AUTHN_ROLES_PASS_OPTIONS,
        [context.getHandler(), context.getClass()],
      ),
      targetScopesPass = new Set(
        this.reflector.getAllAndOverride<Scopes[]>(AUTHN_SCOPE_PASS_OPTIONS, [
          context.getHandler(),
          context.getClass(),
        ]),
      )

    if (
      !targetRoles ||
      targetRoles.length === 0 ||
      targetRoles.includes(Roles.guest)
    )
      return true

    const request = this.getRequest(context)
    const authn = request.authn || (await this.refreshCtxAuthn(request))

    if (!authn?.role) return false
    if (!authn.scopes) authn.scopes = new Set()

    const setPass = (pass = false, no_pass_scopes: Set<Scopes> = new Set()) =>
      this.attachAuthn(request, { ...authn, pass, no_pass_scopes })
    setPass(true)

    if (authn.role === Roles.admin) {
      // setPass(true)
      return true
    }
    if (!targetRoles.includes(authn.role))
      throw new NotSpecificRoleException(targetRoles, authn.role)
    if (authn?.scopes?.has(Scopes.all)) {
      // setPass(true)
      return true
    } else if (SetUtils.isSubsetOf(targetScopes, authn?.scopes)) {
      // 下面全是 else-if setPass()只执行了一次
      const hasTarget = {
        roles: targetRolesPass && targetRolesPass.length > 0,
        scopes: targetScopesPass && targetScopesPass.size > 0,
      }
      if (
        hasTarget.roles &&
        !hasTarget.scopes &&
        targetRolesPass.includes(authn.role)
      )
        setPass()
      else if (
        !hasTarget.roles &&
        hasTarget.scopes &&
        SetUtils.isSubsetOf(targetScopesPass, authn?.scopes)
      )
        setPass(
          false,
          SetUtils.difference(new Set(targetScopesPass), authn?.scopes),
        )
      else if (
        hasTarget.roles &&
        hasTarget.scopes &&
        targetRolesPass.includes(authn.role) &&
        SetUtils.isSubsetOf(targetScopesPass, authn?.scopes)
      )
        setPass(
          false,
          SetUtils.difference(new Set(targetScopesPass), authn?.scopes),
        )

      return true
    } else throw new NotInScopeException(targetScopes, authn?.scopes)
    // if (level >= targetLevels[0]) return true
    // else throw new LevelLowException(targetLevels[0], level)
    // return requiredLevels.some((level) => request.user?.level)
  }

  getRequest(context: ExecutionContext) {
    return getNestExecutionContextRequest(context)
  }

  attachAuthn(request: FastifyBizRequest, authn: NonNullable<AuthnModel>) {
    request.authn = authn
    Object.assign(request.raw, { authn })
  }

  async refreshCtxAuthn(
    request: FastifyBizRequest,
    pass = false,
    no_pass_scopes: Set<Scopes> = new Set(),
  ) {
    // 这里写个apikey权限vertify，再在controller搓个带permissions(scopes)的新建key接口
    // blog写个better-auth apikey get-session bug的解决方案
    const session = await this.authService.getSessionUser(request.raw)
    if (session && session.user?.id) {
      const role: Roles = (session.user?.role as Roles) || Roles.guest
      // level: Levels = session.user?.level || Levels.GuestOrBan,
      let scopes: Set<Scopes> = new Set(session.user?.scopes as Scopes[])
      // if (session.user?.role === Roles.admin) level = Levels.Admin
      // else if (session.user?.banned) level = Levels.GuestOrBan
      if (session.user?.role === Roles.admin) {
        scopes.clear()
        scopes.add(Scopes.all)
      } else if (session.user?.banned) scopes.clear()
      if (scopes.has(Scopes.all)) scopes = Groups.admin
      // else {
      //   ;[...scopes].forEach((scope) => {
      //     if (scope.endsWith('#bypass'))
      //       scopes.add(scope.replace('#bypass', '') as Scopes)
      //   })
      // }
      let sid: string | undefined
      const getSid = (provider: string) => {
        if (
          provider === 'email' ||
          session.accounts[0]?.provider === 'credential'
        )
          return session.user?.email
        const selected_provider = session.accounts.find(
          (account) => account.provider === provider,
        )
        if (selected_provider)
          return `${selected_provider.accountId}@${selected_provider.provider}`
      }
      if (session.user?.role === Roles.bot) sid = getSid('email')
      else if (session.user?.sidProvider)
        sid = getSid(session.user?.sidProvider)
      if (!sid)
        // 优先级由高到低
        for (const p of SidOrder) {
          const cSid = getSid(p)
          if (cSid) {
            sid = cSid
            break
          }
        }
      if (!sid)
        throw new InternalServerErrorException('无可用的sid，请联系管理员重置')
      this.attachAuthn(request, {
        uid: session.user?.id,
        sid,
        role,
        scopes,
        pass,
        no_pass_scopes,
        weight: session.user?.weight || 1,
      })
    } else
      this.attachAuthn(request, {
        uid: 'guest@danuni',
        sid: 'guest@danuni',
        role: Roles.guest,
        scopes: new Set(),
        pass,
        no_pass_scopes,
        weight: 0,
      })
    return request.authn
  }
}
