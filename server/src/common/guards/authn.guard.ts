import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
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

    const setPass = (pass = false) =>
      this.attachAuthn(request, { ...authn, pass })
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
        setPass()
      else if (
        hasTarget.roles &&
        hasTarget.scopes &&
        targetRolesPass.includes(authn.role) &&
        SetUtils.isSubsetOf(targetScopesPass, authn?.scopes)
      )
        setPass()

      return true
    } else throw new NotInScopeException(targetScopes, authn?.scopes)
    // if (level >= targetLevels[0]) return true
    // else throw new LevelLowException(targetLevels[0], level)
    // return requiredLevels.some((level) => request.user?.level)
  }

  getRequest(context: ExecutionContext) {
    return getNestExecutionContextRequest(context)
  }

  attachAuthn(request: FastifyBizRequest, authn: Partial<AuthnModel>) {
    request.authn = authn
    Object.assign(request.raw, { authn })
  }

  async refreshCtxAuthn(request: FastifyBizRequest, pass = false) {
    const session = await this.authService.getSessionUser(request.raw)
    if (session) {
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
      else {
        ;[...scopes].forEach((scope) => {
          if (scope.endsWith('#passcheck'))
            scopes.add(scope.replace('#passcheck', '') as Scopes)
        })
      }
      let sid: string | undefined
      const getSid = (provider: string) => {
        if (provider === 'email' || session.accounts[0]?.provider === 'local')
          return session.user?.email
        const selected_provider = session.accounts.find(
          (account) => account.provider === provider,
        )
        if (selected_provider)
          return `${selected_provider.accountId}@${selected_provider.provider}`
      }
      if (session.user?.sidProvider) sid = getSid(session.user?.sidProvider)
      if (!sid)
        // 优先级由高到低
        for (const p of SidOrder) {
          const cSid = getSid(p)
          if (cSid) {
            sid = cSid
            break
          }
        }
      if (!sid) throw new BadRequestException('无可用的sid，请联系管理员重置')
      this.attachAuthn(request, {
        uid: session.user?.id,
        sid,
        role,
        scopes,
        pass,
        weight: session.user?.weight || 1,
      })
    } else
      this.attachAuthn(request, {
        uid: 'guest@danuni',
        sid: 'guest@danuni',
        role: Roles.guest,
        pass,
        weight: 0,
      })
    return request.authn
  }
}
